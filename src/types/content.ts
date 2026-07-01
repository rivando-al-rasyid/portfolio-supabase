export type PublishStatus = 'draft' | 'published';
export type ContentSource = 'manual' | 'github_readme' | 'markdown_url';
export type EntityType = 'blog' | 'project' | 'category';
export type SharePlatform = 'facebook' | 'instagram' | 'linkedin' | 'x';


export interface QueueShareItem {
  id: string;
  blog_post_id: string | null;
  project_id: string | null;
  content_id: string | null;
  content_type: Extract<EntityType, 'blog' | 'project'>;
  is_posted: boolean;
  created_at: string;
  updated_at: string;
  title: string | null;
  slug: string | null;
  status: PublishStatus | null;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  created_at: string;
  updated_at: string;
}

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  content_source?: ContentSource | null;
  source_url?: string | null;
  cover_image: string | null;
  status: PublishStatus;
  is_featured: boolean;
  sort_order: number;
  meta_title: string | null;
  meta_description: string | null;
  canonical_url: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  categories?: Category[];
}

export interface Project {
  id: string;
  title: string;
  slug: string;
  summary: string | null;
  content: string;
  content_source?: ContentSource | null;
  source_url?: string | null;
  image_url: string | null;
  demo_url: string | null;
  repo_url: string | null;
  status: PublishStatus;
  is_featured: boolean;
  sort_order: number;
  meta_title: string | null;
  meta_description: string | null;
  created_at: string;
  updated_at: string;
  categories?: Category[];
}

export interface SiteSettings {
  id: string;
  site_name: string;
  hero_badge: string;
  hero_title: string;
  hero_description: string;
  primary_cta_label: string;
  primary_cta_href: string;
  secondary_cta_label: string;
  secondary_cta_href: string;
  updated_at: string;
}

export interface GraphNode {
  id: string;
  type: EntityType;
  label: string;
  slug: string;
  description?: string | null;
}

export interface GraphEdge {
  source: string;
  target: string;
  weight: number;
  reason: string;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

