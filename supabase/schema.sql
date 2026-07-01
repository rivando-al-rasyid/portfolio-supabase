create extension if not exists pgcrypto;

-- Fresh CMS schema: topics are replaced by categories.
do $$ begin
  create type publish_status as enum ('draft', 'published');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type entity_type as enum ('blog', 'project', 'category');
exception when duplicate_object then null;
end $$;

do $$ begin
  alter type entity_type add value if not exists 'category';
exception when duplicate_object then null;
end $$;


create table if not exists blog_posts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  excerpt text,
  content text not null default '',
  content_source text not null default 'manual' check (content_source in ('manual', 'github_readme', 'markdown_url')),
  source_url text,
  cover_image text,
  status publish_status not null default 'draft',
  is_featured boolean not null default false,
  sort_order integer not null default 100,
  meta_title text,
  meta_description text,
  canonical_url text,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  summary text,
  content text not null default '',
  content_source text not null default 'manual' check (content_source in ('manual', 'github_readme', 'markdown_url')),
  source_url text,
  image_url text,
  demo_url text,
  repo_url text,
  status publish_status not null default 'draft',
  is_featured boolean not null default false,
  sort_order integer not null default 100,
  meta_title text,
  meta_description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table blog_posts add column if not exists content_source text not null default 'manual' check (content_source in ('manual', 'github_readme', 'markdown_url'));
alter table blog_posts add column if not exists source_url text;
alter table blog_posts add column if not exists is_featured boolean not null default false;
alter table blog_posts add column if not exists sort_order integer not null default 100;
alter table projects add column if not exists content_source text not null default 'manual' check (content_source in ('manual', 'github_readme', 'markdown_url'));
alter table projects add column if not exists source_url text;
alter table projects add column if not exists is_featured boolean not null default false;
alter table projects add column if not exists sort_order integer not null default 100;

create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- One-time migration from the older topics table, if it exists.
do $$ begin
  if to_regclass('public.topics') is not null then
    execute 'insert into public.categories (name, slug, created_at, updated_at)
      select name, slug, created_at, now() from public.topics
      on conflict (slug) do update set
        name = excluded.name,
        updated_at = now()';
  end if;
end $$;

create table if not exists site_settings (
  id text primary key default 'default',
  site_name text not null default 'Portfolio Knowledge Graph',
  hero_badge text not null default 'Next.js + Tailwind 4 + Supabase',
  hero_title text not null default 'Portfolio that works like a knowledge graph.',
  hero_description text not null default 'Publish posts, projects, and categories from a protected CMS dashboard. Then connect them through automatic relations and share-ready SEO metadata.',
  primary_cta_label text not null default 'View projects',
  primary_cta_href text not null default '/projects',
  secondary_cta_label text not null default 'Explore graph',
  secondary_cta_href text not null default '/graph',
  updated_at timestamptz not null default now()
);

create table if not exists blog_post_categories (
  blog_post_id uuid not null references blog_posts(id) on delete cascade,
  category_id uuid not null references categories(id) on delete cascade,
  primary key (blog_post_id, category_id)
);

create table if not exists project_categories (
  project_id uuid not null references projects(id) on delete cascade,
  category_id uuid not null references categories(id) on delete cascade,
  primary key (project_id, category_id)
);

-- One-time relationship migration from blog_post_topics/project_topics.
do $$ begin
  if to_regclass('public.blog_post_topics') is not null and to_regclass('public.topics') is not null then
    execute 'insert into public.blog_post_categories (blog_post_id, category_id)
      select old.blog_post_id, c.id
      from public.blog_post_topics old
      join public.topics t on t.id = old.topic_id
      join public.categories c on c.slug = t.slug
      on conflict do nothing';
  end if;

  if to_regclass('public.project_topics') is not null and to_regclass('public.topics') is not null then
    execute 'insert into public.project_categories (project_id, category_id)
      select old.project_id, c.id
      from public.project_topics old
      join public.topics t on t.id = old.topic_id
      join public.categories c on c.slug = t.slug
      on conflict do nothing';
  end if;
end $$;

drop table if exists blog_post_topics cascade;
drop table if exists project_topics cascade;
drop table if exists topics cascade;

alter table categories drop column if exists description;

drop table if exists social_api_connections cascade;
drop table if exists social_share_settings cascade;
drop table if exists social_share_queue cascade;
drop type if exists share_platform cascade;
drop type if exists share_status cascade;


-- Queue used by n8n scheduled workflows.
-- Each row stores only one linked content id and whether it has already been posted.
drop view if exists public.queue_share_items;

create table if not exists queue_share (
  id uuid primary key default gen_random_uuid(),
  blog_post_id uuid references blog_posts(id) on delete cascade,
  project_id uuid references projects(id) on delete cascade,
  is_posted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table queue_share add column if not exists blog_post_id uuid references blog_posts(id) on delete cascade;
alter table queue_share add column if not exists project_id uuid references projects(id) on delete cascade;
alter table queue_share add column if not exists is_posted boolean not null default false;
alter table queue_share add column if not exists created_at timestamptz not null default now();
alter table queue_share add column if not exists updated_at timestamptz not null default now();

-- Migrate rows from the older entity_type/entity_id queue shape if those columns still exist.
do $$ begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'queue_share' and column_name = 'entity_type'
  ) and exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'queue_share' and column_name = 'entity_id'
  ) then
    update public.queue_share
    set blog_post_id = entity_id
    where entity_type = 'blog' and blog_post_id is null;

    update public.queue_share
    set project_id = entity_id
    where entity_type = 'project' and project_id is null;
  end if;
end $$;

delete from public.queue_share where blog_post_id is null and project_id is null;

alter table queue_share drop column if exists entity_type cascade;
alter table queue_share drop column if exists entity_id cascade;
alter table queue_share drop column if exists scheduled_at cascade;
alter table queue_share drop column if exists posted_at cascade;
alter table queue_share drop column if exists last_error cascade;
alter table queue_share drop column if exists retry_count cascade;

do $$ begin
  alter table public.queue_share
    add constraint queue_share_one_content check (
      (blog_post_id is not null and project_id is null)
      or (blog_post_id is null and project_id is not null)
    );
exception when duplicate_object then null;
end $$;

create unique index if not exists idx_queue_share_blog_post_unique
  on public.queue_share(blog_post_id)
  where blog_post_id is not null;

create unique index if not exists idx_queue_share_project_unique
  on public.queue_share(project_id)
  where project_id is not null;

create or replace function public.enqueue_blog_post_share()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'published' then
    insert into public.queue_share (blog_post_id)
    values (new.id)
    on conflict (blog_post_id) where blog_post_id is not null do update set
      updated_at = now();
  end if;

  return new;
end;
$$;

create or replace function public.enqueue_project_share()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'published' then
    insert into public.queue_share (project_id)
    values (new.id)
    on conflict (project_id) where project_id is not null do update set
      updated_at = now();
  end if;

  return new;
end;
$$;

drop trigger if exists trg_enqueue_blog_post_share on public.blog_posts;
create trigger trg_enqueue_blog_post_share
after insert or update of status
on public.blog_posts
for each row
execute function public.enqueue_blog_post_share();

drop trigger if exists trg_enqueue_project_share on public.projects;
create trigger trg_enqueue_project_share
after insert or update of status
on public.projects
for each row
execute function public.enqueue_project_share();

insert into public.queue_share (blog_post_id)
select id
from public.blog_posts
where status = 'published'
on conflict (blog_post_id) where blog_post_id is not null do nothing;

insert into public.queue_share (project_id)
select id
from public.projects
where status = 'published'
on conflict (project_id) where project_id is not null do nothing;

create table if not exists share_events (
  id uuid primary key default gen_random_uuid(),
  entity_type entity_type not null check (entity_type in ('blog', 'project')),
  entity_id uuid not null,
  platform text not null,
  url text not null,
  title text not null,
  created_at timestamptz not null default now()
);

-- Public Supabase Storage bucket for CMS-uploaded, compressed images.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'portfolio-media',
  'portfolio-media',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

create index if not exists idx_blog_status on blog_posts(status, published_at desc);
create index if not exists idx_blog_featured on blog_posts(is_featured desc, sort_order asc);
create index if not exists idx_project_status on projects(status, updated_at desc);
create index if not exists idx_project_featured on projects(is_featured desc, sort_order asc);
create index if not exists idx_category_slug on categories(slug);
create index if not exists idx_category_name on categories using gin (to_tsvector('simple', name));
create index if not exists idx_share_events_entity on share_events(entity_type, entity_id);
create index if not exists idx_queue_share_posted on queue_share(is_posted, created_at);
create index if not exists idx_queue_share_blog_post on queue_share(blog_post_id);
create index if not exists idx_queue_share_project on queue_share(project_id);
-- Old social posting config tables/types are dropped. queue_share is kept as the simple n8n queue.

alter table blog_posts enable row level security;
alter table projects enable row level security;
alter table categories enable row level security;
alter table site_settings enable row level security;
alter table blog_post_categories enable row level security;
alter table project_categories enable row level security;
alter table share_events enable row level security;
alter table queue_share enable row level security;

-- Content read/write policies
drop policy if exists "Public can read published blog posts" on blog_posts;
create policy "Public can read published blog posts" on blog_posts
  for select using (status = 'published' or auth.role() = 'authenticated');

drop policy if exists "Authenticated can manage blog posts" on blog_posts;
create policy "Authenticated can manage blog posts" on blog_posts
  for all to authenticated using (true) with check (true);

drop policy if exists "Public can read published projects" on projects;
create policy "Public can read published projects" on projects
  for select using (status = 'published' or auth.role() = 'authenticated');

drop policy if exists "Authenticated can manage projects" on projects;
create policy "Authenticated can manage projects" on projects
  for all to authenticated using (true) with check (true);

drop policy if exists "Public can read categories" on categories;
create policy "Public can read categories" on categories for select using (true);

drop policy if exists "Authenticated can manage categories" on categories;
create policy "Authenticated can manage categories" on categories
  for all to authenticated using (true) with check (true);

drop policy if exists "Public can read site settings" on site_settings;
create policy "Public can read site settings" on site_settings for select using (true);

drop policy if exists "Authenticated can manage site settings" on site_settings;
create policy "Authenticated can manage site settings" on site_settings
  for all to authenticated using (true) with check (true);

drop policy if exists "Public can read blog category links" on blog_post_categories;
create policy "Public can read blog category links" on blog_post_categories for select using (true);

drop policy if exists "Authenticated can manage blog category links" on blog_post_categories;
create policy "Authenticated can manage blog category links" on blog_post_categories
  for all to authenticated using (true) with check (true);

drop policy if exists "Public can read project category links" on project_categories;
create policy "Public can read project category links" on project_categories for select using (true);

drop policy if exists "Authenticated can manage project category links" on project_categories;
create policy "Authenticated can manage project category links" on project_categories
  for all to authenticated using (true) with check (true);


drop policy if exists "Authenticated can manage queue share" on queue_share;
create policy "Authenticated can manage queue share" on queue_share
  for all to authenticated using (true) with check (true);

-- The admin queue page reads queue_share_items through the logged-in Supabase session.
-- n8n should connect to Supabase directly on its own schedule, read queue_share_items where
-- is_posted = false and status = 'published', then update queue_share.is_posted to true.

drop policy if exists "Public can insert share events" on share_events;
create policy "Public can insert share events" on share_events
  for insert with check (true);

drop policy if exists "Authenticated can read share events" on share_events;
create policy "Authenticated can read share events" on share_events
  for select to authenticated using (true);

-- Storage policies
drop policy if exists "Public can read portfolio media" on storage.objects;
create policy "Public can read portfolio media" on storage.objects
  for select using (bucket_id = 'portfolio-media');

drop policy if exists "Authenticated can upload portfolio media" on storage.objects;
create policy "Authenticated can upload portfolio media" on storage.objects
  for insert to authenticated with check (bucket_id = 'portfolio-media');

drop policy if exists "Authenticated can update portfolio media" on storage.objects;
create policy "Authenticated can update portfolio media" on storage.objects
  for update to authenticated using (bucket_id = 'portfolio-media') with check (bucket_id = 'portfolio-media');

drop policy if exists "Authenticated can delete portfolio media" on storage.objects;
create policy "Authenticated can delete portfolio media" on storage.objects
  for delete to authenticated using (bucket_id = 'portfolio-media');

insert into site_settings (id)
values ('default')
on conflict (id) do nothing;

