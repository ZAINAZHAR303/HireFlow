// HireFlow — interview-prep Edge Function.
// Generates STAR-method interview questions + company research for a job, and
// caches them on the application row. Deploy: `supabase functions deploy interview-prep`
import { corsHeaders } from "../_shared/cors.ts";
import { callGemini, extractJson, geminiKey, userClient, withinAiQuota } from "../_shared/gemini.ts";

function sampleQuestions(jobTitle: string, companyName: string) {
  return [
    { question: `Tell me about your experience with ${jobTitle} responsibilities.`, answer: `Situation: In a previous role I worked on similar ${jobTitle} tasks. Task: I was responsible for delivering results. Action: I collaborated across teams and applied best practices. Result: Completed projects with positive feedback.`, category: "behavioral" },
    { question: "Describe a challenging project and how you overcame obstacles.", answer: "Situation: A complex project with tight deadlines. Task: Deliver quality while managing stakeholders. Action: Broke work into tasks, prioritized, communicated often. Result: Delivered on time with high satisfaction.", category: "behavioral" },
    { question: `What technical skills are most important for a ${jobTitle}?`, answer: `Strong problem-solving, proficiency in the relevant tools, knowledge of best practices, and the ability to work in agile teams. Communication matters just as much.`, category: "technical" },
    { question: `Why are you interested in the ${jobTitle} position at ${companyName}?`, answer: `The role aligns with my goals and lets me apply my experience while learning. I admire ${companyName}'s mission and want to contribute.`, category: "general" },
    { question: "Describe your approach to problem-solving.", answer: "Define the problem, gather information, analyze root causes, brainstorm and evaluate solutions, implement the best one, and monitor results.", category: "technical" },
  ];
}

function sampleResearch(jobTitle: string, companyName: string) {
  const tech = /dev|engineer|software/i.test(jobTitle);
  return {
    summary: `${companyName} is a company in the ${tech ? "technology" : "business"} sector, focused on innovation and growth.`,
    keyFacts: ["Dynamic work environment", "Professional development opportunities", "Collaborative culture", "Focus on innovation and quality", "Competitive benefits"],
    culture: "Values collaboration, innovation, and continuous learning, with attention to work-life balance.",
    recentNews: `Demand for skilled ${jobTitle} professionals continues to grow across the industry.`,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const json = (obj: unknown, status = 200) =>
    new Response(JSON.stringify(obj), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    const { applicationId, jobDescription, jobTitle, companyName } = await req.json();
    if (!jobDescription || !jobTitle || !companyName) return json({ error: "Missing required fields" }, 400);

    const supabase = userClient(req);

    // Return cached prep if present.
    if (applicationId) {
      const { data } = await supabase.from("applications").select("interview_prep").eq("id", applicationId).maybeSingle();
      const cached = data?.interview_prep;
      if (cached?.questions?.length) return json({ success: true, interviewPrep: cached, cached: true });
    }

    let questions: unknown[] = [];
    let companyResearch: unknown = {};
    let fallback = false;

    if (geminiKey() && (await withinAiQuota(req))) {
      try {
        const qPrompt = `You are an expert interview coach. Generate 8 interview questions with model answers for this role.

Job Title: ${jobTitle}
Company: ${companyName}
Job Description: ${String(jobDescription).slice(0, 2000)}

For each: question, a detailed STAR-method answer, and category ("behavioral","technical","general").
Return ONLY a valid JSON array: [{"question":"...","answer":"...","category":"behavioral"}]`;
        const qText = await callGemini(qPrompt, { temperature: 0.7, maxOutputTokens: 3000 });
        questions = extractJson(qText) ?? [];

        const rPrompt = `Provide brief interview research for this company/role.
Company: ${companyName}
Job Title: ${jobTitle}
Return ONLY valid JSON: {"summary":"...","keyFacts":["..."],"culture":"...","recentNews":"..."}`;
        const rText = await callGemini(rPrompt, { temperature: 0.6, maxOutputTokens: 1500 });
        companyResearch = extractJson(rText) ?? {};
      } catch (_) {
        fallback = true;
      }
    } else {
      fallback = true;
    }

    if (fallback || !Array.isArray(questions) || questions.length === 0) {
      questions = sampleQuestions(jobTitle, companyName);
      companyResearch = sampleResearch(jobTitle, companyName);
      fallback = true;
    }

    const interviewPrep = { questions, companyResearch, preparedAt: new Date().toISOString() };
    if (applicationId) {
      await supabase.from("applications").update({ interview_prep: interviewPrep }).eq("id", applicationId);
    }
    return json({ success: true, interviewPrep: { questions, companyResearch }, fallback });
  } catch (e) {
    return json({ error: "Failed to generate interview preparation", message: String((e as Error).message) }, 500);
  }
});
