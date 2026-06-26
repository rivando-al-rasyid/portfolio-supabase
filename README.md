# Portfolio Supabase — Next.js CMS

A modern personal portfolio and CMS built with **Next.js App Router**, React, Tailwind CSS 4, and Supabase.

It includes a public portfolio, blog, project showcase, lightweight knowledge graph, protected admin CMS, project README import, blog Markdown import, searchable categories, and server-side social auto-share webhooks.

## Stack

- Next.js App Router
- React 19
- Tailwind CSS 4
- Supabase Auth, Postgres, Storage
- TanStack Query for admin CMS data
- Server-side API routes for webhooks / social share processing

## Environment

Create `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
NEXT_PUBLIC_SITE_URL=http://localhost:3000

SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SOCIAL_SHARE_WEBHOOK_SECRET=change-this-secret
```

`SUPABASE_SERVICE_ROLE_KEY` is server-only. Do not expose it to the browser.

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Database

Run `supabase/schema.sql`, then optionally run `supabase/seed.sql`.

Main CMS tables:

- `blog_posts`
- `projects`
- `categories`
- `blog_post_categories`
- `project_categories`
- `site_settings`
- `social_api_connections`
- `social_share_settings`
- `social_share_queue`
- `share_events`

Categories are reused by slug. When you save a blog/project and type a category that does not exist, the CMS creates it. If it exists, the same row is reused.

## Content import rules

### Project

Projects can import README content from a GitHub repository URL or README URL, for example:

- `https://github.com/rivando-al-rasyid/portfolio-supabase`
- `https://github.com/rivando-al-rasyid/portfolio-supabase/blob/main/README.md`

Projects can also import a local `.md` / `.markdown` file.

### Blog

Blog import uses only a local `.md` / `.markdown` file. README import is intentionally project-only.

Supported frontmatter example:

```md
---
title: My Project
excerpt: Short summary
categories: [Next.js, Supabase]
cover_image: https://example.com/cover.png
repo_url: https://github.com/user/repo
demo_url: https://example.com
status: published
featured: true
sort_order: 10
---

# Content here
```

## Auto-share webhooks

The browser does not post directly to social APIs. Publishing content creates queue rows. Server-side Next.js API routes process the queue.

Endpoints:

- `POST /api/webhooks/social-share` — process queued jobs.
- `POST /api/webhooks/content-published` — optional endpoint for external publish events to enqueue jobs.

Example:

```bash
curl -X POST https://your-domain.com/api/webhooks/social-share \
  -H "content-type: application/json" \
  -H "x-webhook-secret: change-this-secret" \
  -d '{"limit":10}'
```

Read `docs/social-auto-share-requirements.md` for details.

## Supabase SSR session setup

This Next.js version uses `@supabase/ssr` for browser/server auth session handling.

Added files:

- `src/utils/supabase/client.ts` — browser Supabase client.
- `src/utils/supabase/server.ts` — server component Supabase client using `next/headers` cookies.
- `src/utils/supabase/middleware.ts` — refreshes sessions and writes updated cookies.
- `src/middleware.ts` — applies the Supabase middleware to application routes.

Install dependencies:

```bash
npm install @supabase/supabase-js @supabase/ssr
```

Local env:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://vvsuyntqnehrrrsnnlgo.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_6zFE4f7hcoejgByjC4Wqjw_pRZ3KQ7O
```

For auto-share webhooks, also set these server-only values in Vercel or `.env.local`:

```bash
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SOCIAL_SHARE_WEBHOOK_SECRET=change-this-secret
```

Do not expose `SUPABASE_SERVICE_ROLE_KEY` in client code.
