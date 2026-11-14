/**
 * Deterministic job match scoring.
 *
 * Produces a normalized 0-100 "match score" for a job against a user's profile,
 * plus the list of skills that matched and a short human-readable reason. This
 * runs locally (no per-job AI call) so it's fast and free at request time; the
 * AI's contribution is the *expanded* keyword/category set computed once at
 * resume-upload time and persisted on the user.
 *
 * Signal strength per matched skill:
 *   - title match            => 1.0  (strongest intent signal)
 *   - category / tag match   => 0.6
 *   - description match (>=2) => 0.3
 */

// Count non-overlapping occurrences of `needle` within `haystack` (both lower-cased).
function countOccurrences(haystack, needle) {
  if (!needle) return 0;
  return haystack.split(needle).length - 1;
}

// Break a skill into meaningful word parts, keeping useful short tokens like
// "go", "c#", "ai", "ml" and dropping noise.
function tokenize(skill) {
  const cleaned = String(skill).toLowerCase().trim();
  if (!cleaned) return [];
  // Split on whitespace, slashes and hyphens but keep symbols like + # . that
  // are part of tech names (c++, c#, node.js, .net).
  const parts = cleaned.split(/[\s/\-]+/).filter(Boolean);
  // Keep the whole phrase too (so "machine learning" can match as a phrase).
  if (parts.length > 1) parts.unshift(cleaned);
  return parts.filter((p) => p.length >= 2);
}

// Synonyms / abbreviations so a résumé skill matches the way a JD phrases it
// (e.g. "k8s" in a résumé matches "Kubernetes" in a posting). Bidirectional.
const SYNONYMS = {
  js: ['javascript'], javascript: ['js'],
  ts: ['typescript'], typescript: ['ts'],
  node: ['node.js', 'nodejs'], 'node.js': ['node', 'nodejs'], nodejs: ['node', 'node.js'],
  react: ['reactjs', 'react.js'], reactjs: ['react'], 'react.js': ['react'],
  next: ['next.js', 'nextjs'], 'next.js': ['next', 'nextjs'], nextjs: ['next.js'],
  vue: ['vuejs', 'vue.js'], angular: ['angularjs'],
  k8s: ['kubernetes'], kubernetes: ['k8s'],
  ml: ['machine learning'], 'machine learning': ['ml'],
  ai: ['artificial intelligence'], nlp: ['natural language processing'],
  cv: ['computer vision'], dl: ['deep learning'],
  postgres: ['postgresql'], postgresql: ['postgres'],
  mongo: ['mongodb'], mongodb: ['mongo'],
  py: ['python'], golang: ['go'], go: ['golang'],
  gcp: ['google cloud'], aws: ['amazon web services'], azure: ['microsoft azure'],
  tf: ['tensorflow'], 'ci/cd': ['cicd', 'continuous integration'],
  rest: ['restful', 'rest api'], gql: ['graphql'],
  tailwind: ['tailwindcss'], 'tailwind css': ['tailwind'],
  'c#': ['csharp'], 'c++': ['cpp'], '.net': ['dotnet'],
};

function variantsOf(skill) {
  const s = String(skill).toLowerCase().trim();
  const set = new Set([s]);
  (SYNONYMS[s] || []).forEach((v) => set.add(v));
  return [...set];
}

function bestSignalForSkill(skill, fields) {
  const { title, category, tags, description } = fields;
  let best = 0;
  // Consider the skill plus its synonyms, so "k8s" ≈ "kubernetes" etc.
  for (const variant of variantsOf(skill)) {
    for (const part of tokenize(variant)) {
      if (title.includes(part)) best = Math.max(best, 1.0);
      if (category.includes(part) || tags.some((t) => t.includes(part))) best = Math.max(best, 0.6);
      if (countOccurrences(description, part) >= 2) best = Math.max(best, 0.3);
      if (best === 1.0) return best; // can't do better
    }
  }
  return best;
}

/**
 * @param {object} job     Remotive job object
 * @param {object} profile { coreSkills: string[], expansionTerms: string[] }
 * @returns {{ matchScore:number, matchedSkills:string[], matchReasons:string[] }}
 */
function scoreJob(job, profile) {
  const fields = {
    title: (job.title || '').toLowerCase(),
    category: (job.category || '').toLowerCase(),
    tags: (job.tags || []).map((t) => String(t).toLowerCase()),
    description: (job.description || '').toLowerCase(),
  };

  const coreSkills = Array.from(new Set((profile.coreSkills || []).map((s) => String(s).toLowerCase().trim()).filter(Boolean)));
  const expansionTerms = Array.from(
    new Set((profile.expansionTerms || []).map((s) => String(s).toLowerCase().trim()).filter(Boolean))
  ).filter((t) => !coreSkills.includes(t));

  if (coreSkills.length === 0) {
    return { matchScore: null, matchedSkills: [], matchReasons: [] };
  }

  const matchedSkills = [];
  const titleSkills = [];
  let qualitySum = 0;
  for (const skill of coreSkills) {
    const signal = bestSignalForSkill(skill, fields);
    if (signal > 0) {
      matchedSkills.push(skill);
      qualitySum += signal;
      if (signal >= 1.0) titleSkills.push(skill);
    }
  }

  const coverage = matchedSkills.length / coreSkills.length; // 0..1
  const avgQuality = matchedSkills.length ? qualitySum / matchedSkills.length : 0; // 0..1

  // Supplementary signal from AI-expanded terms / job categories (bonus only).
  let categoryBonus = 0;
  for (const term of expansionTerms) {
    const signal = bestSignalForSkill(term, fields);
    if (signal >= 0.6) {
      categoryBonus = 0.1;
      break;
    }
  }

  const score01 = Math.min(1, coverage * 0.55 + avgQuality * 0.35 + categoryBonus);
  const matchScore = Math.round(score01 * 100);

  // Build human-readable reasons (consumed by the JobCard "Why this is a match" panel).
  const matchReasons = [];
  if (matchedSkills.length > 0) {
    const shown = matchedSkills.slice(0, 5).join(', ');
    matchReasons.push(
      `Matches ${matchedSkills.length} of your ${coreSkills.length} skills: ${shown}${matchedSkills.length > 5 ? ', …' : ''}`
    );
  }
  if (titleSkills.length > 0) {
    matchReasons.push(`The role title directly mentions ${titleSkills.slice(0, 3).join(', ')}`);
  }
  if (categoryBonus > 0) {
    matchReasons.push('Falls within your target job category');
  }

  return { matchScore, matchedSkills, matchReasons };
}

export { scoreJob };
