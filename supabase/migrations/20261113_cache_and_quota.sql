-- HireFlow — jobs cache + AI usage quota.

-- ---------------------------------------------------------------------------
-- jobs_cache: shared cache for aggregated job results (no RLS policies, so
-- only the service_role key, used by the jobs function, can touch it).
-- ---------------------------------------------------------------------------
create table if not exists public.jobs_cache (
  key text primary key,
  data jsonb not null,
  fetched_at timestamptz not null default now()
);
alter table public.jobs_cache enable row level security;

-- ---------------------------------------------------------------------------
-- ai_usage: per-user per-day AI call counter (rate limiting the Gemini fns).
-- Users may read their own usage (for a meter); writes happen only through the
-- SECURITY DEFINER function below.
-- ---------------------------------------------------------------------------
create table if not exists public.ai_usage (
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null default current_date,
  count int not null default 0,
  primary key (user_id, day)
);
alter table public.ai_usage enable row level security;

drop policy if exists "read own ai usage" on public.ai_usage;
create policy "read own ai usage" on public.ai_usage
  for select using (auth.uid() = user_id);

-- Atomically increment today's counter for the calling user and return whether
-- they are still within the limit. SECURITY DEFINER so it writes regardless of
-- the (read-only) RLS policy; uses auth.uid() so callers can't spoof others.
create or replace function public.consume_ai_quota(p_limit int)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  c int;
  u uuid := auth.uid();
begin
  if u is null then
    return false;
  end if;
  insert into public.ai_usage (user_id, day, count)
  values (u, current_date, 1)
  on conflict (user_id, day) do update set count = public.ai_usage.count + 1
  returning count into c;
  return c <= p_limit;
end;
$$;

revoke all on function public.consume_ai_quota(int) from public;
grant execute on function public.consume_ai_quota(int) to authenticated;
