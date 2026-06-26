# Social auto-share requirements

Auto-share is handled by **Next.js API routes**, not browser code. The dashboard saves credentials and destination IDs only; it does not ask for a webhook/posting URL.

## Next.js endpoints

- `POST /api/webhooks/social-share` — processes queued share jobs and sends them using server-side platform adapters.
- `POST /api/webhooks/content-published` — optional endpoint to enqueue jobs when another system says content was published.

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
SOCIAL_SHARE_EMAIL_FROM="Portfolio <hello@example.com>"
```

`SOCIAL_SHARE_EMAIL_FROM` is only needed when using the email/Resend adapter and you do not save a From email in the connection form.

## How posting works

1. Publish a blog post or project from `/admin`.
2. The CMS inserts rows into `social_share_queue` for the active platforms.
3. A scheduler calls `POST /api/webhooks/social-share`.
4. The route reads `social_api_connections` using the Supabase service-role key.
5. The route renders the message template.
6. The route sends through the built-in Next.js adapter for the selected platform.
7. The queue row becomes `sent` or `failed`.

## Platform fields

| Platform | Account / destination ID | API code | Access token |
| --- | --- | --- | --- |
| LinkedIn | Author URN, for example `urn:li:person:...` or `urn:li:organization:...` | Optional | LinkedIn token with posting permission |
| X / Twitter | Usually empty | Optional | OAuth user token with `tweet.write` |
| Facebook | Page ID | Optional | Page access token |
| WhatsApp | WhatsApp phone number ID | Recipient phone number | Meta/WhatsApp access token |
| Telegram | Chat ID | Optional | Bot token |
| Email | Recipient email | From email, optional | Resend API key |

## Example scheduler request

```bash
curl -X POST https://your-domain.com/api/webhooks/social-share \
  -H "content-type: application/json" \
  -H "x-webhook-secret: change-this-secret" \
  -d '{"limit":10}'
```

Use Vercel Cron, Supabase Scheduled Functions, GitHub Actions cron, n8n, Make, Zapier, or any trusted server to call it.

## Important note

Direct posting to LinkedIn, X, Facebook, and WhatsApp may require approved app permissions, OAuth setup, and platform review. The Next.js route centralizes posting so secrets stay server-side, but you still need valid platform credentials.
