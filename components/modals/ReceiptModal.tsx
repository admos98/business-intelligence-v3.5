import React, { useState, useEffect } from 'react';
import { t } from '../../translations';

interface ReceiptModalProps {
  imageUrl: string;
  itemName: string;
  onClose: () => void;
}

const ReceiptModal: React.FC<ReceiptModalProps> = ({ imageUrl, itemName, onClose }) => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => { setIsOpen(true); }, []);
  
  const handleClose = () => {
    setIsOpen(false);
    setTimeout(onClose, 300);
  };

  return (
    <div
      className={`fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`} onClick={handleClose}
    >
      <div
        className={`bg-surface p-4 rounded-xl border border-border max-w-3xl max-h-[90vh] flex flex-col transition-all duration-300 ${isOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-medium text-primary mb-4 text-center flex-shrink-0">{t.receiptFor(itemName)}</h3>
        <div className="flex-grow overflow-auto rounded-lg">
            <img src={imageUrl} alt={t.receiptFor(itemName)} className="w-full h-auto" />
        </div>
        <button
          onClick={handleClose}
          className="mt-4 flex-shrink-0 px-4 py-2 bg-accent text-accent-text font-medium rounded-lg hover:opacity-90 transition-opacity w-full"
        >
          {t.close}
        </button>
      </div>
    </div>
  );
};

export default ReceiptModal;