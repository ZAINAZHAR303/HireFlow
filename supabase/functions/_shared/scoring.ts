// Shared deterministic job scoring (TS port of the tested lib/jobScoring.js).
import type { Job } from "./jobSources.ts";

function countOccurrences(haystack: string, needle: string): number {
  if (!needle) return 0;
  return haystack.split(needle).length - 1;
}

function tokenize(skill: string): string[] {
  const cleaned = String(skill).toLowerCase().trim();
  if (!cleaned) return [];
  const parts = cleaned.split(/[\s/\-]+/).filter(Boolean);
  if (parts.length > 1) parts.unshift(cleaned);
  return parts.filter((p) => p.length >= 2);
}

function bestSignalForSkill(skill: string, fields: { title: string; category: string; tags: string[]; description: string }): number {
  let best = 0;
  for (const part of tokenize(skill)) {
    if (fields.title.includes(part)) best = Math.max(best, 1.0);
    if (fields.category.includes(part) || fields.tags.some((t) => t.includes(part))) best = Math.max(best, 0.6);
    if (countOccurrences(fields.description, part) >= 2) best = Math.max(best, 0.3);
    if (best === 1.0) break;
  }
  return best;
}

export function scoreJob(
  job: Job,
  profile: { coreSkills: string[]; expansionTerms: string[] },
): { matchScore: number | null; matchedSkills: string[]; matchReasons: string[] } {
  const fields = {
    title: (job.title || "").toLowerCase(),
    category: (job.category || "").toLowerCase(),
    tags: (job.tags || []).map((t) => String(t).toLowerCase()),
    description: (job.description || "").toLowerCase(),
  };
  const coreSkills = Array.from(new Set((profile.coreSkills || []).map((s) => String(s).toLowerCase().trim()).filter(Boolean)));
  const expansionTerms = Array.from(new Set((profile.expansionTerms || []).map((s) => String(s).toLowerCase().trim()).filter(Boolean)))
    .filter((t) => !coreSkills.includes(t));

  if (coreSkills.length === 0) return { matchScore: null, matchedSkills: [], matchReasons: [] };

  const matchedSkills: string[] = [];
  const titleSkills: string[] = [];
  let qualitySum = 0;
  for (const skill of coreSkills) {
    const signal = bestSignalForSkill(skill, fields);
    if (signal > 0) { matchedSkills.push(skill); qualitySum += signal; if (signal >= 1.0) titleSkills.push(skill); }
  }

  const coverage = matchedSkills.length / coreSkills.length;
  const avgQuality = matchedSkills.length ? qualitySum / matchedSkills.length : 0;
  let categoryBonus = 0;
  for (const term of expansionTerms) {
    if (bestSignalForSkill(term, fields) >= 0.6) { categoryBonus = 0.1; break; }
  }
  const matchScore = Math.round(Math.min(1, coverage * 0.55 + avgQuality * 0.35 + categoryBonus) * 100);

  const matchReasons: string[] = [];
  if (matchedSkills.length > 0) {
    matchReasons.push(`Matches ${matchedSkills.length} of your ${coreSkills.length} skills: ${matchedSkills.slice(0, 5).join(", ")}${matchedSkills.length > 5 ? ", …" : ""}`);
  }
  if (titleSkills.length > 0) matchReasons.push(`The role title directly mentions ${titleSkills.slice(0, 3).join(", ")}`);
  if (categoryBonus > 0) matchReasons.push("Falls within your target job category");

  return { matchScore, matchedSkills, matchReasons };
}
