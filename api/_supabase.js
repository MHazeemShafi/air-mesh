import { createClient } from '@supabase/supabase-js';

let supabaseClient = null;

export function getSupabase() {
  if (!supabaseClient) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
      throw new Error('Supabase credentials missing: check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
    }

    supabaseClient = createClient(url, key);
  }

  return supabaseClient;
}
