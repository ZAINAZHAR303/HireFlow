/**
 * Recruiter-outreach drafting helpers.
 *
 * Pure functions: build the AI prompt, parse the AI's JSON, and produce a
 * deterministic template fallback when no AI key is configured (or the AI call
 * fails). The route layer handles the actual Gemini call.
 */

const TONES = ['professional', 'warm', 'confident', 'concise'];

function cleanText(s) {
  return String(s || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function topSkills(user, n = 3) {
  return (user.skills || []).slice(0, n);
}

/**
 * Build the prompt sent to the LLM. Kept pure so it can be unit-tested.
 */
function buildOutreachPrompt({ user, job, tone = 'professional' }) {
  const safeTone = TONES.includes(tone) ? tone : 'professional';
  const skills = topSkills(user, 6).join(', ') || 'relevant experience';
  const jd = cleanText(job.jobDescription || job.description || '').slice(0, 1500);

  return `You are an expert career coach writing recruiter outreach for a job seeker.

Candidate:
- Name: ${user.name || 'the candidate'}
- Key skills: ${skills}
- LinkedIn: ${user.linkedin || 'n/a'}
- GitHub: ${user.github || 'n/a'}

Role:
- Title: ${job.jobTitle || job.title || 'the role'}
- Company: ${job.companyName || job.company_name || 'the company'}
- Job description (may be truncated): ${jd || 'n/a'}

Write outreach in a ${safeTone} tone. Produce:
1. email: an object with "subject" (under 80 chars) and "body" (120-180 words, addressed to a recruiter, referencing 1-2 concrete skills that fit the role, with a clear call to action). Do not invent specific metrics or employers the candidate did not provide.
2. linkedin: an object with "body" (a connection-request / DM message under 90 words, friendlier and shorter than the email).

Use the candidate's real name as the sign-off. Do NOT fabricate experience.

IMPORTANT: Return ONLY a valid JSON object. No markdown, no code blocks, no extra text.
Format: {"email":{"subject":"...","body":"..."},"linkedin":{"body":"..."}}`;
}

/**
 * Parse an LLM response that should contain a JSON object, tolerating markdown
 * code fences and surrounding prose. Returns null if nothing usable is found.
 */
function extractOutreachJson(text) {
  if (!text) return null;
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  const candidate = fenced ? fenced[1] : (text.match(/\{[\s\S]*\}/) || [null])[0];
  if (!candidate) return null;
  try {
    const parsed = JSON.parse(candidate);
    if (parsed && parsed.email && parsed.linkedin) return parsed;
    return null;
  } catch {
    return null;
  }
}

/**
 * Deterministic, genuinely-usable outreach when AI is unavailable.
 */
function fallbackOutreach({ user, job, tone = 'professional' }) {
  const name = user.name || 'there';
  const firstName = name.split(' ')[0];
  const company = job.companyName || job.company_name || 'your company';
  const title = job.jobTitle || job.title || 'the open role';
  const skills = topSkills(user, 3);
  const skillPhrase = skills.length
    ? skills.length === 1
      ? skills[0]
      : `${skills.slice(0, -1).join(', ')} and ${skills[skills.length - 1]}`
    : 'the skills this role calls for';

  const greeting = tone === 'warm' ? 'Hi there,' : 'Hello,';
  const closer = tone === 'warm' ? 'Warm regards,' : 'Best regards,';

  const subject = `Application for ${title} at ${company}`;

  const body =
    `${greeting}\n\n` +
    `I came across the ${title} opening at ${company} and wanted to reach out directly. ` +
    `I work with ${skillPhrase}, which lines up closely with what the role needs, and I'm excited about the opportunity to contribute.\n\n` +
    `I'd love to share how my background maps to your team's goals. Would you be open to a short conversation this week? ` +
    `I'm happy to send my resume and any work samples that would help.\n\n` +
    `${closer}\n${name}` +
    (user.linkedin ? `\n${user.linkedin}` : '');

  const linkedin =
    `Hi — I noticed ${company} is hiring for ${title}. ` +
    `I work with ${skillPhrase} and think I could be a strong fit. ` +
    `Would love to connect and learn more about the team. Thanks! — ${firstName}`;

  return {
    email: { subject, body },
    linkedin: { body: linkedin },
  };
}

module.exports = {
  TONES,
  buildOutreachPrompt,
  extractOutreachJson,
  fallbackOutreach,
};
