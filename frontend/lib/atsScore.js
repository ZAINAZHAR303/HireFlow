/**
 * ATS (Applicant Tracking System) resume scoring + keyword-gap analysis.
 *
 * Deterministic and dependency-free: given a resume's text and a job
 * description, it extracts the relevant keywords/skills the JD asks for,
 * checks which appear in the resume, and returns a 0-100 score plus the
 * matched / missing keywords and concrete suggestions.
 *
 * This is the core logic behind "will my resume pass the keyword filter?" —
 * the same question Teal/Jobscan-style tools answer.
 */

// Curated keyword dictionary grouped by theme. Extend freely.
const KEYWORD_DICTIONARY = [
  // Languages
  'javascript', 'typescript', 'python', 'java', 'c++', 'c#', 'go', 'golang', 'rust', 'ruby', 'php',
  'swift', 'kotlin', 'scala', 'r', 'matlab', 'perl', 'dart', 'sql',
  // Frontend
  'react', 'next.js', 'nextjs', 'vue', 'angular', 'svelte', 'redux', 'tailwind', 'sass', 'webpack',
  'html', 'css', 'jquery', 'bootstrap', 'material-ui',
  // Backend / frameworks
  'node', 'node.js', 'express', 'nestjs', 'django', 'flask', 'fastapi', 'spring', 'spring boot',
  'rails', 'laravel', '.net', 'asp.net', 'graphql', 'rest', 'grpc', 'microservices',
  // Data / ML
  'machine learning', 'deep learning', 'tensorflow', 'pytorch', 'pandas', 'numpy', 'scikit-learn',
  'nlp', 'computer vision', 'data analysis', 'data science', 'etl', 'spark', 'hadoop', 'kafka',
  'tableau', 'power bi', 'looker',
  // Databases
  'mongodb', 'postgresql', 'postgres', 'mysql', 'redis', 'elasticsearch', 'dynamodb', 'cassandra',
  'sqlite', 'oracle', 'firebase', 'supabase',
  // Cloud / DevOps
  'aws', 'azure', 'gcp', 'google cloud', 'docker', 'kubernetes', 'terraform', 'ansible', 'jenkins',
  'ci/cd', 'github actions', 'gitlab', 'circleci', 'serverless', 'lambda', 'nginx', 'linux',
  // Practices / tools
  'agile', 'scrum', 'kanban', 'jira', 'git', 'tdd', 'unit testing', 'integration testing', 'jest',
  'cypress', 'playwright', 'figma', 'api', 'oauth', 'jwt', 'websocket',
  // Roles / soft
  'leadership', 'communication', 'mentoring', 'stakeholder', 'cross-functional', 'problem solving',
  'project management', 'product management',
];

// Words that often precede a hard requirement in a JD.
const REQUIRED_MARKERS = ['required', 'must have', 'must-have', 'minimum', 'essential', 'proficient', 'strong'];

function normalize(text) {
  return String(text || '').toLowerCase();
}

// Whole-token match so "r" doesn't match "react" and "go" doesn't match
// "good", while still matching symbol-laden tech names (c++, c#, .net, node.js).
function contains(haystack, keyword) {
  const esc = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`(?<![a-z0-9])${esc}(?![a-z0-9])`, 'i');
  return re.test(haystack);
}

/**
 * Extract the keywords a job description cares about.
 * Returns [{ keyword, required }].
 */
function extractJdKeywords(jobDescription) {
  const jd = normalize(jobDescription);
  const found = [];
  const seen = new Set();
  for (const keyword of KEYWORD_DICTIONARY) {
    if (seen.has(keyword)) continue;
    if (contains(jd, keyword)) {
      // Heuristic: treat as "required" if a requirement marker appears near it.
      const idx = jd.indexOf(keyword);
      const window = jd.slice(Math.max(0, idx - 60), idx + keyword.length + 10);
      const required = REQUIRED_MARKERS.some((m) => window.includes(m));
      found.push({ keyword, required });
      seen.add(keyword);
    }
  }
  return found;
}

function detectSeniority(jobDescription) {
  const jd = normalize(jobDescription);
  if (/\b(senior|lead|principal|staff|architect)\b/.test(jd)) return 'Senior';
  if (/\b(junior|entry|graduate|intern)\b/.test(jd)) return 'Junior';
  return 'Mid-level';
}

function resumeStructureScore(resumeText) {
  const text = normalize(resumeText);
  const checks = {
    hasEmail: /[\w.+-]+@[\w-]+\.[\w.-]+/.test(resumeText || ''),
    hasPhone: /(\+?\d[\d\s().-]{7,})/.test(resumeText || ''),
    hasExperience: /(experience|employment|work history)/.test(text),
    hasEducation: /(education|university|bachelor|master|b\.?s\.?|degree)/.test(text),
    reasonableLength: (resumeText || '').length >= 400,
  };
  const passed = Object.values(checks).filter(Boolean).length;
  return { score: passed / Object.keys(checks).length, checks };
}

/**
 * @param {string} resumeText
 * @param {string} jobDescription
 * @returns {{ atsScore, matchedKeywords, missingKeywords, requiredMissing, seniority, structure, suggestions }}
 */
function computeAtsScore(resumeText, jobDescription) {
  const resume = normalize(resumeText);
  const jdKeywords = extractJdKeywords(jobDescription);

  const matched = [];
  const missing = [];
  for (const { keyword, required } of jdKeywords) {
    if (contains(resume, keyword)) matched.push(keyword);
    else missing.push({ keyword, required });
  }

  const totalKeywords = jdKeywords.length;
  const keywordScore = totalKeywords === 0 ? 0.5 : matched.length / totalKeywords;

  const structure = resumeStructureScore(resumeText);

  // Missing *required* keywords hurt more than missing nice-to-haves.
  const requiredMissing = missing.filter((m) => m.required).map((m) => m.keyword);
  const requiredPenalty = Math.min(0.2, requiredMissing.length * 0.05);

  const atsScore = Math.max(
    0,
    Math.round((keywordScore * 0.8 + structure.score * 0.2 - requiredPenalty) * 100)
  );

  const suggestions = [];
  if (requiredMissing.length > 0) {
    suggestions.push(
      `Add these required keywords if you have the experience: ${requiredMissing.slice(0, 8).join(', ')}`
    );
  }
  const niceMissing = missing.filter((m) => !m.required).map((m) => m.keyword);
  if (niceMissing.length > 0) {
    suggestions.push(`Consider mentioning: ${niceMissing.slice(0, 8).join(', ')}`);
  }
  if (!structure.checks.hasEmail || !structure.checks.hasPhone) {
    suggestions.push('Make sure your email and phone number are clearly present near the top.');
  }
  if (!structure.checks.hasExperience) {
    suggestions.push('Add a clearly labeled "Experience" section — ATS parsers look for it.');
  }
  if (!structure.checks.hasEducation) {
    suggestions.push('Include an "Education" section.');
  }
  if (totalKeywords > 0 && matched.length / totalKeywords > 0.8) {
    suggestions.push('Great keyword coverage — tailor your summary line to mirror the job title too.');
  }

  return {
    atsScore,
    matchedKeywords: matched,
    missingKeywords: missing.map((m) => m.keyword),
    requiredMissing,
    seniority: detectSeniority(jobDescription),
    structure: structure.checks,
    totalKeywords,
    suggestions,
  };
}

export { computeAtsScore, extractJdKeywords };
