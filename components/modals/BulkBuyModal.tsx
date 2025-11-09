import React, { useState, useMemo, useEffect } from 'react';
import { ShoppingItem, ItemStatus, PaymentMethod, PaymentStatus } from '../../types';
import { t } from '../../translations';
import CurrencyDisplay from '../common/CurrencyDisplay';
import { useShoppingStore } from '../../store/useShoppingStore';
import { compressImage } from '../../lib/image';

interface BulkBuyModalProps {
  items: ShoppingItem[];
  onClose: () => void;
  onConfirm: (updatedItems: ShoppingItem[], sharedVendorName?: string) => void;
}

interface PurchaseDetail {
    purchasedAmount: number | '';
    pricePerUnit: number | '';
}

const BulkBuyModal: React.FC<BulkBuyModalProps> = ({ items, onClose, onConfirm }) => {
  const { vendors } = useShoppingStore();
  const [isOpen, setIsOpen] = useState(false);
  const [sharedVendor, setSharedVendor] = useState('');
  const [sharedPaymentMethod, setSharedPaymentMethod] = useState<PaymentMethod>(PaymentMethod.Card);
  const [sharedPaymentStatus, setSharedPaymentStatus] = useState<PaymentStatus>(PaymentStatus.Paid);
  const [purchaseDetails, setPurchaseDetails] = useState<Record<string, PurchaseDetail>>(
    items.reduce((acc, item) => ({ ...acc, [item.id]: { purchasedAmount: item.amount, pricePerUnit: '' } }), {})
  );

  useEffect(() => { setIsOpen(true); }, []);
  
  const handleClose = () => {
    setIsOpen(false);
    setTimeout(onClose, 300);
  };

  const handleDetailChange = (itemId: string, field: keyof PurchaseDetail, value: string) => {
    setPurchaseDetails(prev => ({ ...prev, [itemId]: { ...prev[itemId], [field]: value === '' ? '' : parseFloat(value) } }));
  };
  
  const isFormValid = useMemo(() => items.every(item => {
    const d = purchaseDetails[item.id];
    return d && d.purchasedAmount !== '' && Number(d.purchasedAmount) > 0 && d.pricePerUnit !== '' && Number(d.pricePerUnit) >= 0;
  }), [items, purchaseDetails]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;

    const updatedItems = items.map(item => {
        const d = purchaseDetails[item.id];
        const purchasedAmount = Number(d.purchasedAmount);
        const pricePerUnit = Number(d.pricePerUnit);
        return { ...item, status: ItemStatus.Bought, purchasedAmount, paidPrice: purchasedAmount * pricePerUnit,
            paymentMethod: sharedPaymentMethod, paymentStatus: sharedPaymentStatus,
        };
    });
    onConfirm(updatedItems, sharedVendor.trim());
    handleClose();
  };

  return (
    <div className={`fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`}>
      <div className={`bg-surface p-6 rounded-xl border border-border w-full max-w-2xl max-h-[90vh] flex flex-col transition-all duration-300 ${isOpen ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-10'}`}>
        <h2 className="text-xl font-bold text-primary mb-4 flex-shrink-0">{t.bulkBuyTitle} ({items.length} قلم)</h2>
        <form onSubmit={handleSubmit} className="flex-grow flex flex-col min-h-0">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 flex-shrink-0">
            <div className="md:col-span-1">
              <input type="text" list="vendors" value={sharedVendor} onChange={e => setSharedVendor(e.target.value)} placeholder={t.sharedVendor} className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"/>
              <datalist id="vendors">
                {vendors.map(v => <option key={v.id} value={v.name} />)}
              </datalist>
            </div>
            <select value={sharedPaymentMethod} onChange={e => setSharedPaymentMethod(e.target.value as PaymentMethod)} className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent">{Object.values(PaymentMethod).map(m => <option key={m} value={m}>{m}</option>)}</select>
            <select value={sharedPaymentStatus} onChange={e => setSharedPaymentStatus(e.target.value as PaymentStatus)} className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent">{Object.values(PaymentStatus).map(s => <option key={s} value={s}>{s}</option>)}</select>
          </div>
          <p className="text-center text-sm text-secondary mb-2 border-t border-b border-border py-2 flex-shrink-0">{t.enterPurchaseDetails}</p>
          <div className="flex-grow overflow-y-auto pr-2 space-y-3">
            {items.map(item => {
                const d = purchaseDetails[item.id];
                const total = (Number(d?.purchasedAmount) || 0) * (Number(d?.pricePerUnit) || 0);
                return (<div key={item.id} className="p-3 bg-background rounded-lg border border-border"><p className="font-bold text-primary mb-2">{item.name}</p><div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <input type="number" value={d.purchasedAmount} onChange={e => handleDetailChange(item.id, 'purchasedAmount', e.target.value)} className="w-full px-2 py-1 bg-surface border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-accent" placeholder={t.quantityPurchased} required/>
                    <div>
                        <input type="number" value={d.pricePerUnit} onChange={e => handleDetailChange(item.id, 'pricePerUnit', e.target.value)} className="w-full px-2 py-1 bg-surface border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-accent" placeholder={t.pricePerUnitLabel} required/>
                    </div>
                    <div className="self-center text-center">
                        <span className="text-xs text-secondary">{t.calculatedTotal}: </span>
                        <CurrencyDisplay value={total} className="font-semibold text-accent" />
                    </div>
                </div></div>);
            })}
          </div>
          <div className="mt-6 flex justify-end gap-3 flex-shrink-0 border-t border-border pt-4">
            <button type="button" onClick={handleClose} className="px-4 py-2 bg-border text-primary font-medium rounded-lg hover:bg-border/70 transition-colors">{t.cancel}</button>
            <button type="submit" disabled={!isFormValid} className="px-4 py-2 bg-accent text-accent-text font-medium rounded-lg hover:opacity-90 transition-opacity disabled:bg-secondary/50 disabled:cursor-not-allowed">{t.confirm}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BulkBuyModal;