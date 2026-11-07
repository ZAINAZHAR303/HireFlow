// HireFlow — jobs Edge Function.
// Fetches and aggregates several free job boards (via _shared/jobSources),
// normalizes, de-duplicates, and returns them. Scoring runs client-side.
// Deploy: `supabase functions deploy jobs`
import { corsHeaders } from "../_shared/cors.ts";
import { fetchAllJobs } from "../_shared/jobSources.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  try {
    const { jobs, sources, errors } = await fetchAllJobs();
    return new Response(
      JSON.stringify({ count: jobs.length, jobs, sources, errors }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as Error).message) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
