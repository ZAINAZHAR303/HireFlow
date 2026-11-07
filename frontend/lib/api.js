/**
 * HireFlow data + auth layer — Supabase edition.
 *
 * The app talks directly to Supabase (Auth, Postgres with RLS, Storage) and to
 * Supabase Edge Functions for server-side work (job aggregation, AI). The old
 * Express/JWT functions are replaced here but keep their names/arities so the
 * UI components barely change; the leading `token` argument is accepted and
 * ignored (Supabase manages the session).
 */
import { getSupabase } from './supabaseClient';
import { scoreJob } from './jobScoring';
import { computeAtsScore } from './atsScore';
import { fallbackOutreach } from './outreachHelper';

// ---- Mapping between DB (snake_case) and UI (camelCase) ----
function profileToClient(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name || '',
    email: row.email || '',
    phone: row.phone || '',
    linkedin: row.linkedin || '',
    github: row.github || '',
    location: row.location || '',
    skills: row.skills || [],
    jobCategories: row.job_categories || [],
    searchKeywords: row.search_keywords || [],
    preferredJobTypes: row.preferred_job_types || [],
    preferredLocations: row.preferred_locations || [],
    experienceLevel: row.experience_level || '',
    jobAlertsEnabled: row.job_alerts_enabled || false,
  };
}

function applicationToClient(row) {
  if (!row) return null;
  return {
    _id: row.id,
    jobId: row.job_id,
    jobTitle: row.job_title,
    companyName: row.company_name,
    applyUrl: row.apply_url || '',
    jobDescription: row.job_description || '',
    status: row.status,
    pipelineStage: row.pipeline_stage,
    notes: row.notes || '',
    appliedAt: row.applied_at,
    createdAt: row.created_at,
  };
}

function splitList(val) {
  if (Array.isArray(val)) return val.map((s) => String(s).trim()).filter(Boolean);
  if (typeof val === 'string') return val.split(',').map((s) => s.trim()).filter(Boolean);
  return [];
}

// ---- Auth ----
export async function signIn({ email, password }) {
  const supabase = getSupabase();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: error.message };
  await cacheProfile();
  return { user: getUser(), session: data.session };
}

export async function signUp({ name, email, password }) {
  const supabase = getSupabase();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { name } },
  });
  if (error) return { error: error.message };
  // When email confirmation is ON, there is no session yet.
  if (data.session) {
    await cacheProfile();
    return { user: getUser(), session: data.session };
  }
  return { needsConfirmation: true };
}

export async function signOut() {
  const supabase = getSupabase();
  await supabase.auth.signOut();
  if (typeof window !== 'undefined') localStorage.removeItem('hf_user');
}

// OAuth (Google / LinkedIn). Requires the provider to be enabled in the
// Supabase dashboard (Authentication → Providers).
export async function signInWithProvider(provider) {
  const supabase = getSupabase();
  const redirectTo = typeof window !== 'undefined' ? `${window.location.origin}/dashboard` : undefined;
  const { error } = await supabase.auth.signInWithOAuth({ provider, options: { redirectTo } });
  return { error: error?.message };
}

export async function resendConfirmation(email) {
  const supabase = getSupabase();
  const { error } = await supabase.auth.resend({ type: 'signup', email });
  return { error: error?.message };
}

export async function sendPasswordReset(email) {
  const supabase = getSupabase();
  const redirectTo = typeof window !== 'undefined' ? `${window.location.origin}/reset-password` : undefined;
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
  return { error: error?.message };
}

export async function updatePassword(password) {
  const supabase = getSupabase();
  const { error } = await supabase.auth.updateUser({ password });
  return { error: error?.message };
}

// Returns the current authenticated user object (or null). Async.
export async function getSessionUser() {
  const supabase = getSupabase();
  const { data } = await supabase.auth.getUser();
  return data?.user || null;
}

/**
 * Route guard for client pages: redirects to /login when signed out.
 * Returns the cached profile for display, or null.
 */
export async function requireAuth(router) {
  const user = await getSessionUser();
  if (!user) {
    router.push('/login');
    return null;
  }
  return (await cacheProfile()) || getUser();
}

// ---- Profile ----
export async function getProfile() {
  const supabase = getSupabase();
  const user = await getSessionUser();
  if (!user) return null;
  const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
  return profileToClient(data);
}

async function cacheProfile() {
  const profile = await getProfile();
  if (profile) saveUser(profile);
  return profile;
}

export async function updateProfile(_token, payload) {
  const supabase = getSupabase();
  const user = await getSessionUser();
  if (!user) return { error: 'Not signed in' };
  const update = { updated_at: new Date().toISOString() };
  if (payload.name !== undefined) update.name = payload.name;
  if (payload.phone !== undefined) update.phone = payload.phone;
  if (payload.linkedin !== undefined) update.linkedin = payload.linkedin;
  if (payload.github !== undefined) update.github = payload.github;
  if (payload.location !== undefined) update.location = payload.location;
  if (payload.experienceLevel !== undefined) update.experience_level = payload.experienceLevel;
  if (payload.jobAlertsEnabled !== undefined) update.job_alerts_enabled = payload.jobAlertsEnabled;
  if (payload.skills !== undefined) update.skills = splitList(payload.skills);
  if (payload.preferredJobTypes !== undefined) update.preferred_job_types = splitList(payload.preferredJobTypes);
  if (payload.preferredLocations !== undefined) update.preferred_locations = splitList(payload.preferredLocations);
  const { data, error } = await supabase
    .from('profiles')
    .update(update)
    .eq('id', user.id)
    .select()
    .single();
  if (error) return { error: error.message };
  const client = profileToClient(data);
  saveUser(client);
  return { user: client };
}

// ---- Applications (tracker) ----
export async function getApplication(_token, id) {
  const supabase = getSupabase();
  const { data, error } = await supabase.from('applications').select('*').eq('id', id).single();
  if (error) return { error: error.message };
  return { application: applicationToClient(data) };
}

export async function getApplications() {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('applications')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) return { applications: [], error: error.message };
  return { applications: (data || []).map(applicationToClient) };
}

export async function trackApplication(_token, payload) {
  const supabase = getSupabase();
  const user = await getSessionUser();
  if (!user) return { error: 'Not signed in' };
  const stage = ['saved', 'applied', 'interviewing', 'offer', 'rejected'].includes(payload.pipelineStage)
    ? payload.pipelineStage
    : 'saved';
  const row = {
    user_id: user.id,
    job_id: payload.jobId || `manual_${Date.now()}`,
    job_title: payload.jobTitle,
    company_name: payload.companyName,
    apply_url: payload.applyUrl || '',
    job_description: payload.jobDescription || '',
    pipeline_stage: stage,
    applied_at: stage === 'saved' ? null : new Date().toISOString(),
  };
  const { data, error } = await supabase
    .from('applications')
    .upsert(row, { onConflict: 'user_id,job_id', ignoreDuplicates: true })
    .select()
    .maybeSingle();
  if (error) return { error: error.message };
  return { success: true, application: applicationToClient(data) };
}

export async function updateApplication(_token, id, payload) {
  const supabase = getSupabase();
  const update = {};
  if (payload.pipelineStage !== undefined) update.pipeline_stage = payload.pipelineStage;
  if (payload.notes !== undefined) update.notes = payload.notes;
  const { data, error } = await supabase.from('applications').update(update).eq('id', id).select().single();
  if (error) return { error: error.message };
  return { success: true, application: applicationToClient(data) };
}

export async function deleteApplication(_token, id) {
  const supabase = getSupabase();
  const { error } = await supabase.from('applications').delete().eq('id', id);
  if (error) return { error: error.message };
  return { success: true };
}

// ---- Edge-function-backed features (deployed separately) ----
async function invoke(name, body) {
  const supabase = getSupabase();
  const { data, error } = await supabase.functions.invoke(name, { body: body || {} });
  if (error) {
    let detail = error.message;
    try {
      detail = (await error.context?.json())?.error || detail;
    } catch (_) {}
    return { error: detail };
  }
  return data;
}

// Jobs: the Edge Function fetches + aggregates sources (needs a server for
// CORS); scoring/filtering runs client-side using the cached profile.
export async function fetchJobs() {
  const res = await invoke('jobs');
  if (res.error) return res;
  let jobs = res.jobs || [];
  const profile = getUser() || {};
  const coreSkills = profile.skills || [];
  if (coreSkills.length === 0) {
    return { count: jobs.length, jobs: jobs.slice(0, 100), message: 'Add skills or a resume to get personalized match scores.' };
  }
  const expansionTerms = [...(profile.searchKeywords || []), ...(profile.jobCategories || [])];
  const scored = jobs
    .map((job) => {
      const { matchScore, matchedSkills, matchReasons } = scoreJob(job, { coreSkills, expansionTerms });
      return { ...job, matchScore, matchedSkills, matchReasons };
    })
    .filter((j) => j.matchedSkills.length > 0 && j.matchScore >= 15);

  const pref = (profile.preferredJobTypes || []).map((s) => s.toLowerCase()).filter(Boolean);
  let filtered = scored;
  if (pref.length > 0) {
    filtered = filtered.filter((j) => {
      const jt = (j.job_type || '').toLowerCase();
      return !jt || pref.includes(jt) || pref.some((p) => jt.includes(p));
    });
  }
  const prefLoc = (profile.preferredLocations || []).map((l) => l.toLowerCase()).filter(Boolean);
  if (prefLoc.length > 0 && (pref.includes('onsite') || pref.includes('hybrid'))) {
    filtered = filtered.filter((j) => {
      const loc = (j.candidate_required_location || '').toLowerCase();
      return !loc || prefLoc.some((l) => loc.includes(l));
    });
  }
  filtered.sort((a, b) => b.matchScore - a.matchScore);
  return {
    count: filtered.length,
    jobs: filtered,
    message: filtered.length === 0 ? "We couldn't find jobs matching your skills. Try adding more skills or adjusting preferences." : undefined,
  };
}

// ATS score: computed client-side against the user's latest resume text, or
// (until resume text extraction is added) their skills as a proxy.
export async function getAtsScore(_token, payload) {
  const supabase = getSupabase();
  const user = await getSessionUser();
  let resumeText = payload.resumeText || '';
  if (!resumeText && user) {
    const { data } = await supabase
      .from('resumes')
      .select('text')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    resumeText = data?.text || '';
  }
  if (!resumeText) {
    const profile = getUser() || {};
    resumeText = (profile.skills || []).join(', ');
  }
  if (!resumeText || resumeText.trim().length < 3) {
    return { error: 'No resume or skills found. Add skills to your profile or upload a resume first.' };
  }
  return { success: true, ...computeAtsScore(resumeText, payload.jobDescription || '') };
}

// Outreach: tries the AI Edge Function; falls back to a client-side template
// if the function isn't deployed / errors, so it always returns something.
export async function generateOutreach(_token, payload) {
  const res = await invoke('outreach', payload);
  if (res && !res.error && (res.email || res.linkedin)) return res;
  const profile = getUser() || {};
  const out = fallbackOutreach({
    user: profile,
    job: { jobTitle: payload.jobTitle, companyName: payload.companyName, jobDescription: payload.jobDescription },
    tone: payload.tone || 'professional',
  });
  return { ...out, usedAI: false };
}

// JD-tailored resume via the Gemini Edge Function.
export async function generateResume(_token, payload) {
  return invoke('resume-generate', payload);
}

// Interview prep / cover letter still require a server-side AI call; these
// Edge Functions are a documented next step. The invokers are kept so the UI
// compiles and shows a clear error until the functions are deployed.
export async function generateInterviewPrep(_token, payload) {
  return invoke('interview-prep', payload);
}

export async function generateCoverLetter(_token, payload) {
  return invoke('cover-letter', payload);
}

// ---- Resume version library ----
export async function saveResumeVersion(payload) {
  const supabase = getSupabase();
  const user = await getSessionUser();
  if (!user) return { error: 'Not signed in' };
  const { data, error } = await supabase
    .from('resume_versions')
    .insert({
      user_id: user.id,
      title: payload.title || `${payload.jobTitle || 'Resume'}${payload.companyName ? ' @ ' + payload.companyName : ''}`,
      job_title: payload.jobTitle || '',
      company_name: payload.companyName || '',
      content: payload.content,
      parsed_job_data: payload.parsedJobData || null,
    })
    .select()
    .single();
  if (error) return { error: error.message };
  return { id: data.id };
}

export async function listResumeVersions() {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('resume_versions')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) return { versions: [], error: error.message };
  return {
    versions: (data || []).map((r) => ({
      id: r.id,
      title: r.title,
      jobTitle: r.job_title,
      companyName: r.company_name,
      content: r.content,
      parsedJobData: r.parsed_job_data,
      createdAt: r.created_at,
    })),
  };
}

export async function deleteResumeVersion(id) {
  const supabase = getSupabase();
  const { error } = await supabase.from('resume_versions').delete().eq('id', id);
  if (error) return { error: error.message };
  return { success: true };
}

// ---- Resume upload (Supabase Storage + resumes table) ----
export async function uploadResume(_token, file, text = '') {
  const supabase = getSupabase();
  const user = await getSessionUser();
  if (!user) return { error: 'Not signed in' };
  const path = `${user.id}/${Date.now()}_${file.name}`;
  const { error: upErr } = await supabase.storage.from('resumes').upload(path, file, { upsert: true });
  if (upErr) return { error: upErr.message };
  const { data, error } = await supabase
    .from('resumes')
    .insert({ user_id: user.id, file_name: file.name, storage_path: path, text: text || '' })
    .select()
    .single();
  if (error) return { error: error.message };
  return { resumeId: data.id, storagePath: path, textLength: (text || '').length };
}

// ---- Local cache of the profile for synchronous UI display ----
export function saveUser(user) {
  if (typeof window !== 'undefined') localStorage.setItem('hf_user', JSON.stringify(user));
}
export function getUser() {
  if (typeof window === 'undefined') return null;
  try {
    return JSON.parse(localStorage.getItem('hf_user'));
  } catch (e) {
    return null;
  }
}

// Deprecated JWT helpers kept as no-ops so legacy imports don't break.
export function saveToken() {}
export function getToken() {
  return null;
}
