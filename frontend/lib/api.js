const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4001';

export async function signup(payload) {
  const res = await fetch(`${API_BASE}/auth/signup`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(payload) });
  return res.json();
}

export async function login(payload) {
  const res = await fetch(`${API_BASE}/auth/login`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(payload) });
  return res.json();
}

export async function uploadResume(token, file) {
  const fd = new FormData();
  fd.append('resume', file);
  const res = await fetch(`${API_BASE}/resumes/upload`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd });
  return res.json();
}

export async function fetchJobs(token) {
  const res = await fetch(`${API_BASE}/jobs`, { headers: { Authorization: `Bearer ${token}` } });
  return res.json();
}

export async function updateProfile(token, payload) {
  const res = await fetch(`${API_BASE}/auth/update-profile`, { 
    method: 'POST', 
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    }, 
    body: JSON.stringify(payload) 
  });
  return res.json();
}

export function saveToken(token) { if (typeof window !== 'undefined') localStorage.setItem('hf_token', token); }
export function getToken() { if (typeof window === 'undefined') return null; return localStorage.getItem('hf_token'); }
export function saveUser(user) { if (typeof window !== 'undefined') localStorage.setItem('hf_user', JSON.stringify(user)); }
export function getUser() { if (typeof window === 'undefined') return null; try { return JSON.parse(localStorage.getItem('hf_user')); } catch(e){return null;} }
