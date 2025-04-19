import React, { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';

interface SeiWalletInfoProps {
  evmAddress: string | null;
}

const SeiWalletInfo: React.FC<SeiWalletInfoProps> = ({ evmAddress }) => {
  const [seiAddress, setSeiAddress] = useState<string | null>(null);
  const [walletType, setWalletType] = useState<string>('Sei');
  
  useEffect(() => {
    // Function to try to get the Sei address from the wallet
    const getSeiAddress = async () => {
      try {
        // For Sei Global Wallet, the EVM address is the address we want to display
        if (evmAddress) {
          setSeiAddress(evmAddress);
          
          // Try to detect if we're using Sei Global Wallet
          if (window.ethereum) {
            try {
              // Check if the window.ethereum provider is Sei Global Wallet
              const isSeiGlobalWallet = Boolean(
                window.ethereum.isSei || 
                window.ethereum.isSeiWallet || 
                (window.ethereum.providers && 
                 window.ethereum.providers.some((p: any) => p.isSei || p.isSeiWallet))
              );
              
              if (isSeiGlobalWallet) {
                setWalletType('Sei');
              } else {
                // If not Sei Global Wallet, it might be another wallet type
                setWalletType('EVM');
              }
            } catch (detectionError) {
              console.warn('Could not detect wallet type:', detectionError);
              setWalletType('EVM');
            }
          }
        }
      } catch (error) {
        console.error('Error getting Sei address:', error);
        setSeiAddress(null);
      }
    };
    
    if (evmAddress) {
      getSeiAddress();
    } else {
      setSeiAddress(null);
    }
  }, [evmAddress]);
  
  if (!evmAddress || !seiAddress) {
    return null;
  }
  
  return (
    <div className="mt-2 text-sm">
      <div className="flex items-center">
        <span className="mr-2 font-semibold">{walletType} Address:</span>
        <span className="text-green-500">
          {seiAddress.substring(0, 6)}...{seiAddress.substring(seiAddress.length - 4)}
        </span>
      </div>
    </div>
  );
};

export default SeiWalletInfo;
