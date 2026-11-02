/**
 * Multi-source job ingestion.
 *
 * Fetches from several free job boards and normalizes every result into the
 * Remotive-shaped object the rest of the app already understands:
 *   { id, title, company_name, category, tags[], job_type,
 *     candidate_required_location, url, description, publication_date, source }
 *
 * Design goals:
 *  - Graceful degradation: one source failing never fails the request.
 *  - Env-gated: ops can enable/disable sources via JOB_SOURCES.
 *  - De-duplicated across sources by company+title.
 *
 * The normalization functions are pure and unit-tested with fixtures; the live
 * HTTP calls run in the deployment environment.
 */
const axios = require('axios');

const HTTP_TIMEOUT = 15000;
const USER_AGENT = 'HireFlow/1.0 (+https://github.com/ZAINAZHAR303/HireFlow)';

function toStringArray(val) {
  if (Array.isArray(val)) return val.map((v) => String(v)).filter(Boolean);
  if (typeof val === 'string') return val.split(',').map((s) => s.trim()).filter(Boolean);
  return [];
}

// ---- Normalizers (pure) ----------------------------------------------------

function normalizeRemotive(data) {
  const jobs = (data && data.jobs) || [];
  return jobs.map((j) => ({
    id: `remotive_${j.id}`,
    title: j.title || '',
    company_name: j.company_name || '',
    category: j.category || '',
    tags: toStringArray(j.tags),
    job_type: j.job_type || '',
    candidate_required_location: j.candidate_required_location || '',
    url: j.url || '',
    description: j.description || '',
    publication_date: j.publication_date || null,
    source: 'remotive',
  }));
}

function normalizeArbeitnow(data) {
  const jobs = (data && data.data) || [];
  return jobs.map((j) => ({
    id: `arbeitnow_${j.slug}`,
    title: j.title || '',
    company_name: j.company_name || '',
    category: toStringArray(j.job_types)[0] || '',
    tags: toStringArray(j.tags),
    job_type: toStringArray(j.job_types)[0] || (j.remote ? 'remote' : ''),
    candidate_required_location: j.location || (j.remote ? 'Remote' : ''),
    url: j.url || '',
    description: j.description || '',
    publication_date: j.created_at ? new Date(j.created_at * 1000).toISOString() : null,
    source: 'arbeitnow',
  }));
}

function normalizeRemoteOk(data) {
  // RemoteOK returns an array whose first element is a legal/metadata object.
  const arr = Array.isArray(data) ? data.filter((x) => x && (x.id || x.slug)) : [];
  return arr.map((j) => ({
    id: `remoteok_${j.id || j.slug}`,
    title: j.position || j.title || '',
    company_name: j.company || '',
    category: '',
    tags: toStringArray(j.tags),
    job_type: 'remote',
    candidate_required_location: j.location || 'Remote',
    url: j.url || (j.slug ? `https://remoteok.com/remote-jobs/${j.slug}` : ''),
    description: j.description || '',
    publication_date: j.date || null,
    source: 'remoteok',
  }));
}

// ---- Source registry -------------------------------------------------------

const SOURCES = {
  remotive: {
    url: 'https://remotive.com/api/remote-jobs',
    normalize: normalizeRemotive,
  },
  arbeitnow: {
    url: 'https://www.arbeitnow.com/api/job-board-api',
    normalize: normalizeArbeitnow,
  },
  remoteok: {
    url: 'https://remoteok.com/api',
    normalize: normalizeRemoteOk,
  },
};

function enabledSources() {
  const raw = (process.env.JOB_SOURCES || 'remotive,arbeitnow,remoteok')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return raw.filter((name) => SOURCES[name]);
}

async function fetchSource(name) {
  const src = SOURCES[name];
  const resp = await axios.get(src.url, {
    timeout: HTTP_TIMEOUT,
    headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
  });
  return src.normalize(resp.data);
}

// De-duplicate across sources by normalized company + title.
function dedupe(jobs) {
  const seen = new Set();
  const out = [];
  for (const job of jobs) {
    const key = `${(job.company_name || '').toLowerCase().trim()}::${(job.title || '').toLowerCase().trim()}`;
    if (key === '::' || seen.has(key)) continue;
    seen.add(key);
    out.push(job);
  }
  return out;
}

/**
 * Fetch and merge all enabled sources. Never throws: failed sources are
 * skipped and reported in the returned `errors` array.
 * @returns {Promise<{ jobs: object[], sources: string[], errors: object[] }>}
 */
async function fetchAllJobs() {
  const names = enabledSources();
  const results = await Promise.allSettled(names.map((n) => fetchSource(n)));

  const jobs = [];
  const errors = [];
  const okSources = [];
  results.forEach((r, i) => {
    const name = names[i];
    if (r.status === 'fulfilled') {
      okSources.push(name);
      jobs.push(...r.value);
    } else {
      console.error(`⚠️ job source "${name}" failed:`, r.reason?.message || r.reason);
      errors.push({ source: name, message: r.reason?.message || String(r.reason) });
    }
  });

  return { jobs: dedupe(jobs), sources: okSources, errors };
}

module.exports = {
  fetchAllJobs,
  dedupe,
  normalizeRemotive,
  normalizeArbeitnow,
  normalizeRemoteOk,
  enabledSources,
  SOURCES,
};
