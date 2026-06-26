# Patch: Next.js auto-share sender

Copy these files into the root of your existing Next.js portfolio project.

Changes included:

- Removes the dashboard input for external webhook/posting endpoint.
- Removes `api_base_url` from the CMS form, TypeScript type, and upsert payload.
- Adds a schema drop line for old `social_api_connections.api_base_url`.
- Makes `/api/webhooks/social-share` the server-side sender.
- Adds built-in server adapters for Telegram, X, Facebook Page, LinkedIn UGC posts, WhatsApp Cloud API, and Resend email.
- Updates the auto-share docs and `.env.example`.

After copying, run:

```bash
npm install
npm run build
```

Then run the updated `supabase/schema.sql` in Supabase so the old `api_base_url` column is removed.
