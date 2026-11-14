// HireFlow — outreach Edge Function.
// Drafts a recruiter email + LinkedIn message, personalized from the caller's
// profile. Uses Gemini when GEMINI_API_KEY is set; falls back to a template.
// Deploy: `supabase functions deploy outreach`
import { corsHeaders } from "../_shared/cors.ts";
import { callGemini, extractJson, geminiKey, userClient, withinAiQuota } from "../_shared/gemini.ts";

const TONES = ["professional", "warm", "confident", "concise"];

function cleanText(s: string): string {
  return String(s || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

// deno-lint-ignore no-explicit-any
function topSkills(user: any, n = 6): string[] {
  return (user?.skills || []).slice(0, n);
}

// deno-lint-ignore no-explicit-any
function buildPrompt(user: any, job: any, tone: string): string {
  const safeTone = TONES.includes(tone) ? tone : "professional";
  const skills = topSkills(user).join(", ") || "relevant experience";
  const jd = cleanText(job.jobDescription || "").slice(0, 1500);
  return `You are an expert career coach writing recruiter outreach for a job seeker.

Candidate:
- Name: ${user?.name || "the candidate"}
- Key skills: ${skills}
- LinkedIn: ${user?.linkedin || "n/a"}
- GitHub: ${user?.github || "n/a"}

Role:
- Title: ${job.jobTitle || "the role"}
- Company: ${job.companyName || "the company"}
- Job description (may be truncated): ${jd || "n/a"}

Write outreach in a ${safeTone} tone. Produce:
1. email: an object with "subject" (under 80 chars) and "body" (120-180 words, addressed to a recruiter, referencing 1-2 concrete skills that fit the role, with a clear call to action). Do not invent specific metrics or employers the candidate did not provide.
2. linkedin: an object with "body" (a connection-request / DM message under 90 words, friendlier and shorter than the email).

Use the candidate's real name as the sign-off. Do NOT fabricate experience.

IMPORTANT: Return ONLY a valid JSON object. No markdown, no code blocks, no extra text.
Format: {"email":{"subject":"...","body":"..."},"linkedin":{"body":"..."}}`;
}

// deno-lint-ignore no-explicit-any
function fallbackOutreach(user: any, job: any, tone: string) {
  const name = user?.name || "there";
  const firstName = name.split(" ")[0];
  const company = job.companyName || "your company";
  const title = job.jobTitle || "the open role";
  const skills = topSkills(user, 3);
  const skillPhrase = skills.length
    ? skills.length === 1 ? skills[0] : `${skills.slice(0, -1).join(", ")} and ${skills[skills.length - 1]}`
    : "the skills this role calls for";
  const greeting = tone === "warm" ? "Hi there," : "Hello,";
  const closer = tone === "warm" ? "Warm regards," : "Best regards,";
  const subject = `Application for ${title} at ${company}`;
  const body =
    `${greeting}\n\nI came across the ${title} opening at ${company} and wanted to reach out directly. ` +
    `I work with ${skillPhrase}, which lines up closely with what the role needs, and I'm excited about the opportunity to contribute.\n\n` +
    `I'd love to share how my background maps to your team's goals. Would you be open to a short conversation this week? ` +
    `I'm happy to send my resume and any work samples that would help.\n\n${closer}\n${name}` +
    (user?.linkedin ? `\n${user.linkedin}` : "");
  const linkedin =
    `Hi — I noticed ${company} is hiring for ${title}. I work with ${skillPhrase} and think I could be a strong fit. ` +
    `Would love to connect and learn more about the team. Thanks! — ${firstName}`;
  return { email: { subject, body }, linkedin: { body: linkedin } };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const json = (obj: unknown, status = 200) =>
    new Response(JSON.stringify(obj), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    const { jobTitle, companyName, jobDescription, tone = "professional" } = await req.json();
    if (!jobTitle || !companyName) return json({ error: "jobTitle and companyName are required" }, 400);

    // Load the caller's profile (RLS limits this to their own row).
    let profile: Record<string, unknown> = {};
    try {
      const { data } = await userClient(req).from("profiles").select("*").maybeSingle();
      if (data) profile = data;
    } catch (_) { /* fall through with empty profile */ }

    const job = { jobTitle, companyName, jobDescription };

    // No key, or over the daily AI limit → still return a usable template draft.
    if (!geminiKey() || !(await withinAiQuota(req))) {
      return json({ ...fallbackOutreach(profile, job, tone), usedAI: false });
    }
    try {
      const text = await callGemini(buildPrompt(profile, job, tone), { temperature: 0.7, maxOutputTokens: 1200 });
      const parsed = extractJson(text);
      if (parsed?.email && parsed?.linkedin) {
        return json({ email: parsed.email, linkedin: parsed.linkedin, usedAI: true });
      }
      return json({ ...fallbackOutreach(profile, job, tone), usedAI: false });
    } catch (_) {
      return json({ ...fallbackOutreach(profile, job, tone), usedAI: false });
    }
  } catch (e) {
    return json({ error: String((e as Error).message) }, 500);
  }
});
