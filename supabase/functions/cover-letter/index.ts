// HireFlow — cover-letter Edge Function.
// Generates a tailored cover letter and caches it on the application row.
// Deploy: `supabase functions deploy cover-letter`
import { corsHeaders } from "../_shared/cors.ts";
import { callGemini, geminiKey, userClient, withinAiQuota } from "../_shared/gemini.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const json = (obj: unknown, status = 200) =>
    new Response(JSON.stringify(obj), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    const { applicationId, jobDescription, jobTitle, companyName, userSkills, userName } = await req.json();
    if (!jobDescription || !jobTitle || !companyName) return json({ error: "Missing required fields" }, 400);

    const supabase = userClient(req);

    if (applicationId) {
      const { data } = await supabase.from("applications").select("cover_letter").eq("id", applicationId).maybeSingle();
      if (data?.cover_letter) return json({ success: true, coverLetter: data.cover_letter, cached: true });
    }

    if (!geminiKey()) return json({ error: "AI is not configured (GEMINI_API_KEY missing)" }, 400);
    if (!(await withinAiQuota(req))) return json({ error: "Daily AI limit reached. Please try again tomorrow." }, 429);

    const prompt = `You are a professional career coach. Write a compelling, personalized cover letter.

Job Title: ${jobTitle}
Company: ${companyName}
Applicant Name: ${userName || "Candidate"}
Skills: ${Array.isArray(userSkills) ? userSkills.join(", ") : userSkills || "N/A"}

Job Description:
${String(jobDescription).slice(0, 2500)}

Write a cover letter that shows enthusiasm, highlights relevant skills, demonstrates understanding of the role, is concise (3-4 paragraphs), and uses a professional but personable tone.
Format: plain text, ready to copy-paste. Use the actual name provided — no placeholders like [Your Name].`;

    const coverLetter = await callGemini(prompt, { temperature: 0.7, maxOutputTokens: 1500 });

    if (applicationId) {
      await supabase.from("applications").update({ cover_letter: coverLetter }).eq("id", applicationId);
    }
    return json({ success: true, coverLetter });
  } catch (e) {
    return json({ error: "Failed to generate cover letter", message: String((e as Error).message) }, 500);
  }
});
