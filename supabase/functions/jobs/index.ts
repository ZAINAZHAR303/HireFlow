// HireFlow — jobs Edge Function.
// Aggregates job boards (via _shared/jobSources), caches the result for 10 min
// in jobs_cache (so each "Find Jobs" doesn't re-hit 3 external APIs), and trims
// descriptions to keep the payload small. Deploy: `supabase functions deploy jobs`
import { createClient } from "jsr:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { fetchAllJobs } from "../_shared/jobSources.ts";

const CACHE_TTL_MS = 10 * 60 * 1000;
const DESC_LIMIT = 1000; // chars; enough for scoring + preview, far smaller payload

// deno-lint-ignore no-explicit-any
function trimJobs(jobs: any[]): any[] {
  return jobs.map((j) => ({ ...j, description: String(j.description || "").slice(0, DESC_LIMIT) }));
}

function serviceClient() {
  return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const json = (obj: unknown, status = 200) =>
    new Response(JSON.stringify(obj), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  const svc = serviceClient();

  try {
    // Serve fresh cache if available.
    const { data: cached } = await svc.from("jobs_cache").select("data, fetched_at").eq("key", "all").maybeSingle();
    if (cached && Date.now() - new Date(cached.fetched_at).getTime() < CACHE_TTL_MS) {
      return json({ ...cached.data, cached: true });
    }

    const { jobs, sources, errors } = await fetchAllJobs();
    const trimmed = trimJobs(jobs);
    const payload = { count: trimmed.length, jobs: trimmed, sources, errors };

    // Only overwrite the cache when at least one source succeeded.
    if (trimmed.length > 0) {
      await svc.from("jobs_cache").upsert({ key: "all", data: payload, fetched_at: new Date().toISOString() });
      return json(payload);
    }
    // All sources failed — fall back to whatever is cached, even if stale.
    if (cached) return json({ ...cached.data, stale: true });
    return json(payload);
  } catch (e) {
    const { data: cached } = await svc.from("jobs_cache").select("data").eq("key", "all").maybeSingle();
    if (cached) return json({ ...cached.data, stale: true });
    return json({ error: String((e as Error).message) }, 500);
  }
});
