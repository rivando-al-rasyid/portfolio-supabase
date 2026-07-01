import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { assertSupabaseConfigured, isSupabaseConfigured } from './env';

export { isSupabaseConfigured };

export async function createClient() {
  const cookieStore = await cookies();
  const { url, publishableKey } = assertSupabaseConfigured();

  return createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Called from a Server Component. Proxy refreshes sessions, so this can be ignored.
        }
      }
    }
  });
}
