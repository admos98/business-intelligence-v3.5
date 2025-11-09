import React, { useState, useEffect } from 'react';
import { t } from '../../translations';
import { MasterItem, Unit } from '../../types';
import { useShoppingStore } from '../../store/useShoppingStore';
import { useToast } from '../common/Toast';

interface EditItemMasterModalProps {
  onClose: () => void;
  itemToEdit: MasterItem;
}

const EditItemMasterModal: React.FC<EditItemMasterModalProps> = ({ onClose, itemToEdit }) => {
  const { updateMasterItem, allCategories } = useShoppingStore();
  const { addToast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState(itemToEdit.name);
  const [category, setCategory] = useState(itemToEdit.category);
  const [unit, setUnit] = useState(itemToEdit.unit);

  useEffect(() => { setIsOpen(true); }, []);
  
  const handleClose = () => {
    setIsOpen(false);
    setTimeout(onClose, 300);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    updateMasterItem(itemToEdit.name, itemToEdit.unit, { name: name.trim(), category: category.trim() || t.other, unit });
    addToast(t.masterItemUpdated, 'success');
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
        <h2 className="text-xl font-bold text-primary mb-6">{t.editMasterItemTitle}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-secondary mb-1">{t.itemName}</label>
            <input
              type="text" value={name} onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
              required autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-secondary mb-1">{t.category}</label>
             <input type="text" list="categories" value={category} onChange={e => setCategory(e.target.value)} placeholder={t.categoryPlaceholder} className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"/>
              <datalist id="categories">
                  {allCategories().map(cat => <option key={cat} value={cat}/>)}
              </datalist>
          </div>
           <div>
            <label className="block text-sm font-medium text-secondary mb-1">{t.unit}</label>
            <select value={unit} onChange={e => setUnit(e.target.value as Unit)} className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent">
                {Object.values(Unit).map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
          <div className="mt-6 flex justify-end gap-3">
            <button type="button" onClick={handleClose} className="px-4 py-2 bg-border text-primary font-medium rounded-lg hover:bg-border/70 transition-colors">
              {t.cancel}
            </button>
            <button type="submit" className="px-4 py-2 bg-accent text-accent-text font-medium rounded-lg hover:opacity-90 transition-opacity">
              {t.saveChanges}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditItemMasterModal;