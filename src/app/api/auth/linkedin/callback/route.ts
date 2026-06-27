import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '../../../../../lib/supabase-server';
import {
  exchangeLinkedInCode,
  fetchLinkedInProfile,
  getLinkedInPersonUrn,
  getLinkedInTokenExpiry
} from '../../../../../lib/linkedinOAuth';
import { createClient } from '../../../../../utils/supabase/server';

export const dynamic = 'force-dynamic';

function redirectToAdmin(request: NextRequest, params: Record<string, string>) {
  const url = new URL('/admin', request.url);
  url.searchParams.set('tab', 'settings');
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return NextResponse.redirect(url);
}

export async function GET(request: NextRequest) {
  const cookieStore = await cookies();
  const supabaseAuth = createClient(cookieStore);
  const {
    data: { user }
  } = await supabaseAuth.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const url = new URL(request.url);
  const error = url.searchParams.get('error');
  const errorDescription = url.searchParams.get('error_description');
  if (error) {
    return redirectToAdmin(request, { linkedin_error: errorDescription || error });
  }

  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const expectedState = cookieStore.get('linkedin_oauth_state')?.value;

  if (!code) return redirectToAdmin(request, { linkedin_error: 'LinkedIn callback did not include an authorization code.' });
  if (!state || !expectedState || state !== expectedState) {
    return redirectToAdmin(request, { linkedin_error: 'LinkedIn OAuth state check failed. Please try connecting again.' });
  }

  try {
    const token = await exchangeLinkedInCode(code);
    const profile = await fetchLinkedInProfile(token.access_token);
    const personUrn = getLinkedInPersonUrn(profile.id);
    const expiresAt = getLinkedInTokenExpiry(token.expires_in);

    const supabase = createServiceClient();
    const { error: upsertError } = await supabase.from('social_api_connections').upsert(
      {
        platform: 'linkedin',
        label: profile.name || 'LinkedIn profile',
        is_enabled: true,
        api_code: null,
        api_token: token.access_token,
        api_secret: null,
        account_id: personUrn,
        extra_config: {
          provider: 'linkedin_oauth',
          profile_id: profile.id,
          person_urn: personUrn,
          token_type: token.token_type || 'Bearer',
          scope: token.scope || 'openid profile w_member_social',
          expires_at: expiresAt,
          picture: profile.picture || null,
          connected_by: user.email || user.id
        }
      },
      { onConflict: 'platform' }
    );

    if (upsertError) throw upsertError;

    const response = redirectToAdmin(request, { linkedin_connected: 'true' });
    response.cookies.set('linkedin_oauth_state', '', { path: '/', maxAge: 0 });
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'LinkedIn OAuth callback failed.';
    return redirectToAdmin(request, { linkedin_error: message });
  }
}
