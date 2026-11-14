// HireFlow — semantic-rerank Edge Function.
// Given a shortlist of jobs {id, text}, returns a cosine-similarity score per
// job against the caller's résumé embedding. Embeds the résumé once (cached on
// resumes.embedding) and each job once (cached in job_embeddings). Returns
// { enabled:false } when there's no résumé text, so the client keeps its order.
// Deploy: `supabase functions deploy semantic-rerank`
import { createClient } from "jsr:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { userClient } from "../_shared/gemini.ts";
import { cosine, embedText, parseVector, toVectorLiteral } from "../_shared/embed.ts";

const MAX_NEW_EMBEDS = 20; // bound embedding calls per request (quota/latency)

function serviceClient() {
  return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const json = (obj: unknown, status = 200) =>
    new Response(JSON.stringify(obj), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    const { jobs } = await req.json();
    if (!Array.isArray(jobs) || jobs.length === 0) return json({ enabled: false, reason: "no jobs" });

    const supa = userClient(req);

    // Résumé embedding (compute + cache once).
    const { data: resume } = await supa
      .from("resumes").select("id, text, embedding").order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (!resume || !resume.text || resume.text.trim().length < 30) {
      return json({ enabled: false, reason: "no resume text" });
    }
    let resumeVec = parseVector(resume.embedding);
    if (resumeVec.length === 0) {
      resumeVec = await embedText(resume.text);
      await supa.from("resumes").update({ embedding: toVectorLiteral(resumeVec) }).eq("id", resume.id);
    }

    const svc = serviceClient();
    const ids = jobs.map((j: { id: string }) => String(j.id));
    const { data: cached } = await svc.from("job_embeddings").select("job_id, embedding").in("job_id", ids);
    const vecById = new Map<string, number[]>();
    for (const row of cached || []) vecById.set(row.job_id, parseVector(row.embedding));

    // Embed any uncached jobs (bounded) and persist them.
    const toInsert: { job_id: string; embedding: string }[] = [];
    let newCount = 0;
    for (const j of jobs) {
      const id = String(j.id);
      if (vecById.has(id)) continue;
      if (newCount >= MAX_NEW_EMBEDS) continue;
      try {
        const v = await embedText(String(j.text || "").slice(0, 4000));
        vecById.set(id, v);
        toInsert.push({ job_id: id, embedding: toVectorLiteral(v) });
        newCount++;
      } catch (_) { /* skip this job on embed failure */ }
    }
    if (toInsert.length) {
      await svc.from("job_embeddings").upsert(toInsert, { onConflict: "job_id" });
    }

    const scores: Record<string, number> = {};
    for (const j of jobs) {
      const id = String(j.id);
      const v = vecById.get(id);
      if (v && v.length) scores[id] = cosine(resumeVec, v); // 0..1-ish
    }

    return json({ enabled: true, scores, embedded: newCount });
  } catch (e) {
    return json({ enabled: false, error: String((e as Error).message) }, 200);
  }
});
