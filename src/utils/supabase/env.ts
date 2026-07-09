const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? '';
const supabasePublishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || '';

export const supabaseEnv = {
  url: supabaseUrl,
  publishableKey: supabasePublishableKey
};

export const isSupabaseConfigured = Boolean(
  supabaseEnv.url &&
    supabaseEnv.publishableKey &&
    !supabaseEnv.url.includes('example.supabase.co') &&
    !supabaseEnv.url.includes('your-project') &&
    !supabaseEnv.publishableKey.includes('missing-key') &&
    !supabaseEnv.publishableKey.includes('your-publishable-key') &&
    !supabaseEnv.publishableKey.includes('your-anon-key')
);

export function assertSupabaseConfigured() {
  if (!isSupabaseConfigured) {
    throw new Error(
      'Missing Supabase environment variables. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in your environment (e.g. .env.local).'
    );
  }

  return supabaseEnv;
}
