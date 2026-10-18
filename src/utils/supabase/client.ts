import { createClient as createSupabaseClient } from '@supabase/supabase-js';

export const SUPABASE_URL =
  import.meta.env.NEXT_PUBLIC_SUPABASE_URL ||
  import.meta.env.VITE_SUPABASE_URL ||
  'https://lockzzblcakpkirkagtd.supabase.co';

export const SUPABASE_KEY =
  import.meta.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  'sb_publishable_60UNpRdS55j5d2JVXlbRGQ_sJkg72eQ';

export const supabase = createSupabaseClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

export const createClient = () => supabase;
