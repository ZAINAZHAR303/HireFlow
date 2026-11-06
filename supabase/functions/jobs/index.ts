// HireFlow — jobs Edge Function.
// Fetches and aggregates several free job boards, normalizes them to one shape,
// de-duplicates, and returns them. Scoring/filtering happens client-side using
// the user's profile. Deploy: `supabase functions deploy jobs`.
import { corsHeaders } from "../_shared/cors.ts";

const HTTP_TIMEOUT = 15000;
const USER_AGENT = "HireFlow/1.0 (+https://github.com/ZAINAZHAR303/HireFlow)";

type Job = {
  id: string;
  title: string;
  company_name: string;
  category: string;
  tags: string[];
  job_type: string;
  candidate_required_location: string;
  url: string;
  description: string;
  publication_date: string | null;
  source: string;
};

function toStringArray(val: unknown): string[] {
  if (Array.isArray(val)) return val.map((v) => String(v)).filter(Boolean);
  if (typeof val === "string") {
    return val.split(",").map((s) => s.trim()).filter(Boolean);
  }
  return [];
}

// deno-lint-ignore no-explicit-any
function normalizeRemotive(data: any): Job[] {
  const jobs = data?.jobs ?? [];
  // deno-lint-ignore no-explicit-any
  return jobs.map((j: any) => ({
    id: `remotive_${j.id}`,
    title: j.title ?? "",
    company_name: j.company_name ?? "",
    category: j.category ?? "",
    tags: toStringArray(j.tags),
    job_type: j.job_type ?? "",
    candidate_required_location: j.candidate_required_location ?? "",
    url: j.url ?? "",
    description: j.description ?? "",
    publication_date: j.publication_date ?? null,
    source: "remotive",
  }));
}

// deno-lint-ignore no-explicit-any
function normalizeArbeitnow(data: any): Job[] {
  const jobs = data?.data ?? [];
  // deno-lint-ignore no-explicit-any
  return jobs.map((j: any) => ({
    id: `arbeitnow_${j.slug}`,
    title: j.title ?? "",
    company_name: j.company_name ?? "",
    category: toStringArray(j.job_types)[0] ?? "",
    tags: toStringArray(j.tags),
    job_type: toStringArray(j.job_types)[0] ?? (j.remote ? "remote" : ""),
    candidate_required_location: j.location ?? (j.remote ? "Remote" : ""),
    url: j.url ?? "",
    description: j.description ?? "",
    publication_date: j.created_at
      ? new Date(j.created_at * 1000).toISOString()
      : null,
    source: "arbeitnow",
  }));
}

// deno-lint-ignore no-explicit-any
function normalizeRemoteOk(data: any): Job[] {
  const arr = Array.isArray(data) ? data.filter((x) => x && (x.id || x.slug)) : [];
  // deno-lint-ignore no-explicit-any
  return arr.map((j: any) => ({
    id: `remoteok_${j.id ?? j.slug}`,
    title: j.position ?? j.title ?? "",
    company_name: j.company ?? "",
    category: "",
    tags: toStringArray(j.tags),
    job_type: "remote",
    candidate_required_location: j.location ?? "Remote",
    url: j.url ?? (j.slug ? `https://remoteok.com/remote-jobs/${j.slug}` : ""),
    description: j.description ?? "",
    publication_date: j.date ?? null,
    source: "remoteok",
  }));
}

const SOURCES: Record<string, { url: string; normalize: (d: unknown) => Job[] }> = {
  remotive: { url: "https://remotive.com/api/remote-jobs", normalize: normalizeRemotive },
  arbeitnow: { url: "https://www.arbeitnow.com/api/job-board-api", normalize: normalizeArbeitnow },
  remoteok: { url: "https://remoteok.com/api", normalize: normalizeRemoteOk },
};

function enabledSources(): string[] {
  const raw = (Deno.env.get("JOB_SOURCES") ?? "remotive,arbeitnow,remoteok")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return raw.filter((n) => SOURCES[n]);
}

async function fetchSource(name: string): Promise<Job[]> {
  const src = SOURCES[name];
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), HTTP_TIMEOUT);
  try {
    const resp = await fetch(src.url, {
      headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
      signal: controller.signal,
    });
    if (!resp.ok) throw new Error(`${name} responded ${resp.status}`);
    return src.normalize(await resp.json());
  } finally {
    clearTimeout(timer);
  }
}

function dedupe(jobs: Job[]): Job[] {
  const seen = new Set<string>();
  const out: Job[] = [];
  for (const job of jobs) {
    const key = `${(job.company_name || "").toLowerCase().trim()}::${(job.title || "").toLowerCase().trim()}`;
    if (key === "::" || seen.has(key)) continue;
    seen.add(key);
    out.push(job);
  }
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  try {
    const names = enabledSources();
    const results = await Promise.allSettled(names.map((n) => fetchSource(n)));
    const jobs: Job[] = [];
    const sources: string[] = [];
    const errors: { source: string; message: string }[] = [];
    results.forEach((r, i) => {
      if (r.status === "fulfilled") {
        sources.push(names[i]);
        jobs.push(...r.value);
      } else {
        errors.push({ source: names[i], message: String(r.reason?.message ?? r.reason) });
      }
    });
    return new Response(
      JSON.stringify({ count: jobs.length, jobs: dedupe(jobs), sources, errors }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as Error).message) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
