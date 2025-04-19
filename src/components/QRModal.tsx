import React, { useRef, useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShareIcon, ArrowDownTrayIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface QRModalProps {
  isOpen: boolean;
  onClose: () => void;
  username: string;
  address: string;
}

const QRModal: React.FC<QRModalProps> = ({ isOpen, onClose, username, address }) => {
  const qrRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const qrData = JSON.stringify({
    app: "ProtectedPay",
    username: username || address,
    address,
    type: "payment"
  });

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Pay ${username || address} on ProtectedPay`,
          text: `Send payment to ${username || address} using ProtectedPay`,
          url: `https://protectedpay.com/transfer?to=${address}`
        });
      } catch (err) {
        console.error('Error sharing:', err);
      }
    }
  };

  const handleDownload = () => {
    const svg = qrRef.current?.querySelector('svg');
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      if (ctx) {
        // Use a variable background color to support both dark and light mode
        ctx.fillStyle = 'rgb(var(--background))';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
      }

      const pngFile = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.download = `protectedpay-${username || address}.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div 
            className="card backdrop-blur-lg p-6 w-full max-w-lg border border-[rgb(var(--border))]/80 relative"
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", duration: 0.5 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button 
              onClick={onClose}
              className="absolute top-4 right-4 p-1 rounded-full hover:bg-[rgb(var(--muted))]/20 text-[rgb(var(--foreground))]"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>

            <div className="flex flex-col md:flex-row items-center md:items-stretch gap-6">
              {/* QR Code */}
              <div className="flex flex-col items-center justify-center">
                <div className="relative group">
                  <div className="absolute -inset-4 bg-gradient-to-r from-[rgb(var(--primary))]/20 via-[rgb(var(--primary))]/20 to-[rgb(var(--primary))]/20 rounded-xl blur-xl opacity-0 group-hover:opacity-100 transition-all duration-500" />
                  <motion.div
                    className="relative p-4 rounded-xl bg-[rgb(var(--background))] border border-[rgb(var(--primary))]/30 shadow-lg"
                    ref={qrRef}
                    whileHover={{ scale: 1.02 }}
                    transition={{ type: "spring", stiffness: 300 }}
                  >
                    <QRCodeSVG
                      value={qrData}
                      size={isMobile ? 180 : 200}
                      level="H"
                      includeMargin={true}
                      bgColor="var(--bg-qr, rgb(var(--background)))"
                      fgColor="var(--fg-qr, rgb(var(--primary)))"
                      imageSettings={{
                        src: "/logo.png",
                        x: undefined,
                        y: undefined,
                        height: isMobile ? 30 : 35,
                        width: isMobile ? 30 : 35,
                        excavate: true,
                      }}
                    />
                  </motion.div>
                </div>
              </div>

              {/* Content */}
              <div className="flex flex-col justify-center flex-1">
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col gap-2 mb-4"
                >
                  <h3 className="text-xl md:text-2xl font-bold text-[rgb(var(--foreground))] mb-1">
                    Payment QR Code
                  </h3>
                  <div className="flex flex-col gap-1">
                    {username && (
                      <p className="text-md font-semibold text-[rgb(var(--primary))]">
                        @{username}
                      </p>
                    )}
                    <p className="text-sm text-[rgb(var(--muted-foreground))]">
                      Scan to send payment
                    </p>
                  </div>
                </motion.div>

                <div className="space-y-4">
                  <div className="flex justify-start gap-4">
                    {typeof navigator.share === 'function' && (
                      <motion.button
                        onClick={handleShare}
                        className="p-3 bg-[rgb(var(--muted))]/20 rounded-xl border border-[rgb(var(--border))] text-[rgb(var(--foreground))] hover:bg-[rgb(var(--primary))]/20 transition-all duration-300"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <ShareIcon className="w-5 h-5" />
                      </motion.button>
                    )}

                    <motion.button
                      onClick={handleDownload}
                      className="p-3 bg-[rgb(var(--muted))]/20 rounded-xl border border-[rgb(var(--border))] text-[rgb(var(--foreground))] hover:bg-[rgb(var(--primary))]/20 transition-all duration-300"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <ArrowDownTrayIcon className="w-5 h-5" />
                    </motion.button>
                  </div>

                  <div className="px-3 py-2 bg-[rgb(var(--muted))]/20 rounded-xl border border-[rgb(var(--border))]/50">
                    <p className="text-xs text-[rgb(var(--muted-foreground))] break-all">
                      {address}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default QRModal;
