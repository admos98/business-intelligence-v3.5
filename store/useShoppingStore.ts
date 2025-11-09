import { create } from 'zustand';
import { ShoppingList, ShoppingItem, CafeCategory, Vendor, OcrResult, Unit, ItemStatus, PaymentStatus, PaymentMethod, PendingPaymentItem, SmartSuggestion, SummaryData, RecentPurchaseItem, MasterItem, AuthSlice, User, ShoppingState } from '../types';
import { t } from '../translations';
import { parseJalaliDate, toJalaliDateString } from '../lib/jalali';
import { fetchData, saveData } from '../lib/api';

type SummaryPeriod = '7d' | '30d' | 'mtd' | 'ytd' | 'all';

interface FullShoppingState extends AuthSlice, ShoppingState {
  lists: ShoppingList[];
  customCategories: string[];
  vendors: Vendor[];
  categoryVendorMap: Record<string, string>; // categoryName -> vendorId
  itemInfoMap: Record<string, { unit: Unit, category: string }>;

  hydrateFromCloud: () => Promise<void>;

  // List Actions
  createList: (date: Date) => string;
  updateList: (listId: string, updatedList: ShoppingList) => void;
  deleteList: (listId: string) => void;
  updateItem: (listId: string, itemId: string, updates: Partial<ShoppingItem>) => void;
  addItemFromSuggestion: (suggestion: SmartSuggestion) => boolean;

  addCustomData: (item: ShoppingItem) => void;

  // OCR Action
  addOcrPurchase: (ocrResult: OcrResult, paymentMethod: PaymentMethod, paymentStatus: PaymentStatus, vendorName?: string) => string;

  // Vendor Actions
  addVendor: (vendorData: Omit<Vendor, 'id'>) => string;
  updateVendor: (vendorId: string, updates: Partial<Vendor>) => void;
  deleteVendor: (vendorId: string) => void;
  findOrCreateVendor: (vendorName?: string) => string | undefined;
  updateCategoryVendorMap: (category: string, vendorId: string) => void;

  // Item Actions
  updateMasterItem: (originalName: string, originalUnit: Unit, updates: { name: string; unit: Unit; category: string }) => void;


  // Computed
  allCategories: () => string[];
  getKnownItemNames: () => string[];
  getAllKnownItems: () => MasterItem[];
  getItemInfo: (name: string) => { unit: Unit, category: string } | undefined;
  getLatestPricePerUnit: (name: string, unit: Unit) => number | undefined;
  getLatestPurchaseInfo: (name: string, unit: Unit) => { pricePerUnit?: number, vendorId?: string, lastAmount?: number };
  getSmartSuggestions: () => SmartSuggestion[];
  getPendingPayments: () => PendingPaymentItem[];
  getRecentPurchases: (count: number) => RecentPurchaseItem[];
  getExpenseForecast: () => { daily: number, monthly: number } | null;
  getSummaryData: (period: SummaryPeriod) => SummaryData | null;


  // Import/Export
  importData: (jsonData: string) => Promise<void>;
  exportData: () => string;
}

const DEFAULT_CATEGORIES: string[] = Object.values(CafeCategory);

const emptyState = {
  lists: [],
  customCategories: [],
  vendors: [],
  categoryVendorMap: {},
  itemInfoMap: {},
};

// --- Debounced save function ---
let debounceTimer: number;
const debouncedSaveData = (state: FullShoppingState) => {
    clearTimeout(debounceTimer);
    debounceTimer = window.setTimeout(() => {
        const { currentUser, isHydrating } = state;
        // Do not save if no user is logged in, or during initial hydration.
        if (!currentUser || isHydrating) {
            return;
        }

        const dataToSave = {
            lists: state.lists,
            customCategories: state.customCategories,
            vendors: state.vendors,
            categoryVendorMap: state.categoryVendorMap,
            itemInfoMap: state.itemInfoMap,
        };
        saveData(dataToSave).catch(err => console.error("Auto-save failed:", err));
    }, 1500); // Debounce for 1.5 seconds
};


export const useShoppingStore = create<FullShoppingState>((set, get) => ({
      isHydrating: true,
      ...emptyState,

      // Auth Slice
      currentUser: null,
      login: async (username, password) => {
        // In a real app, this would fetch a backend endpoint.
        // We simulate this for demonstration.
        // const response = await fetch('/api/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) });
        // if (response.ok) {
        //   const user = await response.json();
        //   set({ currentUser: user });
        //   return true;
        // }
        // return false;

        if (username.toLowerCase() === 'mehrnoosh' && password === 'cafe') {
            set({ currentUser: { id: 'user-1', username: 'mehrnoosh' } });
            return true;
        }
        return false;
      },
      logout: () => {
        // In a real app, you might want to notify the backend.
        // await fetch('/api/auth/logout', { method: 'POST' });
        set({ currentUser: null, ...emptyState, isHydrating: false });
      },

      hydrateFromCloud: async () => {
          set({ isHydrating: true });
          try {
              const data = await fetchData();
              if (data && data.lists) { // Basic check for valid data structure
                  set({ ...data, isHydrating: false });
              } else {
                  // Bin is empty or has invalid data, use a true empty state.
                  set({ ...emptyState, isHydrating: false });
              }
          } catch (error) {
              console.error("Failed to hydrate from cloud:", error);
              set({ ...emptyState, isHydrating: false }); // Fallback to empty state on error
          }
      },

      createList: (date) => {
        const listId = toJalaliDateString(date.toISOString());

        const existingList = get().lists.find(l => l.id === listId);
        if (existingList) {
          return existingList.id;
        }

        const name = t.todaysShoppingList(toJalaliDateString(date.toISOString(), { format: 'long' }));
        const newList: ShoppingList = {
          id: listId,
          name,
          createdAt: date.toISOString(),
          items: [],
        };
        set((state) => ({ lists: [...state.lists, newList] }));
        debouncedSaveData(get());
        return newList.id;
      },

      updateList: (listId, updatedList) => {
        set((state) => ({
          lists: state.lists.map((list) => (list.id === listId ? updatedList : list)),
        }));
        debouncedSaveData(get());
      },

      deleteList: (listId) => {
        set((state) => ({ lists: state.lists.filter((list) => list.id !== listId) }));
        debouncedSaveData(get());
      },

      updateItem: (listId, itemId, updates) => {
        set(state => ({
            lists: state.lists.map(list => {
                if (list.id === listId) {
                    return {
                        ...list,
                        items: list.items.map(item => item.id === itemId ? { ...item, ...updates } : item)
                    };
                }
                return list;
            })
        }));
        debouncedSaveData(get());
      },

      addItemFromSuggestion: ({ name, unit, category }) => {
        const today = new Date();
        today.setHours(0,0,0,0);
        const listId = get().createList(today);
        const list = get().lists.find(l => l.id === listId)!;

        const alreadyExists = list.items.some(item => item.name === name && item.unit === unit && item.status === ItemStatus.Pending);
        if (alreadyExists) {
            return false;
        }

        const latestInfo = get().getLatestPurchaseInfo(name, unit);

        const newItem: ShoppingItem = {
            id: `item-${Date.now()}`,
            name,
            amount: latestInfo.lastAmount || 1,
            unit,
            category,
            status: ItemStatus.Pending,
            estimatedPrice: latestInfo.pricePerUnit ? latestInfo.pricePerUnit * (latestInfo.lastAmount || 1) : undefined
        };

        get().updateList(listId, { ...list, items: [...list.items, newItem] });
        return true;
      },

      addOcrPurchase: (ocrResult, paymentMethod, paymentStatus, vendorName) => {
        const { date, items: ocrItems } = ocrResult;
        const vendorId = get().findOrCreateVendor(vendorName);

        const parsedDate = parseJalaliDate(date);
        if (!parsedDate) {
            console.error("Invalid OCR date, cannot create list:", date);
            return 'Invalid Date';
        }

        const targetListId = get().createList(parsedDate);
        const targetList = get().lists.find(l => l.id === targetListId)!;

        const newShoppingItems: ShoppingItem[] = ocrItems.map((item, index) => ({
            id: `item-${Date.now()}-${index}`,
            name: item.name,
            amount: item.quantity,
            unit: item.unit || Unit.Piece,
            status: ItemStatus.Bought,
            category: item.suggestedCategory || t.other,
            paidPrice: item.price,
            purchasedAmount: item.quantity,
            paymentStatus: paymentStatus,
            paymentMethod: paymentMethod,
            vendorId: vendorId,
        }));

        newShoppingItems.forEach(item => {
            get().addCustomData(item);
            if(item.category && vendorId) {
                get().updateCategoryVendorMap(item.category, vendorId);
            }
        });

        const updatedList = { ...targetList, items: [...targetList.items, ...newShoppingItems] };
        get().updateList(targetListId, updatedList);

        return targetList.name;
      },

      addVendor: (vendorData) => {
        const newVendor: Vendor = {
            id: `vendor-${Date.now()}`,
            ...vendorData
        };
        set(state => ({ vendors: [...state.vendors, newVendor] }));
        debouncedSaveData(get());
        return newVendor.id;
      },

      updateVendor: (vendorId, updates) => {
        set(state => ({
            vendors: state.vendors.map(v => v.id === vendorId ? { ...v, ...updates } : v)
        }));
        debouncedSaveData(get());
      },

      deleteVendor: (vendorId) => {
        set(state => ({
            vendors: state.vendors.filter(v => v.id !== vendorId),
            lists: state.lists.map(list => ({
                ...list,
                items: list.items.map(item => item.vendorId === vendorId ? { ...item, vendorId: undefined } : item)
            }))
        }));
        debouncedSaveData(get());
      },

      findOrCreateVendor: (vendorName) => {
        if (!vendorName || !vendorName.trim()) return undefined;
        const trimmedName = vendorName.trim();
        const existingVendor = get().vendors.find(v => v.name.toLowerCase() === trimmedName.toLowerCase());
        if (existingVendor) {
            return existingVendor.id;
        }
        return get().addVendor({ name: trimmedName });
      },

      updateCategoryVendorMap: (category, vendorId) => {
        set(state => ({
            categoryVendorMap: {
                ...state.categoryVendorMap,
                [category]: vendorId
            }
        }));
        debouncedSaveData(get());
      },

      updateMasterItem: (originalName, originalUnit, updates) => {
          set(state => {
              const newLists = state.lists.map(list => ({
                  ...list,
                  items: list.items.map(item => {
                      if (item.name === originalName && item.unit === originalUnit) {
                          return { ...item, ...updates };
                      }
                      return item;
                  })
              }));

              const newItemInfoMap = { ...state.itemInfoMap };
              if (originalName !== updates.name && newItemInfoMap[originalName]) {
                  delete newItemInfoMap[originalName];
              }
              newItemInfoMap[updates.name] = { unit: updates.unit, category: updates.category };

              return { lists: newLists, itemInfoMap: newItemInfoMap };
          });
          debouncedSaveData(get());
      },

      addCustomData: (item) => {
        const { category, name, unit } = item;
        const allCats = get().allCategories();

        let stateChanged = false;
        const stateUpdates: Partial<FullShoppingState> = {};

        if (category && !allCats.includes(category)) {
          stateUpdates.customCategories = [...get().customCategories, category];
          stateChanged = true;
        }

        if (name && unit && category) {
            stateUpdates.itemInfoMap = { ...get().itemInfoMap, [name.trim()]: { unit, category } };
            stateChanged = true;
        }

        if(stateChanged) {
            set(stateUpdates);
            debouncedSaveData(get());
        }
      },

      allCategories: () => {
         const { customCategories } = get();
         const combined = [...DEFAULT_CATEGORIES, ...customCategories];
         return [...new Set(combined)];
      },

      getKnownItemNames: () => {
        const itemNames = new Set<string>();
        get().lists.forEach(list => {
            list.items.forEach(item => itemNames.add(item.name));
        });
        Object.keys(get().itemInfoMap).forEach(name => itemNames.add(name));
        return Array.from(itemNames).sort((a,b) => a.localeCompare(b, 'fa'));
      },

      getAllKnownItems: () => {
        const allPurchasedItems = get().lists
            .flatMap(list => list.items.map(item => ({ ...item, purchaseDate: new Date(list.createdAt) })))
            .filter(item => item.status === ItemStatus.Bought && item.purchasedAmount != null && item.paidPrice != null);

        const itemStats = new Map<string, MasterItem & { latestPurchaseDate: Date }>();

        allPurchasedItems.forEach(item => {
            const key = `${item.name}-${item.unit}`;
            let currentStats = itemStats.get(key);

            if (!currentStats) {
                currentStats = {
                    name: item.name,
                    unit: item.unit,
                    category: item.category,
                    lastPricePerUnit: 0,
                    totalQuantity: 0,
                    totalSpend: 0,
                    purchaseCount: 0,
                    latestPurchaseDate: new Date(0)
                };
            }

            currentStats.totalQuantity += item.purchasedAmount || 0;
            currentStats.totalSpend += item.paidPrice || 0;
            currentStats.purchaseCount++;

            if (item.purchaseDate >= currentStats.latestPurchaseDate) {
                currentStats.latestPurchaseDate = item.purchaseDate;
                currentStats.lastPricePerUnit = (item.paidPrice || 0) / (item.purchasedAmount || 1);
                currentStats.category = item.category;
            }

            itemStats.set(key, currentStats);
        });

        const result: MasterItem[] = [];
        itemStats.forEach((value) => {
            const { latestPurchaseDate, ...masterItem } = value;
            result.push(masterItem);
        });

        return result.sort((a,b) => a.name.localeCompare(b.name, 'fa'));
      },
      getItemInfo: (name: string) => {
        return get().itemInfoMap[name];
      },
      getLatestPricePerUnit: (name, unit) => {
        return get().getLatestPurchaseInfo(name, unit).pricePerUnit;
      },
      getLatestPurchaseInfo: (name, unit) => {
          const allPurchasesOfItem = get().lists
              .flatMap(list => list.items.map(item => ({ ...item, purchaseDate: new Date(list.createdAt) })))
              .filter(item => item.name === name && item.unit === unit && item.status === ItemStatus.Bought && item.paidPrice && item.purchasedAmount)
              .sort((a, b) => b.purchaseDate.getTime() - a.purchaseDate.getTime());

          if (allPurchasesOfItem.length > 0) {
              const latest = allPurchasesOfItem[0];
              return {
                  pricePerUnit: latest.paidPrice! / latest.purchasedAmount!,
                  vendorId: latest.vendorId,
                  lastAmount: latest.purchasedAmount
              };
          }
          return {};
      },
      getSmartSuggestions: () => {
        const allPurchases = get().lists
            .flatMap(list => list.items.map(item => ({...item, purchaseDate: new Date(list.createdAt)})))
            .filter(item => item.status === ItemStatus.Bought && item.purchasedAmount)
            .sort((a, b) => a.purchaseDate.getTime() - b.purchaseDate.getTime());

        const itemHistory = new Map<string, { dates: Date[], name: string, unit: Unit, category: string }>();

        allPurchases.forEach(item => {
            const key = `${item.name}-${item.unit}`;
            if (!itemHistory.has(key)) {
                itemHistory.set(key, { dates: [], name: item.name, unit: item.unit, category: item.category });
            }
            itemHistory.get(key)!.dates.push(item.purchaseDate);
        });

        const suggestions: SmartSuggestion[] = [];
        const today = new Date();
        today.setHours(0,0,0,0);
        const oneDay = 24 * 60 * 60 * 1000;

        itemHistory.forEach((history, key) => {
            if (history.dates.length < 2) return;

            const diffs = [];
            for (let i = 1; i < history.dates.length; i++) {
                diffs.push(Math.round(Math.abs((history.dates[i].getTime() - history.dates[i-1].getTime()) / oneDay)));
            }

            const avgCycle = Math.round(diffs.reduce((a, b) => a + b, 0) / diffs.length);
            if(avgCycle === 0) return;

            const lastPurchaseDate = history.dates[history.dates.length - 1];
            const daysSinceLastPurchase = Math.round(Math.abs((today.getTime() - lastPurchaseDate.getTime()) / oneDay));

            if (daysSinceLastPurchase >= avgCycle) {
                const daysOverdue = daysSinceLastPurchase - avgCycle;
                suggestions.push({
                    name: history.name,
                    unit: history.unit,
                    category: history.category,
                    lastPurchaseDate: lastPurchaseDate.toISOString(),
                    avgPurchaseCycleDays: avgCycle,
                    reason: t.suggestionReasonDepleted(avgCycle, daysOverdue),
                    priority: daysOverdue > 3 ? 'high' : 'medium'
                });
            } else if (daysSinceLastPurchase >= avgCycle * 0.75) {
                suggestions.push({
                    name: history.name,
                    unit: history.unit,
                    category: history.category,
                    lastPurchaseDate: lastPurchaseDate.toISOString(),
                    avgPurchaseCycleDays: avgCycle,
                    reason: t.suggestionReasonGettingLow(avgCycle),
                    priority: 'low'
                });
            }
        });

        return suggestions.sort((a,b) => b.priority.localeCompare(a.priority));
      },
      getPendingPayments: () => {
          const pending: PendingPaymentItem[] = [];
          get().lists.forEach(list => {
              list.items.forEach(item => {
                  if (item.status === ItemStatus.Bought && item.paymentStatus === PaymentStatus.Due) {
                      pending.push({
                          ...item,
                          listId: list.id,
                          listName: list.name,
                          purchaseDate: list.createdAt,
                      });
                  }
              });
          });
          return pending.sort((a, b) => new Date(a.purchaseDate).getTime() - new Date(b.purchaseDate).getTime());
      },
      getRecentPurchases: (count) => {
          const recent: RecentPurchaseItem[] = [];
          get().lists.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
              .forEach(list => {
                  list.items.filter(item => item.status === ItemStatus.Bought)
                      .forEach(item => {
                          if (recent.length < count) {
                              recent.push({
                                  ...item,
                                  listId: list.id,
                                  purchaseDate: list.createdAt
                              });
                          }
                      });
              });
          return recent;
      },
      getExpenseForecast: () => {
        const allPurchases = get().lists
            .flatMap(l => l.items.map(i => ({...i, date: l.createdAt})))
            .filter(i => i.status === ItemStatus.Bought && i.paidPrice);

        if (allPurchases.length < 5) return null;

        const sorted = allPurchases.sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        const firstDay = new Date(sorted[0].date);
        const lastDay = new Date(sorted[sorted.length - 1].date);
        const oneDay = 24 * 60 * 60 * 1000;
        const totalDays = Math.round(Math.abs((lastDay.getTime() - firstDay.getTime()) / oneDay)) + 1;

        if (totalDays < 30) return null;

        const totalSpend = sorted.reduce((sum, item) => sum + item.paidPrice!, 0);
        const daily = totalSpend / totalDays;

        return {
            daily,
            monthly: daily * 30,
        };
      },
      getSummaryData: (period) => {
        const now = new Date();
        let startDate = new Date();
        const endDate = new Date(now);
        endDate.setHours(23, 59, 59, 999);

        switch (period) {
            case '7d': startDate.setDate(now.getDate() - 6); break;
            case '30d': startDate.setDate(now.getDate() - 29); break;
            case 'mtd': startDate = new Date(now.getFullYear(), now.getMonth(), 1); break;
            case 'ytd': startDate = new Date(now.getFullYear(), 0, 1); break;
            case 'all': startDate = new Date(0); break;
        }
        startDate.setHours(0, 0, 0, 0);

        const allPurchases = get().lists
            .flatMap(list => {
                const listDate = new Date(list.createdAt);
                return listDate >= startDate && listDate <= endDate
                    ? list.items.map(item => ({ ...item, purchaseDate: listDate }))
                    : [];
            })
            // FIX: Corrected filter to handle paidPrice being 0. `!= null` also acts as a type guard for TypeScript.
            .filter(item => item.status === ItemStatus.Bought && item.paidPrice != null);

        if (allPurchases.length === 0) return null;

        // FIX: Removed `!` non-null assertions as they are no longer needed after the filter fix, resolving multiple type errors.
        const kpis = {
            totalSpend: allPurchases.reduce((sum, item) => sum + item.paidPrice, 0),
            totalItems: new Set(allPurchases.map(item => item.name)).size,
            avgDailySpend: 0,
            topCategory: null as { name: string, amount: number } | null,
            topVendor: null as { name: string, amount: number } | null,
        };

        const totalDays = Math.max(1, (endDate.getTime() - startDate.getTime()) / (1000 * 3600 * 24));
        kpis.avgDailySpend = kpis.totalSpend / totalDays;

        const categorySpend = allPurchases.reduce((acc, item) => {
            acc[item.category] = (acc[item.category] || 0) + item.paidPrice;
            return acc;
        }, {} as Record<string, number>);

        const topCat = Object.entries(categorySpend).sort((a,b) => b[1] - a[1])[0];
        if (topCat) kpis.topCategory = { name: topCat[0], amount: topCat[1] };

        const vendorMap = new Map(get().vendors.map(v => [v.id, v.name]));
        const vendorSpend = allPurchases.reduce((acc, item) => {
            if (item.vendorId) {
                const vendorName = vendorMap.get(item.vendorId) || "Unknown";
                acc[vendorName] = (acc[vendorName] || 0) + item.paidPrice;
            }
            return acc;
        }, {} as Record<string, number>);

        const topVen = Object.entries(vendorSpend).sort((a,b) => b[1] - a[1])[0];
        if (topVen) kpis.topVendor = { name: topVen[0], amount: topVen[1] };

        // Chart Data
        const spendingOverTime: { labels: string[]; data: number[] } = { labels: [], data: [] };
        const timeMap = new Map<string, number>();
        for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
             const key = toJalaliDateString(d.toISOString());
             timeMap.set(key, 0);
        }
        allPurchases.forEach(item => {
            const key = toJalaliDateString(item.purchaseDate.toISOString());
            timeMap.set(key, (timeMap.get(key) || 0) + item.paidPrice);
        });
        spendingOverTime.labels = Array.from(timeMap.keys());
        spendingOverTime.data = Array.from(timeMap.values());

        const spendingByCategory: { labels: string[]; data: number[] } = { labels: [], data: [] };
        const sortedCategories = Object.entries(categorySpend).sort((a,b) => b[1] - a[1]);
        spendingByCategory.labels = sortedCategories.map(c => c[0]);
        spendingByCategory.data = sortedCategories.map(c => c[1]);

        return {
            kpis,
            charts: { spendingOverTime, spendingByCategory },
            period: { startDate, endDate }
        };
      },


      importData: async (jsonData) => {
        try {
            const data = JSON.parse(jsonData);
            // Basic validation
            if (Array.isArray(data.lists)) {
                // Cleanse receiptImage from imported data
                const cleanedLists = data.lists.map((list: any) => ({
                    ...list,
                    items: list.items.map((item: any) => {
                        const { receiptImage, ...rest } = item;
                        return rest;
                    }),
                }));

                const dataToSave = {
                    lists: cleanedLists,
                    customCategories: data.customCategories || [],
                    vendors: data.vendors || [],
                    categoryVendorMap: data.categoryVendorMap || {},
                    itemInfoMap: data.itemInfoMap || {},
                }

                set(dataToSave);
                // After importing, immediately save to the cloud
                await saveData(dataToSave);
            } else {
                throw new Error("Invalid data format");
            }
        } catch (error) {
            console.error("Import failed:", error);
            throw error;
        }
      },

      exportData: () => {
        const data = {
            lists: get().lists,
            customCategories: get().customCategories,
            vendors: get().vendors,
            categoryVendorMap: get().categoryVendorMap,
            itemInfoMap: get().itemInfoMap,
        };
        return JSON.stringify(data, null, 2);
      },
}));
