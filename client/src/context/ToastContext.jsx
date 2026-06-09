import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, X } from 'lucide-react';

const ToastContext = createContext(null);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, closing: true } : t))
    );
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 300);
  }, []);

  const addToast = useCallback((message, type) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast = { id, message, type, closing: false };
    
    setToasts((prev) => [...prev, newToast]);

    // Dismiss timers: 2s for success, 3s for warning, 4s for error
    const duration = type === 'success' ? 2000 : type === 'warning' ? 3000 : 4000;
    setTimeout(() => {
      removeToast(id);
    }, duration);
  }, [removeToast]);

  const showSuccess = useCallback((message) => addToast(message, 'success'), [addToast]);
  const showError = useCallback((message) => addToast(message, 'error'), [addToast]);
  const showWarning = useCallback((message) => addToast(message, 'warning'), [addToast]);

  const getIcon = (type) => {
    switch (type) {
      case 'success':
        return <CheckCircle2 size={18} style={{ color: 'var(--success)' }} />;
      case 'error':
        return <XCircle size={18} style={{ color: 'var(--danger)' }} />;
      case 'warning':
        return <AlertTriangle size={18} style={{ color: 'var(--warning)' }} />;
      default:
        return null;
    }
  };

  return (
    <ToastContext.Provider value={{ showSuccess, showError, showWarning }}>
      {children}
      <div className="toast-container">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`toast-item toast-${toast.type} ${toast.closing ? 'toast-closing' : ''}`}
          >
            <div className="toast-content">
              {getIcon(toast.type)}
              <span>{toast.message}</span>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="toast-close-btn"
              aria-label="Close"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};
