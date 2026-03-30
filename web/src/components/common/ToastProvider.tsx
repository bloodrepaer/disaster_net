import React, { useState, useEffect } from 'react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface ToastContextType {
  toasts: Toast[];
  addToast: (message: string, type: ToastType, duration?: number) => void;
  removeToast: (id: string) => void;
}

const ToastContext = React.createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = (id: string) => {
    setToasts(toasts => toasts.filter(t => t.id !== id));
  };

  const addToast = (message: string, type: ToastType, duration = 3000) => {
    const id = Date.now().toString();
    setToasts(toasts => [...toasts, { id, message, type, duration }]);

    if (duration > 0) {
      setTimeout(() => removeToast(id), duration);
    }
  };

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = React.useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}

function ToastContainer({ toasts, removeToast }: { toasts: Toast[]; removeToast: (id: string) => void }) {
  return (
    <div className="fixed bottom-4 right-4 flex flex-col gap-2 z-50 pointer-events-none">
      {toasts.map(toast => (
        <ToastItem key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsExiting(true);
      setTimeout(onClose, 300);
    }, (toast.duration || 3000) - 300);

    return () => clearTimeout(timer);
  }, [toast.duration, onClose]);

  const bgColor = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    info: 'bg-blue-500',
    warning: 'bg-yellow-500',
  }[toast.type];

  const icon = {
    success: '✅',
    error: '❌',
    info: 'ℹ️',
    warning: '⚠️',
  }[toast.type];

  return (
    <div
      className={`${bgColor} text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 pointer-events-auto transition-all duration-300 ${
        isExiting ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0'
      }`}
    >
      <span>{icon}</span>
      <span>{toast.message}</span>
      <button
        onClick={onClose}
        className="ml-auto text-white hover:opacity-70"
      >
        ✕
      </button>
    </div>
  );
}
