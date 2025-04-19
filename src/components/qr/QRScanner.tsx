// components/qr/QRScanner.tsx
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  QrCodeIcon, 
  XMarkIcon,
  PhotoIcon,
  CameraIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import { isMobile } from 'react-device-detect';
import { Html5Qrcode } from 'html5-qrcode';

interface QRScannerProps {
  onScan: (data: string) => void;
  onError?: (error: string) => void;
}

const QRScanner: React.FC<QRScannerProps> = ({ onScan, onError }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isCameraMode, setIsCameraMode] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  const cleanupScanner = useCallback(async () => {
    try {
      if (scannerRef.current) {
        await scannerRef.current.stop();
        await new Promise(resolve => setTimeout(resolve, 100)); // Give time for cleanup
        scannerRef.current.clear();
        scannerRef.current = null;
      }
    } catch (error) {
      console.debug('Scanner cleanup error:', error);
    }
  }, []);

  const handleClose = useCallback(async () => {
    try {
      await cleanupScanner();
    } catch (error) {
      console.debug('Close error:', error);
    } finally {
      setIsOpen(false);
    }
  }, [cleanupScanner]);

  const handleSuccessfulScan = useCallback(async (data: string) => {
    try {
      await cleanupScanner();
    } catch (error) {
      console.debug('Scan cleanup error:', error);
    } finally {
      onScan(data);
      setIsOpen(false);
    }
  }, [onScan, cleanupScanner]);

  useEffect(() => {
    let mounted = true;

    const startScanner = async () => {
      if (isOpen && isCameraMode && isMobile) {
        try {
          await cleanupScanner();
          if (!mounted) return;

          const scanner = new Html5Qrcode("reader");
          scannerRef.current = scanner;

          await scanner.start(
            { facingMode: "environment" },
            {
              fps: 10,
              qrbox: { width: 250, height: 250 },
              aspectRatio: 1.0
            },
            async (decodedText) => {
              if (!mounted) return;
              try {
                const parsedData = JSON.parse(decodedText);
                console.log("Scanned data:", parsedData);
                if (parsedData.app === "ProtectedPay" && parsedData.address) {
                  await handleSuccessfulScan(parsedData.address);
                }
              } catch {
                if (decodedText.startsWith('0x')) {
                  await handleSuccessfulScan(decodedText);
                }
              }
            },
            undefined
          );
        } catch (error) {
          console.error('Scanner error:', error);
          if (mounted) {
            onError?.('Failed to start camera');
            setIsCameraMode(false);
          }
        }
      }
    };

    startScanner();

    return () => {
      mounted = false;
      cleanupScanner().catch(console.debug);
    };
  }, [isOpen, isCameraMode, handleSuccessfulScan, cleanupScanner, onError]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);

    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = async () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx?.drawImage(img, 0, 0);

        try {
          const jsQR = (await import('jsqr')).default;
          const imageData = ctx?.getImageData(0, 0, canvas.width, canvas.height);
          
          if (imageData) {
            const code = jsQR(imageData.data, imageData.width, imageData.height);
            
            if (code) {
              try {
                const parsedData = JSON.parse(code.data);
                if (parsedData.app === "ProtectedPay" && parsedData.address) {
                  handleSuccessfulScan(parsedData.address);
                }
              } catch {
                if (code.data.startsWith('0x')) {
                  handleSuccessfulScan(code.data);
                } else {
                  onError?.('Invalid QR code format');
                }
              }
            } else {
              onError?.('No QR code found in image');
            }
          }
        } catch (error) {
          onError?.(error instanceof Error ? error.message : 'Failed to read QR code');
        }
        
        setIsProcessing(false);
      };

      img.onerror = () => {
        onError?.('Failed to load image');
        setIsProcessing(false);
      };

      const reader = new FileReader();
      reader.onload = (e) => {
        if (typeof e.target?.result === 'string') {
          img.src = e.target.result;
        }
      };
      reader.onerror = () => {
        onError?.('Failed to read file');
        setIsProcessing(false);
      };
      reader.readAsDataURL(file);
      
    } catch (error) {
      onError?.(error instanceof Error ? error.message : 'Failed to process image');
      setIsProcessing(false);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <>
      <motion.button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-8 right-8 p-4 bg-[rgb(var(--background))]/80 backdrop-blur-xl rounded-full border border-[rgb(var(--primary))]/20 text-[rgb(var(--primary))] shadow-lg shadow-[rgb(var(--primary))]/20 z-40 hover:bg-[rgb(var(--primary))]/20 transition-colors"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <QrCodeIcon className="w-6 h-6" />
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="fixed inset-0 bg-[rgb(var(--background))]/95 backdrop-blur-lg z-50 flex flex-col"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="p-4 flex justify-between items-center border-b border-[rgb(var(--primary))]/20 bg-[rgb(var(--background))]/40">
              <h2 className="text-lg font-semibold text-[rgb(var(--primary))]">Scan QR Code</h2>
              <div className="flex items-center space-x-4">
                {isMobile && (
                  <div className="flex rounded-lg overflow-hidden border border-[rgb(var(--primary))]/20 bg-[rgb(var(--background))]/40">
                    <button
                      onClick={() => setIsCameraMode(true)}
                      className={`p-2 ${isCameraMode ? 'bg-[rgb(var(--primary))]/20 text-[rgb(var(--primary))]' : 'text-[rgb(var(--primary))]/60 hover:text-[rgb(var(--primary))]'}`}
                    >
                      <CameraIcon className="w-5 h-5" />
                    </button>
                    <button
                      onClick={async () => {
                        await cleanupScanner();
                        setIsCameraMode(false);
                        triggerFileInput();
                      }}
                      className={`p-2 ${!isCameraMode ? 'bg-[rgb(var(--primary))]/20 text-[rgb(var(--primary))]' : 'text-[rgb(var(--primary))]/60 hover:text-[rgb(var(--primary))]'}`}
                    >
                      <PhotoIcon className="w-5 h-5" />
                    </button>
                  </div>
                )}
                <motion.button
                  onClick={handleClose}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  className="p-2 rounded-lg text-[rgb(var(--primary))]/60 hover:text-[rgb(var(--primary))]"
                >
                  <XMarkIcon className="w-6 h-6" />
                </motion.button>
              </div>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center p-4">
              {isMobile ? (
                isCameraMode ? (
                  <div className="w-full max-w-sm mx-auto relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-[rgb(var(--primary))]/20 to-[rgb(var(--primary))]/20 rounded-2xl blur-xl" />
                    <div className="relative bg-[rgb(var(--background))]/50 p-4 rounded-2xl">
                      <div id="reader" className="overflow-hidden rounded-xl"></div>
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="w-64 h-64 border-2 border-[rgb(var(--primary))]/50 rounded-lg"></div>
                      </div>
                      
                      {/* Fixed buttons at bottom */}
                      <div className="fixed bottom-8 left-0 right-0 flex justify-center space-x-4 px-4">
                        {/* Upload Button */}
                        <motion.button
                          onClick={async () => {
                            await cleanupScanner();
                            setIsCameraMode(false);
                            triggerFileInput();
                          }}
                          className="p-4 bg-[rgb(var(--background))]/80 backdrop-blur-xl rounded-full border border-[rgb(var(--primary))]/20 text-[rgb(var(--primary))] hover:bg-[rgb(var(--primary))]/20 transition-colors"
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                        >
                          <PhotoIcon className="w-6 h-6" />
                        </motion.button>
                
                        {/* Close Button */}
                        <motion.button
                          onClick={handleClose}
                          className="p-4 bg-[rgb(var(--background))]/80 backdrop-blur-xl rounded-full border border-[rgb(var(--destructive))]/20 text-[rgb(var(--destructive))] hover:bg-[rgb(var(--destructive))]/20 transition-colors"
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                        >
                          <XMarkIcon className="w-6 h-6" />
                        </motion.button>
                      </div>
                    </div>
                    <p className="text-[rgb(var(--primary))] text-center mt-4 mb-24">
                      Position the QR code within the frame
                    </p>
                  </div>
                ) : (
                  <div className="w-full max-w-sm mx-auto relative">
                    <div
                      onClick={triggerFileInput}
                      className="w-full p-8 border-2 border-dashed border-[rgb(var(--primary))]/20 rounded-2xl cursor-pointer hover:border-[rgb(var(--primary))]/40 transition-colors"
                    >
                      <div className="flex flex-col items-center space-y-4">
                        {isProcessing ? (
                          <ArrowPathIcon className="w-12 h-12 text-[rgb(var(--primary))] animate-spin" />
                        ) : (
                          <PhotoIcon className="w-12 h-12 text-[rgb(var(--primary))]" />
                        )}
                        <p className="text-[rgb(var(--primary))] font-medium text-center">
                          {isProcessing ? 'Processing...' : 'Select from gallery'}
                        </p>
                      </div>
                    </div>
                    {/* Close button for uploader */}
                    <motion.button
                      onClick={handleClose}
                      className="absolute -top-4 -right-4 p-2 bg-[rgb(var(--background))]/80 backdrop-blur-xl rounded-full border border-[rgb(var(--destructive))]/20 text-[rgb(var(--destructive))] hover:bg-[rgb(var(--destructive))]/20 transition-colors"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      <XMarkIcon className="w-5 h-5" />
                    </motion.button>
                  </div>
                )
              ) : (
                <div className="w-full max-w-sm mx-auto relative">
                  <div
                    onClick={triggerFileInput}
                    className="w-full p-8 border-2 border-dashed border-[rgb(var(--primary))]/20 rounded-2xl cursor-pointer hover:border-[rgb(var(--primary))]/40 transition-colors"
                  >
                    <div className="flex flex-col items-center space-y-4">
                      {isProcessing ? (
                        <ArrowPathIcon className="w-12 h-12 text-[rgb(var(--primary))] animate-spin" />
                      ) : (
                        <PhotoIcon className="w-12 h-12 text-[rgb(var(--primary))]" />
                      )}
                      <p className="text-[rgb(var(--primary))] font-medium text-center">
                        {isProcessing ? 'Processing...' : 'Click to upload QR code'}
                      </p>
                    </div>
                  </div>
                  {/* Close button for uploader */}
                  <motion.button
                    onClick={handleClose}
                    className="absolute -top-4 -right-4 p-2 bg-[rgb(var(--background))]/80 backdrop-blur-xl rounded-full border border-[rgb(var(--destructive))]/20 text-[rgb(var(--destructive))] hover:bg-[rgb(var(--destructive))]/20 transition-colors"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <XMarkIcon className="w-5 h-5" />
                  </motion.button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/*"
        capture="environment"
        onChange={handleFileSelect}
        onClick={(e) => {
          (e.target as HTMLInputElement).value = '';
        }}
      />
    </>
  );
};

export default QRScanner;