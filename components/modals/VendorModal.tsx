import React, { useState, useEffect } from 'react';
import { t } from '../../translations';
import { Vendor } from '../../types';
import { useShoppingStore } from '../../store/useShoppingStore';
import { useToast } from '../common/Toast';

interface VendorModalProps {
  onClose: () => void;
  vendorToEdit?: Vendor;
}

const VendorModal: React.FC<VendorModalProps> = ({ onClose, vendorToEdit }) => {
  const { addVendor, updateVendor } = useShoppingStore();
  const { addToast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState(vendorToEdit?.name || '');
  const [contactPerson, setContactPerson] = useState(vendorToEdit?.contactPerson || '');
  const [phone, setPhone] = useState(vendorToEdit?.phone || '');
  const [address, setAddress] = useState(vendorToEdit?.address || '');

  const isEditing = !!vendorToEdit;

  useEffect(() => { setIsOpen(true); }, []);
  
  const handleClose = () => {
    setIsOpen(false);
    setTimeout(onClose, 300);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const vendorData = { name, contactPerson, phone, address };

    if (isEditing) {
      updateVendor(vendorToEdit.id, vendorData);
      addToast(t.vendorUpdated, 'success');
    } else {
      addVendor(vendorData);
      addToast(t.vendorAdded, 'success');
    }
    handleClose();
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
        <h2 className="text-xl font-bold text-primary mb-6">{isEditing ? t.editVendorTitle : t.addVendorTitle}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-secondary mb-1">{t.vendorName}</label>
            <input
              type="text" value={name} onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
              required autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-secondary mb-1">{t.contactPerson}</label>
            <input
              type="text" value={contactPerson} onChange={(e) => setContactPerson(e.target.value)}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-secondary mb-1">{t.phone}</label>
            <input
              type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-secondary mb-1">{t.address}</label>
            <textarea
              value={address} onChange={(e) => setAddress(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
          <div className="mt-6 flex justify-end gap-3">
            <button type="button" onClick={handleClose} className="px-4 py-2 bg-border text-primary font-medium rounded-lg hover:bg-border/70 transition-colors">
              {t.cancel}
            </button>
            <button type="submit" className="px-4 py-2 bg-accent text-accent-text font-medium rounded-lg hover:opacity-90 transition-opacity">
              {isEditing ? t.saveChanges : t.create}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default VendorModal;