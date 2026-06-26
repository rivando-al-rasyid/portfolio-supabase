# Social auto-share setup

This project stores social API configuration in `social_api_connections` and queues jobs in `social_share_queue` when a blog post or project becomes published.

## Why an Edge Function is needed

Do not post to LinkedIn, X, Facebook, email, or other APIs directly from the Vite frontend. Browser code exposes API tokens. The included `process-social-share` Supabase Edge Function reads the API code/token from the database using the service role key and processes queued jobs server-side.

## Basic flow

1. Run `supabase/schema.sql`.
2. In `/admin`, open **Auto-share**.
3. Enable the platforms you want.
4. Save an API connection for each platform.
5. Publish a blog post or project.
6. Deploy the Edge Function:

```bash
supabase functions deploy process-social-share
```

7. Run the processor manually from the dashboard, or schedule it from Supabase/cron.

## Platform behavior

- `telegram`: uses `api_token` as bot token and `account_id` as chat id.
- `linkedin`, `x`, `facebook`, `whatsapp`, `email`: posts a normalized JSON payload to `api_base_url` with optional `Authorization: Bearer <api_token>`, `x-api-code`, and `x-api-secret` headers.

Direct LinkedIn/X/Facebook posting usually needs OAuth app approval and platform-specific request bodies. Using a small backend, Supabase Edge Function extension, n8n, Make, or Zapier webhook as `api_base_url` is safer than putting all platform-specific logic in the React app.
