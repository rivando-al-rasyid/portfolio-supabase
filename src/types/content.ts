export type PublishStatus = 'draft' | 'published';
export type ContentSource = 'manual' | 'github_readme' | 'markdown_url';
export type EntityType = 'blog' | 'project' | 'topic';
export type SharePlatform = 'linkedin' | 'x' | 'facebook' | 'whatsapp' | 'telegram' | 'email';

export interface Topic {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  aliases: string[] | null;
  created_at: string;
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
  topics?: Topic[];
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
  topics?: Topic[];
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

export interface ShareSettings {
  id: string;
  auto_share_on_publish: boolean;
  active_platforms: SharePlatform[];
  default_message_template: string;
  updated_at: string;
}
