# Portfolio Supabase Next.js

A public, read-only Next.js portfolio (blog, projects, knowledge graph) backed by
Supabase Database. Runs as a self-hosted Node server (Docker-ready) — no
platform-specific deployment required. There is no authentication or admin UI;
all pages simply read published content from Supabase using the anon/publishable key.

## Stack notes

- Uses the current Supabase publishable key env variable: `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- Keeps a legacy fallback for `NEXT_PUBLIC_SUPABASE_ANON_KEY`, but new Supabase projects should use publishable keys.
- Uses a plain `@supabase/supabase-js` client (no auth/session handling) for public reads.
- If Supabase env vars exist, the app reads from Supabase; otherwise the Supabase-dependent pages fall back to bundled mock data.
- Content is managed directly in Supabase (SQL editor / table editor) — write it into `blog_posts`, `projects`, and `categories` and set `status = 'published'` for it to appear on the site.

## Local setup

```bash
npm install
cp .env.example .env.local
# then fill in NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
npm run dev
```

Do not commit `.env.local`.

## Supabase database setup

Run the schema and seed files in the Supabase SQL Editor:

```sql
-- first run supabase/schema.sql
-- then run supabase/seed.sql
```

## Running on your own server

### Option A: plain Node

```bash
npm install
npm run build
npm start
```

`npm start` runs `next start`, which listens on port 3000 by default (`PORT` env var to override).

### Option B: Docker

```bash
docker build -t portfolio .
docker run -p 3000:3000 --env-file .env.local portfolio
```

The included `Dockerfile` uses `next build`'s standalone output, so the final image only
contains the compiled app and `node_modules` it actually needs at runtime — no dev
dependencies, no source maps beyond what Next.js includes by default.

## Scripts

```bash
npm run dev
npm run build
npm start
npm run lint
```
