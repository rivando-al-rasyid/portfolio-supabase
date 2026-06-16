# Social Auto-Share Requirements

The CMS currently supports two different sharing modes:

1. **Manual share** from the public blog/project page using the browser share dialog or platform share URLs.
2. **Auto queue on publish** from the admin dashboard. When a blog post or project is published, rows are inserted into `social_share_queue`.

The queue is intentional. A frontend React app must not post directly to social media APIs because API secrets and long-lived tokens would be exposed in the browser.

## What you need for real automatic posting

### 1. A backend worker

Use one of these:

- Supabase Edge Function
- Node.js server
- GitHub Actions cron
- Vercel/Netlify scheduled function
- n8n / Make / Zapier workflow

Recommended for this project: **Supabase Edge Function** that reads `social_share_queue`, posts to each platform, then updates each row to `posted` or `failed`.

### 2. Platform developer apps and permissions

| Platform | What is needed | Notes |
| --- | --- | --- |
| LinkedIn | LinkedIn Developer App, OAuth access token, `w_member_social` or organization posting permission | Good for posting portfolio articles to a personal profile or company page if approved. |
| X / Twitter | X Developer App, API key/secret, OAuth 1.0a or OAuth 2.0 token with write permission | Free tier may be limited. Check your current X API access before building around it. |
| Facebook Page | Meta Developer App, Facebook Page access token, `pages_manage_posts`, `pages_read_engagement` | Auto-posting is for Pages, not personal profiles. |
| Instagram | Meta Developer App, Instagram Business/Creator account connected to a Facebook Page, Graph API permissions | Image/video posting has extra media-container steps. |
| Telegram | Telegram bot token and target chat/channel ID | The bot must be admin if posting to a channel. |
| Email newsletter | Resend, SendGrid, Mailgun, or SMTP credentials | Best for notifying subscribers. Store subscriber consent properly. |
| WhatsApp | WhatsApp Business Cloud API, verified business, phone number ID, approved message templates | This is for sending messages to opted-in users, not posting to WhatsApp Status. |

### 3. Private secrets in the backend only

Store secrets with your backend provider, not in `.env` variables that start with `VITE_`.

For Supabase Edge Functions, use:

```bash
supabase secrets set LINKEDIN_ACCESS_TOKEN=...
supabase secrets set X_API_KEY=...
supabase secrets set X_API_SECRET=...
supabase secrets set FACEBOOK_PAGE_ACCESS_TOKEN=...
supabase secrets set TELEGRAM_BOT_TOKEN=...
supabase secrets set RESEND_API_KEY=...
```

### 4. A queue processor flow

Recommended flow:

1. Admin publishes a blog post/project.
2. React app inserts rows into `social_share_queue`.
3. Scheduled backend worker finds rows where `status = 'ready'` and `scheduled_at <= now()`.
4. Worker posts to each platform API.
5. Worker updates the row:
   - `status = 'posted'` and `sent_at = now()` if successful
   - `status = 'failed'`, `attempts = attempts + 1`, and `error_message = '...'` if failed
6. Admin can later review failed rows.

### 5. Correct Open Graph metadata

Every shared URL should have:

- `<title>`
- `<meta name="description">`
- `og:title`
- `og:description`
- `og:image`
- `og:url`
- `twitter:card`

This project already generates SEO title and description automatically from CMS input. For better previews, always add a cover image to each blog/project.

## Suggested database improvement for production

The existing `social_share_queue` is enough for a starter CMS. For production, add these columns:

```sql
alter table social_share_queue
  add column if not exists sent_at timestamptz,
  add column if not exists error_message text,
  add column if not exists attempts integer not null default 0;
```

## Important limitation

Some social platforms restrict automatic posting, require app review, or charge for API access. Do not assume every platform will allow unrestricted auto-posting from a new account.
