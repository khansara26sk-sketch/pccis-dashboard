import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const ToastContext = createContext();

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback(({ title, message, type = 'info', duration = 4000 }) => {
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 4);
    setToasts(prev => [...prev, { id, title, message, type }]);

    if (duration > 0) {
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, duration);
    }
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        <AnimatePresence>
          {toasts.map((toast) => {
            const icons = {
              success: <CheckCircle2 className="w-5 h-5 text-[#16A34A] dark:text-[#4ADE80] shrink-0" />,
              error: <AlertCircle className="w-5 h-5 text-[#DC2626] shrink-0" />,
              warning: <AlertTriangle className="w-5 h-5 text-[#D97706] shrink-0" />,
              info: <Info className="w-5 h-5 text-[#15803D] dark:text-[#4ADE80] shrink-0" />,
            };

            const borders = {
              success: 'border-[#E5EDE6] dark:border-[#29382D] bg-white dark:bg-[#19241C] shadow-[0_4px_12px_rgba(21,128,61,0.08)]',
              error: 'border-red-500/20 bg-white dark:bg-[#19241C] shadow-red-500/5',
              warning: 'border-amber-500/20 bg-white dark:bg-[#19241C] shadow-amber-500/5',
              info: 'border-[#E5EDE6] dark:border-[#29382D] bg-white dark:bg-[#19241C] shadow-[0_4px_12px_rgba(21,128,61,0.08)]',
            };

            return (
              <motion.div
                key={toast.id}
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, x: 20, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className={`pointer-events-auto p-4 rounded-xl border shadow-lg flex items-start gap-3 backdrop-blur-md ${borders[toast.type]}`}
              >
                {icons[toast.type]}
                <div className="flex-1 min-w-0">
                  {toast.title && (
                    <p className="text-sm font-semibold text-[#17211B] dark:text-[#F0FDF4] mb-0.5">
                      {toast.title}
                    </p>
                  )}
                  {toast.message && (
                    <p className="text-xs text-[#647067] dark:text-[#A3B3A6] leading-relaxed">
                      {toast.message}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => removeToast(toast.id)}
                  className="text-[#647067] hover:text-[#17211B] dark:hover:text-[#F0FDF4] transition-colors p-0.5"
                >
                  <X className="w-4 h-4" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
