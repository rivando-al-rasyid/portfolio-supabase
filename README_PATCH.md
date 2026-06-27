# Next.js auto-share update

This version supports only the requested production auto-share platforms:

- Facebook Page
- Instagram
- LinkedIn
- X

The dashboard no longer asks for a webhook URL. The Next.js route `/api/webhooks/social-share` is the sender. It reads jobs from `social_share_queue`, loads the matching platform credential from `social_api_connections`, and posts server-side.

Important changes:

- Removed Telegram, WhatsApp, and Email from auto-share settings.
- Added Instagram Graph API Content Publishing adapter.
- Updated X sender to use `https://api.x.com/2/tweets`.
- Facebook sender uses Meta Page feed posts.
- LinkedIn sender uses UGC Posts API with `X-Restli-Protocol-Version: 2.0.0`.
- Instagram requires a public image URL from the blog cover image or project image.
- `.env.example` includes Supabase URL, publishable key, service role placeholder, webhook secret, and Meta Graph API version.
