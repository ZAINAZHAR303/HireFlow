/* HireFlow extension popup controller. */

const $ = (id) => document.getElementById(id);

function setStatus(msg, kind = '') {
  const el = $('status');
  el.textContent = msg || '';
  el.className = 'status' + (kind ? ' ' + kind : '');
}

function showSignedIn(profile) {
  $('signin').classList.add('hidden');
  $('account').classList.remove('hidden');
  $('who-name').textContent = profile.name || profile.email || 'your account';
}

function showSignedOut() {
  $('account').classList.add('hidden');
  $('signin').classList.remove('hidden');
}

function send(message) {
  return new Promise((resolve) => chrome.runtime.sendMessage(message, resolve));
}

async function init() {
  const { profile, apiBase } = await chrome.storage.local.get(['profile', 'apiBase']);
  if (apiBase) $('apiBase').value = apiBase;
  if (profile) showSignedIn(profile);
  else showSignedOut();
}

$('login-btn').addEventListener('click', async () => {
  const email = $('email').value.trim();
  const password = $('password').value;
  const apiBase = $('apiBase').value.trim();
  if (!email || !password) return setStatus('Enter your email and password.', 'err');
  if (apiBase) await chrome.storage.local.set({ apiBase });
  setStatus('Signing in…');
  const res = await send({ type: 'LOGIN', email, password });
  if (res.ok) {
    setStatus('');
    showSignedIn(res.profile);
  } else {
    setStatus(res.error || 'Login failed', 'err');
  }
});

$('refresh-btn').addEventListener('click', async () => {
  setStatus('Refreshing…');
  const res = await send({ type: 'REFRESH_PROFILE' });
  if (res.ok) {
    showSignedIn(res.profile);
    setStatus('Profile updated.', 'ok');
  } else {
    setStatus(res.error || 'Could not refresh', 'err');
  }
});

$('logout-btn').addEventListener('click', async () => {
  await send({ type: 'LOGOUT' });
  showSignedOut();
  setStatus('Signed out.');
});

$('fill-btn').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return setStatus('No active tab.', 'err');
  chrome.tabs.sendMessage(tab.id, { type: 'OPEN_PANEL' }, () => {
    if (chrome.runtime.lastError) {
      setStatus('Open a job application page, then try again.', 'err');
    } else {
      setStatus('Opened the autofill panel on the page.', 'ok');
      window.close();
    }
  });
});

init();
