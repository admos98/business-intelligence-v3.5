import React, { useState, useMemo } from 'react';
import { t } from '../translations';
import { useShoppingStore } from '../store/useShoppingStore';
import Header from '../components/common/Header';
import { MasterItem } from '../types';
import EditItemMasterModal from '../components/modals/EditItemMasterModal';
import { useToast } from '../components/common/Toast';
import CurrencyDisplay from '../components/common/CurrencyDisplay';

const EditIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L14.732 3.732z" /></svg>;

interface ItemsDashboardProps {
  onBack: () => void;
  onLogout: () => void;
}

const ItemsDashboard: React.FC<ItemsDashboardProps> = ({ onBack, onLogout }) => {
  const { getAllKnownItems } = useShoppingStore();
  const [modalState, setModalState] = useState<{ open: boolean; item?: MasterItem }>({ open: false });
  const { addToast } = useToast();

  const allItems = useMemo(() => getAllKnownItems(), [getAllKnownItems]);

  const handleExportJson = () => {
    if (allItems.length === 0) return;

    const dataString = JSON.stringify(allItems, null, 2);
    const blob = new Blob([dataString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mehrnoosh_cafe_items_master_list.json`;
    a.click();
    URL.revokeObjectURL(url);
    addToast(t.exportJsonSuccess, 'success');
  };

  return (
    <>
      <Header title={t.itemsDashboardTitle} onBack={onBack} backText={t.backToDashboard} onLogout={onLogout}>
        <button
          onClick={handleExportJson}
          disabled={allItems.length === 0}
          className="px-3 py-1.5 text-sm bg-surface text-primary font-medium rounded-lg hover:bg-border transition-colors border border-border shadow-subtle disabled:opacity-50 disabled:cursor-not-allowed mr-2"
        >
          {t.exportJson}
        </button>
      </Header>
      <main className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto">
        {allItems.length === 0 ? (
          <div className="text-center py-16 px-6 bg-surface rounded-xl border border-border shadow-card">
            <p className="text-secondary text-lg">{t.noItemsYet}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {allItems.map(item => (
              <div key={`${item.name}-${item.unit}`} className="bg-surface rounded-xl border border-border shadow-card flex flex-col">
                <div className="p-5 flex-grow">
                  <h2 className="text-lg font-bold text-primary mb-1">{item.name}</h2>
                  <p className="text-sm text-secondary mb-3">{item.category} / {item.unit}</p>

                   <div className="space-y-3 border-t border-border pt-3 text-sm">
                        <div className="flex justify-between items-center">
                            <span className="text-secondary">{t.lastPrice}:</span>
                            <CurrencyDisplay value={item.lastPricePerUnit} className="font-semibold text-primary" />
                        </div>
                         <div className="flex justify-between items-center">
                            <span className="text-secondary">{t.totalQuantity}:</span>
                            <span className="font-semibold text-primary">{item.totalQuantity.toLocaleString('fa-IR')} {item.unit}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-secondary">{t.totalSpend}:</span>
                             <CurrencyDisplay value={item.totalSpend} className="font-semibold text-accent" />
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-secondary">{t.totalPurchases}:</span>
                            <span className="font-semibold text-primary">{item.purchaseCount.toLocaleString('fa-IR')}</span>
                        </div>
                   </div>
                </div>
                <div className="p-2 border-t border-border flex justify-end gap-2">
                    <button onClick={() => setModalState({ open: true, item })} className="p-1.5 text-secondary hover:text-primary"><EditIcon/></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
      {modalState.open && (
        <EditItemMasterModal
          itemToEdit={modalState.item!}
          onClose={() => setModalState({ open: false })}
        />
      )}
    </>
  );
};

export default ItemsDashboard;
