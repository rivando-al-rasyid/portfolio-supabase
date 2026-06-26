# Social auto-share requirements

Auto-share is now handled by **Next.js API routes**, not browser code.

## Why the webhook endpoint exists

Social tokens and API codes should not be used directly from React components. The CMS only saves connection settings into the database. Actual posting runs server-side through:

- `POST /api/webhooks/social-share` — processes queued share jobs.
- `POST /api/webhooks/content-published` — optional webhook that can enqueue jobs when an external CMS/database event says content was published.

Both endpoints accept either:

```http
x-webhook-secret: your-secret
```

or:

```http
Authorization: Bearer your-secret
```

Set the value in `SOCIAL_SHARE_WEBHOOK_SECRET`.

## Required environment variables

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
NEXT_PUBLIC_SITE_URL=https://your-domain.com
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SOCIAL_SHARE_WEBHOOK_SECRET=change-this-secret
```

## How posting works

1. Publish a blog post or project from `/admin`.
2. The CMS inserts rows into `social_share_queue` for the active platforms.
3. A scheduler calls `POST /api/webhooks/social-share`.
4. The endpoint reads `social_api_connections` using the Supabase service role key.
5. Telegram can post directly with bot token + chat ID.
6. Other platforms post to your saved `api_base_url` as a normalized webhook payload.

## Example scheduler request

```bash
curl -X POST https://your-domain.com/api/webhooks/social-share \
  -H "content-type: application/json" \
  -H "x-webhook-secret: change-this-secret" \
  -d '{"limit":10}'
```

Use Vercel Cron, Supabase Scheduled Functions, GitHub Actions cron, n8n, Make, Zapier, or any trusted server to call it.

## Normalized payload sent to non-Telegram platforms

```json
{
  "platform": "linkedin",
  "message": "New project: Portfolio Supabase https://example.com/projects/portfolio-supabase",
  "accountId": "author-or-page-id",
  "payload": {
    "title": "Portfolio Supabase",
    "description": "Modern portfolio CMS",
    "url": "https://example.com/projects/portfolio-supabase",
    "type": "project",
    "categories": ["React", "Supabase"]
  },
  "queueId": "uuid",
  "entityType": "project",
  "entityId": "uuid"
}
```

This design is intentional. Direct LinkedIn/X/Facebook posting often requires OAuth review and platform-specific request bodies. A normalized webhook lets you connect an approved backend or automation tool without exposing secrets in the frontend.
