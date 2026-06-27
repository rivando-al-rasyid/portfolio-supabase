import { getSiteUrl } from './utils';

const LINKEDIN_AUTH_URL = 'https://www.linkedin.com/oauth/v2/authorization';
const LINKEDIN_TOKEN_URL = 'https://www.linkedin.com/oauth/v2/accessToken';
const LINKEDIN_USERINFO_URL = 'https://api.linkedin.com/v2/userinfo';
const LINKEDIN_PROFILE_URL = 'https://api.linkedin.com/v2/me';

export interface LinkedInTokenResponse {
  access_token: string;
  expires_in?: number;
  scope?: string;
  token_type?: string;
}

export interface LinkedInProfile {
  id: string;
  name: string;
  picture?: string;
}

export function getLinkedInConfig() {
  const clientId = process.env.LINKEDIN_CLIENT_ID;
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;
  const redirectUri = process.env.LINKEDIN_REDIRECT_URI || `${getSiteUrl()}/api/auth/linkedin/callback`;

  return { clientId, clientSecret, redirectUri };
}

export function assertLinkedInConfig() {
  const config = getLinkedInConfig();
  if (!config.clientId || !config.clientSecret) {
    throw new Error('Missing LINKEDIN_CLIENT_ID or LINKEDIN_CLIENT_SECRET. Add them to .env.local and Vercel environment variables.');
  }
  return config as { clientId: string; clientSecret: string; redirectUri: string };
}

export function buildLinkedInAuthorizationUrl(state: string) {
  const { clientId, redirectUri } = assertLinkedInConfig();
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    state,
    scope: 'openid profile w_member_social'
  });

  return `${LINKEDIN_AUTH_URL}?${params.toString()}`;
}

export async function exchangeLinkedInCode(code: string): Promise<LinkedInTokenResponse> {
  const { clientId, clientSecret, redirectUri } = assertLinkedInConfig();
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
    client_id: clientId,
    client_secret: clientSecret
  });

  const response = await fetch(LINKEDIN_TOKEN_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded'
    },
    body
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '');
    throw new Error(`LinkedIn token exchange failed: ${response.status} ${errorBody}`);
  }

  const token = (await response.json()) as LinkedInTokenResponse;
  if (!token.access_token) throw new Error('LinkedIn did not return an access token.');
  return token;
}

export async function fetchLinkedInProfile(accessToken: string): Promise<LinkedInProfile> {
  const userInfoResponse = await fetch(LINKEDIN_USERINFO_URL, {
    headers: {
      authorization: `Bearer ${accessToken}`
    }
  });

  if (userInfoResponse.ok) {
    const profile = (await userInfoResponse.json()) as {
      sub?: string;
      name?: string;
      given_name?: string;
      family_name?: string;
      picture?: string;
    };
    if (profile.sub) {
      return {
        id: profile.sub,
        name: profile.name || [profile.given_name, profile.family_name].filter(Boolean).join(' ') || 'LinkedIn profile',
        picture: profile.picture
      };
    }
  }

  const profileResponse = await fetch(LINKEDIN_PROFILE_URL, {
    headers: {
      authorization: `Bearer ${accessToken}`,
      'x-restli-protocol-version': '2.0.0'
    }
  });

  if (!profileResponse.ok) {
    const errorBody = await profileResponse.text().catch(() => '');
    throw new Error(`Unable to read LinkedIn profile ID: ${profileResponse.status} ${errorBody}`);
  }

  const profile = (await profileResponse.json()) as {
    id?: string;
    localizedFirstName?: string;
    localizedLastName?: string;
  };

  if (!profile.id) throw new Error('LinkedIn profile response did not include an id.');

  return {
    id: profile.id,
    name: [profile.localizedFirstName, profile.localizedLastName].filter(Boolean).join(' ') || 'LinkedIn profile'
  };
}

export function getLinkedInPersonUrn(profileId: string) {
  return profileId.startsWith('urn:li:person:') ? profileId : `urn:li:person:${profileId}`;
}

export function getLinkedInTokenExpiry(expiresIn?: number) {
  if (!expiresIn || Number.isNaN(Number(expiresIn))) return null;
  return new Date(Date.now() + Number(expiresIn) * 1000).toISOString();
}
