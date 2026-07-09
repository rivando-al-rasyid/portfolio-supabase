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

// Both client and server bundles use a plain, anon Supabase client for public reads.
export const supabase = typeof window === 'undefined' ? createPublicServerClient() : getBrowserClient();
