import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl =
  import.meta.env.NEXT_PUBLIC_SUPABASE_URL ||
  import.meta.env.VITE_SUPABASE_URL ||
  'https://lockzzblcakpkirkagtd.supabase.co';

const supabaseKey =
  import.meta.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  'sb_publishable_60UNpRdS55j5d2JVXlbRGQ_sJkg72eQ';

export const createClient = () =>
  createBrowserClient(supabaseUrl, supabaseKey);

export const supabase = createClient();
