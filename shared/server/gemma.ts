import { GoogleGenAI } from '@google/genai';
import { SYSTEM_INSTRUCTION } from './prompts';

export const GEMMA_MODEL = process.env.GEMMA_MODEL || 'gemma-4-26b-a4b-it';

export function gemmaAvailable(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}

export class GemmaError extends Error {}

export type Ask = (prompt: string, opts?: { timeoutMs?: number; maxOutputTokens?: number }) => Promise<string>;

/**
 * Calls Gemma 4 through the Gemini API. Server-side only. The system
 * instruction is fixed; untrusted text only ever travels in `prompt`, fenced
 * by tags. Each call is aborted after 12 s.
 */
export const askGemma: Ask = async (prompt, { timeoutMs = 12_000, maxOutputTokens = 1024 } = {}) => {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await Promise.race([
      ai.models.generateContent({
        model: GEMMA_MODEL,
        contents: prompt,
        config: { systemInstruction: SYSTEM_INSTRUCTION, temperature: 0.4, maxOutputTokens, abortSignal: controller.signal },
      }),
      new Promise<never>((_, reject) => controller.signal.addEventListener('abort', () => reject(new GemmaError('Gemma request timed out')))),
    ]);
    const text = res.text?.trim();
    if (!text) throw new GemmaError('Empty response from Gemma');
    return text;
  } finally {
    clearTimeout(timer);
  }
};
