import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { isSupabaseConfigured, supabaseEnv } from './env';

export { isSupabaseConfigured };

export function createClient() {
  return createSupabaseClient(supabaseEnv.url || 'https://example.supabase.co', supabaseEnv.publishableKey || 'missing-key', {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    }
  });
}
