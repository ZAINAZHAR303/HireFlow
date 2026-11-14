// HireFlow — embed Edge Function (text → embedding vector via Gemini).
// Used by semantic matching. Returns { dims, vector } or an error.
// Deploy: `supabase functions deploy embed`
import { corsHeaders } from "../_shared/cors.ts";
import { geminiKey, withinAiQuota } from "../_shared/gemini.ts";

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
    throw new Error(`Embed ${resp.status}: ${body.slice(0, 300)}`);
  }
  const data = await resp.json();
  return data?.embedding?.values ?? [];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const json = (obj: unknown, status = 200) =>
    new Response(JSON.stringify(obj), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  try {
    const { text } = await req.json();
    if (!text) return json({ error: "text required" }, 400);
    if (!(await withinAiQuota(req))) return json({ error: "Daily AI limit reached" }, 429);
    const vector = await embedText(text);
    return json({ dims: vector.length, vector });
  } catch (e) {
    return json({ error: String((e as Error).message) }, 500);
  }
});
