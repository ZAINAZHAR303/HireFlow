// HireFlow — embed Edge Function (text → embedding vector). Thin wrapper over
// the shared embedText for diagnostics/standalone use.
// Deploy: `supabase functions deploy embed`
import { corsHeaders } from "../_shared/cors.ts";
import { withinAiQuota } from "../_shared/gemini.ts";
import { embedText } from "../_shared/embed.ts";

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
