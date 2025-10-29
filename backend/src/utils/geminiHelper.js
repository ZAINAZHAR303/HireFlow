const axios = require('axios');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';

/**
 * Extract skills and job categories from resume text using Gemini
 */
async function extractSkillsFromResume(resumeText) {
  if (!GEMINI_API_KEY) {
    console.warn('GEMINI_API_KEY not set, using basic extraction');
    return { skills: [], jobCategories: [] };
  }

  const prompt = `Analyze this resume and extract:
1. Technical skills (programming languages, frameworks, tools)
2. Broad job categories this person qualifies for (e.g., "Software Development", "Data Science", "DevOps", "Product Management")

Resume:
${resumeText.slice(0, 3000)}

Respond in JSON format:
{
  "skills": ["skill1", "skill2", ...],
  "jobCategories": ["category1", "category2", ...]
}`;

  try {
    const response = await axios.post(
      `${GEMINI_API_URL}?key=${GEMINI_API_KEY}`,
      {
        contents: [{
          parts: [{ text: prompt }]
        }]
      }
    );

    const text = response.data.candidates[0].content.parts[0].text;
    // Extract JSON from response (might be wrapped in markdown code blocks)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        skills: parsed.skills || [],
        jobCategories: parsed.jobCategories || []
      };
    }
    return { skills: [], jobCategories: [] };
  } catch (err) {
    console.error('Gemini API error:', err.message);
    return { skills: [], jobCategories: [] };
  }
}

/**
 * Expand user search terms into broader job categories using Gemini
 */
async function expandSearchTerms(searchTerms) {
  if (!GEMINI_API_KEY || !searchTerms || searchTerms.length === 0) {
    return searchTerms || [];
  }

  const prompt = `Given these job search terms: ${searchTerms.join(', ')}

Expand them into related job categories, technologies, and synonyms that would help find relevant jobs.
For example:
- "react js, next js" → ["React", "Next.js", "JavaScript", "Frontend Development", "Web Development", "UI Development", "Software Development"]
- "full stack developer" → ["Full Stack", "Frontend", "Backend", "Software Development", "Web Development", "JavaScript", "Node.js"]

Return only a JSON array of expanded terms (no explanation):
["term1", "term2", ...]`;

  try {
    const response = await axios.post(
      `${GEMINI_API_URL}?key=${GEMINI_API_KEY}`,
      {
        contents: [{
          parts: [{ text: prompt }]
        }]
      }
    );

    const text = response.data.candidates[0].content.parts[0].text;
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return parsed;
    }
    return searchTerms;
  } catch (err) {
    console.error('Gemini API error:', err.message);
    return searchTerms;
  }
}

module.exports = {
  extractSkillsFromResume,
  expandSearchTerms
};
