import { createBrowserClient } from '@supabase/ssr';
import { isSupabaseConfigured, supabaseEnv } from './env';

export { isSupabaseConfigured };

export function createClient() {
  return createBrowserClient(
    supabaseEnv.url || 'https://example.supabase.co',
    supabaseEnv.publishableKey || 'missing-key'
  );
}
