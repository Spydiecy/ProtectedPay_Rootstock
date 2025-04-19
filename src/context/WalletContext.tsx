// context/WalletContext.tsx

'use client'

import React, { ReactNode, useEffect, useState } from 'react';
import { createConfig, WagmiProvider, useAccount, useBalance as useWagmiBalance } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ethers } from 'ethers';
import { http } from 'viem';
import { 
  RainbowKitProvider,
  getDefaultWallets,
  connectorsForWallets,
  darkTheme 
} from '@rainbow-me/rainbowkit';
import '@rainbow-me/rainbowkit/styles.css';
// Import Sei Global Wallet for EIP-6963 discovery
import '@sei-js/sei-global-wallet/eip6963';
// Import our Sei wallet adapter
import { createSeiWalletAdapter } from '@/utils/seiWalletProvider';

type ExtendedProvider = ethers.providers.ExternalProvider & {
  on: (event: string, callback: (...args: unknown[]) => void) => void;
  removeListener: (event: string, callback: (...args: unknown[]) => void) => void;
  isMetaMask?: boolean;
};

// Define chains
const seiTestnet = {
  id: 1328,
  name: 'Sei Testnet',
  network: 'sei-testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'SEI',
    symbol: 'SEI',
  },
  rpcUrls: {
    default: {
      http: ['https://evm-rpc-testnet.sei-apis.com']
    },
    public: {
      http: ['https://evm-rpc-testnet.sei-apis.com']
    }
  },
  blockExplorers: {
    default: {
      name: 'Sei Trace',
      url: 'https://seitrace.com'
    }
  },
  testnet: true,
} as const;

const chains = [seiTestnet] as const; 

const projectId = 'b8ad206ba9492e6096fa0aa0f868586c';

const { wallets } = getDefaultWallets({
  appName: 'ProtectedPay',
  projectId,
});

const connectors = connectorsForWallets([
  ...wallets,
], {
  appName: 'ProtectedPay',
  projectId,
});

const wagmiConfig = createConfig({
  connectors,
  chains,
  transports: {
    [seiTestnet.id]: http(),
  },
});

const queryClient = new QueryClient();

interface WalletContextType {
  address: string | null;
  balance: string | null;
  signer: ethers.Signer | null;
  isConnected: boolean;
}

const WalletContext = React.createContext<WalletContextType>({
  address: null,
  balance: null,
  signer: null,
  isConnected: false,
});

function WalletState({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const [state, setState] = useState<WalletContextType>({
    address: null,
    balance: null,
    signer: null,
    isConnected: false,
  });

  const { address, isConnected } = useAccount();
  const { data: wagmiBalance } = useWagmiBalance({
    address: address as `0x${string}` | undefined,
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const initializeWallet = async () => {
      if (typeof window !== 'undefined' && window.ethereum && address) {
        try {
          // Detect if this is Sei Global Wallet
          const isSeiGlobalWallet = Boolean(
            window.ethereum.isSei || 
            window.ethereum.isSeiWallet || 
            (window.ethereum.providers && 
            window.ethereum.providers.some((p: any) => p.isSei || p.isSeiWallet))
          );
          
          let signer: ethers.Signer;
          let balance: string = '0.00';
          
          if (isSeiGlobalWallet) {
            console.log('🌟 Sei Global Wallet detected, using specialized adapter');
            // Use our specialized adapter for Sei Global Wallet
            const seiAdapter = createSeiWalletAdapter(window.ethereum, address);
            signer = seiAdapter.getSigner();
            
            try {
              // Get balance using the adapter's safe method
              balance = await seiAdapter.getBalance();
            } catch (balanceError) {
              console.warn('Error getting Sei wallet balance, using wagmi balance');
              if (wagmiBalance) {
                balance = ethers.utils.formatEther(wagmiBalance.value.toString());
              }
            }
          } else {
            // Standard wallet implementation
            const provider = new ethers.providers.Web3Provider(
              window.ethereum as unknown as ExtendedProvider, 
              'any' // Set this to 'any' to prevent network-related issues
            );
            
            try {
              signer = provider.getSigner();
            } catch (signerError) {
              console.warn('Could not get standard signer, using fallback', signerError);
              const standardSigner = provider.getSigner();
              signer = standardSigner;
              
              // Override the getAddress method if needed
              (signer as any).getAddress = () => Promise.resolve(address as string);
            }
            
            if (wagmiBalance) {
              balance = ethers.utils.formatEther(wagmiBalance.value.toString());
            } else {
              try {
                const ethersBalance = await provider.getBalance(address);
                balance = ethers.utils.formatEther(ethersBalance);
              } catch (balanceError) {
                console.warn('Error getting balance, using 0', balanceError);
              }
            }
          }
          
          setState({
            address,
            balance,
            signer,
            isConnected: true,
          });
        } catch (error) {
          console.error('Error initializing wallet:', error);
          setState({
            address: null,
            balance: null,
            signer: null,
            isConnected: false,
          });
        }
      } else if (!address) {
        setState({
          address: null,
          balance: null,
          signer: null,
          isConnected: false,
        });
      }
    };

    const handleAccountsChanged = () => {
      initializeWallet();
    };

    const handleChainChanged = () => {
      window.location.reload();
    };

    initializeWallet();

    const ethereum = window.ethereum as unknown as ExtendedProvider;
    if (ethereum?.on) {
      ethereum.on('accountsChanged', handleAccountsChanged);
      ethereum.on('chainChanged', handleChainChanged);
    }

    return () => {
      if (ethereum?.removeListener) {
        ethereum.removeListener('accountsChanged', handleAccountsChanged);
        ethereum.removeListener('chainChanged', handleChainChanged);
      }
    };
  }, [mounted, address, isConnected, wagmiBalance]);

  useEffect(() => {
    if (wagmiBalance && address && isConnected) {
      try {
        const formattedBalance = ethers.utils.formatEther(wagmiBalance.value.toString());
        setState(prev => ({
          ...prev,
          balance: formattedBalance,
        }));
      } catch (error) {
        console.error('Error formatting balance:', error);
      }
    }
  }, [wagmiBalance, address, isConnected]);

  if (!mounted) return null;

  return (
    <WalletContext.Provider value={state}>
      {children}
    </WalletContext.Provider>
  );
}

export function WalletProvider({ children }: { children: ReactNode }) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          theme={darkTheme({
            accentColor: '#22c55e',
            accentColorForeground: 'white',
          })}
        >
          <WalletState>{children}</WalletState>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

export function useWallet() {
  const context = React.useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
}

export { useAccount, useBalance, useConnect, useDisconnect } from 'wagmi';