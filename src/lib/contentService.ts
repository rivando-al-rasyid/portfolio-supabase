import { isSupabaseConfigured, supabase } from './supabase';
import { mockBlogPosts, mockCategories, mockProjects, mockSiteSettings } from './mockData';
import { fetchGitHubReadmeFromRepo, fetchMarkdownFromUrl } from './contentImport';
import type { BlogPost, Category, EntityType, Project, SiteSettings } from '../types/content';

const blogSelect = '*, blog_post_categories(categories(*))';
const projectSelect = '*, project_categories(categories(*))';

interface CategoryJoinRow {
  categories: Category | null;
}

interface BlogRow extends BlogPost {
  blog_post_categories?: CategoryJoinRow[] | null;
}

interface ProjectRow extends Project {
  project_categories?: CategoryJoinRow[] | null;
}

function mapBlog(row: BlogRow): BlogPost {
  return {
    ...row,
    content_source: row.content_source ?? 'manual',
    source_url: row.source_url ?? null,
    is_featured: row.is_featured ?? false,
    sort_order: row.sort_order ?? 100,
    categories: row.blog_post_categories?.map((item) => item.categories).filter(Boolean) as Category[] | undefined
  };
}

function mapProject(row: ProjectRow): Project {
  return {
    ...row,
    content_source: row.content_source ?? 'manual',
    source_url: row.source_url ?? null,
    is_featured: row.is_featured ?? false,
    sort_order: row.sort_order ?? 100,
    categories: row.project_categories?.map((item) => item.categories).filter(Boolean) as Category[] | undefined
  };
}

function shouldUseMockData() {
  return !isSupabaseConfigured;
}

async function resolveBlogContent(post: BlogPost): Promise<BlogPost> {
  // Blog posts are stored as manual CMS content. README/stateless refresh is intentionally project-only.
  return post;
}

async function resolveProjectContent(project: Project): Promise<Project> {
  const sourceUrl = project.source_url || project.repo_url;
  if (!sourceUrl) return project;

  try {
    if (project.content_source === 'github_readme' || (project.content.trim().length === 0 && project.repo_url)) {
      const imported = await fetchGitHubReadmeFromRepo(sourceUrl);
      return {
        ...project,
        content: imported.content,
        source_url: imported.sourceUrl,
        content_source: 'github_readme',
        summary: project.summary || imported.description || project.summary,
        image_url: project.image_url || imported.imageUrl || null,
        repo_url: project.repo_url || imported.repoUrl || null,
        demo_url: project.demo_url || imported.demoUrl || null
      };
    }

    if (project.content_source === 'markdown_url') {
      const imported = await fetchMarkdownFromUrl(sourceUrl);
      return {
        ...project,
        content: imported.content,
        summary: project.summary || imported.description || project.summary,
        image_url: project.image_url || imported.imageUrl || null,
        repo_url: project.repo_url || imported.repoUrl || null,
        demo_url: project.demo_url || imported.demoUrl || null
      };
    }
  } catch (error) {
    console.warn('Using stored project content because stateless import failed:', error instanceof Error ? error.message : error);
  }

  return project;
}

export async function getSiteSettings() {
  if (shouldUseMockData()) return mockSiteSettings;
  const { data, error } = await supabase.from('site_settings').select('*').eq('id', 'default').maybeSingle();
  if (error || !data) {
    if (error) console.warn('Using mock site settings because Supabase returned:', error.message);
    return mockSiteSettings;
  }
  return data as SiteSettings;
}

export async function getPublishedBlogPosts() {
  if (shouldUseMockData()) return mockBlogPosts;
  const { data, error } = await supabase
    .from('blog_posts')
    .select(blogSelect)
    .eq('status', 'published')
    .order('is_featured', { ascending: false })
    .order('sort_order', { ascending: true })
    .order('published_at', { ascending: false });

  if (error) {
    console.warn('Using mock blog posts because Supabase returned:', error.message);
    return mockBlogPosts;
  }

  return (data as BlogRow[]).map(mapBlog);
}

export async function getBlogPostBySlug(slug: string) {
  if (shouldUseMockData()) return mockBlogPosts.find((post) => post.slug === slug) ?? null;
  const { data, error } = await supabase.from('blog_posts').select(blogSelect).eq('slug', slug).maybeSingle();

  if (error) {
    console.warn('Using mock blog post because Supabase returned:', error.message);
    return mockBlogPosts.find((post) => post.slug === slug) ?? null;
  }

  return data ? resolveBlogContent(mapBlog(data as BlogRow)) : mockBlogPosts.find((post) => post.slug === slug) ?? null;
}

export async function getPublishedProjects() {
  if (shouldUseMockData()) return mockProjects;
  const { data, error } = await supabase
    .from('projects')
    .select(projectSelect)
    .eq('status', 'published')
    .order('is_featured', { ascending: false })
    .order('sort_order', { ascending: true })
    .order('updated_at', { ascending: false });

  if (error) {
    console.warn('Using mock projects because Supabase returned:', error.message);
    return mockProjects;
  }

  return (data as ProjectRow[]).map(mapProject);
}

export async function getProjectBySlug(slug: string) {
  if (shouldUseMockData()) return mockProjects.find((project) => project.slug === slug) ?? null;
  const { data, error } = await supabase.from('projects').select(projectSelect).eq('slug', slug).maybeSingle();

  if (error) {
    console.warn('Using mock project because Supabase returned:', error.message);
    return mockProjects.find((project) => project.slug === slug) ?? null;
  }

  return data ? resolveProjectContent(mapProject(data as ProjectRow)) : mockProjects.find((project) => project.slug === slug) ?? null;
}

export async function getCategories() {
  if (shouldUseMockData()) return mockCategories;
  const { data, error } = await supabase.from('categories').select('*').order('name');
  if (error) {
    console.warn('Using mock categories because Supabase returned:', error.message);
    return mockCategories;
  }
  return data as Category[];
}

export async function trackShareEvent(input: {
  entityType: Extract<EntityType, 'blog' | 'project'>;
  entityId: string;
  platform: string;
  url: string;
  title: string;
}) {
  const { error } = await supabase.from('share_events').insert({
    entity_type: input.entityType,
    entity_id: input.entityId,
    platform: input.platform,
    url: input.url,
    title: input.title
  });
  if (error) console.warn('Share event insert failed:', error.message);
}
