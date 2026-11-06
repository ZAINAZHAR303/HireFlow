// HireFlow — resume-generate Edge Function.
// Tailors the user's latest resume to a job description via Gemini.
// Deploy: `supabase functions deploy resume-generate`
import { corsHeaders } from "../_shared/cors.ts";
import { callGemini, geminiKey, userClient } from "../_shared/gemini.ts";

const SKILL_KEYWORDS = [
  "javascript", "typescript", "python", "java", "react", "angular", "vue", "node",
  "express", "django", "flask", "spring", "mongodb", "postgresql", "mysql", "aws",
  "azure", "gcp", "docker", "kubernetes", "git", "agile", "scrum", "api", "rest",
  "graphql", "ci/cd", "jenkins", "terraform", "html", "css", "sass", "webpack",
  "redux", "next.js", "tailwind",
];

function parseJobDescription(jd: string) {
  const lower = (jd || "").toLowerCase();
  const requiredSkills = SKILL_KEYWORDS.filter((s) => lower.includes(s));
  let seniority = "Mid-level";
  if (/senior|lead|principal/.test(lower)) seniority = "Senior";
  else if (/junior|entry|graduate/.test(lower)) seniority = "Junior";
  const yearsMatch = jd.match(/(\d+)\+?\s*years?/i);
  const yearsRequired = yearsMatch ? parseInt(yearsMatch[1]) : null;
  return { requiredSkills, seniority, yearsRequired, keywords: requiredSkills };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const json = (obj: unknown, status = 200) =>
    new Response(JSON.stringify(obj), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    const { jobTitle, jobCompany, jobDescription, tone = "professional" } = await req.json();
    if (!jobDescription) return json({ error: "Job description is required" }, 400);
    if (!geminiKey()) return json({ error: "AI is not configured (GEMINI_API_KEY missing)" }, 400);

    const { data: resume } = await userClient(req)
      .from("resumes")
      .select("text")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const resumeText = resume?.text || "";
    if (!resumeText) {
      return json({ error: "No resume found. Upload your resume first." }, 404);
    }

    const parsedJD = parseJobDescription(jobDescription);
    const prompt = `You are an expert resume writer and ATS optimization specialist. Tailor a resume to a specific job while staying truthful.

**Job Title:** ${jobTitle}
**Company:** ${jobCompany}
**Seniority Level:** ${parsedJD.seniority}
**Required Skills:** ${parsedJD.requiredSkills.join(", ")}

**Job Description:**
${String(jobDescription).slice(0, 2000)}

**Current Resume:**
${resumeText.slice(0, 2000)}

**Tone:** ${tone}

Generate a tailored resume with: Professional Summary (2-3 sentences), Key Skills (8-12 matching skills), and Experience Bullets (5-7 achievement-focused, keyword-rich, quantified, strong action verbs).
ATS rules: use exact keywords from the JD, include acronyms and full terms, quantify achievements, standard section headings, no tables/graphics. Format the output in clean Markdown.`;

    const content = await callGemini(prompt, { temperature: 0.7, maxOutputTokens: 8000 });

    return json({
      success: true,
      resume: {
        content,
        format: "markdown",
        parsedJobData: {
          requiredSkills: parsedJD.requiredSkills,
          seniority: parsedJD.seniority,
          yearsRequired: parsedJD.yearsRequired,
          keywords: parsedJD.keywords,
        },
      },
    });
  } catch (e) {
    return json({ error: "Failed to generate resume", message: String((e as Error).message) }, 500);
  }
});
