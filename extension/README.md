# HireFlow Autofill Copilot (Chrome Extension)

A Manifest V3 browser extension that fills job-application forms with your
HireFlow profile. It **detects fields and fills them for you to review** — it
never clicks submit.

## What it does

- Sign in once with your HireFlow account (in the toolbar popup).
- On any job-application page, a floating 🤖 button appears when a form is
  detected. Click it, then **Fill this form**.
- Name (incl. first/last split), email, phone, LinkedIn, GitHub/portfolio and
  location are matched and filled; filled fields are outlined green.
- Already-typed values are never overwritten, and the form is never submitted.

Field matching lives in [`lib/fieldMatcher.js`](lib/fieldMatcher.js) and is
unit-tested in [`test/fieldMatcher.test.js`](test/fieldMatcher.test.js)
(`node --test extension/test/*.test.js`). It handles hand-rolled forms and the
common ATS platforms (Greenhouse, Lever, Workday, Ashby) via
`autocomplete`/`type` attributes and id/name/label keywords.

## Install (developer mode)

1. Open `chrome://extensions` in Chrome (or any Chromium browser).
2. Toggle **Developer mode** (top right).
3. Click **Load unpacked** and select this `extension/` folder.
4. Pin the extension, open it, and sign in. If your HireFlow backend isn't at
   `http://localhost:4001`, set your API URL under **Advanced**.

## Notes

- The extension talks to the HireFlow backend's `/auth/login` and
  `/auth/update-profile` endpoints. Because it declares `host_permissions`, its
  requests aren't subject to the backend's browser CORS allowlist.
- Your JWT and cached profile are stored in `chrome.storage.local` and are
  removed on sign out.
- No toolbar icon images are bundled; Chrome shows a default icon. Drop
  16/48/128px PNGs in an `icons/` folder and add an `icons` key to
  `manifest.json` to brand it.
