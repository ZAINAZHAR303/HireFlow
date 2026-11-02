const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { validateBody, outreachSchema } = require('../utils/validate');
const { buildOutreachPrompt, extractOutreachJson, fallbackOutreach } = require('../utils/outreachHelper');

const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent';

// POST /outreach/generate - Draft recruiter outreach (email + LinkedIn) for a job.
// Uses Gemini when GEMINI_API_KEY is set; otherwise returns a personalized
// template so the feature always works.
router.post('/generate', authMiddleware, validateBody(outreachSchema), async (req, res) => {
  const { jobTitle, companyName, jobDescription, tone = 'professional' } = req.body;
  const user = req.user;
  const job = { jobTitle, companyName, jobDescription };

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.json({ ...fallbackOutreach({ user, job, tone }), usedAI: false });
  }

  try {
    const prompt = buildOutreachPrompt({ user, job, tone });
    const response = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 1200 },
      }),
      signal: AbortSignal.timeout(30000),
    });

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const parsed = extractOutreachJson(text);

    if (!parsed) {
      // AI responded but not in a usable shape — fall back gracefully.
      return res.json({ ...fallbackOutreach({ user, job, tone }), usedAI: false });
    }

    res.json({ email: parsed.email, linkedin: parsed.linkedin, usedAI: true });
  } catch (err) {
    console.error('outreach generate error:', err.message);
    res.json({ ...fallbackOutreach({ user, job, tone }), usedAI: false });
  }
});

module.exports = router;
