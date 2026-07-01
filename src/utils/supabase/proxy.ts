import { createServerClient } from '@supabase/ssr';
import { type NextRequest, NextResponse } from 'next/server';
import { isSupabaseConfigured, supabaseEnv } from './env';

type HeaderMap = Record<string, string> | Headers | undefined;

function copyHeaders(headers: HeaderMap, response: NextResponse) {
  if (!headers) return;

  if (headers instanceof Headers) {
    headers.forEach((value, key) => response.headers.set(key, value));
    return;
  }

  Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value));
}

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  if (!isSupabaseConfigured) {
    return response;
  }

  const supabase = createServerClient(supabaseEnv.url, supabaseEnv.publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));

        response = NextResponse.next({ request });

        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        copyHeaders(headers as HeaderMap, response);
      }
    }
  });

  // Required by Supabase SSR. This refreshes expired sessions and writes updated cookies to the response.
  await supabase.auth.getClaims();

  return response;
}
