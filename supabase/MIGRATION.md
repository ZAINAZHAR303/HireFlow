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
- Optional: enable Google / LinkedIn providers later for social login.

### 3. Frontend env vars
Local: copy `frontend/.env.local.example` → `frontend/.env.local` and fill in.
On **Vercel** (frontend project) → Settings → Environment Variables:
```
NEXT_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```
Redeploy.

### 4. Deploy the jobs Edge Function
Install the Supabase CLI, then:
```bash
supabase login
supabase link --project-ref <your-project-ref>
supabase functions deploy jobs
```
(Optional) restrict sources: Dashboard → Edge Functions → jobs → Secrets →
`JOB_SOURCES=remotive,arbeitnow,remoteok`.

## Status after this milestone
Working end-to-end on Supabase: **sign up / sign in**, **profile**,
**application tracker**, **job search with match scores**, **ATS check**
(uses resume text if present, else your skills), and **recruiter outreach**
(template drafts).

## Not yet ported (next milestone — need a Gemini Edge Function)
- **AI** recruiter outreach (currently template-only), **résumé generator**,
  **interview prep**, **cover letters** — these call Gemini, which needs a
  server-side function holding `GEMINI_API_KEY` as a Supabase secret.
- **Résumé text extraction** (PDF/DOCX → text) for richer ATS scoring. The old
  Python service did this; it should become an Edge Function or a client-side
  parser.
- The **old Express backend** (`backend/`) and **ai-backend/** can be retired
  once the above functions are deployed. They remain in the repo for now.

> The migration lives on the `claude/hireflow-enhancements` branch. `main`
> still runs the working Mongo version until you've completed the setup above
> and verified the Supabase app.
