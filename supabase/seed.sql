insert into site_settings (
  id,
  site_name,
  hero_badge,
  hero_title,
  hero_description,
  primary_cta_label,
  primary_cta_href,
  secondary_cta_label,
  secondary_cta_href
)
values (
  'default',
  'Portfolio Knowledge Graph',
  'Next.js + Tailwind 4 + Supabase',
  'Portfolio that works like a knowledge graph.',
  'Publish posts, projects, and categories from a protected CMS dashboard. Then connect them through automatic relations and share-ready SEO metadata.',
  'View projects',
  '/projects',
  'Explore graph',
  '/graph'
)
on conflict (id) do update set
  site_name = excluded.site_name,
  hero_badge = excluded.hero_badge,
  hero_title = excluded.hero_title,
  hero_description = excluded.hero_description,
  primary_cta_label = excluded.primary_cta_label,
  primary_cta_href = excluded.primary_cta_href,
  secondary_cta_label = excluded.secondary_cta_label,
  secondary_cta_href = excluded.secondary_cta_href,
  updated_at = now();

insert into categories (name, slug) values
  ('React', 'react'),
  ('Go Backend', 'go-backend'),
  ('Supabase', 'supabase')
on conflict (slug) do update set
  name = excluded.name,
  updated_at = now();

insert into blog_posts (
  title,
  slug,
  excerpt,
  content,
  cover_image,
  status,
  is_featured,
  sort_order,
  published_at
)
values
  (
    'Building a Portfolio with a Knowledge Graph',
    'building-a-portfolio-with-a-knowledge-graph',
    'How categories, internal links, and project references can turn a portfolio into a navigable knowledge map.',
    '## Why a graph portfolio?\nA normal portfolio lists work. A graph portfolio shows how ideas, projects, and skills connect.\n\n## Signals\nUse categories, links, and keyword overlap to generate relations automatically.\n\nYou can also write **bold text**, add [project links](/projects), embed images with Markdown, and paste media embeds.\n\n::youtube https://youtu.be/dQw4w9WgXcQ',
    null,
    'published',
    true,
    10,
    now()
  ),
  (
    'Designing Auth for an Admin Dashboard',
    'designing-auth-for-an-admin-dashboard',
    'A practical Supabase Auth pattern for keeping public content readable and admin writes protected.',
    '## Public read, private write\nVisitors should read published content, but only authenticated users should create and update records.\n\n## RLS matters\nProtect the database with Row Level Security. Frontend route guards are useful, but they are not enough alone.',
    null,
    'published',
    true,
    20,
    now()
  )
on conflict (slug) do update set
  title = excluded.title,
  excerpt = excluded.excerpt,
  content = excluded.content,
  status = excluded.status,
  is_featured = excluded.is_featured,
  sort_order = excluded.sort_order,
  published_at = excluded.published_at,
  updated_at = now();

insert into projects (
  title,
  slug,
  summary,
  content,
  image_url,
  demo_url,
  repo_url,
  status,
  is_featured,
  sort_order
)
values
  (
    'Tickitz Movie Ticketing App',
    'tickitz-movie-ticketing-app',
    'A movie ticketing platform with schedules, payment flow, mobile tickets, and admin-ready data structure.',
    '## Stack\nReact, Tailwind, Go, PostgreSQL, Redis, and Docker.\n\n## Features\nMovie catalog, showtime filters, booking state, payment confirmation, and ticket result pages.\n\n- Interactive seat maps\n- Secure payment flow\n- Mobile ticket result page',
    null,
    'https://example.com',
    'https://github.com/example/tickitz',
    'published',
    true,
    10
  ),
  (
    'VanWallet API',
    'vanwallet-api',
    'A wallet backend with transaction history, top up, transfer, withdrawal, Redis, and PostgreSQL.',
    '## Backend focus\nThe API handles transaction flows, JWT auth, history filters, summaries, and reporting.\n\n## Deployment\nDocker Compose keeps PostgreSQL, Redis, and the API consistent across development environments.',
    null,
    null,
    'https://github.com/example/vanwallet',
    'published',
    true,
    20
  )
on conflict (slug) do update set
  title = excluded.title,
  summary = excluded.summary,
  content = excluded.content,
  image_url = excluded.image_url,
  demo_url = excluded.demo_url,
  repo_url = excluded.repo_url,
  status = excluded.status,
  is_featured = excluded.is_featured,
  sort_order = excluded.sort_order,
  updated_at = now();

insert into blog_post_categories (blog_post_id, category_id)
select b.id, c.id from blog_posts b, categories c
where b.slug = 'building-a-portfolio-with-a-knowledge-graph' and c.slug in ('react', 'supabase')
on conflict do nothing;

insert into blog_post_categories (blog_post_id, category_id)
select b.id, c.id from blog_posts b, categories c
where b.slug = 'designing-auth-for-an-admin-dashboard' and c.slug = 'supabase'
on conflict do nothing;

insert into project_categories (project_id, category_id)
select p.id, c.id from projects p, categories c
where p.slug = 'tickitz-movie-ticketing-app' and c.slug in ('react', 'go-backend')
on conflict do nothing;

insert into project_categories (project_id, category_id)
select p.id, c.id from projects p, categories c
where p.slug = 'vanwallet-api' and c.slug = 'go-backend'
on conflict do nothing;

insert into social_share_settings (id, auto_share_on_publish, active_platforms, default_message_template)
values ('default', true, array['facebook','instagram','linkedin','x']::share_platform[], 'New {{type}}: {{title}} {{url}}')
on conflict (id) do nothing;
