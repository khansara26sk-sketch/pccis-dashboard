import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

export default function Modal({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = 'max-w-xl',
  footer,
}) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
          />

          {/* Modal Dialog Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className={`relative w-full ${maxWidth} bg-white dark:bg-[#19241C] border border-[#E5EDE6] dark:border-[#29382D] rounded-2xl shadow-2xl z-10 overflow-hidden flex flex-col max-h-[90vh]`}
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-[#E5EDE6] dark:border-[#29382D] flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-[#17211B] dark:text-[#F0FDF4] font-['Plus_Jakarta_Sans']">
                  {title}
                </h3>
                {subtitle && (
                  <p className="text-xs text-[#647067] dark:text-[#A3B3A6] mt-0.5">
                    {subtitle}
                  </p>
                )}
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-[#647067] hover:text-[#17211B] dark:hover:text-[#F0FDF4] hover:bg-[#F0FDF4] dark:hover:bg-[#173D26] transition-colors"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="px-6 py-5 overflow-y-auto flex-1 text-[#17211B] dark:text-[#F0FDF4] text-sm">
              {children}
            </div>

            {/* Footer */}
            {footer && (
              <div className="px-6 py-3.5 border-t border-[#E5EDE6] dark:border-[#29382D] bg-[#F7FAF7]/60 dark:bg-[#141D17]/60 flex items-center justify-end gap-2.5">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
