# Portfolio Knowledge Graph

Built from the ground up using:

- React + TypeScript + Vite
- Tailwind CSS 4 through `@tailwindcss/vite`
- shadcn/ui-style local components in `src/components/ui`
- Supabase Auth for admin login
- Supabase Postgres + RLS for CMS content storage
- Supabase Storage for compressed CMS images
- WordPress/Blogger-style CMS editor with slug generation, rich Markdown, images, YouTube embeds, and audio embeds
- React Query for data loading
- Lightweight SVG knowledge graph, no heavy graph canvas dependency
- Social share fallback dialog, share-event tracking, and queued auto-share jobs

## Install

```bash
npm install
```

## Environment

Create `.env` from `.env.example`:

```bash
cp .env.example .env
```

Fill it:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
VITE_SITE_URL=http://localhost:5173
```

## Supabase setup

1. Open Supabase SQL Editor.
2. Run `supabase/schema.sql`.
3. Optional: run `supabase/seed.sql` to add starter content.
4. Confirm a public Storage bucket named `portfolio-media` exists. The schema creates it automatically on Supabase.
5. Go to **Authentication → Users → Add user**.
6. Create your admin email and password.
7. Run the app and open `/login`.

## Run locally

```bash
npm run dev
```

Open:

- `/` public home
- `/blog` public posts
- `/projects` public projects
- `/graph` knowledge graph
- `/login` admin login
- `/admin` protected dashboard

## Build

```bash
npm run build
```

## Admin notes

The dashboard now works as a small CMS. It supports creating, editing, and deleting:

- Blog posts
- Projects
- Topics
- Homepage hero/site copy
- Share settings

Blog posts and projects also support:

- Draft/published status
- Featured flag
- Sort order
- Automatic clean slug generation with manual override
- Automatic SEO title and description generated from CMS title, excerpt/summary, and rich content
- Topic assignment
- Cover image upload with browser-side compression before Supabase Storage upload
- Rich CMS content input with write/preview mode
- Bold, italic, links, headings, lists, quotes, code blocks, and horizontal rules
- Inline compressed image upload into the article body
- YouTube embeds using `::youtube https://youtu.be/video_id`
- Audio embeds using `::audio https://example.com/audio.mp3`

Images are compressed in the browser to WebP/JPEG and uploaded to the public Supabase Storage bucket named `portfolio-media`. Run `supabase/schema.sql` again if you are upgrading an older project so the bucket and storage policies are created.

## CMS content syntax

The dashboard content editor stores safe Markdown-style text in the existing `content` column, so no extra rich-text dependency is required. Supported examples:

```md
## Heading

Paragraph with **bold text**, *italic text*, and [a link](https://example.com).

![Screenshot alt text](https://example.com/screenshot.webp)

::youtube https://youtu.be/dQw4w9WgXcQ

::audio https://example.com/audio.mp3

- Bullet item
- Another item

> Quote text
```

The public blog/project detail pages render that input as polished CMS output with responsive images, safe YouTube iframes, and native audio controls.

## Automatic SEO

Blog posts and projects no longer require manual SEO fields. The admin form shows an **Automatic SEO preview** and saves:

- `meta_title` from the content title, trimmed for search/social previews
- `meta_description` from the excerpt/summary first, then the rich CMS body as a fallback

The public detail pages also generate a fallback SEO description from the CMS content if older rows do not have metadata yet.

## Auto-share requirements

The CMS can queue auto-share jobs when new blog posts or projects are published. Real automatic posting still requires a backend worker and platform API credentials. Read:

```txt
docs/social-auto-share-requirements.md
```

Do not put social API secrets in `VITE_` frontend environment variables. Use Supabase Edge Function secrets, a backend server, or an automation service such as n8n/Zapier/Make.

## Security note

The frontend route guard protects `/admin`, but the real protection is in Supabase Row Level Security. The included schema allows:

- public read for published content
- authenticated write access for admin operations
- public insert for share analytics

For production, consider restricting admin writes to a specific allowlisted user ID or custom role claim instead of every authenticated user.

## Folder structure

```txt
src/
  components/
    ui/                 shadcn-style components
  features/
    admin/              protected dashboard
    auth/               Supabase auth provider, login, route guard
    blog/               list/detail pages
    graph/              SVG knowledge graph
    home/               landing page
    projects/           list/detail pages
    seo/                Open Graph/Twitter metadata
    share/              share dialog and tracking
  hooks/                React Query hooks
  lib/                  Supabase, content service, media upload, image compression, utilities
  types/                content models
supabase/
  schema.sql            tables, RLS policies, storage bucket, storage policies
  seed.sql
```

## NPM registry fix

This project includes a `.npmrc` file that forces npm to use the public npm registry:

```bash
npm config set registry https://registry.npmjs.org/
npm install
```
