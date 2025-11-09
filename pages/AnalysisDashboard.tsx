import React, { useState, useMemo, useEffect, useRef } from 'react';
import { ItemStatus, ShoppingItem } from '../types';
import Header from '../components/common/Header';
import Card from '../components/common/Card';
import SkeletonLoader from '../components/common/SkeletonLoader';
import { t } from '../translations';
import { useShoppingStore } from '../store/useShoppingStore';
import { getAnalysisInsights } from '../lib/gemini';
import CurrencyDisplay from '../components/common/CurrencyDisplay';
import { parseJalaliDate, toJalaliDateString } from '../lib/jalali';
import JalaliCalendar from '../components/common/JalaliCalendar';
import { useToast } from '../components/common/Toast';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);


// Helper Types
type Metric = 'totalSpend' | 'totalQuantity' | 'uniquePurchases' | 'avgPricePerUnit';
type GroupBy = 'vendor' | 'category' | 'date' | 'item';

interface AnalysisConfig {
  startDate: string;
  endDate: string;
  metrics: Metric[];
  groupBy: GroupBy | 'none';
  filters: {
    categories: string[];
    vendors: string[];
    items: string[];
  }
}

interface ProcessedData {
    kpis: Record<string, number>;
    chartData: { labels: string[], datasets: any[] };
    tableData: Record<string, any>[];
}

const METRIC_LABELS: Record<Metric, string> = {
  totalSpend: t.totalSpend,
  totalQuantity: t.totalQuantity,
  uniquePurchases: t.uniquePurchases,
  avgPricePerUnit: t.avgPricePerUnit,
};

const GROUP_BY_LABELS: Record<GroupBy | 'none', string> = {
  none: t.noGrouping,
  item: t.itemName,
  category: t.category,
  vendor: t.vendor,
  date: t.date,
};

interface DataExplorerProps {
    onBack: () => void;
    onLogout: () => void;
}

const DataExplorer: React.FC<DataExplorerProps> = ({ onBack, onLogout }) => {
  const { lists, vendors, allCategories } = useShoppingStore();
  const { addToast } = useToast();
  const vendorMap = useMemo(() => new Map(vendors.map(v => [v.id, v.name])), [vendors]);
  const allKnownCategories = useMemo(() => allCategories(), [allCategories]);
  const allKnownItems = useMemo(() => {
    const itemSet = new Set<string>();
    lists.forEach(l => l.items.forEach(i => itemSet.add(i.name)));
    return Array.from(itemSet).sort((a,b) => a.localeCompare(b, 'fa'));
  }, [lists]);


  const initialDateRange = useMemo(() => {
    const today = new Date();
    const sortedLists = [...lists].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    const earliestDate = sortedLists.length > 0 ? new Date(sortedLists[0].createdAt) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    return {
      start: toJalaliDateString(earliestDate.toISOString()),
      end: toJalaliDateString(today.toISOString()),
    };
  }, [lists]);

  const [config, setConfig] = useState<AnalysisConfig>({
    startDate: initialDateRange.start,
    endDate: initialDateRange.end,
    metrics: ['totalSpend'],
    groupBy: 'category',
    filters: { categories: [], vendors: [], items: [] }
  });

  const [processedData, setProcessedData] = useState<ProcessedData | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [aiInsight, setAiInsight] = useState('');
  const [aiQuery, setAiQuery] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);

  const chartRef = useRef<HTMLCanvasElement | null>(null);
  const chartInstance = useRef<Chart | null>(null);

  const handleConfigChange = <K extends keyof AnalysisConfig>(key: K, value: AnalysisConfig[K]) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  const handleFilterChange = <K extends keyof AnalysisConfig['filters']>(key: K, value: AnalysisConfig['filters'][K]) => {
     setConfig(prev => ({ ...prev, filters: { ...prev.filters, [key]: value } }));
  };

  const handleRunAnalysis = () => {
    setIsProcessing(true);
    setProcessedData(null);
    setAiInsight('');

    setTimeout(() => { // Simulate processing time & allow UI to update
        const start = parseJalaliDate(config.startDate);
        const end = parseJalaliDate(config.endDate);
        if (!start || !end) {
            setIsProcessing(false);
            return;
        }
        end.setHours(23, 59, 59, 999);

        // 1. Filter items based on date and filters
        let filteredItems = lists
            .filter(l => {
                const listDate = new Date(l.createdAt);
                return listDate >= start && listDate <= end;
            })
            .flatMap(l => l.items.map(i => ({...i, purchaseDate: toJalaliDateString(l.createdAt)})))
            .filter(i => i.status === ItemStatus.Bought);

        if (config.filters.categories.length > 0) {
            filteredItems = filteredItems.filter(i => config.filters.categories.includes(i.category));
        }
        if (config.filters.vendors.length > 0) {
            filteredItems = filteredItems.filter(i => i.vendorId && config.filters.vendors.includes(i.vendorId));
        }
         if (config.filters.items.length > 0) {
            filteredItems = filteredItems.filter(i => config.filters.items.includes(i.name));
        }

        // 2. Calculate KPIs
        const totalSpend = filteredItems.reduce((sum, item) => sum + (item.paidPrice || 0), 0);
        const uniqueItems = new Set(filteredItems.map(i => i.name)).size;
        const uniqueVendors = new Set(filteredItems.map(i => i.vendorId).filter(Boolean)).size;

        const kpis = { totalSpend, uniqueItems, uniqueVendors };

        // 3. Group and aggregate data
        const groupedMap = new Map<string, any[]>();
        if (config.groupBy !== 'none') {
            filteredItems.forEach(item => {
                let key: string;
                 switch (config.groupBy) {
                    case 'category': key = item.category || t.other; break;
                    case 'vendor': key = vendorMap.get(item.vendorId || '') || 'نامشخص'; break;
                    case 'item': key = item.name; break;
                    case 'date': key = item.purchaseDate; break;
                    default: key = 'All';
                }
                if (!groupedMap.has(key)) groupedMap.set(key, []);
                groupedMap.get(key)!.push(item);
            });
        } else {
            groupedMap.set('All Data', filteredItems);
        }

        const tableData: Record<string, any>[] = [];
        const labels = Array.from(groupedMap.keys()).sort((a,b) => a.localeCompare(b, 'fa'));

        labels.forEach(key => {
            const groupItems = groupedMap.get(key)!;
            const row: Record<string, any> = { [config.groupBy]: key };

            if(config.metrics.includes('totalSpend')) {
                row.totalSpend = groupItems.reduce((sum, i) => sum + (i.paidPrice || 0), 0);
            }
            if(config.metrics.includes('totalQuantity')) {
                row.totalQuantity = groupItems.reduce((sum, i) => sum + (i.purchasedAmount || i.amount || 0), 0);
            }
            if(config.metrics.includes('uniquePurchases')) {
                row.uniquePurchases = groupItems.length;
            }
            if(config.metrics.includes('avgPricePerUnit')) {
                 const totalVal = groupItems.reduce((sum, i) => sum + (i.paidPrice || 0), 0);
                 const totalQty = groupItems.reduce((sum, i) => sum + (i.purchasedAmount || i.amount || 1), 0);
                 row.avgPricePerUnit = totalQty > 0 ? totalVal / totalQty : 0;
            }
            tableData.push(row);
        });

        // 4. Prepare Chart Data
        const datasets: any[] = [];
        const styles = getComputedStyle(document.documentElement);
        const chartColors = [
            styles.getPropertyValue('--color-chart-1').trim(),
            styles.getPropertyValue('--color-chart-2').trim(),
            styles.getPropertyValue('--color-chart-3').trim(),
            styles.getPropertyValue('--color-chart-4').trim(),
            styles.getPropertyValue('--color-chart-5').trim(),
        ];

        config.metrics.forEach((metric, index) => {
            datasets.push({
                label: METRIC_LABELS[metric],
                data: tableData.map(d => d[metric]),
                backgroundColor: chartColors[index % chartColors.length],
                borderColor: chartColors[index % chartColors.length],
                tension: 0.1,
            });
        });

        setProcessedData({ kpis, chartData: { labels, datasets }, tableData });
        setIsProcessing(false);
    }, 100);
  };

  const handleAskAI = async () => {
      if (!aiQuery.trim() || !processedData) return;
      setIsAiLoading(true);
      setAiInsight('');

      try {
        const context = `
        Analysis Configuration:
        - Date Range: ${config.startDate} to ${config.endDate}
        - Grouped By: ${GROUP_BY_LABELS[config.groupBy]}
        - Metrics: ${config.metrics.map(m => METRIC_LABELS[m]).join(', ')}
        - Filters: ${JSON.stringify(config.filters)}
        `;
        const insight = await getAnalysisInsights(aiQuery, context, processedData.tableData);
        setAiInsight(insight);
      } catch (e) {
        setAiInsight(t.aiError);
      } finally {
        setIsAiLoading(false);
      }
  };

  const handleExportJson = () => {
    if (!processedData) return;

    const dataString = JSON.stringify(processedData.tableData, null, 2);
    const blob = new Blob([dataString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analysis_results_${config.startDate.replace(/\//g, '-')}_to_${config.endDate.replace(/\//g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
    addToast(t.exportJsonSuccess, 'success');
  };

  useEffect(() => {
    if (chartInstance.current) {
        chartInstance.current.destroy();
    }
    if (chartRef.current && processedData && processedData.chartData.labels.length > 0) {
        const isTimeSeries = config.groupBy === 'date';
        const isCategorical = ['category', 'vendor', 'item'].includes(config.groupBy);
        const isSingleMetricProportion = isCategorical && config.metrics.length === 1 && config.metrics[0] === 'totalSpend';

        let chartType: 'line' | 'bar' | 'pie' = 'bar';
        if (isTimeSeries) chartType = 'line';
        if (isSingleMetricProportion) chartType = 'pie';

        const ctx = chartRef.current.getContext('2d');
        if (ctx) {
            chartInstance.current = new Chart(ctx, {
                type: chartType,
                data: processedData.chartData,
                options: {
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { legend: { position: 'top' } },
                }
            });
        }
    }
     return () => {
        if(chartInstance.current) chartInstance.current.destroy();
    };
  }, [processedData]);

  return (
    <div className="flex flex-col h-screen">
      <Header title={t.dataExplorer} onBack={onBack} backText={t.backToDashboard} onLogout={onLogout}>
        <button
          onClick={handleExportJson}
          disabled={!processedData}
          className="px-3 py-1.5 text-sm bg-surface text-primary font-medium rounded-lg hover:bg-border transition-colors border border-border shadow-subtle disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {t.exportJson}
        </button>
      </Header>
      <div className="flex-grow grid grid-cols-1 lg:grid-cols-12 gap-6 p-6 overflow-hidden">

        {/* Controls Sidebar */}
        <aside className="lg:col-span-3 bg-surface p-4 rounded-xl border border-border overflow-y-auto">
          <h2 className="text-lg font-bold mb-4">{t.exploreData}</h2>
          <div className="space-y-4">
              {/* Date Range */}
              <div>
                <h3 className="font-semibold text-primary mb-2">{t.analysisPeriod}</h3>
                <div className="grid grid-cols-2 gap-2">
                    <input type="text" value={config.startDate} onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleConfigChange('startDate', e.target.value)} placeholder={t.startDate} className="w-full text-sm px-2 py-1.5 bg-background border border-border rounded-lg" />
                    <input type="text" value={config.endDate} onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleConfigChange('endDate', e.target.value)} placeholder={t.endDate} className="w-full text-sm px-2 py-1.5 bg-background border border-border rounded-lg" />
                </div>
              </div>

              {/* Metrics */}
              <div>
                <h3 className="font-semibold text-primary mb-2">{t.selectMetrics}</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {(Object.keys(METRIC_LABELS) as Metric[]).map(metric => (
                    <label key={metric} className="flex items-center gap-2 p-2 bg-background rounded-md">
                      <input type="checkbox" checked={config.metrics.includes(metric)} onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        const newMetrics = e.target.checked ? [...config.metrics, metric] : config.metrics.filter(m => m !== metric);
                        handleConfigChange('metrics', newMetrics);
                      }} className="form-checkbox h-4 w-4 rounded bg-surface border-border text-accent"/>
                      {METRIC_LABELS[metric]}
                    </label>
                  ))}
                </div>
              </div>

              {/* Group By */}
               <div>
                  <h3 className="font-semibold text-primary mb-2">{t.groupBy}</h3>
                  <select value={config.groupBy} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleConfigChange('groupBy', e.target.value as GroupBy | 'none')} className="w-full px-2 py-1.5 bg-background border border-border rounded-lg text-sm">
                      {(Object.keys(GROUP_BY_LABELS) as (GroupBy | 'none')[]).map(key => (
                          <option key={key} value={key}>{GROUP_BY_LABELS[key]}</option>
                      ))}
                  </select>
               </div>

               {/* Filters */}
               <div>
                <h3 className="font-semibold text-primary mb-2">{t.filters}</h3>
                <div className="space-y-2">
                    <select multiple value={config.filters.categories} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleFilterChange('categories', Array.from(e.target.selectedOptions, option => option.value))} className="w-full p-2 bg-background border border-border rounded-lg text-sm h-24">
                        {allKnownCategories.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                     <select multiple value={config.filters.vendors} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleFilterChange('vendors', Array.from(e.target.selectedOptions, option => option.value))} className="w-full p-2 bg-background border border-border rounded-lg text-sm h-24">
                        {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                    </select>
                     <select multiple value={config.filters.items} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleFilterChange('items', Array.from(e.target.selectedOptions, option => option.value))} className="w-full p-2 bg-background border border-border rounded-lg text-sm h-24">
                        {allKnownItems.map(i => <option key={i} value={i}>{i}</option>)}
                    </select>
                </div>
               </div>

              <button onClick={handleRunAnalysis} disabled={isProcessing || config.metrics.length === 0} className="w-full py-2 bg-accent text-accent-text font-bold rounded-lg hover:opacity-90 disabled:opacity-50">
                {isProcessing ? t.generatingInsights : t.runAnalysis}
              </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="lg:col-span-6 flex flex-col gap-6 overflow-hidden">
           {processedData ? (
             <>
                <Card title={t.kpis} className="flex-shrink-0">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-center">
                        <div><p className="text-sm text-secondary">{t.totalSpend}</p><CurrencyDisplay value={processedData.kpis.totalSpend} className="font-bold text-xl text-accent"/></div>
                        <div><p className="text-sm text-secondary">{t.totalItems}</p><p className="font-bold text-xl text-accent">{processedData.kpis.uniqueItems.toLocaleString('fa-IR')}</p></div>
                        <div><p className="text-sm text-secondary">{t.totalVendors}</p><p className="font-bold text-xl text-accent">{processedData.kpis.uniqueVendors.toLocaleString('fa-IR')}</p></div>
                    </div>
                </Card>
                <Card title={t.analysisResults} className="flex-grow min-h-0 flex flex-col">
                    <div className="flex-grow h-1/3 min-h-[200px] mb-4">
                        <canvas ref={chartRef}></canvas>
                    </div>
                     <div className="overflow-y-auto border-t border-border pt-2 flex-grow h-2/3">
                        <DataTable data={processedData.tableData} groupBy={config.groupBy} metrics={config.metrics} />
                     </div>
                </Card>
             </>
           ) : (
                <div className="flex items-center justify-center h-full bg-surface rounded-xl border-2 border-dashed border-border text-center text-secondary p-8">
                    {isProcessing ? t.generatingInsights : t.dataExplorerDescription}
                </div>
           )}
        </main>

        {/* AI Sidebar */}
        <aside className="lg:col-span-3 bg-surface p-4 rounded-xl border border-border flex flex-col overflow-y-auto">
           <h2 className="text-lg font-bold mb-4 flex-shrink-0">{t.aiBusinessAdvisor}</h2>
           <div className="flex-grow overflow-y-auto mb-4 p-2 bg-background rounded-lg">
                {isAiLoading ? <SkeletonLoader lines={5} /> : (
                    <p className="text-sm text-primary whitespace-pre-wrap leading-relaxed">
                        {aiInsight || t.aiWelcome}
                    </p>
                )}
           </div>
           <div className="flex-shrink-0">
                <textarea value={aiQuery} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setAiQuery(e.target.value)} placeholder={t.aiPromptPlaceholder} rows={3} className="w-full text-sm p-2 bg-background border border-border rounded-lg mb-2"></textarea>
                <button onClick={handleAskAI} disabled={isAiLoading || !processedData || !aiQuery.trim()} className="w-full py-2 bg-primary text-background font-bold rounded-lg hover:opacity-90 disabled:opacity-50">{t.ask}</button>
           </div>
        </aside>

      </div>
    </div>
  );
};

const DataTable: React.FC<{data: Record<string, any>[], groupBy: GroupBy | 'none', metrics: Metric[]}> = ({data, groupBy, metrics}) => {
    if (data.length === 0) {
        return <p className="text-center text-secondary py-4">{t.noDataForPeriod}</p>
    }
    const headers = [GROUP_BY_LABELS[groupBy], ...metrics.map(m => METRIC_LABELS[m])];
    const keys = [groupBy, ...metrics];

    const formatValue = (key: string, value: any) => {
        if (typeof value !== 'number') return value;
        if (key === 'totalQuantity' || key === 'uniquePurchases') return value.toLocaleString('fa-IR');
        return <CurrencyDisplay value={value} className="text-sm" />
    };

    return (
        <table className="w-full text-sm text-right">
            <thead className="sticky top-0 bg-surface">
                <tr>
                    {headers.map(h => <th key={h} className="font-bold p-2 border-b border-border">{h}</th>)}
                </tr>
            </thead>
            <tbody>
                {data.map((row, rowIndex) => (
                    <tr key={rowIndex} className="hover:bg-background">
                        {keys.map(key => (
                            <td key={key} className="p-2 border-b border-border/50">{formatValue(key, row[key])}</td>
                        ))}
                    </tr>
                ))}
            </tbody>
        </table>
    )
}


export default DataExplorer;
