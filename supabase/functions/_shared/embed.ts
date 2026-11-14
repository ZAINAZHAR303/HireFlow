// Shared embedding helper (Gemini embeddings; separate quota from text gen).
import { geminiKey } from "./gemini.ts";

const EMBED_MODEL = Deno.env.get("GEMINI_EMBED_MODEL") ?? "gemini-embedding-001";
export const EMBED_DIMS = Number(Deno.env.get("GEMINI_EMBED_DIMS") ?? "768");

export async function embedText(text: string): Promise<number[]> {
  const key = geminiKey();
  if (!key) throw new Error("GEMINI_API_KEY not configured");
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${EMBED_MODEL}:embedContent?key=${key}`;
  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: `models/${EMBED_MODEL}`,
      content: { parts: [{ text: String(text).slice(0, 8000) }] },
      outputDimensionality: EMBED_DIMS,
    }),
  });
  if (!resp.ok) {
    const body = await resp.text().catch(() => "");
    throw new Error(`Embed ${resp.status}: ${body.slice(0, 200)}`);
  }
  const data = await resp.json();
  return data?.embedding?.values ?? [];
}

// Cosine similarity (handles non-normalized vectors).
export function cosine(a: number[], b: number[]): number {
  let dot = 0, na = 0, nb = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

// pgvector returns a vector as a JSON-array string like "[0.1,0.2,...]".
export function parseVector(v: unknown): number[] {
  if (Array.isArray(v)) return v as number[];
  if (typeof v === "string") {
    try { return JSON.parse(v); } catch { return []; }
  }
  return [];
}

export function toVectorLiteral(vec: number[]): string {
  return `[${vec.join(",")}]`;
}
