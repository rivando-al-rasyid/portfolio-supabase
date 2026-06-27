import { randomBytes } from 'crypto';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { buildLinkedInAuthorizationUrl } from '../../../../../lib/linkedinOAuth';
import { createClient } from '../../../../../utils/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  try {
    const state = randomBytes(24).toString('hex');
    const response = NextResponse.redirect(buildLinkedInAuthorizationUrl(state));
    response.cookies.set('linkedin_oauth_state', state, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 10
    });
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to start LinkedIn OAuth.';
    const redirectUrl = new URL('/admin', request.url);
    redirectUrl.searchParams.set('tab', 'settings');
    redirectUrl.searchParams.set('linkedin_error', message);
    return NextResponse.redirect(redirectUrl);
  }
}
