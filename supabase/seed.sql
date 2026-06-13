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
) values (
  'default',
  'Portfolio Knowledge Graph',
  'React + Tailwind 4 + Supabase',
  'Portfolio that works like a knowledge graph.',
  'Publish posts, projects, and topics from a protected CMS dashboard. Then connect them through automatic relations and share-ready SEO metadata.',
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

insert into topics (name, slug, description, aliases) values
  ('React', 'react', 'Frontend architecture, routing, state, and UI composition.', array['frontend','vite']),
  ('Go Backend', 'go-backend', 'REST APIs, PostgreSQL, Redis, and Docker-backed services.', array['golang','api']),
  ('Supabase', 'supabase', 'Auth, Postgres, RLS, and realtime-ready application data.', array['postgres','auth'])
on conflict (slug) do update set description = excluded.description, aliases = excluded.aliases;

insert into blog_posts (title, slug, excerpt, content, status, is_featured, sort_order, published_at) values
  (
    'Building a Portfolio with a Knowledge Graph',
    'building-a-portfolio-with-a-knowledge-graph',
    'How tags, internal links, and project references can turn a portfolio into a navigable knowledge map.',
    '## Why a graph portfolio?\nA normal portfolio lists work. A graph portfolio shows how ideas, projects, and skills connect.\n\n## Signals\nUse topics, links, aliases, and keyword overlap to generate relations automatically.\n\nYou can also write **bold text**, add [project links](/projects), embed images with Markdown, and paste media embeds.\n\n::youtube https://youtu.be/dQw4w9WgXcQ',
    'published',
    true,
    10,
    now()
  ),
  (
    'Designing Auth for an Admin Dashboard',
    'designing-auth-for-an-admin-dashboard',
    'A practical Supabase Auth pattern for keeping public content readable and admin writes protected.',
    '## Public read, private write\nVisitors should read published content, but only authenticated users should create and update records.\n\n## RLS matters\nFrontend route guards are useful, but database policies are the real security layer.',
    'published',
    true,
    20,
    now()
  )
on conflict (slug) do update set
  excerpt = excluded.excerpt,
  content = excluded.content,
  status = excluded.status,
  is_featured = excluded.is_featured,
  sort_order = excluded.sort_order,
  published_at = excluded.published_at;

insert into projects (title, slug, summary, content, demo_url, repo_url, status, is_featured, sort_order) values
  (
    'Tickitz Movie Ticketing App',
    'tickitz-movie-ticketing-app',
    'A movie ticketing platform with schedules, payment flow, mobile tickets, and admin-ready data structure.',
    '## Stack\nReact, Tailwind, Go, PostgreSQL, Redis, and Docker.\n\n## Features\nMovie catalog, showtime filters, booking state, payment confirmation, and ticket result pages.\n\n- Interactive seat maps\n- Secure payment flow\n- Mobile ticket result page\n\n::audio https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
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
    'https://github.com/example/vanwallet',
    'published',
    true,
    20
  )
on conflict (slug) do update set
  summary = excluded.summary,
  content = excluded.content,
  demo_url = excluded.demo_url,
  repo_url = excluded.repo_url,
  status = excluded.status,
  is_featured = excluded.is_featured,
  sort_order = excluded.sort_order;

insert into blog_post_topics (blog_post_id, topic_id)
select b.id, t.id from blog_posts b, topics t
where b.slug = 'building-a-portfolio-with-a-knowledge-graph' and t.slug in ('react', 'supabase')
on conflict do nothing;

insert into blog_post_topics (blog_post_id, topic_id)
select b.id, t.id from blog_posts b, topics t
where b.slug = 'designing-auth-for-an-admin-dashboard' and t.slug = 'supabase'
on conflict do nothing;

insert into project_topics (project_id, topic_id)
select p.id, t.id from projects p, topics t
where p.slug = 'tickitz-movie-ticketing-app' and t.slug in ('react', 'go-backend')
on conflict do nothing;

insert into project_topics (project_id, topic_id)
select p.id, t.id from projects p, topics t
where p.slug = 'vanwallet-api' and t.slug = 'go-backend'
on conflict do nothing;
