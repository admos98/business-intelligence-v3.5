import React, { useState, useEffect } from 'react';
import { t } from '../../translations';

interface SettingsModalProps {
  onClose: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ onClose }) => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => { setIsOpen(true); }, []);

  const handleClose = () => {
    setIsOpen(false);
    setTimeout(onClose, 300);
  };

  return (
    <div
      className={`fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`}
      onClick={handleClose}
    >
      <div
        className={`bg-surface p-6 rounded-xl border border-border w-full max-w-md transition-all duration-300 ${isOpen ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-10'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl font-bold text-primary mb-2">تنظیمات</h2>
        <p className="text-sm text-secondary mb-6">هیچ تنظیماتی برای نمایش وجود ندارد.</p>
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={handleClose} className="px-4 py-2 bg-accent text-accent-text font-medium rounded-lg hover:opacity-90 transition-opacity">
            {t.close}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
