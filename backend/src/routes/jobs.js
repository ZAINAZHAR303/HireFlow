const express = require('express');
const axios = require('axios');
const JobCache = require('../models/jobCache');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

const REMOTIVE_URL = 'https://remotive.com/api/remote-jobs';

async function fetchRemotiveAll() {
  // cache key 'all'
  const key = 'all';
  const cached = await JobCache.findOne({ key });
  const TTL_MS = 1000 * 60 * 10; // 10 minutes
  if (cached && (Date.now() - cached.fetchedAt.getTime()) < TTL_MS) return cached.data;
  const resp = await axios.get(REMOTIVE_URL);
  const data = resp.data;
  await JobCache.findOneAndUpdate({ key }, { data, fetchedAt: new Date() }, { upsert: true });
  return data;
}

router.get('/', authMiddleware, async (req, res) => {
  try {
    const user = req.user;
    const remotive = await fetchRemotiveAll();
    let jobs = remotive.jobs || [];
    
    // Get user's skills directly
    const userSkills = user.skills || [];
    
    if (userSkills.length === 0) {
      // No skills - return all jobs
      return res.json({ count: jobs.length, jobs });
    }
    
    // Simple keyword-based filtering using user skills
    console.log(`🔍 Filtering jobs with ${userSkills.length} skills:`, userSkills.join(', '));
    
    // Filter jobs using user skills with weighted scoring
    const keywords = userSkills.map(k => k.toLowerCase().trim());
    let filteredJobs = [];
    
    if (keywords.length > 0) {
      // Score each job based on skill matches
      const scoredJobs = jobs.map(job => {
        const title = (job.title || '').toLowerCase();
        const category = (job.category || '').toLowerCase();
        const tags = (job.tags || []).map(t => t.toLowerCase());
        const description = (job.description || '').toLowerCase();
        
        let score = 0;
        const matchedSkills = new Set();
        
        keywords.forEach(keyword => {
          const skillParts = keyword.split(/[\s\/\-]+/);
          
          skillParts.forEach(part => {
            if (part.length < 3) return; // Skip very short words
            
            // High priority: Match in job title (10 points)
            if (title.includes(part)) {
              score += 10;
              matchedSkills.add(keyword);
            }
            
            // Medium priority: Match in category or tags (5 points)
            if (category.includes(part) || tags.some(tag => tag.includes(part))) {
              score += 5;
              matchedSkills.add(keyword);
            }
            
            // Lower priority: Match in description (1 point)
            // Only count if it appears multiple times or as a whole word
            const regex = new RegExp(`\\b${part}\\b`, 'gi');
            const matches = description.match(regex);
            if (matches && matches.length >= 2) {
              score += 1;
              matchedSkills.add(keyword);
            }
          });
        });
        
        return { job, score, matchedCount: matchedSkills.size };
      });
      
      // Filter: require at least 1 skill match and score > 5
      filteredJobs = scoredJobs
        .filter(item => item.matchedCount > 0 && item.score >= 5)
        .sort((a, b) => b.score - a.score) // Sort by score descending
        .map(item => item.job);
    } else {
      // No keywords - return all jobs
      filteredJobs = jobs;
    }
    
    console.log(`✅ Filtered ${filteredJobs.length} jobs from ${jobs.length} total jobs`);
    
    // Filter by preferred job types if specified
    const pref = (user.preferredJobTypes || []).map(s => s.toLowerCase()).filter(Boolean);
    console.log('👤 User job type preferences:', pref);
    if (pref.length > 0) {
      const beforeJobTypeFilter = filteredJobs.length;
      filteredJobs = filteredJobs.filter(job => {
        const jt = (job.job_type || '').toLowerCase();
        if (!jt) return true;
        return pref.includes(jt) || pref.some(p => jt.includes(p));
      });
      console.log(`📋 After job type filter: ${filteredJobs.length} (was ${beforeJobTypeFilter})`);
    }
    
    // Filter by preferred locations if user wants onsite/hybrid
    const prefLocations = (user.preferredLocations || []).map(l => l.toLowerCase()).filter(Boolean);
    console.log('📍 User location preferences:', prefLocations);
    if (prefLocations.length > 0 && (pref.includes('onsite') || pref.includes('hybrid'))) {
      const beforeLocationFilter = filteredJobs.length;
      filteredJobs = filteredJobs.filter(job => {
        const location = (job.candidate_required_location || '').toLowerCase();
        if (!location) return true;
        return prefLocations.some(loc => location.includes(loc));
      });
      console.log(`🌍 After location filter: ${filteredJobs.length} (was ${beforeLocationFilter})`);
    }

    console.log(`📤 Sending response: ${filteredJobs.length} jobs`);
    res.json({ 
      count: filteredJobs.length, 
      jobs: filteredJobs,
      message: filteredJobs.length === 0 ? 
        "We couldn't find any jobs matching your skills. Try updating your profile or resume." : 
        undefined
    });
  } catch (err) {
    console.error('jobs error', err);
    res.status(500).json({ error: 'failed to fetch jobs' });
  }
});

module.exports = router;
