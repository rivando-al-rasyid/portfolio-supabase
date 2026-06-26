import type { BlogPost, Category, Project, SiteSettings } from '../types/content';

const now = new Date().toISOString();

export const mockCategories: Category[] = [
  {
    id: 'category-react',
    name: 'React',
    slug: 'react',
    created_at: now,
    updated_at: now
  },
  {
    id: 'category-go',
    name: 'Go Backend',
    slug: 'go-backend',
    created_at: now,
    updated_at: now
  },
  {
    id: 'category-supabase',
    name: 'Supabase',
    slug: 'supabase',
    created_at: now,
    updated_at: now
  }
];

export const mockBlogPosts: BlogPost[] = [
  {
    id: 'blog-1',
    title: 'Building a Portfolio with a Knowledge Graph',
    slug: 'building-a-portfolio-with-a-knowledge-graph',
    excerpt: 'How tags, internal links, and project references can turn a portfolio into a navigable knowledge map.',
    content:
      '## Why a graph portfolio?\nA normal portfolio lists work. A graph portfolio shows how ideas, projects, and skills connect.\n\n## Signals\nUse categories, links, aliases, and keyword overlap to generate relations automatically.\n\nYou can also write **bold text**, add [project links](/projects), embed images with Markdown, and paste media embeds.\n\n::youtube https://youtu.be/dQw4w9WgXcQ\n\n## Admin workflow\nWrite a post, publish it, then rebuild relations from the dashboard.',
    cover_image: null,
    status: 'published',
    is_featured: true,
    sort_order: 10,
    meta_title: null,
    meta_description: null,
    canonical_url: null,
    published_at: now,
    created_at: now,
    updated_at: now,
    categories: [mockCategories[0], mockCategories[2]]
  },
  {
    id: 'blog-2',
    title: 'Designing Auth for an Admin Dashboard',
    slug: 'designing-auth-for-an-admin-dashboard',
    excerpt: 'A practical Supabase Auth pattern for keeping public content readable and admin writes protected.',
    content:
      '## Public read, private write\nVisitors should read published content, but only authenticated users should create and update records.\n\n## RLS matters\nProtect the database with Row Level Security. Frontend route guards are useful, but they are not enough alone.',
    cover_image: null,
    status: 'published',
    is_featured: true,
    sort_order: 20,
    meta_title: null,
    meta_description: null,
    canonical_url: null,
    published_at: now,
    created_at: now,
    updated_at: now,
    categories: [mockCategories[2]]
  }
];

export const mockProjects: Project[] = [
  {
    id: 'project-1',
    title: 'Tickitz Movie Ticketing App',
    slug: 'tickitz-movie-ticketing-app',
    summary: 'A movie ticketing platform with schedules, payment flow, mobile tickets, and admin-ready data structure.',
    content:
      '## Stack\nReact, Tailwind, Go, PostgreSQL, Redis, and Docker.\n\n## Features\nMovie catalog, showtime filters, booking state, payment confirmation, and ticket result pages.\n\n- Interactive seat maps\n- Secure payment flow\n- Mobile ticket result page\n\n::audio https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3\n\n## Relation\nThis project connects frontend UX, backend API design, and secure checkout flow.',
    image_url: null,
    demo_url: 'https://example.com',
    repo_url: 'https://github.com/example/tickitz',
    status: 'published',
    is_featured: true,
    sort_order: 10,
    meta_title: null,
    meta_description: null,
    created_at: now,
    updated_at: now,
    categories: [mockCategories[0], mockCategories[1]]
  },
  {
    id: 'project-2',
    title: 'VanWallet API',
    slug: 'vanwallet-api',
    summary: 'A wallet backend with transaction history, top up, transfer, withdrawal, Redis, and PostgreSQL.',
    content:
      '## Backend focus\nThe API handles transaction flows, JWT auth, history filters, summaries, and reporting.\n\n## Deployment\nDocker Compose keeps PostgreSQL, Redis, and the API consistent across development environments.',
    image_url: null,
    demo_url: null,
    repo_url: 'https://github.com/example/vanwallet',
    status: 'published',
    is_featured: true,
    sort_order: 20,
    meta_title: null,
    meta_description: null,
    created_at: now,
    updated_at: now,
    categories: [mockCategories[1]]
  }
];


export const mockSiteSettings: SiteSettings = {
  id: 'default',
  site_name: 'Portfolio Knowledge Graph',
  hero_badge: 'React + Tailwind 4 + Supabase',
  hero_title: 'Portfolio that works like a knowledge graph.',
  hero_description:
    'Publish posts, projects, and categories from a protected CMS dashboard. Then connect them through automatic relations and share-ready SEO metadata.',
  primary_cta_label: 'View projects',
  primary_cta_href: '/projects',
  secondary_cta_label: 'Explore graph',
  secondary_cta_href: '/graph',
  updated_at: now
};
