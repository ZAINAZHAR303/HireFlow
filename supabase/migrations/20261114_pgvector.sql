-- HireFlow — pgvector semantic matching.
create extension if not exists vector;

-- Store the résumé embedding alongside its text.
alter table public.resumes add column if not exists embedding vector(768);

-- Shared cache of job embeddings (service-role only; no RLS policies).
create table if not exists public.job_embeddings (
  job_id text primary key,
  embedding vector(768) not null,
  updated_at timestamptz not null default now()
);
alter table public.job_embeddings enable row level security;
