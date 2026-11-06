import { createBrowserClient } from '@supabase/ssr';

// Single browser Supabase client for the whole app. Uses the publishable
// (anon) key — safe to expose; Row-Level Security enforces per-user access.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

let client = null;

export function getSupabase() {
  if (client) return client;
  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      'Supabase env vars missing: set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'
    );
  }
  client = createBrowserClient(supabaseUrl, supabaseKey);
  return client;
}

export default getSupabase;
