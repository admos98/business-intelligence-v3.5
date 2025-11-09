import React, { useState, useEffect } from 'react';
import { ShoppingItem, Unit } from '../../types';
import { t } from '../../translations';
import { useShoppingStore } from '../../store/useShoppingStore';

interface EditItemModalProps {
  item: ShoppingItem;
  onClose: () => void;
  onSave: (itemId: string, updates: Partial<ShoppingItem>) => void;
}

const EditItemModal: React.FC<EditItemModalProps> = ({ item, onClose, onSave }) => {
  const { allCategories } = useShoppingStore();
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState(item.name);
  const [amount, setAmount] = useState<number | ''>(item.amount);
  const [unit, setUnit] = useState(item.unit);
  const [category, setCategory] = useState(item.category);

  useEffect(() => { setIsOpen(true); }, []);

  const handleClose = () => {
    setIsOpen(false);
    setTimeout(onClose, 300);
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim() && Number(amount) > 0) {
      onSave(item.id, { name: name.trim(), amount: Number(amount), unit, category: category.trim() || t.other });
      handleClose();
    }
  };

  return (
    <div className={`fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`}>
      <div className={`bg-surface p-6 rounded-xl border border-border w-full max-w-md transition-all duration-300 ${isOpen ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-10'}`}>
        <h2 className="text-xl font-bold text-primary mb-6">{t.editItemTitle}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
             <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder={t.itemName} className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"/>
             <div className="flex gap-4">
                <input type="number" value={amount} onChange={e => setAmount(e.target.value === '' ? '' : parseFloat(e.target.value))} placeholder={t.amount} className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"/>
                <select value={unit} onChange={e => setUnit(e.target.value as Unit)} className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent">
                    {Object.values(Unit).map(u => <option key={u} value={u}>{u}</option>)}
                </select>
             </div>
             <input type="text" list="categories" value={category} onChange={e => setCategory(e.target.value)} placeholder={t.categoryPlaceholder} className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"/>
              <datalist id="categories">
                  {allCategories().map(cat => <option key={cat} value={cat}/>)}
              </datalist>
          <div className="mt-6 flex justify-end gap-3">
            <button type="button" onClick={handleClose} className="px-4 py-2 bg-border text-primary font-medium rounded-lg hover:bg-border/70 transition-colors">{t.cancel}</button>
            <button type="submit" className="px-4 py-2 bg-accent text-accent-text font-medium rounded-lg hover:opacity-90 transition-opacity">{t.saveChanges}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditItemModal;