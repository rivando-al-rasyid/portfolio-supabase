create extension if not exists pgcrypto;

do $$ begin
  create type publish_status as enum ('draft', 'published');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type entity_type as enum ('blog', 'project', 'topic');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type share_platform as enum ('linkedin', 'x', 'facebook', 'whatsapp', 'telegram', 'email');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type share_status as enum ('pending', 'ready', 'sent', 'failed');
exception when duplicate_object then null;
end $$;

create table if not exists blog_posts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  excerpt text,
  content text not null default '',
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

alter table blog_posts add column if not exists is_featured boolean not null default false;
alter table blog_posts add column if not exists sort_order integer not null default 100;
alter table projects add column if not exists is_featured boolean not null default false;
alter table projects add column if not exists sort_order integer not null default 100;

create table if not exists topics (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  aliases text[] default '{}',
  created_at timestamptz not null default now()
);

create table if not exists site_settings (
  id text primary key default 'default',
  site_name text not null default 'Portfolio Knowledge Graph',
  hero_badge text not null default 'React + Tailwind 4 + Supabase',
  hero_title text not null default 'Portfolio that works like a knowledge graph.',
  hero_description text not null default 'Publish posts, projects, and topics from a protected CMS dashboard. Then connect them through automatic relations and share-ready SEO metadata.',
  primary_cta_label text not null default 'View projects',
  primary_cta_href text not null default '/projects',
  secondary_cta_label text not null default 'Explore graph',
  secondary_cta_href text not null default '/graph',
  updated_at timestamptz not null default now()
);

create table if not exists blog_post_topics (
  blog_post_id uuid not null references blog_posts(id) on delete cascade,
  topic_id uuid not null references topics(id) on delete cascade,
  primary key (blog_post_id, topic_id)
);

create table if not exists project_topics (
  project_id uuid not null references projects(id) on delete cascade,
  topic_id uuid not null references topics(id) on delete cascade,
  primary key (project_id, topic_id)
);

create table if not exists social_share_settings (
  id text primary key default 'default',
  auto_share_on_publish boolean not null default true,
  active_platforms share_platform[] not null default array['linkedin','x','facebook','whatsapp','telegram','email']::share_platform[],
  default_message_template text not null default 'New {{type}}: {{title}} {{url}}',
  updated_at timestamptz not null default now()
);

create table if not exists social_share_queue (
  id uuid primary key default gen_random_uuid(),
  entity_type entity_type not null check (entity_type in ('blog', 'project')),
  entity_id uuid not null,
  platform share_platform not null,
  status share_status not null default 'ready',
  payload jsonb not null default '{}'::jsonb,
  scheduled_at timestamptz not null default now(),
  sent_at timestamptz,
  error_message text,
  created_at timestamptz not null default now()
);

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
create index if not exists idx_topic_slug on topics(slug);
create index if not exists idx_share_queue_status on social_share_queue(status, scheduled_at);
create index if not exists idx_share_events_entity on share_events(entity_type, entity_id);

alter table blog_posts enable row level security;
alter table projects enable row level security;
alter table topics enable row level security;
alter table site_settings enable row level security;
alter table blog_post_topics enable row level security;
alter table project_topics enable row level security;
alter table social_share_settings enable row level security;
alter table social_share_queue enable row level security;
alter table share_events enable row level security;

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

drop policy if exists "Public can read topics" on topics;
create policy "Public can read topics" on topics for select using (true);

drop policy if exists "Authenticated can manage topics" on topics;
create policy "Authenticated can manage topics" on topics
  for all to authenticated using (true) with check (true);

drop policy if exists "Public can read site settings" on site_settings;
create policy "Public can read site settings" on site_settings for select using (true);

drop policy if exists "Authenticated can manage site settings" on site_settings;
create policy "Authenticated can manage site settings" on site_settings
  for all to authenticated using (true) with check (true);

drop policy if exists "Public can read blog topic links" on blog_post_topics;
create policy "Public can read blog topic links" on blog_post_topics for select using (true);

drop policy if exists "Authenticated can manage blog topic links" on blog_post_topics;
create policy "Authenticated can manage blog topic links" on blog_post_topics
  for all to authenticated using (true) with check (true);

drop policy if exists "Public can read project topic links" on project_topics;
create policy "Public can read project topic links" on project_topics for select using (true);

drop policy if exists "Authenticated can manage project topic links" on project_topics;
create policy "Authenticated can manage project topic links" on project_topics
  for all to authenticated using (true) with check (true);

-- Share policies
drop policy if exists "Public can read share settings" on social_share_settings;
create policy "Public can read share settings" on social_share_settings for select using (true);

drop policy if exists "Authenticated can manage share settings" on social_share_settings;
create policy "Authenticated can manage share settings" on social_share_settings
  for all to authenticated using (true) with check (true);

drop policy if exists "Authenticated can manage share queue" on social_share_queue;
create policy "Authenticated can manage share queue" on social_share_queue
  for all to authenticated using (true) with check (true);

drop policy if exists "Public can insert share events" on share_events;
create policy "Public can insert share events" on share_events for insert with check (true);

drop policy if exists "Authenticated can read share events" on share_events;
create policy "Authenticated can read share events" on share_events for select to authenticated using (true);

-- Storage policies for CMS media.
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

insert into social_share_settings (id, auto_share_on_publish, active_platforms, default_message_template)
values ('default', true, array['linkedin','x','facebook','whatsapp','telegram','email']::share_platform[], 'New {{type}}: {{title}} {{url}}')
on conflict (id) do nothing;
