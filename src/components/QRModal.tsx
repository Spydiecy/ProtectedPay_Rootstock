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
    try {
      // Get the QR data and create a new QR code with white background for downloading
      const qrSize = 1000; // Large size for better quality
      
      // Create a temporary container for a new QR code
      const tempContainer = document.createElement('div');
      document.body.appendChild(tempContainer);
      
      // Create a new QR code instance specifically for download (with white background)
      const qrForDownload = (
        <QRCodeSVG
          value={qrData}
          size={qrSize}
          level="H"
          includeMargin={true}
          bgColor="#FFFFFF"
          fgColor="rgb(var(--primary))"
          imageSettings={{
            src: "/logo.png",
            height: Math.floor(qrSize * 0.15),
            width: Math.floor(qrSize * 0.15),
            excavate: true,
          }}
        />
      );
      
      // Render the QR code to the temp container
      const root = document.createElement('div');
      tempContainer.appendChild(root);
      
      // Use ReactDOM to render the QR code
      const ReactDOM = require('react-dom');
      ReactDOM.render(qrForDownload, root);
      
      // Wait for the QR code to render
      setTimeout(() => {
        try {
          // Get the SVG from the rendered QR code
          const svg = root.querySelector('svg');
          if (!svg) throw new Error('No SVG found');
          
          // Create a canvas with white background
          const canvas = document.createElement('canvas');
          canvas.width = qrSize;
          canvas.height = qrSize;
          
          const ctx = canvas.getContext('2d');
          if (!ctx) throw new Error('Could not get canvas context');
          
          // Fill with white background
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, qrSize, qrSize);
          
          // Convert SVG to data URL
          const svgData = new XMLSerializer().serializeToString(svg);
          const svgBlob = new Blob([svgData], {type: 'image/svg+xml;charset=utf-8'});
          const svgUrl = URL.createObjectURL(svgBlob);
          
          // Load the SVG as an image
          const img = new Image();
          img.onload = () => {
            // Draw the QR code on the canvas
            ctx.drawImage(img, 0, 0, qrSize, qrSize);
            
            // Add logo in the center (optional)
            const logoImage = new Image();
            const logoSize = qrSize * 0.15;
            
            logoImage.onload = () => {
              const logoX = (qrSize - logoSize) / 2;
              const logoY = (qrSize - logoSize) / 2;
              
              // Draw white background for the logo
              ctx.fillStyle = '#FFFFFF';
              ctx.fillRect(logoX, logoY, logoSize, logoSize);
              
              // Draw the logo
              ctx.drawImage(logoImage, logoX, logoY, logoSize, logoSize);
              
              // Finally, download the canvas as PNG
              downloadCanvasAsPng();
            };
            
            logoImage.onerror = () => {
              // Download without logo if it fails to load
              downloadCanvasAsPng();
            };
            
            // Try to load logo (will fall back if this fails)
            logoImage.src = '/logo.png';
            
            // Function to download the canvas as PNG
            function downloadCanvasAsPng() {
              // Get the data URL
              const dataUrl = canvas.toDataURL('image/png');
              
              // Create a temporary link and trigger download
              const a = document.createElement('a');
              a.href = dataUrl;
              a.download = `protectedpay-${username || address}.png`;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              
              // Clean up
              URL.revokeObjectURL(svgUrl);
              document.body.removeChild(tempContainer);
            }
          };
          
          img.onerror = (err) => {
            console.error('Error loading QR code image:', err);
            URL.revokeObjectURL(svgUrl);
            document.body.removeChild(tempContainer);
          };
          
          img.src = svgUrl;
        } catch (err) {
          console.error('Error generating QR code:', err);
          document.body.removeChild(tempContainer);
        }
      }, 100);
    } catch (error) {
      console.error('Failed to download QR code:', error);
      alert('Could not download QR code. Please try again.');
    }
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
