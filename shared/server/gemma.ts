import { GoogleGenAI, type GenerateContentConfig } from '@google/genai';

/** Gemini API host. Set explicitly so a Netlify-injected gateway URL cannot intercept Gemma. */
const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com';

export const GEMMA_MODEL = (process.env.GEMMA_MODEL || 'gemma-4-26b-a4b-it').replace(/^models\//, '');

export function gemmaAvailable(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}

export function isGemmaUpstreamError(message: string): boolean {
  return /INTERNAL|UNAVAILABLE|RESOURCE_EXHAUSTED|"code":\s*(429|500|503)|timed out|Empty response/i.test(message);
}

/** Short reason for the UI. Schema failures keep the validation label. */
export function gemmaFailureReason(message: string): string {
  if (/"code":\s*500|\bINTERNAL\b/i.test(message)) {
    return 'Gemma API error: Google returned 500 Internal. Using the template quest.';
  }
  if (/timed out/i.test(message)) return 'Gemma timed out. Using the template quest.';
  if (isGemmaUpstreamError(message)) return 'Gemma API error. Using the template quest.';
  return `Gemma failed validation: ${message}`;
}

function client() {
  return new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      baseUrl: GEMINI_API_BASE,
      retryOptions: {
        attempts: 2,
        initialDelay: 0.4,
        maxDelay: 1.5,
        httpStatusCodes: [429, 500, 503],
      },
    },
  });
}

async function once(prompt: string, config: GenerateContentConfig | undefined, timeoutMs: number): Promise<string> {
  const call = client().models.generateContent({
    model: GEMMA_MODEL,
    contents: prompt,
    ...(config ? { config } : {}),
  });
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('Gemma request timed out')), timeoutMs),
  );
  const res = await Promise.race([call, timeout]);
  const text = res.text?.trim();
  if (!text) throw new Error('Empty response from Gemma');
  return text;
}

/** Calls Gemma 4 through the Gemini API with a hard timeout. Server-side only. */
export async function askGemma(prompt: string, timeoutMs = 25_000): Promise<string> {
  const started = Date.now();
  const remaining = () => Math.max(0, timeoutMs - (Date.now() - started));
  try {
    return await once(prompt, { temperature: 0.4, maxOutputTokens: 1024 }, remaining());
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    // Some Gemma requests 500 when generation config is set. One bare retry.
    if (!isGemmaUpstreamError(message) || remaining() < 3000) throw err;
    return once(prompt, undefined, remaining());
  }
}
