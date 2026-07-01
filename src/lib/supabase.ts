import { createClient as createSupabaseJsClient } from '@supabase/supabase-js';
import { createClient as createBrowserSupabaseClient, isSupabaseConfigured } from '../utils/supabase/client';
import { supabaseEnv } from '../utils/supabase/env';

let browserClient: ReturnType<typeof createBrowserSupabaseClient> | null = null;

function createPublicServerClient() {
  return createSupabaseJsClient(
    supabaseEnv.url || 'https://example.supabase.co',
    supabaseEnv.publishableKey || 'missing-key',
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false
      }
    }
  );
}

function getBrowserClient() {
  if (!browserClient) {
    browserClient = createBrowserSupabaseClient();
  }

  return browserClient;
}

export { isSupabaseConfigured };

// Client bundle: uses @supabase/ssr so auth cookies stay in sync with Next proxy.
// Server bundle: uses an anon, stateless Supabase client for public CMS reads.
export const supabase = typeof window === 'undefined' ? createPublicServerClient() : getBrowserClient();
