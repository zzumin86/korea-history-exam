import { createClient } from '@supabase/supabase-js';

export const KHE_BUCKET = 'khe-exams-private';
// Supabase publishable key is a client-visible identifier, NOT a service-role secret.
export const supabase = createClient(
  'https://taiqsfrzlehwohthjaew.supabase.co',
  'sb_publishable_O6JPcwy7fliKU-LdMsjkHA_LgPT3_xs',
  {
    auth: { autoRefreshToken: true, persistSession: true, detectSessionInUrl: true },
  }
);
