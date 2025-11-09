// /api/proxy.ts
import { GoogleGenAI } from "@google/genai";
import type { VercelRequest, VercelResponse } from '@vercel/node';

// This function will be deployed as a Vercel Serverless Function.
export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  // Ensure the API key is set in your Vercel environment variables
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "GEMINI_API_KEY is not configured." });
  }

  const { action, payload } = req.body;

  if (!action || !payload) {
    return res.status(400).json({ error: "Missing 'action' or 'payload' in request body." });
  }

  try {
    const ai = new GoogleGenAI({ apiKey });

    let result: any;

    // Use a switch to handle different AI actions requested by the frontend
    switch (action) {
      case 'parseReceipt': {
        const { imageBase64, categories } = payload;
        const model = 'gemini-2.5-flash';
        const prompt = `Parse the attached receipt image. Extract the date (in YYYY/MM/DD format) and all purchased items. For each item, provide its name, quantity, and total price in Iranian Rials. If possible, suggest a category for each item from this list: ${categories.join(', ')}. Also suggest a 'unit' for each item. Respond ONLY with a JSON object in this format: { "date": "YYYY/MM/DD", "items": [{ "name": "...", "quantity": 1, "price": 120000, "unit": "عدد", "suggestedCategory": "..." }] }. Do not include any other text or markdown formatting.`;

        const imagePart = {
          inlineData: { mimeType: 'image/jpeg', data: imageBase64 },
        };
        const textPart = { text: prompt };

        const response = await ai.models.generateContent({
            model,
            contents: { parts: [imagePart, textPart] },
        });

        // The model should return a JSON string. We parse it here.
        result = JSON.parse(response.text);
        break;
      }

      case 'getAnalysisInsights': {
        const { question, context, data } = payload;
        const model = 'gemini-2.5-pro';
        const prompt = `You are an expert business analyst for a cafe. Based on the following data and context, answer the user's question. Provide a concise, insightful answer.

        Context of the data provided: ${context}

        Data (JSON):
        ${JSON.stringify(data, null, 2)}

        User's Question: "${question}"

        Your analysis:`;

        const response = await ai.models.generateContent({ model, contents: prompt });
        result = { insight: response.text };
        break;
      }

      case 'generateReportSummary':
      case 'generateExecutiveSummary': {
        const model = 'gemini-2.5-pro';
        const systemInstruction = "You are a business intelligence expert analyzing purchasing data for a cafe owner named Mehrnoosh. Your tone should be professional, insightful, and encouraging. All monetary values are in Iranian Rials. Provide your analysis in Persian.";
        const prompt = `Please provide a concise executive summary based on the following data. Highlight key trends, significant expenses, and offer one or two actionable recommendations.

        Data:
        ${JSON.stringify(payload.summaryData || payload, null, 2)}
        `;

        const response = await ai.models.generateContent({
          model,
          contents: prompt,
          config: { systemInstruction },
        });
        result = { summary: response.text };
        break;
      }

      default:
        return res.status(400).json({ error: `Unknown action: ${action}` });
    }

    return res.status(200).json(result);

  } catch (error) {
    console.error(`Error processing action '${action}':`, error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
    return res.status(500).json({ error: `Server error: ${errorMessage}` });
  }
}
