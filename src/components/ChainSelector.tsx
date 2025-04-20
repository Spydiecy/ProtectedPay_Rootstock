import React, { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import { useWallet } from '@/context/WalletContext'
import { ChevronDownIcon } from '@heroicons/react/24/outline'

export interface ChainInfo {
  id: number
  hexId: string
  name: string
  icon: string
  symbol: string
  rpcUrl: string
  blockExplorerUrl: string
}

export const supportedChains: ChainInfo[] = [
  {
    id: 1328,
    hexId: '0x530',
    name: 'Sei Testnet',
    icon: '/chains/sei.png',
    symbol: 'SEI',
    rpcUrl: 'https://evm-rpc-testnet.sei-apis.com',
    blockExplorerUrl: 'https://seitrace.com'
  },
  {
    id: 1329,
    hexId: '0x531',
    name: 'Sei Mainnet',
    icon: '/chains/sei.png',
    symbol: 'SEI',
    rpcUrl: 'https://evm-rpc.sei-apis.com',
    blockExplorerUrl: 'https://seistream.app'
  },
] as const

const ChainSelector = () => {
  const { isConnected } = useWallet()
  const [currentChainId, setCurrentChainId] = useState<number | null>(null)
  const [isSwitching, setIsSwitching] = useState(false)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('touchstart', handleClickOutside)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
    }
  }, [])

  const handleSwitchNetwork = async (chainData: typeof supportedChains[number]) => {
    if (!window.ethereum || !isConnected || isSwitching) return

    setIsSwitching(true)
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: chainData.hexId }],
      })
      setIsDropdownOpen(false)
    } catch (switchError: unknown) {
      if ((switchError as { code: number }).code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: chainData.hexId,
                chainName: chainData.name,
                nativeCurrency: {
                  name: chainData.symbol,
                  symbol: chainData.symbol,
                  decimals: 18
                },
                rpcUrls: [chainData.rpcUrl],
                blockExplorerUrls: [chainData.blockExplorerUrl]
              }
            ]
          })
          setIsDropdownOpen(false)
        } catch (addError) {
          console.error('Error adding chain:', addError)
        }
      }
    } finally {
      setIsSwitching(false)
    }
  }

  useEffect(() => {
    const getChainId = async () => {
      if (window.ethereum && isConnected) {
        try {
          const chainId = await window.ethereum.request({ method: 'eth_chainId' })
          setCurrentChainId(parseInt(chainId, 16))
        } catch (error) {
          console.error('Error getting chain ID:', error)
        }
      }
    }

    getChainId()

    const handleChainChanged = (chainId: string) => {
      setCurrentChainId(parseInt(chainId, 16))
      window.location.reload()
    }

    if (window.ethereum) {
      window.ethereum.on('chainChanged', handleChainChanged)
    }

    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener('chainChanged', handleChainChanged)
      }
    }
  }, [isConnected])

  if (!isConnected) return null

  const currentChain = supportedChains.find(c => c.id === currentChainId) || supportedChains[0]

  const mobileDropdownVariants = {
    hidden: { opacity: 0, y: -20 },
    visible: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 }
  }

  const desktopDropdownVariants = {
    hidden: { opacity: 0, y: -10 },
    visible: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -10 }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <motion.button
        className="flex items-center justify-between space-x-2 px-3 py-2 rounded-xl bg-black/30 border border-green-500/20 hover:bg-black/40 transition-colors w-full md:w-auto min-w-[120px]"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        aria-label="Select blockchain network"
      >
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 relative flex-shrink-0">
            <Image
              src={currentChain.icon}
              alt={currentChain.name}
              fill
              className="rounded-full object-contain"
            />
          </div>
          <span className="text-green-400 font-medium text-sm">
            {isMobile ? currentChain.symbol : currentChain.name}
          </span>
        </div>
        <ChevronDownIcon 
          className={`w-4 h-4 text-green-400 transition-transform duration-200 ${
            isDropdownOpen ? 'rotate-180' : ''
          }`}
        />
      </motion.button>

      <AnimatePresence>
        {isDropdownOpen && (
          isMobile ? (
            // Mobile Dropdown - Improved scrollable design
            <motion.div
              className="fixed inset-x-0 top-16 bottom-0 z-50 bg-black/95 backdrop-blur-xl"
              variants={mobileDropdownVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              transition={{ duration: 0.2 }}
            >
              <div className="flex flex-col h-full">
                <div className="px-4 py-3 border-b border-green-500/20">
                  <h3 className="text-green-400 font-medium text-lg">Select Network</h3>
                </div>
                
                <div className="flex-1 overflow-y-auto scrollbar-hide">
                  <div className="px-4 py-2 space-y-2">
                    {supportedChains.map((chain) => (
                      <motion.button
                        key={chain.id}
                        onClick={() => handleSwitchNetwork(chain)}
                        className={`w-full px-4 py-3 flex items-center space-x-3 rounded-xl border ${
                          chain.id === currentChainId 
                            ? 'border-green-500/30 bg-green-500/5 text-green-400' 
                            : 'border-transparent text-gray-400 active:bg-green-500/5'
                        } ${isSwitching ? 'opacity-50' : ''}`}
                        disabled={isSwitching}
                        whileTap={{ scale: 0.98 }}
                      >
                        <div className="w-8 h-8 relative flex-shrink-0">
                          <Image
                            src={chain.icon}
                            alt={chain.name}
                            fill
                            className="rounded-full object-contain"
                          />
                        </div>
                        <div className="flex-1 text-left">
                          <div className="text-base font-medium">{chain.name}</div>
                          <div className="text-sm opacity-60">{chain.symbol}</div>
                        </div>
                        {chain.id === currentChainId && (
                          <motion.div
                            className="w-2 h-2 rounded-full bg-green-500"
                            layoutId="activeChain"
                          />
                        )}
                      </motion.button>
                    ))}
                  </div>
                </div>
                
                <div className="p-4 border-t border-green-500/20">
                  <button
                    onClick={() => setIsDropdownOpen(false)}
                    className="w-full py-3 px-4 rounded-xl bg-green-500/10 text-green-400 font-medium active:bg-green-500/20"
                  >
                    Close
                  </button>
                </div>
              </div>
            </motion.div>
          ) : (
            // Desktop Dropdown
            <motion.div
              variants={desktopDropdownVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              transition={{ duration: 0.2 }}
              className="absolute right-0 mt-2 w-64 rounded-xl bg-black/95 backdrop-blur-xl border border-green-500/20 shadow-xl overflow-hidden z-50"
            >
              <div className="py-2 max-h-96 overflow-y-auto scrollbar-hide">
                {supportedChains.map((chain) => (
                  <motion.button
                    key={chain.id}
                    onClick={() => handleSwitchNetwork(chain)}
                    className={`w-full px-4 py-2 flex items-center space-x-3 ${
                      chain.id === currentChainId ? 'text-green-400 bg-green-500/5' : 'text-gray-400 hover:bg-green-500/10'
                    } ${isSwitching ? 'opacity-50' : ''}`}
                    whileHover={{ x: 4 }}
                    disabled={isSwitching}
                  >
                    <div className="w-6 h-6 relative flex-shrink-0">
                      <Image
                        src={chain.icon}
                        alt={chain.name}
                        fill
                        className="rounded-full object-contain"
                      />
                    </div>
                    <span className="flex-1 text-left text-sm">{chain.name}</span>
                    {chain.id === currentChainId && (
                      <motion.div
                        className="w-2 h-2 rounded-full bg-green-500"
                        layoutId="activeChain"
                      />
                    )}
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )
        )}
      </AnimatePresence>
    </div>
  )
}

export default ChainSelector