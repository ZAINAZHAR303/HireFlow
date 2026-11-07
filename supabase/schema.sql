-- HireFlow — Supabase schema (run this in the Supabase SQL Editor)
-- Safe to re-run: uses IF NOT EXISTS / CREATE OR REPLACE and drops policies first.
--
-- Tables are prefixed implicitly by living in the `public` schema of the
-- HireFlow project. If this project is shared with another app, the table
-- names below (profiles, applications, resumes) must not collide.

-- ---------------------------------------------------------------------------
-- profiles: 1:1 with auth.users, holds the HireFlow profile fields.
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  name text default '',
  phone text default '',
  linkedin text default '',
  github text default '',
  location text default '',
  skills text[] default '{}',
  job_categories text[] default '{}',
  search_keywords text[] default '{}',
  preferred_job_types text[] default '{}',
  preferred_locations text[] default '{}',
  experience_level text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- applications: the job-search pipeline / tracker.
-- ---------------------------------------------------------------------------
create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  job_id text,
  job_title text not null,
  company_name text not null,
  apply_url text default '',
  job_description text default '',
  status text not null default 'pending'
    check (status in ('pending','in_progress','success','failed','timeout')),
  pipeline_stage text not null default 'saved'
    check (pipeline_stage in ('saved','applied','interviewing','offer','rejected')),
  notes text default '',
  interview_prep jsonb,
  cover_letter text,
  applied_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, job_id)
);
create index if not exists applications_user_stage_idx
  on public.applications (user_id, pipeline_stage);

-- ---------------------------------------------------------------------------
-- resumes: metadata + extracted text; files live in the `resumes` storage bucket.
-- ---------------------------------------------------------------------------
create table if not exists public.resumes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  file_name text default '',
  storage_path text default '',
  text text default '',
  created_at timestamptz not null default now()
);
create index if not exists resumes_user_idx on public.resumes (user_id);

-- ---------------------------------------------------------------------------
-- updated_at maintenance
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists applications_set_updated_at on public.applications;
create trigger applications_set_updated_at before update on public.applications
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Auto-create a profile row when a new auth user signs up.
-- `name` is read from the signup metadata (data: { name }).
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Row-Level Security: every user sees and edits only their own rows.
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.applications enable row level security;
alter table public.resumes enable row level security;

drop policy if exists "own profile" on public.profiles;
create policy "own profile" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "own applications" on public.applications;
create policy "own applications" on public.applications
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own resumes" on public.resumes;
create policy "own resumes" on public.resumes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Storage bucket for resume files (private). Users can only touch files under
-- a top-level folder named with their own user id, e.g. "<uid>/resume.pdf".
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('resumes', 'resumes', false)
on conflict (id) do nothing;

drop policy if exists "resumes read own" on storage.objects;
create policy "resumes read own" on storage.objects
  for select using (bucket_id = 'resumes' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "resumes write own" on storage.objects;
create policy "resumes write own" on storage.objects
  for insert with check (bucket_id = 'resumes' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "resumes update own" on storage.objects;
create policy "resumes update own" on storage.objects
  for update using (bucket_id = 'resumes' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "resumes delete own" on storage.objects;
create policy "resumes delete own" on storage.objects
  for delete using (bucket_id = 'resumes' and (storage.foldername(name))[1] = auth.uid()::text);
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
