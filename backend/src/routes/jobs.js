const express = require('express');
const JobCache = require('../models/jobCache');
const authMiddleware = require('../middleware/authMiddleware');
const { scoreJob } = require('../utils/jobScoring');
const { fetchAllJobs } = require('../services/jobSources');

const router = express.Router();

// Fetch (and cache) the merged, de-duplicated job list from all enabled sources.
async function getAllJobs() {
  const key = 'all';
  const cached = await JobCache.findOne({ key });
  const TTL_MS = 1000 * 60 * 10; // 10 minutes
  if (cached && Date.now() - cached.fetchedAt.getTime() < TTL_MS) return cached.data;

  const { jobs, sources, errors } = await fetchAllJobs();
  console.log(`📥 Fetched ${jobs.length} jobs from [${sources.join(', ')}]${errors.length ? `, ${errors.length} source(s) failed` : ''}`);

  // Only refresh the cache when at least one source succeeded, so a transient
  // outage doesn't blow away a good cached list.
  if (jobs.length > 0) {
    await JobCache.findOneAndUpdate({ key }, { data: { jobs }, fetchedAt: new Date() }, { upsert: true });
    return { jobs };
  }
  return cached ? cached.data : { jobs: [] };
}

router.get('/', authMiddleware, async (req, res) => {
  try {
    const user = req.user;
    const all = await getAllJobs();
    let jobs = all.jobs || [];

    const coreSkills = user.skills || [];

    // No skills yet: return recent jobs unscored so the user still sees content.
    if (coreSkills.length === 0) {
      return res.json({
        count: jobs.length,
        jobs: jobs.slice(0, 100),
        message: 'Add skills or upload a resume to get personalized match scores.',
      });
    }

    // AI-expanded terms (persisted at resume upload) act as supplementary signals.
    const expansionTerms = [...(user.searchKeywords || []), ...(user.jobCategories || [])];
    const profile = { coreSkills, expansionTerms };

    console.log(`🔍 Scoring ${jobs.length} jobs against ${coreSkills.length} skills (+${expansionTerms.length} expanded)`);

    // Score every job, keep only those with at least one skill match.
    let scored = jobs
      .map((job) => {
        const { matchScore, matchedSkills, matchReasons } = scoreJob(job, profile);
        return { ...job, matchScore, matchedSkills, matchReasons };
      })
      .filter((job) => job.matchedSkills.length > 0 && job.matchScore >= 15)
      .sort((a, b) => b.matchScore - a.matchScore);

    // Filter by preferred job types if specified.
    const pref = (user.preferredJobTypes || []).map((s) => s.toLowerCase()).filter(Boolean);
    if (pref.length > 0) {
      scored = scored.filter((job) => {
        const jt = (job.job_type || '').toLowerCase();
        if (!jt) return true;
        return pref.includes(jt) || pref.some((p) => jt.includes(p));
      });
    }

    // Filter by preferred locations when the user wants onsite/hybrid.
    const prefLocations = (user.preferredLocations || []).map((l) => l.toLowerCase()).filter(Boolean);
    if (prefLocations.length > 0 && (pref.includes('onsite') || pref.includes('hybrid'))) {
      scored = scored.filter((job) => {
        const location = (job.candidate_required_location || '').toLowerCase();
        if (!location) return true;
        return prefLocations.some((loc) => location.includes(loc));
      });
    }

    console.log(`✅ Returning ${scored.length} matched jobs (of ${jobs.length})`);

    res.json({
      count: scored.length,
      jobs: scored,
      message:
        scored.length === 0
          ? "We couldn't find jobs matching your skills. Try adding more skills or adjusting your preferences."
          : undefined,
    });
  } catch (err) {
    console.error('jobs error', err);
    res.status(500).json({ error: 'failed to fetch jobs' });
  }
});

module.exports = router;
