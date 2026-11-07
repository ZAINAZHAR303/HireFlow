// HireFlow — daily-digest Edge Function.
// For every opted-in user, scores the latest jobs against their profile and
// emails their top new matches (via Resend). Meant to be invoked by a daily
// pg_cron job using the project's service_role key.
//
// Guard: the caller's JWT must carry role=service_role (the platform verifies
// the signature; this blocks ordinary logged-in users from triggering a send).
// Body: { "dryRun": true } computes without sending or recording.
import { createClient } from "jsr:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { fetchAllJobs } from "../_shared/jobSources.ts";
import { scoreJob } from "../_shared/scoring.ts";

const TOP_N = 6;
const MIN_SCORE = 30;

function digestHtml(name: string, jobs: { title: string; company_name: string; url: string; matchScore: number }[]): string {
  const rows = jobs.map((j) => `
    <tr><td style="padding:12px 0;border-bottom:1px solid #eee;">
      <a href="${j.url}" style="font-size:16px;font-weight:600;color:#1e293b;text-decoration:none;">${j.title}</a>
      <div style="color:#64748b;font-size:14px;">${j.company_name}
        <span style="background:#eef2ff;color:#4f46e5;border-radius:10px;padding:2px 8px;font-size:12px;margin-left:6px;">${j.matchScore}% match</span>
      </div>
    </td></tr>`).join("");
  return `<div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;">
    <h2 style="color:#4f46e5;">Your HireFlow matches${name ? ", " + name : ""} 👋</h2>
    <p style="color:#475569;">${jobs.length} new role${jobs.length === 1 ? "" : "s"} matched your skills today.</p>
    <table style="width:100%;border-collapse:collapse;">${rows}</table>
    <p style="color:#94a3b8;font-size:12px;margin-top:24px;">You receive these because job alerts are on in HireFlow. Turn them off in your dashboard anytime.</p>
  </div>`;
}

async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  const key = Deno.env.get("RESEND_API_KEY");
  if (!key) return false;
  const from = Deno.env.get("RESEND_FROM") || "HireFlow <onboarding@resend.dev>";
  const resp = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to, subject, html }),
  });
  return resp.ok;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const json = (obj: unknown, status = 200) =>
    new Response(JSON.stringify(obj), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  // Guard: require a service_role caller (signature already checked by the
  // platform when JWT verification is on).
  const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  let role = "";
  try {
    role = JSON.parse(atob(token.split(".")[1] || "")).role;
  } catch (_) { /* ignore */ }
  if (role !== "service_role") return json({ error: "forbidden" }, 403);

  const body = await req.json().catch(() => ({}));
  const dryRun = !!body.dryRun;

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  // Opted-in users with an email + at least one skill.
  const { data: profiles, error: pErr } = await supabase
    .from("profiles")
    .select("id,email,name,skills,search_keywords,job_categories")
    .eq("job_alerts_enabled", true);
  if (pErr) return json({ error: pErr.message }, 500);

  const recipients = (profiles || []).filter((p) => p.email && (p.skills || []).length > 0);
  if (recipients.length === 0) return json({ usersProcessed: 0, emailsSent: 0, dryRun, note: "no opted-in users with skills" });

  const { jobs, sources, errors } = await fetchAllJobs();

  let emailsSent = 0;
  const sample: unknown[] = [];

  for (const p of recipients) {
    const expansionTerms = [...(p.search_keywords || []), ...(p.job_categories || [])];
    const scored = jobs
      .map((job) => ({ job, ...scoreJob(job, { coreSkills: p.skills, expansionTerms }) }))
      .filter((s) => s.matchScore !== null && s.matchScore >= MIN_SCORE && s.matchedSkills.length > 0)
      .sort((a, b) => (b.matchScore as number) - (a.matchScore as number));

    // Exclude jobs already emailed to this user.
    const { data: sent } = await supabase.from("job_alert_sent").select("job_id").eq("user_id", p.id);
    const sentIds = new Set((sent || []).map((r) => r.job_id));
    const fresh = scored.filter((s) => !sentIds.has(s.job.id)).slice(0, TOP_N);
    if (fresh.length === 0) continue;

    const picks = fresh.map((s) => ({ title: s.job.title, company_name: s.job.company_name, url: s.job.url, matchScore: s.matchScore as number }));

    if (sample.length < 3) sample.push({ email: p.email, count: picks.length, top: picks.slice(0, 3) });

    if (!dryRun) {
      const ok = await sendEmail(p.email, `${picks.length} new job matches on HireFlow`, digestHtml(p.name, picks));
      if (ok) {
        emailsSent++;
        await supabase.from("job_alert_sent").upsert(fresh.map((s) => ({ user_id: p.id, job_id: s.job.id })), { onConflict: "user_id,job_id", ignoreDuplicates: true });
        await supabase.from("profiles").update({ job_alerts_last_sent_at: new Date().toISOString() }).eq("id", p.id);
      }
    }
  }

  return json({ usersProcessed: recipients.length, emailsSent, dryRun, emailConfigured: !!Deno.env.get("RESEND_API_KEY"), sources, sourceErrors: errors, sample });
});
