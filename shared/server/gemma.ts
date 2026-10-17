import { GoogleGenAI } from '@google/genai';

export const GEMMA_MODEL = process.env.GEMMA_MODEL || 'gemma-4-26b-a4b-it';

export function gemmaAvailable(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}

/** Calls Gemma 4 through the Gemini API with a hard timeout. Server-side only. */
export async function askGemma(prompt: string, timeoutMs = 25_000): Promise<string> {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
  const call = ai.models.generateContent({
    model: GEMMA_MODEL,
    contents: prompt,
    config: { temperature: 0.4, maxOutputTokens: 1024 },
  });
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('Gemma request timed out')), timeoutMs),
  );
  const res = await Promise.race([call, timeout]);
  const text = res.text?.trim();
  if (!text) throw new Error('Empty response from Gemma');
  return text;
}
