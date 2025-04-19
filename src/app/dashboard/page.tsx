'use client'

import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { 
  ArrowRightIcon, 
  UsersIcon, 
  BanknotesIcon,
  ClockIcon,
  ShieldCheckIcon,
  UserCircleIcon
} from '@heroicons/react/24/outline'
import Link from 'next/link'
import { useAccount } from 'wagmi'
import { useWallet } from '@/context/WalletContext'
import { 
  getUserTransfers,
  getUserByAddress
} from '@/utils/contract'
import { ethers } from 'ethers';
import { useChain } from '@/hooks/useChain';
import SeiWalletInfo from '@/components/SeiWalletInfo';
import RegisterUsernameModal from '@/components/RegisterUsernameModal';

// Animation variants
const fadeIn = {
  initial: { opacity: 0, y: 20 },
  animate: { 
    opacity: 1, 
    y: 0, 
    transition: { duration: 0.3 } 
  }
}

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
}

interface Activity {
  id: string;
  type: 'sent' | 'received' | 'group' | 'savings';
  amount: string;
  timestamp: number;
  otherParty: string;
  status: number; // 0 = pending, 1 = completed, 2 = refunded
}

export default function DashboardPage() {
  const { address } = useAccount()
  const { signer } = useWallet()
  const { nativeToken } = useChain();
  const [balance, setBalance] = useState<string>('0.00')
  const [isLoading, setIsLoading] = useState(true)
  const [recentActivity, setRecentActivity] = useState<Activity[]>([])
  const [username, setUsername] = useState<string>('');
  const [isUsernameModalOpen, setIsUsernameModalOpen] = useState(false);

  // Fetch wallet balance and activity
  useEffect(() => {
    const fetchBalanceAndActivity = async () => {
      if (!signer || !address) return

      try {
        // Get wallet balance
        const balanceWei = await signer.getBalance()
        setBalance(parseFloat(ethers.utils.formatEther(balanceWei)).toFixed(4))

        // Get username if available
        try {
          const userInfoResult = await getUserByAddress(signer, address);
          if (userInfoResult.success && userInfoResult.data) {
            // Check if username exists and is not empty
            if (userInfoResult.data.username && userInfoResult.data.username !== "0x0000000000000000000000000000000000000000") {
              // We just need the username string, not the whole object
              setUsername(userInfoResult.data.username);
            }
          }
        } catch (err) {
          console.error('Error fetching username:', err);
        }

        // Get user balance
        const provider = await signer.provider;
        if (provider) {
          const balanceInWei = await provider.getBalance(address);
          const balanceInEth = ethers.utils.formatEther(balanceInWei);
          setBalance(parseFloat(balanceInEth).toFixed(4));
        }

        // Get all transfers for this address (includes both pending and completed transfers)
        const allTransfers = await getUserTransfers(signer, address)
        
        if (!allTransfers || allTransfers.length === 0) {
          setRecentActivity([])
          setIsLoading(false)
          return
        }

        // Format transfers and get the 4 most recent ones
        const activities = allTransfers
          .map(transfer => {
            const isSender = transfer.sender.toLowerCase() === address.toLowerCase()
            return {
              id: `${transfer.sender}-${transfer.recipient}-${transfer.timestamp}`,
              type: isSender ? 'sent' : 'received',
              amount: `${parseFloat(transfer.amount).toFixed(4)} ${nativeToken}`,
              timestamp: transfer.timestamp,
              otherParty: isSender ? transfer.recipient : transfer.sender,
              status: transfer.status
            } as Activity
          })
          .sort((a, b) => b.timestamp - a.timestamp)
          .slice(0, 4)
        
        // Set state with the recent activities
        setRecentActivity(activities)
      } catch (err) {
        console.error('Error fetching data:', err)
      } finally {
        setIsLoading(false)
      }
    }

    if (signer && address) {
      fetchBalanceAndActivity()
    }
  }, [signer, address, nativeToken])

  // Quick action card component
  const QuickActionCard = ({ 
    title, 
    description, 
    icon, 
    href,
    gradientFrom,
    gradientTo
  }: { 
    title: string, 
    description: string, 
    icon: React.ReactNode, 
    href: string,
    gradientFrom: string,
    gradientTo: string
  }) => (
    <Link href={href}>
      <motion.div 
        className="card backdrop-blur-lg p-6 border border-[rgb(var(--border))]/50 h-full"
        whileHover={{ y: -5, scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <div className={`inline-flex p-3 rounded-xl mb-4 bg-gradient-to-br ${gradientFrom} ${gradientTo}`}>
          {icon}
        </div>
        <h3 className="text-xl font-semibold mb-2 text-[rgb(var(--foreground))]">{title}</h3>
        <p className="text-[rgb(var(--muted-foreground))]">{description}</p>
      </motion.div>
    </Link>
  )

  // Activity item component
  const ActivityItem = ({ activity }: { activity: Activity }) => {
    const formatDate = (timestamp: number) => {
      const date = new Date(timestamp * 1000)
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    }

    const getStatusText = (status: number) => {
      switch (status) {
        case 0: return 'Pending'
        case 1: return 'Completed'
        case 2: return 'Refunded'
        default: return 'Unknown'
      }
    }

    const truncateAddress = (address: string) => 
      `${address.slice(0, 6)}...${address.slice(-4)}`

    return (
      <motion.div 
        className="flex items-center justify-between p-4 rounded-xl card backdrop-blur-sm border border-[rgb(var(--border))]/50"
        variants={fadeIn}
        whileHover={{ y: -2 }}
      >
        <div className="flex items-center space-x-4">
          <div className={`p-2 rounded-full ${
            activity.type === 'sent' 
              ? 'bg-orange-500/20 text-orange-400'
              : 'bg-green-500/20 text-green-400'
          }`}>
            {activity.type === 'sent' ? (
              <ArrowRightIcon className="w-5 h-5" />
            ) : (
              <ArrowRightIcon className="w-5 h-5 transform rotate-180" />
            )}
          </div>
          <div>
            <p className="text-[rgb(var(--foreground))] font-medium">
              {activity.type === 'sent' ? 'Sent to ' : 'Received from '}
              {truncateAddress(activity.otherParty)}
            </p>
            <div className="flex items-center space-x-2 text-xs text-[rgb(var(--muted-foreground))]">
              <ClockIcon className="w-3 h-3" />
              <span>{formatDate(activity.timestamp)}</span>
              <span className={`px-2 py-0.5 rounded-full text-xs ${
                activity.status === 0 ? 'bg-yellow-500/20 text-yellow-400' :
                activity.status === 1 ? 'bg-green-500/20 text-green-400' :
                'bg-red-500/20 text-red-400'
              }`}>
                {getStatusText(activity.status)}
              </span>
            </div>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[rgb(var(--foreground))] font-medium">{activity.amount}</p>
        </div>
      </motion.div>
    )
  }

  const NoWalletMessage = () => (
    <div className="card backdrop-blur-lg p-8 text-center">
      <UserCircleIcon className="w-16 h-16 text-[rgb(var(--primary))] mx-auto mb-4" />
      <h2 className="text-xl font-semibold mb-2">Connect Your Wallet</h2>
      <p className="text-[rgb(var(--muted-foreground))] mb-4">
        Connect your wallet to view your dashboard and start making transfers.
      </p>
    </div>
  )

  return (
    <div className="max-w-6xl mx-auto">
      <motion.div 
        className="mb-8"
        variants={fadeIn}
        initial="initial"
        animate="animate"
      >
        <h1 className="text-3xl md:text-4xl font-bold text-[rgb(var(--foreground))] mb-2">Dashboard</h1>
        <p className="text-[rgb(var(--muted-foreground))]">
          Welcome to ProtectedPay. Your secure crypto transfer platform.
        </p>
      </motion.div>

      {!address ? (
        <NoWalletMessage />
      ) : (
        <>
          {/* Balance Card */}
          <motion.div 
            className="card backdrop-blur-lg p-6 border border-[rgb(var(--border))]/50 mb-6"
            variants={fadeIn}
          >
            <div className="flex flex-wrap items-center justify-between">
              <div>
                <div className="text-[rgb(var(--muted-foreground))] mb-1">Your Balance</div>
                <div className="text-3xl font-bold text-[rgb(var(--foreground))]">
                  {balance} {nativeToken}
                </div>
                {username ? (
                  <div className="text-sm text-[rgb(var(--muted-foreground))] mt-1">
                    Username: <span className="text-[rgb(var(--primary))]">@{username}</span>
                  </div>
                ) : (
                  <button 
                    onClick={() => setIsUsernameModalOpen(true)}
                    className="text-sm text-[rgb(var(--primary))] mt-1 flex items-center hover:underline"
                  >
                    <span>Register Username</span>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 ml-1">
                      <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
                    </svg>
                  </button>
                )}
                {/* Display Sei Address */}
                <SeiWalletInfo evmAddress={address} />
              </div>
              
              <div className="flex flex-wrap gap-3 mt-4 sm:mt-0">
                <Link 
                  href="/dashboard/transfer" 
                  className="btn-primary flex items-center px-4 py-2 rounded-xl"
                >
                  <ArrowRightIcon className="w-4 h-4 mr-2" />
                  <span>Send</span>
                </Link>
                
                <Link 
                  href="/dashboard/group-payments" 
                  className="btn-outline flex items-center px-4 py-2 rounded-xl border border-[rgb(var(--border))]"
                >
                  <UsersIcon className="w-4 h-4 mr-2" />
                  <span>Group Pay</span>
                </Link>
              </div>
            </div>
          </motion.div>

          {/* Quick Actions */}
          <motion.section 
            className="mb-10"
            variants={staggerContainer}
            initial="initial"
            animate="animate"
          >
            <h2 className="text-xl font-semibold mb-4 text-[rgb(var(--foreground))]">Quick Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <motion.div variants={fadeIn}>
                <QuickActionCard 
                  title="Transfer" 
                  description="Send assets securely to any address or username"
                  icon={<ArrowRightIcon className="w-6 h-6 text-[rgb(var(--foreground))]" />}
                  href="/transfer"
                  gradientFrom="from-green-500/20"
                  gradientTo="to-emerald-500/20"
                />
              </motion.div>
              <motion.div variants={fadeIn}>
                <QuickActionCard 
                  title="Group Payments" 
                  description="Split expenses or contribute to group funds"
                  icon={<UsersIcon className="w-6 h-6 text-[rgb(var(--foreground))]" />}
                  href="/group-payments"
                  gradientFrom="from-blue-500/20"
                  gradientTo="to-indigo-500/20"
                />
              </motion.div>
              <motion.div variants={fadeIn}>
                <QuickActionCard 
                  title="Saving Pots" 
                  description="Create goal-based savings pots"
                  icon={<BanknotesIcon className="w-6 h-6 text-[rgb(var(--foreground))]" />}
                  href="/savings-pots"
                  gradientFrom="from-purple-500/20"
                  gradientTo="to-pink-500/20"
                />
              </motion.div>
            </div>
          </motion.section>

          {/* Recent Activity */}
          <motion.section
            variants={staggerContainer}
            initial="initial"
            animate="animate"
          >
            <h2 className="text-xl font-semibold mb-4 text-[rgb(var(--foreground))]">Recent Activity</h2>
            
            {isLoading ? (
              <div className="flex justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[rgb(var(--primary))]"></div>
              </div>
            ) : recentActivity.length > 0 ? (
              <div className="space-y-3">
                {recentActivity.map((activity) => (
                  <ActivityItem key={activity.id} activity={activity} />
                ))}
                <motion.div 
                  className="mt-4 text-center"
                  variants={fadeIn}
                >
                  <Link href="/dashboard/history" className="text-[rgb(var(--primary))] hover:text-[rgb(var(--primary))]/80 font-medium inline-flex items-center">
                    View all transactions
                    <ArrowRightIcon className="w-4 h-4 ml-1" />
                  </Link>
                </motion.div>
              </div>
            ) : (
              <motion.div 
                className="card backdrop-blur-lg p-8 text-center"
                variants={fadeIn}
              >
                <ShieldCheckIcon className="w-16 h-16 text-[rgb(var(--primary))] mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">No Recent Activity</h3>
                <p className="text-[rgb(var(--muted-foreground))] mb-4">
                  Your recent transfers and transactions will appear here.
                </p>
                <Link 
                  href="/transfer" 
                  className="inline-flex items-center justify-center px-4 py-2 bg-[rgb(var(--primary))] text-[rgb(var(--primary-foreground))] rounded-xl font-medium"
                >
                  Make your first transfer
                </Link>
              </motion.div>
            )}
          </motion.section>
        </>
      )}
      
      {/* Register Username Modal */}
      <RegisterUsernameModal 
        isOpen={isUsernameModalOpen} 
        onClose={() => setIsUsernameModalOpen(false)} 
        onSuccess={(newUsername) => {
          setUsername(newUsername);
          setIsUsernameModalOpen(false);
        }}
      />
    </div>
  )
}
