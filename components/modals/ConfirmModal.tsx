import React, { useState, useEffect } from 'react';
import { t } from '../../translations';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string | React.ReactNode;
  confirmText?: string;
  variant?: 'danger' | 'default';
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText,
  variant = 'default',
}) => {
  const [isModalVisible, setIsModalVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsModalVisible(true);
    }
  }, [isOpen]);

  const handleClose = () => {
    setIsModalVisible(false);
    setTimeout(onClose, 300);
  };

  const handleConfirm = () => {
    onConfirm();
    handleClose();
  };

  if (!isOpen) {
    return null;
  }

  const confirmButtonClasses = variant === 'danger'
    ? 'bg-danger text-primary hover:bg-danger/90'
    : 'bg-accent text-accent-text hover:opacity-90';

  return (
    <div
      className={`fixed inset-0 bg-black/70 flex items-center justify-center z-50 transition-opacity duration-300 ${isModalVisible ? 'opacity-100' : 'opacity-0'}`}
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
    >
      <div
        className={`bg-surface p-6 rounded-xl border border-border w-full max-w-md m-4 transition-all duration-300 ${isModalVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-10'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="confirm-modal-title" className="text-xl font-bold text-primary mb-4">{title}</h2>
        <div className="text-secondary mb-6">{message}</div>
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={handleClose} className="px-4 py-2 bg-border text-primary font-medium rounded-lg hover:bg-border/70 transition-colors">
            {t.cancel}
          </button>
          <button type="button" onClick={handleConfirm} className={`px-4 py-2 font-medium rounded-lg transition-opacity ${confirmButtonClasses}`}>
            {confirmText || (variant === 'danger' ? t.delete : t.confirm)}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
