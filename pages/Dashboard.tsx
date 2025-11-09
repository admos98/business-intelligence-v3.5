import React, { useState, useRef, useMemo, useEffect } from 'react';
import { ShoppingList, ItemStatus, SmartSuggestion, PendingPaymentItem } from '../types';
import Header from '../components/common/Header';
import NewListModal from '../components/modals/NewListModal';
import ConfirmModal from '../components/modals/ConfirmModal';
import ReportsModal from '../components/modals/ReportsModal';
import { t } from '../translations';
import { useShoppingStore } from '../store/useShoppingStore';
import { useToast } from '../components/common/Toast';
import { toJalaliDateString, gregorianToJalali } from '../lib/jalali';
import CurrencyDisplay from '../components/common/CurrencyDisplay';
import Card from '../components/common/Card';

interface DashboardProps {
  onSelectList: (listId: string) => void;
  onViewAnalysis: () => void;
  onViewVendors: () => void;
  onViewItems: () => void;
  onViewSummary: () => void;
  onLogout: () => void;
}

const PlusIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m6-6H6" /></svg>;
const CheckIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>;
const SearchIcon = ({className}: {className?: string}) => <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>;
const ChevronDownIcon = ({ className }: { className?: string }) => <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>;


const Dashboard: React.FC<DashboardProps> = ({ onSelectList, onViewAnalysis, onViewVendors, onViewItems, onViewSummary, onLogout }) => {
  const store = useShoppingStore();
  const { lists, createList, deleteList, importData, exportData, getSmartSuggestions, getPendingPayments, vendors, getExpenseForecast, addItemFromSuggestion } = store;
  const [isNewListModalOpen, setIsNewListModalOpen] = useState(false);
  const [isReportsModalOpen, setIsReportsModalOpen] = useState(false);
  const [addedSuggestions, setAddedSuggestions] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedMonths, setExpandedMonths] = useState<Record<string, boolean>>({});

  const importInputRef = useRef<HTMLInputElement>(null);
  const { addToast } = useToast();
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; listId: string; listName: string; }>({ isOpen: false, listId: '', listName: '' });
  const [importConfirmOpen, setImportConfirmOpen] = useState(false);
  
  const vendorMap = React.useMemo(() => new Map(vendors.map(v => [v.id, v.name])), [vendors]);

  const handleCreateAndOpenList = (date: Date) => {
    const listId = createList(date);
    addToast(t.listCreated, 'success');
    setIsNewListModalOpen(false);
    onSelectList(listId);
  };
  
  const handleAddItemFromSuggestion = (suggestion: SmartSuggestion) => {
    const wasAdded = addItemFromSuggestion(suggestion);
    if (wasAdded) {
        addToast(t.itemAddedToList, 'success');
        setAddedSuggestions(prev => new Set(prev).add(`${suggestion.name}-${suggestion.unit}`));
    } else {
        addToast(t.itemAlreadyInList, 'info');
    }
  };

  const handleImportData = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const result = e.target?.result;
            if (typeof result === 'string') {
                await importData(result);
                addToast(t.importSuccess, 'success');
                addToast(t.dataSynced, 'success');
            } else {
                throw new Error("File could not be read as text.");
            }
        } catch (error) {
            addToast(t.importError, 'error');
            console.error("Import failed:", error);
            if (error instanceof Error && (error.message.includes('saveData') || error.message.includes('Gist'))) {
                addToast(t.syncError, 'error');
            }
        }
    };
    reader.readAsText(file);
    if(event.target) event.target.value = '';
  };
  
  const triggerImport = () => {
    importInputRef.current?.click();
  };

  const handleExportData = () => {
    const dataString = exportData();
    const blob = new Blob([dataString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.download = `mehrnoosh_cafe_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.href = url;
    a.click();
    URL.revokeObjectURL(url);
    addToast(t.exportSuccess, 'success');
  };

  const handleDelete = (listId: string, listName: string) => {
    setDeleteConfirm({ isOpen: true, listId, listName });
  };
  
  const confirmDelete = () => {
    deleteList(deleteConfirm.listId);
    addToast(t.listDeleted, 'info');
  };
  
  const smartSuggestions = getSmartSuggestions();
  const pendingPayments = getPendingPayments();
  const expenseForecast = getExpenseForecast();

  const filteredLists = useMemo(() => {
    const sortedLists = [...lists].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    if (!searchQuery.trim()) {
      return sortedLists;
    }
    const query = searchQuery.toLowerCase().trim();
    return sortedLists.filter(list =>
      list.name.toLowerCase().includes(query) ||
      list.items.some(item => item.name.toLowerCase().includes(query))
    );
  }, [searchQuery, lists]);

  const { currentMonthLists, pastMonthsGroups } = useMemo(() => {
    const today = new Date();
    const [currentJalaliYear, currentJalaliMonth] = gregorianToJalali(today.getUTCFullYear(), today.getUTCMonth() + 1, today.getUTCDate());
    const currentMonthKey = `${currentJalaliYear}-${currentJalaliMonth}`;
    
    const current: ShoppingList[] = [];
    const pastGroups: Record<string, ShoppingList[]> = {};
    
    filteredLists.forEach(list => {
      const listDate = new Date(list.createdAt);
      const [jy, jm] = gregorianToJalali(listDate.getUTCFullYear(), listDate.getUTCMonth() + 1, listDate.getUTCDate());
      const monthKey = `${jy}-${jm}`;
      
      if (monthKey === currentMonthKey) {
        current.push(list);
      } else {
        if (!pastGroups[monthKey]) {
          pastGroups[monthKey] = [];
        }
        pastGroups[monthKey].push(list);
      }
    });

    return { currentMonthLists: current, pastMonthsGroups: pastGroups };
  }, [filteredLists]);
  
  useEffect(() => {
    if (searchQuery.trim()) {
      const newExpanded: Record<string, boolean> = {};
      Object.keys(pastMonthsGroups).forEach(monthKey => {
        newExpanded[monthKey] = true;
      });
      setExpandedMonths(newExpanded);
    } else {
      setExpandedMonths({});
    }
  }, [searchQuery, pastMonthsGroups]);

  const toggleMonthExpansion = (monthKey: string) => {
    setExpandedMonths(prev => ({ ...prev, [monthKey]: !prev[monthKey] }));
  };

  return (
    <>
      <Header title={t.appTitle} onLogout={onLogout}>
         <button
            onClick={onViewSummary}
            className="px-3 py-1.5 text-sm bg-surface text-primary font-medium rounded-lg hover:bg-border transition-colors border border-border shadow-subtle"
          >
            {t.executiveSummary}
          </button>
         <button
            onClick={() => setIsReportsModalOpen(true)}
            className="px-3 py-1.5 text-sm bg-surface text-accent font-medium rounded-lg hover:bg-border transition-colors border border-border shadow-subtle"
          >
            {t.generateReport}
          </button>
         <button
            onClick={onViewAnalysis}
            className="px-3 py-1.5 text-sm bg-surface text-primary font-medium rounded-lg hover:bg-border transition-colors border border-border shadow-subtle"
          >
            {t.analysisDashboard}
          </button>
          <button
            onClick={onViewVendors}
            className="px-3 py-1.5 text-sm bg-surface text-primary font-medium rounded-lg hover:bg-border transition-colors border border-border shadow-subtle"
          >
            {t.manageVendors}
          </button>
          <button
            onClick={onViewItems}
            className="px-3 py-1.5 text-sm bg-surface text-primary font-medium rounded-lg hover:bg-border transition-colors border border-border shadow-subtle"
          >
            {t.manageItems}
          </button>
      </Header>
      <main className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card title={t.todaysBriefing} className="lg:col-span-3">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="md:col-span-1">
                        <ExpenseForecastCard forecast={expenseForecast} />
                    </div>
                    <div className="md:col-span-2">
                        <h4 className="font-bold text-primary mb-3">{t.todaysSmartSuggestions}</h4>
                        {smartSuggestions.length > 0 ? (
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                {smartSuggestions.map(s => <SmartSuggestionCard key={s.name+s.unit} suggestion={s} onAdd={handleAddItemFromSuggestion} isAdded={addedSuggestions.has(`${s.name}-${s.unit}`)} />)}
                            </div>
                        ) : (
                            <p className="text-center text-secondary py-4">{t.noSuggestions}</p>
                        )}
                    </div>
                </div>
            </Card>
        </div>
        
        {pendingPayments.length > 0 && (
            <div>
                <h2 className="text-xl font-bold text-primary mb-4">{t.pendingPayments}</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {pendingPayments.map(item => <PendingPaymentCard key={item.id} item={item} vendorName={item.vendorId ? vendorMap.get(item.vendorId) : undefined} onGoToList={onSelectList} />)}
                </div>
            </div>
        )}

        <div className="flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center">
          <h1 className="text-2xl font-bold text-primary">{t.myShoppingLists}</h1>
           <div className="relative w-full md:max-w-sm">
              <input 
                  type="text"
                  placeholder={t.searchLists}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-2 pr-10 bg-surface border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
              />
              <SearchIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary" />
          </div>
          <div className="flex gap-2 justify-end">
             <input type="file" ref={importInputRef} className="hidden" accept=".json" onChange={handleImportData} />
             <button onClick={() => setImportConfirmOpen(true)} className="px-3 py-2 text-sm text-secondary font-medium rounded-lg hover:bg-surface transition-colors">{t.importData}</button>
             <button onClick={handleExportData} className="px-3 py-2 text-sm text-secondary font-medium rounded-lg hover:bg-surface transition-colors">{t.exportData}</button>
            <button
              onClick={() => setIsNewListModalOpen(true)}
              className="px-4 py-2 bg-accent text-accent-text font-medium rounded-lg hover:opacity-90 transition-opacity shadow-md shadow-accent/20 whitespace-nowrap"
            >
              {t.createNewList}
            </button>
          </div>
        </div>

        {lists.length === 0 ? (
          <div className="text-center py-16 px-6 bg-surface rounded-xl border border-border shadow-card">
            <p className="text-secondary text-lg">{t.noListsYet}</p>
            <p className="mt-2">{t.getStartedPrompt}</p>
          </div>
        ) : filteredLists.length === 0 ? (
            <div className="text-center py-16 px-6 bg-surface rounded-xl border border-border shadow-card col-span-full">
                <p className="text-secondary text-lg">{t.noListsFoundForSearch(searchQuery)}</p>
            </div>
        ) : (
          <div className="space-y-8">
            {currentMonthLists.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {currentMonthLists.map((list: ShoppingList) => (
                        <ListCard key={list.id} list={list} onSelect={onSelectList} onDelete={handleDelete} />
                    ))}
                </div>
            )}
            
            {Object.keys(pastMonthsGroups).sort().reverse().map(monthKey => {
                const [year, month] = monthKey.split('-').map(Number);
                const monthName = t.jalaliMonths[month - 1];
                const isExpanded = expandedMonths[monthKey] || false;
                
                return (
                    <div key={monthKey}>
                        <button 
                            onClick={() => toggleMonthExpansion(monthKey)}
                            className="w-full flex justify-between items-center p-3 bg-surface rounded-lg border border-border shadow-subtle mb-4"
                        >
                            <h3 className="font-bold text-primary">{t.pastMonthHeader(monthName, year)}</h3>
                            <ChevronDownIcon className={`w-5 h-5 text-secondary transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
                        </button>
                        {isExpanded && (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
                                {pastMonthsGroups[monthKey].map(list => (
                                    <ListCard key={list.id} list={list} onSelect={onSelectList} onDelete={handleDelete} />
                                ))}
                            </div>
                        )}
                    </div>
                );
            })}
             <style>{`
                @keyframes fade-in {
                    0% { opacity: 0; transform: translateY(-10px); }
                    100% { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in { animation: fade-in 0.3s ease-out forwards; }
            `}</style>
          </div>
        )}
      </main>
      {isNewListModalOpen && (
        <NewListModal onClose={() => setIsNewListModalOpen(false)} onCreate={handleCreateAndOpenList} />
      )}
      {isReportsModalOpen && <ReportsModal onClose={() => setIsReportsModalOpen(false)} />}
      <ConfirmModal
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ ...deleteConfirm, isOpen: false })}
        onConfirm={confirmDelete}
        title={t.confirmDeleteTitle}
        message={t.confirmDeleteList(deleteConfirm.listName) as string}
        variant="danger"
      />
      <ConfirmModal
        isOpen={importConfirmOpen}
        onClose={() => setImportConfirmOpen(false)}
        onConfirm={triggerImport}
        title={t.importData}
        message={t.confirmImport}
        confirmText={t.importData}
      />
    </>
  );
};

const ListCard: React.FC<{list: ShoppingList, onSelect: (id: string) => void, onDelete: (id: string, name: string) => void}> = ({ list, onSelect, onDelete }) => {
    const boughtItems = list.items.filter(i => i.status === ItemStatus.Bought).length;
    const totalItems = list.items.length;
    const progress = totalItems > 0 ? (boughtItems / totalItems) * 100 : 0;
    
    const getStatusPill = () => {
      if (totalItems > 0 && boughtItems === totalItems) {
        return <span className="text-xs font-medium px-2 py-1 bg-success-soft text-success rounded-full">{t.completed}</span>;
      }
      if (boughtItems > 0) {
        return <span className="text-xs font-medium px-2 py-1 bg-yellow-400/20 text-yellow-600 dark:text-yellow-400 rounded-full">{t.inProgress}</span>;
      }
      return <span className="text-xs font-medium px-2 py-1 bg-secondary/20 text-secondary rounded-full">{t.new}</span>;
    };
    
    return (
      <div
        className="bg-surface rounded-xl border border-border flex flex-col group transition-all duration-300 hover:-translate-y-1 hover:shadow-glow shadow-card"
      >
        <div role="button" tabIndex={0} className="flex-grow cursor-pointer" onClick={() => onSelect(list.id)} onKeyDown={(e) => e.key === 'Enter' && onSelect(list.id)}>
            <div className="p-5">
                <div className="flex justify-between items-start">
                  <h2 className="text-lg font-bold text-primary mb-2">{list.name}</h2>
                  {getStatusPill()}
                </div>
                <p className="text-sm text-secondary mb-4">{toJalaliDateString(list.createdAt, { format: 'long' })}</p>
                <div className="text-sm text-secondary space-y-2">
                  <p>{t.totalItems}: <span className="font-medium text-primary">{totalItems}</span></p>
                  <p>{t.itemsPurchased}: <span className="font-medium text-primary">{boughtItems}</span></p>
                </div>
            </div>
             <div className="px-5 pb-5">
                <p className="text-xs text-secondary mb-1">{t.progress}</p>
                <div className="w-full bg-background rounded-full h-1.5"><div className="bg-accent h-1.5 rounded-full" style={{ width: `${progress}%` }}></div></div>
            </div>
        </div>
        <div className="p-2 border-t border-border text-center opacity-0 group-hover:opacity-100 transition-opacity">
           <button onClick={(e) => { e.stopPropagation(); onDelete(list.id, list.name); }} className="text-danger/70 text-xs hover:underline font-medium hover:text-danger">{t.delete}</button>
        </div>
      </div>
    );
};


const SmartSuggestionCard: React.FC<{suggestion: SmartSuggestion, onAdd: (suggestion: SmartSuggestion) => void, isAdded: boolean}> = ({ suggestion, onAdd, isAdded }) => {
    const priorityColor: Record<SmartSuggestion['priority'], string> = {
        high: 'border-danger/50 bg-danger/5',
        medium: 'border-yellow-500/50 bg-yellow-500/5',
        low: 'border-transparent bg-background',
    }
    return (
        <div className={`p-3 rounded-lg border ${priorityColor[suggestion.priority]} flex flex-col`}>
            <div className="flex-grow">
                <p className="font-bold text-primary text-sm truncate">{suggestion.name}</p>
                <p className="text-xs text-secondary">{suggestion.category}</p>
                <div className="text-xs text-secondary mt-2 pt-2 border-t border-border">
                    <p className="leading-relaxed">{suggestion.reason}</p>
                </div>
            </div>
            <button
                onClick={() => onAdd(suggestion)}
                disabled={isAdded}
                className="mt-2 w-full flex items-center justify-center gap-2 px-2 py-1 bg-accent/10 text-accent text-xs font-medium rounded-md hover:bg-accent/20 transition-colors disabled:bg-success/20 disabled:text-success disabled:cursor-not-allowed"
            >
                {isAdded ? <CheckIcon /> : <PlusIcon />}
                <span>{isAdded ? t.completed : 'افزودن'}</span>
            </button>
        </div>
    );
};

const ExpenseForecastCard: React.FC<{forecast: { daily: number; monthly: number } | null}> = ({ forecast }) => {
    return (
        <div className="h-full bg-background p-4 rounded-lg border border-border flex flex-col justify-center">
            <h4 className="font-bold text-primary mb-3">{t.expenseForecast}</h4>
            {forecast ? (
                <div className="space-y-4">
                    <div>
                        <p className="text-sm text-secondary">{t.avgDailyExpense}</p>
                        <CurrencyDisplay value={forecast.daily} className="font-bold text-lg text-accent"/>
                    </div>
                     <div>
                        <p className="text-sm text-secondary">{t.estimatedMonthlyExpense}</p>
                        <CurrencyDisplay value={forecast.monthly} className="font-bold text-lg text-accent"/>
                    </div>
                </div>
            ) : (
                <p className="text-sm text-secondary text-center py-4">{t.notEnoughDataForForecast}</p>
            )}
        </div>
    )
}

const PendingPaymentCard: React.FC<{item: PendingPaymentItem, vendorName?: string, onGoToList: (listId: string) => void}> = ({ item, vendorName, onGoToList }) => {
    return (
        <Card>
            <div className="flex flex-col justify-between h-full">
                <div>
                    <div className="flex justify-between items-start">
                        <p className="font-bold text-primary text-md">{item.name}</p>
                        <CurrencyDisplay value={item.paidPrice || 0} className="font-semibold text-danger" />
                    </div>
                    <p className="text-sm text-secondary">{vendorName || 'نامشخص'}</p>
                    <p className="text-xs text-secondary mt-1">{t.purchasedOn(toJalaliDateString(item.purchaseDate, {format: 'long'}))}</p>
                </div>
                <button
                    onClick={() => onGoToList(item.listId)}
                    className="mt-4 w-full text-center px-3 py-1.5 bg-border text-primary text-sm font-medium rounded-md hover:bg-accent hover:text-accent-text transition-colors"
                >
                    {t.goToShoppingList}
                </button>
            </div>
        </Card>
    );
};


export default Dashboard;