# Social auto-share requirements

Auto-share is processed by the Next.js server route, not by browser code.

Run this endpoint from Vercel Cron, Supabase Scheduled Functions, GitHub Actions, or another scheduler:

```txt
POST /api/webhooks/social-share
Authorization: Bearer $SOCIAL_SHARE_WEBHOOK_SECRET
```

Supported destinations are intentionally limited to production-ready targets:

- Facebook Page
- Instagram Business / Creator account
- LinkedIn member profile
- X account

## LinkedIn

LinkedIn should use OAuth, not a pasted Client Secret in the dashboard.

1. In LinkedIn Developer Portal, add this redirect URL:

```txt
https://your-domain.com/api/auth/linkedin/callback
```

For local development:

```txt
http://localhost:3000/api/auth/linkedin/callback
```

2. Add these server environment variables:

```env
LINKEDIN_CLIENT_ID=your-linkedin-client-id
LINKEDIN_CLIENT_SECRET=your-linkedin-primary-client-secret
LINKEDIN_REDIRECT_URI=https://your-domain.com/api/auth/linkedin/callback
```

3. Make sure your LinkedIn app has permission to request:

```txt
openid profile w_member_social
```

4. In the Admin CMS Auto-share tab, select LinkedIn and click **Connect LinkedIn OAuth**.

The callback route exchanges the authorization code server-side, reads the LinkedIn profile ID, then upserts the `linkedin` row in `social_api_connections` with:

- `account_id`: `urn:li:person:<profile-id>`
- `api_token`: LinkedIn OAuth access token
- `extra_config.expires_at`: token expiry timestamp

The auto-share processor posts LinkedIn text/article shares through the server adapter.

## Facebook Page

Save:

- Facebook Page ID
- Page access token with page publishing permission

The sender posts to the Page feed with message text and optional link.

## Instagram

Save:

- Instagram Business IG User ID
- Instagram Graph API access token

Instagram publishing requires a public image URL. Add a blog cover image or project image before publishing.

## X

Save:

- OAuth user access token with post/write permission

X posts are truncated to 280 characters.

## Security notes

- Do not expose platform access tokens in client-side code.
- Do not put LinkedIn Client Secret in the dashboard UI.
- Keep `SUPABASE_SERVICE_ROLE_KEY`, platform app secrets, and webhook secrets as server-only environment variables.
- For production, set `NEXT_PUBLIC_SITE_URL` to your real domain so callback URLs and shared content URLs are correct.
