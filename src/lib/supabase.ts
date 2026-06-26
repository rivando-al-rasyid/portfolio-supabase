import { createClient as createSupabaseJsClient } from '@supabase/supabase-js';
import { createClient as createBrowserSupabaseClient, isSupabaseConfigured } from '../utils/supabase/client';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

let browserClient: ReturnType<typeof createBrowserSupabaseClient> | null = null;

function createPublicServerClient() {
  return createSupabaseJsClient(supabaseUrl || 'https://example.supabase.co', supabaseKey || 'missing-key', {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    }
  });
}

function getBrowserClient() {
  if (!browserClient) {
    browserClient = createBrowserSupabaseClient();
  }

  return browserClient;
}

export { isSupabaseConfigured };

// Client bundle: uses @supabase/ssr so auth cookies stay in sync with Next middleware.
// Server bundle: uses an anon, stateless Supabase client for public CMS reads.
export const supabase = typeof window === 'undefined' ? createPublicServerClient() : getBrowserClient();
