import { OcrResult, SummaryData, Unit } from "../types";
import { t } from "../translations";
import { toJalaliDateString } from "./jalali";

// A generic function to proxy all AI-related calls to a backend endpoint.
// This is where a Vercel Serverless Function would handle the request.
const aiProxy = async (action: string, payload: any) => {
  try {
    const response = await fetch('/api/proxy', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ action, payload }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`API proxy error for action "${action}":`, errorBody);
      // Try to parse error from backend, otherwise throw generic message
      try {
        const errorJson = JSON.parse(errorBody);
        throw new Error(errorJson.error || t.aiError);
      } catch {
        throw new Error(t.aiError);
      }
    }

    return await response.json();
  } catch (error) {
    console.error(`Failed to fetch from API proxy for action "${action}":`, error);
    // Re-throw to be caught by the calling function
    throw error;
  }
};

export async function parseReceipt(imageBase64: string, categories: string[]): Promise<OcrResult> {
  try {
    const payload = { imageBase64, categories };
    const result = await aiProxy('parseReceipt', payload);
    // Basic validation of the response from the backend
    if (result.items && Array.isArray(result.items) && typeof result.date === 'string') {
      return result;
    }
    throw new Error("Invalid data structure returned from backend for parseReceipt.");
  } catch (error) {
    console.error("Proxy call for parsing receipt failed:", error);
    throw new Error(t.ocrError);
  }
}

export async function getAnalysisInsights(
    question: string,
    context: string,
    data: any[]
): Promise<string> {
    try {
        const payload = { question, context, data };
        const result = await aiProxy('getAnalysisInsights', payload);
        return result.insight;
    } catch (error) {
        console.error("Proxy call for analysis insights failed:", error);
        throw new Error(t.aiError);
    }
}

export async function generateReportSummary(
    totalSpending: number,
    categorySpending: Record<string, number>
): Promise<string> {
    try {
        const payload = { totalSpending, categorySpending };
        const result = await aiProxy('generateReportSummary', payload);
        return result.summary;
    } catch (error) {
        console.error("Proxy call for report summary failed:", error);
        throw new Error(t.aiSummaryError);
    }
}

export async function generateExecutiveSummary(summaryData: SummaryData): Promise<string> {
    try {
        const payload = { summaryData };
        const result = await aiProxy('generateExecutiveSummary', payload);
        return result.summary;
    } catch (error) {
        console.error("Proxy call for executive summary failed:", error);
        throw new Error(t.aiSummaryError);
    }
}
import { OcrResult, SummaryData, Unit } from "../types";
import { t } from "../translations";
import { toJalaliDateString } from "./jalali";

// A generic function to proxy all AI-related calls to a backend endpoint.
// This is where a Vercel Serverless Function would handle the request.
const aiProxy = async (action: string, payload: any) => {
  try {
    const response = await fetch('/api/proxy', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ action, payload }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
       if (errorBody.trim().startsWith('<!DOCTYPE')) {
          const message = `Backend proxy endpoint not found for action "${action}". This is expected if you are not running a Vercel-like development server (e.g., using 'vercel dev'). Cannot connect to Gemini API.`;
          console.error(message);
          throw new Error(message);
      }
      console.error(`API proxy error for action "${action}":`, errorBody);
      try {
        const errorJson = JSON.parse(errorBody);
        throw new Error(errorJson.error || t.aiError);
      } catch {
        throw new Error(t.aiError);
      }
    }

    return await response.json();
  } catch (error) {
    console.error(`Failed to fetch from API proxy for action "${action}":`, error);
    // Re-throw to be caught by the calling function
    throw error;
  }
};

export async function parseReceipt(imageBase64: string, categories: string[]): Promise<OcrResult> {
  try {
    const payload = { imageBase64, categories };
    const result = await aiProxy('parseReceipt', payload);
    // Basic validation of the response from the backend
    if (result.items && Array.isArray(result.items) && typeof result.date === 'string') {
      return result;
    }
    throw new Error("Invalid data structure returned from backend for parseReceipt.");
  } catch (error) {
    console.error("Proxy call for parsing receipt failed:", error);
    throw new Error(t.ocrError);
  }
}

export async function getAnalysisInsights(
    question: string,
    context: string,
    data: any[]
): Promise<string> {
    try {
        const payload = { question, context, data };
        const result = await aiProxy('getAnalysisInsights', payload);
        return result.insight;
    } catch (error) {
        console.error("Proxy call for analysis insights failed:", error);
        throw new Error(t.aiError);
    }
}

export async function generateReportSummary(
    totalSpending: number,
    categorySpending: Record<string, number>
): Promise<string> {
    try {
        const payload = { totalSpending, categorySpending };
        const result = await aiProxy('generateReportSummary', payload);
        return result.summary;
    } catch (error) {
        console.error("Proxy call for report summary failed:", error);
        throw new Error(t.aiSummaryError);
    }
}

export async function generateExecutiveSummary(summaryData: SummaryData): Promise<string> {
    try {
        const payload = { summaryData };
        const result = await aiProxy('generateExecutiveSummary', payload);
        return result.summary;
    } catch (error) {
        console.error("Proxy call for executive summary failed:", error);
        throw new Error(t.aiSummaryError);
    }
}
