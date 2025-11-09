import { GoogleGenAI, Type } from "@google/genai";
import { OcrResult, ShoppingItem, SummaryData, Unit } from "../types";
import { t } from "../translations";
import { toJalaliDateString } from "./jalali";

const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY as string });

const itemSchema = { type: Type.OBJECT, properties: { name: { type: Type.STRING }, quantity: { type: Type.NUMBER }, price: { type: Type.NUMBER }, unit: { type: Type.STRING }, suggestedCategory: { type: Type.STRING } }, required: ["name", "quantity", "price"] };
const receiptSchema = { type: Type.OBJECT, properties: { date: { type: Type.STRING, description: "The date from the receipt in YYYY/MM/DD Jalali format." }, items: { type: Type.ARRAY, items: itemSchema } }, required: ["date", "items"] };


export async function parseReceipt(imageBase64: string, categories: string[]): Promise<OcrResult> {
  const unitValues = Object.values(Unit).join(', ');
  const prompt = `
    You are an expert receipt and invoice analyzer for a cafe, fluent in Persian.
    The user has provided an image of a receipt. Meticulously extract all items AND the date of the receipt.
    For each item, provide its name, quantity, and total price.

    IMPORTANT - UNIT: Determine the unit of measurement for each item based on the receipt text (e.g., 'kg', 'عدد'). Choose the most appropriate unit from this list: [${unitValues}]. If no unit is specified or clear, you can use "${Unit.Piece}".

    IMPORTANT - CATEGORY: Based on the item name, suggest the most relevant category from the following list: [${categories.join(', ')}]. If no category fits, use "${t.other}".

    IMPORTANT - DATE: Extract the date from the receipt. You MUST return it in the Jalali calendar format of YYYY/MM/DD. For example, '1403/05/01'.

    IMPORTANT - PRICES: Prices on Iranian receipts are in Rials. Extract the price exactly as it appears on the receipt. The final price in the JSON output MUST be in Rials.

    Return the output ONLY as a JSON object matching the provided schema. Do not include any extra text or explanations.
  `;

  try {
    const response = await ai.models.generateContent({
      // FIX: Using the recommended model for this task.
      model: 'gemini-2.5-flash',
      contents: { parts: [{ text: prompt }, { inlineData: { mimeType: 'image/jpeg', data: imageBase64 } }] },
      config: { responseMimeType: "application/json", responseSchema: receiptSchema }
    });

    // FIX: Extract JSON from the response text, which may include markdown backticks.
    let jsonText = response.text;
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.substring(7, jsonText.length - 3);
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.substring(3, jsonText.length - 3);
    }
    const parsedJson = JSON.parse(jsonText.trim());

    if (parsedJson.items && Array.isArray(parsedJson.items) && typeof parsedJson.date === 'string') {
        return {
            date: parsedJson.date,
            items: parsedJson.items.filter((item: any) => item.name && typeof item.quantity === 'number' && typeof item.price === 'number')
        };
    }
    throw new Error("Parsed JSON does not contain a valid 'items' array and 'date' string.");
  } catch (error) {
    console.error("Gemini API call for parsing receipt failed:", error);
    throw new Error(t.ocrError);
  }
}

export async function getAnalysisInsights(
    question: string,
    context: string,
    data: any[]
): Promise<string> {
    const prompt = `
    You are an expert business analyst for a cafe owner, fluent in Persian. Your task is to answer the user's question based *only* on the provided data and context. Do not use any external knowledge.

    **Context of the Analysis:**
    ${context}

    **Data for Analysis (in JSON format):**
    ${JSON.stringify(data, null, 2)}

    **User's Question:**
    "${question}"

    **Your Task:**
    1.  Carefully analyze the provided JSON data.
    2.  Answer the user's question directly and concisely in Persian.
    3.  If the data supports it, provide a brief "Insight" or "Recommendation" in a new paragraph. For example, if they ask for the most expensive vendor, you could recommend comparing prices.
    4.  If the data is insufficient to answer the question, clearly state that the answer cannot be determined from the current data view.

    Be factual, data-driven, and professional.
    `;

    try {
        // FIX: Using the recommended model for basic text tasks.
        const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
        return response.text.trim();
    } catch (error) {
        console.error("Gemini API call for analysis insights failed:", error);
        throw new Error(t.aiError);
    }
}


export async function generateReportSummary(
    totalSpending: number,
    categorySpending: Record<string, number>
): Promise<string> {
    const prompt = `
    You are an expert financial analyst creating a summary for a cafe's periodic purchasing report. Analyze the provided data and generate a detailed, insightful summary in Persian. The tone should be professional and analytical.

    Data:
    - Total Spending for the period: ${totalSpending.toLocaleString('fa-IR')} ${t.currency}
    - Spending breakdown by Category: ${JSON.stringify(Object.entries(categorySpending).sort(([,a],[,b]) => b-a).reduce((r, [k, v]) => ({ ...r, [k]: v }), {}))}

    Your analysis should include:
    1.  An introduction stating the total expenditure for the period.
    2.  A detailed breakdown of the main spending categories. Identify the top 3-4 categories and discuss their significance as a percentage of the total budget.
    3.  Identify any notable patterns or anomalies. For example, is spending concentrated in one area? Are there any unexpectedly high costs?
    4.  Provide one or two strategic concluding remarks or points of focus for the cafe owner based on this data. For instance, areas where cost control might be beneficial or where spending aligns with business goals (e.g., high spending on quality produce).

    Format the output clearly with paragraphs for each section.
    `;

    try {
        // FIX: Using the recommended model for basic text tasks.
        const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
        return response.text.trim();
    } catch (error) {
        console.error("Gemini API call for report summary failed:", error);
        throw new Error(t.aiSummaryError);
    }
}


export async function generateExecutiveSummary(summaryData: SummaryData): Promise<string> {
    const { kpis, charts, period } = summaryData;
    const prompt = `
    You are a professional business consultant for a cafe owner, fluent in Persian. Your task is to provide a concise executive summary based on the following purchasing data for the period from ${toJalaliDateString(period.startDate.toISOString())} to ${toJalaliDateString(period.endDate.toISOString())}.

    **Key Performance Indicators (KPIs):**
    *   Total Spend: ${kpis.totalSpend.toLocaleString('fa-IR')} ${t.currency}
    *   Average Daily Spend: ${kpis.avgDailySpend.toLocaleString('fa-IR')} ${t.currency}
    *   Total Unique Items Purchased: ${kpis.totalItems.toLocaleString('fa-IR')}
    *   Top Spending Category: ${kpis.topCategory?.name || 'N/A'} (${kpis.topCategory?.amount.toLocaleString('fa-IR')} ${t.currency})
    *   Top Spending Vendor: ${kpis.topVendor?.name || 'N/A'} (${kpis.topVendor?.amount.toLocaleString('fa-IR')} ${t.currency})

    **Data Trends:**
    *   Spending by Category (% of total): ${JSON.stringify(charts.spendingByCategory.labels.map((label, index) => ({ category: label, percentage: ((charts.spendingByCategory.data[index] / kpis.totalSpend) * 100).toFixed(1) + '%' })), null, 2)}
    *   Spending Over Time (Trend): Analyze the daily spending data points to identify trends: ${JSON.stringify(charts.spendingOverTime.data)}

    **Your Task:**
    Provide a brief, insightful summary in Persian (max 3-4 paragraphs).
    1.  Start with a clear opening statement about the overall spending during the period.
    2.  Analyze the KPIs. What do they reveal? Is the spending high or low? Point out the most significant category and vendor.
    3.  Comment on the trends. Is spending increasing, decreasing, or volatile? Is it concentrated in a few categories?
    4.  Conclude with one key, actionable insight or a question for the owner to consider. For example, "The significant spend on 'Dairy' suggests it's a core cost center. It may be worthwhile to explore alternative suppliers for this category to optimize costs." or "Spending shows an upward trend towards the end of the period; is this due to increased business or rising prices?"

    Your tone should be helpful, professional, and data-driven.
    `;

    try {
        // FIX: Using the recommended model for complex text tasks.
        const response = await ai.models.generateContent({ model: 'gemini-2.5-pro', contents: prompt });
        return response.text.trim();
    } catch (error) {
        console.error("Gemini API call for executive summary failed:", error);
        throw new Error(t.aiSummaryError);
    }
}
