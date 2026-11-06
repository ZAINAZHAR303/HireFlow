// Shared Gemini helper for HireFlow Edge Functions.
// Reads GEMINI_API_KEY (or GEMINI_INTERVIEW_API_KEY) from function secrets.
import { createClient, type SupabaseClient } from "jsr:@supabase/supabase-js@2";

const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent";

export function geminiKey(): string | null {
  return Deno.env.get("GEMINI_API_KEY") ?? Deno.env.get("GEMINI_INTERVIEW_API_KEY") ?? null;
}

/**
 * Call Gemini and return the text, retrying on 503 (overloaded).
 * Throws on hard errors or when no key is configured.
 */
export async function callGemini(
  prompt: string,
  opts: { temperature?: number; maxOutputTokens?: number } = {},
): Promise<string> {
  const key = geminiKey();
  if (!key) throw new Error("GEMINI_API_KEY not configured");

  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: opts.temperature ?? 0.7,
      maxOutputTokens: opts.maxOutputTokens ?? 2000,
    },
  };

  let lastErr: Error | null = null;
  for (let attempt = 1; attempt <= 3; attempt++) {
    if (attempt > 1) await new Promise((r) => setTimeout(r, attempt * 1500));
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 30000);
    try {
      const resp = await fetch(`${GEMINI_URL}?key=${key}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      if (resp.status === 503) {
        lastErr = new Error("Gemini model temporarily overloaded");
        continue;
      }
      if (!resp.ok) {
        // deno-lint-ignore no-explicit-any
        const err: any = await resp.json().catch(() => ({}));
        throw new Error(`Gemini API error (${resp.status}): ${err?.error?.message ?? resp.statusText}`);
      }
      // deno-lint-ignore no-explicit-any
      const data: any = await resp.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error("Empty response from Gemini");
      return text;
    } catch (e) {
      lastErr = e as Error;
      if (attempt === 3) throw lastErr;
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastErr ?? new Error("Gemini call failed");
}

// Extract the first JSON object or array from text, tolerating ```json fences.
// deno-lint-ignore no-explicit-any
export function extractJson(text: string): any {
  if (!text) return null;
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  const candidate = fenced ? fenced[1] : (text.match(/[[{][\s\S]*[\]}]/) || [null])[0];
  if (!candidate) return null;
  try {
    return JSON.parse(candidate);
  } catch {
    return null;
  }
}

// A Supabase client scoped to the calling user (respects RLS via their JWT),
// for functions that read/write the caller's own rows.
export function userClient(req: Request): SupabaseClient {
  const authHeader = req.headers.get("Authorization") ?? "";
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );
}
