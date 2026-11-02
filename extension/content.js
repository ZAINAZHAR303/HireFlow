/**
 * HireFlow content script — the on-page autofill copilot.
 *
 * Shows a small launcher on pages that contain a form. On "Fill", it matches
 * every visible field against the signed-in user's profile and fills it,
 * highlighting what changed. It never clicks submit — the user always reviews
 * and submits themselves.
 *
 * fieldMatcher.js is injected before this file and exposes window.HireFlowMatcher.
 */
(function () {
  const { matchField, valueForField } = window.HireFlowMatcher;
  const PANEL_ID = 'hireflow-copilot-panel';
  const LAUNCHER_ID = 'hireflow-copilot-launcher';

  function hasMeaningfulForm() {
    const inputs = document.querySelectorAll(
      'input:not([type=hidden]):not([type=submit]):not([type=button]), textarea, select'
    );
    return inputs.length >= 2;
  }

  function isFillable(el) {
    if (el.disabled || el.readOnly) return false;
    const style = window.getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden') return false;
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }

  function labelFor(el) {
    if (el.id) {
      const lbl = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
      if (lbl) return lbl.textContent || '';
    }
    const wrap = el.closest('label');
    return wrap ? wrap.textContent || '' : '';
  }

  function describe(el) {
    return {
      id: el.id,
      name: el.name,
      placeholder: el.placeholder,
      type: el.type,
      label: labelFor(el),
      ariaLabel: el.getAttribute('aria-label'),
      autocomplete: el.getAttribute('autocomplete'),
    };
  }

  function setValue(el, value) {
    // Use the native setter so React/Vue controlled inputs register the change.
    const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
    if (setter) setter.call(el, value);
    else el.value = value;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function fillForm(profile) {
    const inputs = document.querySelectorAll('input, textarea');
    let filled = 0;
    inputs.forEach((el) => {
      if (!isFillable(el)) return;
      const key = matchField(describe(el));
      if (!key) return;
      const value = valueForField(key, profile);
      if (!value) return;
      // Don't overwrite something the user already typed.
      if (el.value && el.value.trim().length > 0) return;
      setValue(el, value);
      el.style.outline = '2px solid #10b981';
      el.style.transition = 'outline 0.2s';
      filled += 1;
    });
    return filled;
  }

  function removePanel() {
    document.getElementById(PANEL_ID)?.remove();
  }

  async function openPanel() {
    removePanel();
    const { token, profile } = await chrome.storage.local.get(['token', 'profile']);

    const panel = document.createElement('div');
    panel.id = PANEL_ID;

    if (!token || !profile) {
      panel.innerHTML = `
        <div class="hf-head"><span>🤖 HireFlow</span><button class="hf-x" aria-label="Close">×</button></div>
        <div class="hf-body">
          <p>You're not signed in. Open the HireFlow extension (toolbar icon) and sign in to enable autofill.</p>
        </div>`;
      document.body.appendChild(panel);
      panel.querySelector('.hf-x').onclick = removePanel;
      return;
    }

    panel.innerHTML = `
      <div class="hf-head"><span>🤖 HireFlow Autofill</span><button class="hf-x" aria-label="Close">×</button></div>
      <div class="hf-body">
        <div class="hf-who">Signed in as <strong>${escapeHtml(profile.name || profile.email)}</strong></div>
        <button class="hf-fill">Fill this form</button>
        <div class="hf-status"></div>
        <p class="hf-note">HireFlow fills fields for you to review. It never submits the application.</p>
      </div>`;
    document.body.appendChild(panel);
    panel.querySelector('.hf-x').onclick = removePanel;
    panel.querySelector('.hf-fill').onclick = () => {
      const count = fillForm(profile);
      const status = panel.querySelector('.hf-status');
      status.textContent = count > 0 ? `✅ Filled ${count} field${count === 1 ? '' : 's'} — please review.` : 'No matching fields found on this page.';
      status.className = 'hf-status ' + (count > 0 ? 'ok' : 'warn');
    };
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function addLauncher() {
    if (document.getElementById(LAUNCHER_ID) || !hasMeaningfulForm()) return;
    const btn = document.createElement('button');
    btn.id = LAUNCHER_ID;
    btn.title = 'HireFlow Autofill';
    btn.textContent = '🤖';
    btn.onclick = openPanel;
    document.body.appendChild(btn);
  }

  // Allow the popup to trigger fill directly on the active tab.
  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg.type === 'OPEN_PANEL') {
      openPanel();
      sendResponse({ ok: true });
    }
    return true;
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', addLauncher);
  } else {
    addLauncher();
  }
})();
