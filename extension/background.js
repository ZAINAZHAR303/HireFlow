/**
 * HireFlow extension service worker.
 *
 * Owns network calls to the HireFlow backend (login + profile refresh) so the
 * content script and popup never hold credentials longer than needed. The JWT
 * and a cached profile live in chrome.storage.local.
 */

const DEFAULT_API_BASE = 'http://localhost:4001';

async function getApiBase() {
  const { apiBase } = await chrome.storage.local.get('apiBase');
  return apiBase || DEFAULT_API_BASE;
}

function toProfile(user) {
  if (!user) return null;
  return {
    name: user.name || '',
    email: user.email || '',
    phone: user.phone || '',
    linkedin: user.linkedin || '',
    github: user.github || '',
    portfolio: user.portfolio || user.github || '',
    location: user.location || '',
  };
}

async function login(email, password) {
  const base = await getApiBase();
  const res = await fetch(`${base}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok || !data.token) {
    throw new Error(data.error || 'Login failed');
  }
  const profile = toProfile(data.user);
  await chrome.storage.local.set({ token: data.token, profile });
  return profile;
}

async function refreshProfile() {
  const base = await getApiBase();
  const { token } = await chrome.storage.local.get('token');
  if (!token) throw new Error('Not signed in');
  // update-profile with an empty body returns the current user unchanged.
  const res = await fetch(`${base}/auth/update-profile`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({}),
  });
  const data = await res.json();
  if (!res.ok || !data.user) throw new Error(data.error || 'Could not refresh profile');
  const profile = toProfile(data.user);
  await chrome.storage.local.set({ profile });
  return profile;
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  (async () => {
    try {
      if (msg.type === 'LOGIN') {
        const profile = await login(msg.email, msg.password);
        sendResponse({ ok: true, profile });
      } else if (msg.type === 'REFRESH_PROFILE') {
        const profile = await refreshProfile();
        sendResponse({ ok: true, profile });
      } else if (msg.type === 'LOGOUT') {
        await chrome.storage.local.remove(['token', 'profile']);
        sendResponse({ ok: true });
      } else {
        sendResponse({ ok: false, error: 'Unknown message' });
      }
    } catch (e) {
      sendResponse({ ok: false, error: e.message });
    }
  })();
  return true; // keep the message channel open for the async response
});
