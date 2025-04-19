import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon, CheckIcon } from '@heroicons/react/24/outline';
import { useWallet } from '@/context/WalletContext';
import { registerUsername, getUserByAddress } from '@/utils/contract';

interface RegisterUsernameModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (username: string) => void;
}

const RegisterUsernameModal: React.FC<RegisterUsernameModalProps> = ({ 
  isOpen, 
  onClose,
  onSuccess
}) => {
  const [username, setUsername] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { signer, address } = useWallet();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !signer || !address) return;

    setError(null);
    setIsSubmitting(true);

    try {
      // Check if username format is valid
      if (username.length < 3) {
        setError('Username must be at least 3 characters long');
        setIsSubmitting(false);
        return;
      }

      // Check if username contains only allowed characters
      if (!/^[a-zA-Z0-9_]+$/.test(username)) {
        setError('Username can only contain letters, numbers, and underscores');
        setIsSubmitting(false);
        return;
      }

      // Register the username
      await registerUsername(signer, username);
      
      // Verify registration was successful
      const registeredUser = await getUserByAddress(signer, address);
      if (registeredUser === username) {
        onSuccess(username);
        onClose();
      } else {
        setError('Registration failed. Please try again.');
      }
    } catch (error: any) {
      console.error('Error registering username:', error);
      setError(error.message || 'Failed to register username. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <motion.div 
            className="card backdrop-blur-lg p-6 w-full max-w-md border border-[rgb(var(--border))]/50"
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Register Username</h2>
              <button 
                onClick={onClose} 
                className="p-1 rounded-full hover:bg-[rgb(var(--muted))]/20"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <p className="text-[rgb(var(--muted-foreground))] mb-4">
              Register a username to make it easier for others to send you funds.
            </p>

            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block mb-1 text-sm font-medium">
                  Username
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-3 flex items-center text-[rgb(var(--muted-foreground))]">
                    @
                  </span>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="input pl-8 w-full"
                    placeholder="Enter username"
                    disabled={isSubmitting}
                  />
                </div>
                {error && (
                  <div className="mt-2 text-red-500 text-sm">{error}</div>
                )}
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  className="btn-outline mr-2"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary flex items-center justify-center min-w-[100px]"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    <>
                      <CheckIcon className="w-5 h-5 mr-1" />
                      Register
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default RegisterUsernameModal;
