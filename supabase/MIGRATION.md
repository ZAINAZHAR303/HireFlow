# HireFlow → Supabase migration (frontend-direct)

This moves HireFlow off the Express/Mongo backend to **Supabase** (Auth +
Postgres with RLS + Storage), with the frontend talking to Supabase directly
and a Supabase **Edge Function** for job aggregation.

## What changed in the code
- `frontend/lib/supabaseClient.js` — browser Supabase client (anon key).
- `frontend/lib/api.js` — rewritten to use Supabase for auth, profile,
  applications; client-side match scoring, ATS scoring, and (template) outreach;
  `fetchJobs()` calls the `jobs` Edge Function.
- `frontend/pages/login.js`, `signup.js` — Supabase Auth.
- `frontend/pages/dashboard.js`, `profile.js`, `tracker.js` — session guards.
- `supabase/schema.sql` — tables, RLS, triggers, storage bucket.
- `supabase/functions/jobs/` — job aggregation Edge Function.

## One-time setup (you do this)

### 1. Create the database schema
Supabase dashboard → **SQL Editor** → paste all of `supabase/schema.sql` → Run.
This creates `profiles`, `applications`, `resumes`, RLS policies, the
new-user trigger, and the private `resumes` storage bucket.

### 2. Configure Auth
Dashboard → **Authentication → Providers → Email**: enable it.
- For the smoothest start, turn **Confirm email** OFF (users sign in
  immediately). Leave it ON if you want email verification — signup then tells
  users to check their inbox.
- **Google login**: Authentication → Providers → Google → enable, and paste a
  Google OAuth client ID/secret (from Google Cloud console). The app shows a
  "Continue with Google" button on login/signup.
- **Redirect URLs**: Authentication → URL Configuration → add your site URL and
  `.../dashboard` and `.../reset-password` to the allowed redirect list, so
  OAuth and password-reset links land correctly.
- Password reset works out of the box (the app has `/forgot-password` and
  `/reset-password` pages using Supabase's reset email).

### 3. Frontend env vars
Local: copy `frontend/.env.local.example` → `frontend/.env.local` and fill in.
On **Vercel** (frontend project) → Settings → Environment Variables:
```
NEXT_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```
Redeploy.

### 4. Deploy the Edge Functions
Install the Supabase CLI, then:
```bash
supabase login
supabase link --project-ref <your-project-ref>

# Set the Gemini key once (powers outreach, resume, interview prep, cover letters)
supabase secrets set GEMINI_API_KEY=your_gemini_key

# Deploy all functions
supabase functions deploy jobs
supabase functions deploy outreach
supabase functions deploy resume-generate
supabase functions deploy interview-prep
supabase functions deploy cover-letter
```
Notes:
- `jobs` needs no key. (Optional) restrict sources via a `JOB_SOURCES` secret.
- Without `GEMINI_API_KEY`, outreach still returns template drafts; resume /
  interview prep / cover letter return a clear "AI not configured" error
  (interview prep falls back to sample questions).

## Status after this milestone
Working end-to-end on Supabase: **sign up / sign in**, **profile**,
**application tracker**, **job search with match scores**, **ATS check**,
**recruiter outreach** (AI via Gemini, template fallback), **résumé generator**
(JD-tailored, client-side PDF via print), **interview prep**, and **cover
letters** — all via Edge Functions.

## Not yet ported
- **Résumé text extraction** (PDF/DOCX → text). Resume files upload to Storage,
  but their text isn't extracted yet, so the résumé generator / ATS use what
  text is present (else your skills). Add this as an Edge Function (PDF parser)
  or a client-side parser (pdf.js) next.
- **Auto-apply agent** (Puppeteer `analyze-form` / `apply`) can't run in an Edge
  Function (no headless Chrome). The **browser extension** already covers
  autofill (review-then-submit), so this path is effectively replaced — those
  buttons still point at the old backend and should be removed or repointed.
- The **old Express backend** (`backend/`) and **ai-backend/** can be retired
  once you're happy with the above. They remain in the repo for reference.

> The migration lives on the `claude/hireflow-enhancements` branch. `main`
> still runs the working Mongo version until you've completed the setup above
> and verified the Supabase app.
