// This entire PDF generation method is deprecated due to issues with custom font embedding and text rendering for RTL languages.
// The application has been standardized to use the html2canvas-based approach in `lib/pdfExport.ts` for consistent and accurate visual output.

import { ShoppingList, AggregatedShoppingItem } from '../types';

// Deprecated: All functions are now no-ops to prevent accidental use.
export const generateShoppingReportPdf = async (list: ShoppingList, vendorMap: Map<string, string>) => {
    console.error("generateShoppingReportPdf is deprecated and should not be used. Use exportComponentAsPdf instead.");
};

export const generateAnalysisReportPdf = async (
    startDate: string,
    endDate: string,
    totalSpending: number,
    aiSummary: string,
    charts: { [key: string]: string },
    topItemsByCost: AggregatedShoppingItem[],
    topItemsByQuantity: AggregatedShoppingItem[]
) => {
    console.error("generateAnalysisReportPdf is deprecated and should not be used. Use exportElementAsPdf instead.");
};

export const generatePeriodicReportPdf = async (
    startDate: string,
    endDate: string,
    aiSummary: string,
    groupedReportData: Record<string, AggregatedShoppingItem[]>,
    vendorMap: Map<string, string>,
    totalCostForPeriod: number,
    totalOutstandingDue: number
) => {
    console.error("generatePeriodicReportPdf is deprecated and should not be used. Use exportComponentAsPdf instead.");
};
