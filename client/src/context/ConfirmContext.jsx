import React, { createContext, useContext, useState, useRef } from 'react';
import { AlertTriangle, X } from 'lucide-react';

const ConfirmContext = createContext(null);

export const useConfirm = () => {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useConfirm must be used within a ConfirmProvider');
  }
  return context;
};

export const ConfirmProvider = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState({ title: '', message: '', danger: true });
  const resolveRef = useRef(null);

  const confirm = (confirmOptions) => {
    setOptions({
      title: confirmOptions.title || 'Confirm Action',
      message: confirmOptions.message || 'Are you sure you want to proceed?',
      danger: confirmOptions.danger !== false
    });
    setIsOpen(true);
    return new Promise((resolve) => {
      resolveRef.current = resolve;
    });
  };

  const handleCancel = () => {
    setIsOpen(false);
    if (resolveRef.current) resolveRef.current(false);
  };

  const handleConfirm = () => {
    setIsOpen(false);
    if (resolveRef.current) resolveRef.current(true);
  };

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {isOpen && (
        <div className="modal-overlay" style={{ zIndex: 2000 }}>
          <div className="modal-content" style={{ maxWidth: '420px', animation: 'slideUp 0.2s cubic-bezier(0.16, 1, 0.3, 1)' }}>
            <div className="modal-header" style={{ padding: '1rem 1.25rem' }}>
              <h3 style={{ fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: options.danger ? 'var(--accent)' : 'var(--primary)' }}>
                {options.danger ? <AlertTriangle size={18} /> : null}
                <span>{options.title}</span>
              </h3>
              <button 
                onClick={handleCancel}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                <X size={16} />
              </button>
            </div>
            <div className="modal-body" style={{ padding: '1.25rem 1.5rem', fontSize: '0.875rem', color: 'var(--text-main)', lineHeight: 1.45 }}>
              {options.message}
            </div>
            <div className="modal-footer" style={{ padding: '0.75rem 1.25rem', gap: '0.5rem' }}>
              <button 
                type="button" 
                className="btn btn-secondary btn-sm" 
                onClick={handleCancel}
              >
                Cancel
              </button>
              <button 
                type="button" 
                className={`btn btn-sm ${options.danger ? 'btn-danger' : 'btn-primary'}`} 
                onClick={handleConfirm}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
};
