import React, { useState, useCallback, useEffect } from 'react';
import { t } from '../../translations';
import { OcrParsedItem, OcrResult, PaymentMethod, PaymentStatus, Unit } from '../../types';
import { parseReceipt } from '../../lib/gemini';
import { useShoppingStore } from '../../store/useShoppingStore';
import { compressImage } from '../../lib/image';

interface OcrImportModalProps {
  onClose: () => void;
  onConfirm: (result: OcrResult, paymentMethod: PaymentMethod, paymentStatus: PaymentStatus, vendorName?: string) => void;
}

const OcrImportModal: React.FC<OcrImportModalProps> = ({ onClose, onConfirm }) => {
  const { allCategories, vendors } = useShoppingStore();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parsedResult, setParsedResult] = useState<OcrResult | null>(null);
  const [receiptImage, setReceiptImage] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.Card);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>(PaymentStatus.Paid);
  const [vendorName, setVendorName] = useState('');

  useEffect(() => { setIsOpen(true); }, []);
  
  const handleClose = () => {
    setIsOpen(false);
    setTimeout(onClose, 300);
  };
  
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressedB64 = await compressImage(file);
        setReceiptImage(compressedB64);
        processImage(compressedB64.split(',')[1]);
      } catch (error) {
        console.error("Image processing failed:", error);
        setError(t.ocrError);
      }
    }
  };

  const processImage = useCallback(async (base64String: string) => {
    setIsLoading(true); setError(null); setParsedResult(null);
    try {
      const result = await parseReceipt(base64String, allCategories());
      setParsedResult(result);
    } catch (err) {
      console.error(err);
      setError(t.ocrError);
    } finally {
      setIsLoading(false);
    }
  }, [allCategories]);
  
  const handleItemChange = (index: number, field: keyof OcrParsedItem, value: string | number) => {
    if (!parsedResult) return;
    const newItems = [...parsedResult.items];
    const targetItem = newItems[index];
    
    if (field === 'name' || field === 'suggestedCategory' || field === 'unit') {
        // @ts-ignore
        targetItem[field] = value as string;
    } else {
        // @ts-ignore
        targetItem[field] = Number(value) || 0;
    }
    setParsedResult({ ...parsedResult, items: newItems });
  };

  const handleSubmit = () => {
    if (parsedResult) {
        onConfirm(parsedResult, paymentMethod, paymentStatus, vendorName);
        handleClose();
    }
  };

  return (
    <div className={`fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`}>
      <div className={`bg-surface p-6 rounded-xl border border-border w-full max-w-4xl max-h-[90vh] flex flex-col transition-all duration-300 ${isOpen ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-10'}`}>
        <h2 className="text-xl font-bold text-primary mb-4">{t.ocrModalTitle}</h2>
        {!parsedResult && (<div className="flex-grow flex flex-col items-center justify-center border-2 border-dashed border-border rounded-lg p-8">
            {isLoading ? <p className="text-secondary">{t.parsingReceipt}</p> : (<>
                <p className="text-center text-secondary mb-4">{t.ocrInstruction}</p>
                <input type="file" id="receipt-upload" className="hidden" accept="image/*" onChange={handleImageUpload} />
                <label htmlFor="receipt-upload" className="cursor-pointer px-4 py-2 bg-accent text-accent-text font-medium rounded-lg hover:opacity-90 transition-opacity">{t.uploadImage}</label>
                {error && <p className="text-danger mt-4">{error}</p>}
            </>)}
        </div>)}

        {parsedResult && (<>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3 mb-4 p-3 bg-background rounded-lg flex-shrink-0">
                <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-secondary">{t.receiptDate}:</label>
                    <input 
                        type="text" 
                        value={parsedResult.date}
                        onChange={(e) => setParsedResult({ ...parsedResult, date: e.target.value })}
                        placeholder={t.ocrDatePlaceholder}
                        className="px-2 py-1 bg-surface border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-accent"
                    />
                </div>
                 <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-secondary">{t.paymentMethod}:</label>
                    <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value as PaymentMethod)} className="px-2 py-1 bg-surface border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-accent">
                        {Object.values(PaymentMethod).map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                </div>
                <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-secondary">{t.paymentStatus}:</label>
                    <select value={paymentStatus} onChange={e => setPaymentStatus(e.target.value as PaymentStatus)} className="px-2 py-1 bg-surface border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-accent">
                        {Object.values(PaymentStatus).map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>
                <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-secondary">{t.vendor}:</label>
                    <input type="text" list="vendors-ocr" value={vendorName} onChange={e => setVendorName(e.target.value)} placeholder={t.vendorPlaceholder} className="px-2 py-1 bg-surface border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-accent"/>
                    <datalist id="vendors-ocr">{vendors.map(v => <option key={v.id} value={v.name} />)}</datalist>
                </div>
            </div>

            <p className="text-sm text-secondary mb-3 flex-shrink-0">{t.reviewExtractedItems}</p>
            <div className="flex-grow overflow-y-auto pr-2 space-y-2">
                <div className="grid grid-cols-6 gap-2 text-xs text-secondary px-2 pb-1 font-medium">
                    <span className="col-span-2">{t.itemName}</span>
                    <span>{t.amount}</span>
                    <span>{t.unit}</span>
                    <span>{t.price}</span>
                    <span>{t.category}</span>
                </div>
                {parsedResult.items.map((item, index) => (<div key={index} className="grid grid-cols-6 gap-2 p-2 bg-background rounded-lg items-center">
                    <input type="text" value={item.name} onChange={e => handleItemChange(index, 'name', e.target.value)} className="col-span-2 w-full px-2 py-1 bg-surface border border-border rounded-md"/>
                    <input type="number" value={item.quantity} onChange={e => handleItemChange(index, 'quantity', e.target.value)} className="w-full px-2 py-1 bg-surface border border-border rounded-md"/>
                    <select value={item.unit || ''} onChange={e => handleItemChange(index, 'unit', e.target.value)} className="w-full px-2 py-1 bg-surface border border-border rounded-md">
                        <option value="" disabled>{t.unit}</option>
                        {Object.values(Unit).map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                    <div className="relative group">
                        <input type="number" value={item.price} onChange={e => handleItemChange(index, 'price', e.target.value)} className="w-full px-2 py-1 bg-surface border border-border rounded-md"/>
                        {item.price > 0 && (
                            <span className="absolute top-full left-1/2 -translate-x-1/2 mt-1 w-max px-2 py-1 bg-surface text-primary text-xs font-normal rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none border border-border z-10">
                                {t.tomanEquivalent((item.price / 10).toLocaleString('fa-IR'))}
                            </span>
                        )}
                    </div>
                    <input type="text" list="categories-ocr" value={item.suggestedCategory || ''} onChange={e => handleItemChange(index, 'suggestedCategory', e.target.value)} placeholder={t.category} className="w-full px-2 py-1 bg-surface border border-border rounded-md"/>
                    <datalist id="categories-ocr">{allCategories().map(cat => <option key={cat} value={cat}/>)}</datalist>
                </div>))}
            </div>
        </>)}
        
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={handleClose} className="px-4 py-2 bg-border text-primary font-medium rounded-lg hover:bg-border/70 transition-colors">{t.cancel}</button>
          {parsedResult && <button onClick={handleSubmit} className="px-4 py-2 bg-accent text-accent-text font-medium rounded-lg hover:opacity-90 transition-opacity">{t.addAllToPurchased}</button>}
        </div>
      </div>
    </div>
  );
};

export default OcrImportModal;