import { ethers } from 'ethers';

/**
 * This is a specialized provider that handles the specifics of Sei Global Wallet
 * It implements workarounds for methods that might not be fully supported in the Sei implementation
 */
export class SeiWalletAdapter {
  provider: ethers.providers.Web3Provider;
  address: string;
  
  constructor(ethereumProvider: any, address: string) {
    // Initialize the provider with 'any' network to prevent network-related issues
    this.provider = new ethers.providers.Web3Provider(ethereumProvider, 'any');
    this.address = address;
  }
  
  /**
   * Creates a signer that works with Sei Global Wallet
   * This handles special cases where standard ethers.js functionality isn't fully supported
   */
  getSigner(): ethers.Signer {
    try {
      // First try to get the standard signer
      const signer = this.provider.getSigner();
      
      // Patch the signer to work with Sei Global Wallet's limitations
      const patchedSigner = this.patchSigner(signer);
      return patchedSigner;
    } catch (error) {
      console.error("Error creating standard signer, using fallback:", error);
      
      // Create a fallback signer that works with minimum functionality
      return this.createFallbackSigner();
    }
  }
  
  /**
   * Patches a standard signer to work around limitations in Sei Global Wallet
   */
  private patchSigner(signer: ethers.Signer): ethers.Signer {
    // Override the getAddress method to avoid UNSUPPORTED_OPERATION errors
    (signer as any).getAddress = async () => this.address;
    
    // Patch the signMessage method which might not be properly implemented
    const originalSignMessage = signer.signMessage.bind(signer);
    (signer as any).signMessage = async (message: string | ethers.utils.Bytes) => {
      try {
        return await originalSignMessage(message);
      } catch (signError: any) {
        if (signError.code === "UNSUPPORTED_OPERATION") {
          console.warn("Standard signMessage not supported by wallet, using fallback");
          // Use the provider's send method directly as a fallback
          return await this.provider.send('personal_sign', [
            ethers.utils.hexlify(typeof message === 'string' ? ethers.utils.toUtf8Bytes(message) : message),
            this.address.toLowerCase()
          ]);
        }
        throw signError;
      }
    };
    
    // Add a specialized sendTransaction method to handle Sei Global Wallet's transaction format
    const originalSendTransaction = signer.sendTransaction.bind(signer);
    (signer as any).sendTransaction = async (transaction: ethers.utils.Deferrable<ethers.providers.TransactionRequest>) => {
      try {
        // First try the standard method
        return await originalSendTransaction(transaction);
      } catch (txError: any) {
        if (txError.code === "UNSUPPORTED_OPERATION") {
          console.warn("Standard sendTransaction not supported by wallet, using fallback");
          
          // Use the provider's send method directly with eth_sendTransaction
          // Create a clean transaction object with only the properties that are defined
          const txParams: Record<string, any> = {
            from: this.address
          };

          // Only add properties if they exist to avoid undefined values
          if (transaction.to) {
            txParams.to = await transaction.to;
          }
          
          // Handle value with proper type checking
          if (transaction.value) {
            const resolvedValue = await transaction.value;
            if (resolvedValue !== undefined) {
              txParams.value = ethers.utils.hexValue(resolvedValue);
            } else {
              txParams.value = '0x0';
            }
          } else {
            txParams.value = '0x0';
          }
          
          // Handle data with proper type checking
          if (transaction.data) {
            const resolvedData = await transaction.data;
            if (resolvedData !== undefined) {
              txParams.data = ethers.utils.hexlify(resolvedData);
            } else {
              txParams.data = '0x';
            }
          } else {
            txParams.data = '0x';
          }
          
          if (transaction.gasLimit) {
            const resolvedGasLimit = await transaction.gasLimit;
            if (resolvedGasLimit !== undefined) {
              txParams.gasLimit = ethers.utils.hexValue(resolvedGasLimit);
            }
          }
          
          if (transaction.gasPrice) {
            const resolvedGasPrice = await transaction.gasPrice;
            if (resolvedGasPrice !== undefined) {
              txParams.gasPrice = ethers.utils.hexValue(resolvedGasPrice);
            }
          }
          
          const txHash = await this.provider.send('eth_sendTransaction', [txParams]);
          
          // Return a TransactionResponse-like object with safe typing
          // Create transaction data safely
          let txData = '0x';
          if (transaction.data) {
            const resolvedData = await transaction.data;
            if (resolvedData) {
              txData = ethers.utils.hexlify(resolvedData);
            }
          }
          
          // Create transaction value safely
          let txValue = ethers.BigNumber.from(0);
          if (transaction.value) {
            const resolvedValue = await transaction.value;
            if (resolvedValue) {
              txValue = ethers.BigNumber.from(resolvedValue);
            }
          }
          
          // Get network chainId safely
          const network = await this.provider.getNetwork();
          const chainId = network.chainId;
          
          return {
            hash: txHash,
            from: this.address,
            to: transaction.to ? await transaction.to : null,
            confirmations: 0,
            nonce: 0, // We don't know the nonce
            gasLimit: ethers.BigNumber.from(0),
            gasPrice: ethers.BigNumber.from(0),
            data: txData,
            value: txValue,
            chainId: chainId,
            wait: async (confirmations?: number) => {
              // Wait for transaction receipt
              return await this.provider.waitForTransaction(txHash, confirmations || 1);
            }
          };
        }
        throw txError;
      }
    };
    
    return signer;
  }
  
  /**
   * Creates a minimal fallback signer when standard signer creation fails entirely
   */
  private createFallbackSigner(): ethers.Signer {
    // Create a minimal signer that can sign transactions
    const fallbackSigner = new ethers.VoidSigner(this.address, this.provider);
    
    // Override the connect method so it doesn't lose our custom methods
    const originalConnect = fallbackSigner.connect.bind(fallbackSigner);
    (fallbackSigner as any).connect = (provider: ethers.providers.Provider) => {
      const newSigner = originalConnect(provider);
      return this.patchSigner(newSigner);
    };
    
    return this.patchSigner(fallbackSigner);
  }
  
  /**
   * Helper method to get balance that handles provider errors
   */
  async getBalance(): Promise<string> {
    try {
      const balance = await this.provider.getBalance(this.address);
      return ethers.utils.formatEther(balance);
    } catch (error) {
      console.error("Error getting balance:", error);
      return "0.00";
    }
  }
}

/**
 * Factory function to create a Sei Wallet adapter
 */
export function createSeiWalletAdapter(ethereum: any, address: string): SeiWalletAdapter {
  return new SeiWalletAdapter(ethereum, address);
}
