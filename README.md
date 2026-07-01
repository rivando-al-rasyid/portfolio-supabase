# Portfolio Supabase Next.js

Next.js portfolio CMS using Supabase Auth, Supabase Database/Storage, and Vercel deployment.

## What changed for the current Vercel + Supabase integration

- Uses the current Supabase publishable key env variable: `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- Keeps a legacy fallback for `NEXT_PUBLIC_SUPABASE_ANON_KEY`, but new Supabase projects should use publishable keys.
- Uses `@supabase/ssr` clients for browser, server, and request-session refresh.
- Uses the Next.js 16 `src/proxy.ts` file convention for request-session refresh; no legacy `middleware.ts` file is included.
- Removes the old build-time mock-data shortcut. If Supabase env vars exist, the build reads from Supabase instead of silently building mock portfolio content.
- Pins `@supabase/ssr` and `@vercel/analytics` instead of using `latest`, so Vercel builds are reproducible.

## Vercel setup

1. Import this repository into Vercel.
2. Open the Vercel project, then install/connect **Supabase** from Vercel Marketplace.
3. Connect the Supabase project to this Vercel project.
4. Confirm these variables exist in Vercel Project Settings → Environment Variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - `SUPABASE_URL`
   - `SUPABASE_PUBLISHABLE_KEY`
   - `SUPABASE_SECRET_KEY`
   - `POSTGRES_URL`
5. Redeploy after the integration is connected. Vercel environment variable changes only apply to new deployments.

## Local setup with Vercel-managed env vars

```bash
npm install
npx vercel login
npx vercel link
npx vercel env pull .env.development.local
npm run dev
```

Do not commit `.env.development.local` or `.env.local`.

## Supabase database setup

Run the schema and seed files in the Supabase SQL Editor:

```sql
-- first run supabase/schema.sql
-- then run supabase/seed.sql
```

Create an admin user in Supabase Auth, then use that email/password on `/login`.

## Scripts

```bash
npm run dev
npm run build
npm start
npm run lint
```
