import React, { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';

interface RootstockWalletInfoProps {
  evmAddress: string | null;
}

const RootstockWalletInfo: React.FC<RootstockWalletInfoProps> = ({ evmAddress }) => {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [walletType, setWalletType] = useState<string>('Rootstock');
  
  useEffect(() => {
    // Function to get the wallet address
    const getWalletAddress = async () => {
      try {
        if (evmAddress) {
          setWalletAddress(evmAddress);
          
          // Try to detect wallet type
          if (window.ethereum) {
            try {
              // Check if window.ethereum provider has specific properties
              // that might identify specific wallets
              if (window.ethereum.isMetaMask) {
                setWalletType('MetaMask');
              } else {
                // Default to EVM wallet
                setWalletType('EVM');
              }
            } catch (detectionError) {
              console.warn('Could not detect wallet type:', detectionError);
              setWalletType('EVM');
            }
          }
        }
      } catch (error) {
        console.error('Error getting wallet address:', error);
        setWalletAddress(null);
      }
    };
    
    if (evmAddress) {
      getWalletAddress();
    } else {
      setWalletAddress(null);
    }
  }, [evmAddress]);
  
  if (!evmAddress || !walletAddress) {
    return null;
  }
  
  return (
    <div className="mt-2 text-sm">
      <div className="flex items-center">
        <span className="mr-2 font-semibold">{walletType} Address:</span>
        <span className="text-green-500">
          {walletAddress.substring(0, 6)}...{walletAddress.substring(walletAddress.length - 4)}
        </span>
      </div>
    </div>
  );
};

export default RootstockWalletInfo;
