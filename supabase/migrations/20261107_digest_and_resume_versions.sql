-- HireFlow — résumé versions + daily digest schema.
-- Apply in the Supabase SQL Editor (or it is applied via the Management API).

-- ---------------------------------------------------------------------------
-- resume_versions: a library of AI-tailored resumes (one per generation).
-- ---------------------------------------------------------------------------
create table if not exists public.resume_versions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text default '',
  job_title text default '',
  company_name text default '',
  content text not null,
  parsed_job_data jsonb,
  created_at timestamptz not null default now()
);
create index if not exists resume_versions_user_idx on public.resume_versions (user_id, created_at desc);

alter table public.resume_versions enable row level security;
drop policy if exists "own resume_versions" on public.resume_versions;
create policy "own resume_versions" on public.resume_versions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Daily digest opt-in + de-duplication.
-- ---------------------------------------------------------------------------
alter table public.profiles add column if not exists job_alerts_enabled boolean not null default false;
alter table public.profiles add column if not exists job_alerts_last_sent_at timestamptz;

create table if not exists public.job_alert_sent (
  user_id uuid not null references auth.users (id) on delete cascade,
  job_id text not null,
  sent_at timestamptz not null default now(),
  primary key (user_id, job_id)
);

alter table public.job_alert_sent enable row level security;
drop policy if exists "own job_alert_sent" on public.job_alert_sent;
create policy "own job_alert_sent" on public.job_alert_sent
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
