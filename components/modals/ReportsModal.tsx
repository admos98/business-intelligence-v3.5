import React, { useState, useMemo, useEffect } from 'react';
import { AggregatedShoppingItem, ItemStatus, PaymentStatus } from '../../types';
import { t } from '../../translations';
import { useShoppingStore } from '../../store/useShoppingStore';
import CurrencyDisplay from '../common/CurrencyDisplay';
import { parseJalaliDate, toJalaliDateString } from '../../lib/jalali';
import { generateReportSummary } from '../../lib/gemini';
import JalaliCalendar from '../common/JalaliCalendar';
import { exportComponentAsPdf } from '../../lib/pdfExport';
import { useToast } from '../common/Toast';

interface ReportsModalProps {
  onClose: () => void;
}

const CalendarIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
);


const ReportsModal: React.FC<ReportsModalProps> = ({ onClose }) => {
  const { lists, vendors } = useShoppingStore();
  const [isOpen, setIsOpen] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isStartCalendarOpen, setIsStartCalendarOpen] = useState(false);
  const [isEndCalendarOpen, setIsEndCalendarOpen] = useState(false);
  const [reportData, setReportData] = useState<AggregatedShoppingItem[] | null>(null);
  const [includeAiAnalysis, setIncludeAiAnalysis] = useState(true);
  const [isGeneratingData, setIsGeneratingData] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const { addToast } = useToast();

  const vendorMap = useMemo(() => new Map<string, string>(vendors.map(v => [v.id, v.name])), [vendors]);

  useEffect(() => { setIsOpen(true); }, []);
  
  const handleClose = () => {
    setIsOpen(false);
    setTimeout(onClose, 300);
  };

  const handleStartDateSelect = (date: Date) => {
    setStartDate(toJalaliDateString(date.toISOString()));
    setIsStartCalendarOpen(false);
    setReportData(null);
  };
  
  const handleEndDateSelect = (date: Date) => {
    setEndDate(toJalaliDateString(date.toISOString()));
    setIsEndCalendarOpen(false);
    setReportData(null);
  };

  const handleGenerateData = () => {
    const start = parseJalaliDate(startDate);
    const end = parseJalaliDate(endDate);
    if (!start || !end) return;
    
    setIsGeneratingData(true);
    setReportData(null);
    
    setTimeout(() => {
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);

      const filteredLists = lists.filter(list => new Date(list.createdAt) >= start && new Date(list.createdAt) <= end);
      const aggregationMap = new Map<string, Omit<AggregatedShoppingItem, 'purchaseHistory'>>();

      filteredLists.forEach(list => list.items.forEach(item => {
          if (item.status === ItemStatus.Bought) {
            const key = `${item.name}|${item.unit}|${item.vendorId || 'N/A'}|${item.paymentStatus || 'N/A'}|${item.paymentMethod || 'N/A'}`;
            if (!aggregationMap.has(key)) {
              aggregationMap.set(key, { 
                  name: item.name, 
                  unit: item.unit, 
                  category: item.category || t.other,
                  vendorId: item.vendorId,
                  paymentStatus: item.paymentStatus,
                  paymentMethod: item.paymentMethod,
                  totalAmount: 0, 
                  totalPrice: 0 
              });
            }
            const existing = aggregationMap.get(key)!;
            existing.totalAmount += item.purchasedAmount ?? item.amount;
            existing.totalPrice += item.paidPrice ?? 0;
          }
      }));
      
      const aggregatedData = Array.from(aggregationMap.values()).map(item => ({...item, purchaseHistory: []}));
      if (aggregatedData.length === 0) {
          addToast(t.noDataForPeriod, "info");
      } else {
          setReportData(aggregatedData);
      }
      setIsGeneratingData(false);
    }, 100);
  };

  const groupAggregatedData = (data: AggregatedShoppingItem[]) => {
    return data.reduce((acc, item) => {
      const category = item.category || t.other;
      if (!acc[category]) acc[category] = [];
      acc[category].push(item);
      return acc;
    }, {} as {[key: string]: AggregatedShoppingItem[]});
  };

  const calculateTotals = (data: AggregatedShoppingItem[], start?: Date | null, end?: Date | null) => {
    let totalDue = 0;
    if (start && end) {
        lists.filter(l => new Date(l.createdAt) >= start && new Date(l.createdAt) <= end)
            .forEach(l => l.items.forEach(i => {
                if (i.status === ItemStatus.Bought && i.paymentStatus === PaymentStatus.Due) totalDue += i.paidPrice ?? 0;
            }));
    }
    return {
        totalCostForPeriod: data.reduce((s, i) => s + i.totalPrice, 0),
        totalOutstandingDue: totalDue
    };
  };

  const handleDownloadPdf = async () => {
    if (!reportData) return;
    setIsGeneratingPdf(true);
    
    let summary = '';
    if (includeAiAnalysis) {
        try {
            const totalSpending = reportData.reduce((sum, item) => sum + item.totalPrice, 0);
            const categorySpending = reportData.reduce((acc, item) => {
                acc[item.category] = (acc[item.category] || 0) + item.totalPrice;
                return acc;
            }, {} as Record<string, number>);
            
            summary = await generateReportSummary(totalSpending, categorySpending);
        } catch (e) {
            summary = t.aiSummaryError;
        }
    }
    
    try {
        const start = parseJalaliDate(startDate)!;
        const end = parseJalaliDate(endDate)!;
        const reportComponent = (
            <PeriodicReportForPdf 
                startDate={startDate}
                endDate={endDate}
                aiSummary={summary}
                groupedReportData={groupAggregatedData(reportData)}
                vendorMap={vendorMap}
                totalCostForPeriod={calculateTotals(reportData, start, end).totalCostForPeriod}
                totalOutstandingDue={calculateTotals(reportData, start, end).totalOutstandingDue}
            />
        );
        await exportComponentAsPdf(reportComponent, `${t.reportsModalTitle}_${startDate.replace(/\//g, '-')}-${endDate.replace(/\//g, '-')}.pdf`);
    } catch (error) {
        console.error("PDF generation failed:", error);
        addToast((error as Error).message || "An unknown error occurred during PDF generation.", "error");
    } finally {
        setIsGeneratingPdf(false);
    }
  };

  const handleExportJson = () => {
    if (!reportData) return;
    const start = parseJalaliDate(startDate);
    const end = parseJalaliDate(endDate);

    const data = reportData.map(item => {
        const { purchaseHistory, ...rest } = item; // Exclude empty purchaseHistory
        return {
            ...rest,
            vendorName: item.vendorId ? vendorMap.get(item.vendorId) : undefined,
        };
    });

    const dataToExport = {
        period: { startDate, endDate },
        totals: calculateTotals(reportData, start, end),
        data: data,
    };

    const dataString = JSON.stringify(dataToExport, null, 2);
    const blob = new Blob([dataString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `periodic_report_${startDate.replace(/\//g, '-')}_to_${endDate.replace(/\//g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
    addToast(t.exportJsonSuccess, 'success');
  };

  return (
    <div className={`fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`}>
      <div className={`bg-surface p-6 rounded-xl border border-border w-full max-w-4xl max-h-[90vh] flex flex-col transition-all duration-300 ${isOpen ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-10'}`}>
        <div className="flex justify-between items-center mb-4 flex-shrink-0"><h2 className="text-xl font-bold text-primary">{t.reportsModalTitle}</h2><button onClick={handleClose} className="text-secondary hover:text-primary text-2xl">&times;</button></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 p-4 bg-background rounded-lg flex-shrink-0">
          <div className="relative">
            <label className="block text-sm font-medium text-secondary mb-1">{t.startDate}</label>
            <input type="text" readOnly value={startDate} onFocus={() => setIsStartCalendarOpen(true)} placeholder={t.datePlaceholder} className="w-full px-3 py-2 bg-surface border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent pr-10 cursor-pointer"/>
             <button type="button" onClick={() => setIsStartCalendarOpen(p => !p)} className="absolute right-2 top-9 -translate-y-1/2 p-1 text-secondary hover:text-accent"><CalendarIcon /></button>
            {isStartCalendarOpen && <JalaliCalendar selectedDate={parseJalaliDate(startDate) || new Date()} onSelectDate={handleStartDateSelect} />}
          </div>
          <div className="relative">
            <label className="block text-sm font-medium text-secondary mb-1">{t.endDate}</label>
            <input type="text" readOnly value={endDate} onFocus={() => setIsEndCalendarOpen(true)} placeholder={t.datePlaceholder} className="w-full px-3 py-2 bg-surface border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent pr-10 cursor-pointer"/>
            <button type="button" onClick={() => setIsEndCalendarOpen(p => !p)} className="absolute right-2 top-9 -translate-y-1/2 p-1 text-secondary hover:text-accent"><CalendarIcon /></button>
            {isEndCalendarOpen && <JalaliCalendar selectedDate={parseJalaliDate(endDate) || new Date()} onSelectDate={handleEndDateSelect} />}
          </div>
          <button onClick={handleGenerateData} disabled={isGeneratingData || !startDate || !endDate} className="self-end w-full px-4 py-2 bg-accent text-accent-text font-medium rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50">{isGeneratingData ? t.loadingData : t.generateReport}</button>
        </div>
        
        <div className="flex-grow overflow-y-auto pr-2 flex items-center justify-center">
            {isGeneratingData ? (
                <p className="text-center text-secondary">{t.loadingData}</p>
            ) : reportData ? (
                 <div className="text-center w-full max-w-md mx-auto">
                    <h3 className="text-lg font-bold text-primary mb-4">{t.reportReady}</h3>
                    
                    <div className="p-4 bg-background rounded-lg mb-4 border border-border">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-sm text-secondary">{t.totalCostForPeriod}</p>
                                <CurrencyDisplay value={calculateTotals(reportData, parseJalaliDate(startDate), parseJalaliDate(endDate)).totalCostForPeriod} className="font-bold text-lg text-primary" />
                            </div>
                            <div>
                                <p className="text-sm text-secondary">{t.totalOutstandingDue}</p>
                                <CurrencyDisplay value={calculateTotals(reportData, parseJalaliDate(startDate), parseJalaliDate(endDate)).totalOutstandingDue} className="font-bold text-lg text-danger" />
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center justify-center mb-4">
                        <input type="checkbox" id="ai-analysis" checked={includeAiAnalysis} onChange={e => setIncludeAiAnalysis(e.target.checked)} className="form-checkbox h-4 w-4 rounded bg-background border-border text-accent focus:ring-accent"/>
                        <label htmlFor="ai-analysis" className="mr-2 text-sm text-primary">{t.includeAiAnalysis}</label>
                    </div>

                    <div className="flex justify-center gap-4">
                        <button onClick={handleDownloadPdf} disabled={isGeneratingPdf} className="px-4 py-2 bg-primary text-background font-medium rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50">
                            {isGeneratingPdf ? t.downloadingPdf : t.downloadReport}
                        </button>
                        <button onClick={handleExportJson} className="px-4 py-2 bg-surface text-primary font-medium rounded-lg hover:bg-border transition-colors border border-border">
                            {t.exportJson}
                        </button>
                    </div>
                </div>
            ) : (
                <p className="text-center text-secondary mt-8">{t.selectDateRange}</p>
            )}
        </div>
      </div>
    </div>
  );
};

const PeriodicReportForPdf: React.FC<{
    startDate: string;
    endDate: string;
    aiSummary: string;
    groupedReportData: Record<string, AggregatedShoppingItem[]>;
    vendorMap: Map<string, string>;
    totalCostForPeriod: number;
    totalOutstandingDue: number;
}> = ({ startDate, endDate, aiSummary, groupedReportData, vendorMap, totalCostForPeriod, totalOutstandingDue }) => (
    <div className="p-10 pdf-render-container" style={{ direction: 'rtl' }}>
        <h1 className="text-3xl font-bold text-center mb-4">{t.aggregatedReportForPeriod(startDate, endDate)}</h1>
        
        {aiSummary && (
            <div className="mb-8 p-4 bg-gray-50 rounded-lg">
                <h2 className="text-2xl font-bold mb-4 border-b pb-2">{t.aiSummary}</h2>
                <p className="text-base whitespace-pre-wrap leading-relaxed">{aiSummary}</p>
            </div>
        )}

        <table className="w-full mb-8 text-lg border">
            <tbody>
                <tr className="border-b"><td className="p-3 font-bold">{t.totalCostForPeriod}</td><td className="p-3">{totalCostForPeriod.toLocaleString('fa-IR')} {t.currency}</td></tr>
                <tr className="border-b"><td className="p-3 font-bold">{t.totalOutstandingDue}</td><td className="p-3">{totalOutstandingDue.toLocaleString('fa-IR')} {t.currency}</td></tr>
            </tbody>
        </table>

        {/* FIX: Explicitly cast 'items' to the correct type to resolve type inference issue. */}
        {Object.entries(groupedReportData).sort((a, b) => a[0].localeCompare(b[0], 'fa')).map(([category, items]: [string, AggregatedShoppingItem[]]) => (
            <div key={category} className="mb-6 break-after-page">
                <h3 className="text-xl font-semibold mb-3">{category}</h3>
                <table className="w-full text-right border-collapse text-sm">
                    <thead className="bg-gray-100">
                        <tr>
                            <th className="p-2 border">{t.itemName}</th>
                            <th className="p-2 border">{t.vendor}</th>
                            <th className="p-2 border">{t.totalPurchasedAmount}</th>
                            <th className="p-2 border">{t.totalCost}</th>
                            <th className="p-2 border">{t.paymentStatus}</th>
                            <th className="p-2 border">{t.paymentMethod}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map(item => (
                            <tr key={`${item.name}-${item.unit}-${item.vendorId || 'na_vendor'}-${item.paymentStatus || 'na_status'}-${item.paymentMethod || 'na_method'}`} className="border-b">
                                <td className="p-2 border">{item.name}</td>
                                <td className="p-2 border">{item.vendorId ? vendorMap.get(item.vendorId) || '-' : '-'}</td>
                                <td className="p-2 border">{item.totalAmount.toLocaleString('fa-IR')} {item.unit}</td>
                                <td className="p-2 border">{item.totalPrice.toLocaleString('fa-IR')}</td>
                                <td className="p-2 border">{item.paymentStatus || '-'}</td>
                                <td className="p-2 border">{item.paymentMethod || '-'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        ))}
    </div>
);


export default ReportsModal;