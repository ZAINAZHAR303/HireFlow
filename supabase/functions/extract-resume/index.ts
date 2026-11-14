// HireFlow — extract-resume Edge Function.
// AI pass over résumé text to pull skills + contact links for messy/unusual
// résumés the client-side dictionary parser misses. Returns {skills:[]} when AI
// is unavailable/over-quota, so the client keeps its deterministic result.
// Deploy: `supabase functions deploy extract-resume`
import { corsHeaders } from "../_shared/cors.ts";
import { callGemini, extractJson, geminiKey, withinAiQuota } from "../_shared/gemini.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const json = (obj: unknown, status = 200) =>
    new Response(JSON.stringify(obj), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    const { text } = await req.json();
    if (!text || String(text).trim().length < 30) return json({ skills: [] });
    if (!geminiKey() || !(await withinAiQuota(req))) return json({ skills: [] });

    const prompt = `Extract structured data from this résumé. Return ONLY valid JSON, no markdown:
{"skills":["..."],"github":"","linkedin":"","location":""}
- skills: concrete technical + professional skills (max 25), using common names (e.g. "React", "Node.js", "Project Management").
- github/linkedin: full URLs if present, else "".
- location: city/country if present, else "".

Résumé:
${String(text).slice(0, 6000)}`;

    const out = await callGemini(prompt, { temperature: 0.2, maxOutputTokens: 800 });
    const parsed = extractJson(out) || {};
    return json({
      skills: Array.isArray(parsed.skills) ? parsed.skills.slice(0, 25) : [],
      github: typeof parsed.github === "string" ? parsed.github : "",
      linkedin: typeof parsed.linkedin === "string" ? parsed.linkedin : "",
      location: typeof parsed.location === "string" ? parsed.location : "",
    });
  } catch (e) {
    // Never hard-fail — the client falls back to its own parser.
    return json({ skills: [], error: String((e as Error).message) });
  }
});
