import { supabase } from './supabase';
import { mockBlogPosts, mockCategories, mockProjects, mockSiteSettings } from './mockData';
import { fetchGitHubReadmeFromRepo, fetchMarkdownFromUrl } from './contentImport';
import { toSlug } from './utils';
import type {
  BlogPost,
  Category,
  EntityType,
  Project,
  SharePlatform,
  ShareSettings,
  SiteSettings,
  SocialApiConnection,
  SocialShareQueueItem
} from '../types/content';

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

function uniqueCategoryNames(names: string[]) {
  const seen = new Set<string>();
  return names
    .map((name) => name.trim())
    .filter(Boolean)
    .filter((name) => {
      const key = toSlug(name);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
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
  const { data, error } = await supabase.from('site_settings').select('*').eq('id', 'default').maybeSingle();
  if (error || !data) {
    if (error) console.warn('Using mock site settings because Supabase returned:', error.message);
    return mockSiteSettings;
  }
  return data as SiteSettings;
}

export async function updateSiteSettings(payload: Omit<SiteSettings, 'id' | 'updated_at'>) {
  const { data, error } = await supabase
    .from('site_settings')
    .upsert({ id: 'default', ...payload, updated_at: new Date().toISOString() })
    .select('*')
    .single();
  if (error) throw error;
  return data as SiteSettings;
}

export async function getPublishedBlogPosts() {
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

export async function getAllBlogPosts() {
  const { data, error } = await supabase
    .from('blog_posts')
    .select(blogSelect)
    .order('is_featured', { ascending: false })
    .order('sort_order', { ascending: true })
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return (data as BlogRow[]).map(mapBlog);
}

export async function getBlogPostBySlug(slug: string) {
  const { data, error } = await supabase.from('blog_posts').select(blogSelect).eq('slug', slug).maybeSingle();

  if (error) {
    console.warn('Using mock blog post because Supabase returned:', error.message);
    return mockBlogPosts.find((post) => post.slug === slug) ?? null;
  }

  return data ? resolveBlogContent(mapBlog(data as BlogRow)) : mockBlogPosts.find((post) => post.slug === slug) ?? null;
}

export async function getPublishedProjects() {
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

export async function getAllProjects() {
  const { data, error } = await supabase
    .from('projects')
    .select(projectSelect)
    .order('is_featured', { ascending: false })
    .order('sort_order', { ascending: true })
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return (data as ProjectRow[]).map(mapProject);
}

export async function getProjectBySlug(slug: string) {
  const { data, error } = await supabase.from('projects').select(projectSelect).eq('slug', slug).maybeSingle();

  if (error) {
    console.warn('Using mock project because Supabase returned:', error.message);
    return mockProjects.find((project) => project.slug === slug) ?? null;
  }

  return data ? resolveProjectContent(mapProject(data as ProjectRow)) : mockProjects.find((project) => project.slug === slug) ?? null;
}

export async function getCategories() {
  const { data, error } = await supabase.from('categories').select('*').order('name');
  if (error) {
    console.warn('Using mock categories because Supabase returned:', error.message);
    return mockCategories;
  }
  return data as Category[];
}

export async function createBlogPost(payload: Partial<BlogPost>) {
  const { data, error } = await supabase.from('blog_posts').insert(payload).select('*').single();
  if (error) throw error;
  return data as BlogPost;
}

export async function updateBlogPost(id: string, payload: Partial<BlogPost>) {
  const { data, error } = await supabase
    .from('blog_posts')
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return data as BlogPost;
}

export async function deleteBlogPost(id: string) {
  const { error } = await supabase.from('blog_posts').delete().eq('id', id);
  if (error) throw error;
}

export async function createProject(payload: Partial<Project>) {
  const { data, error } = await supabase.from('projects').insert(payload).select('*').single();
  if (error) throw error;
  return data as Project;
}

export async function updateProject(id: string, payload: Partial<Project>) {
  const { data, error } = await supabase
    .from('projects')
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return data as Project;
}

export async function deleteProject(id: string) {
  const { error } = await supabase.from('projects').delete().eq('id', id);
  if (error) throw error;
}

export async function getOrCreateCategoriesByName(names: string[]) {
  const categoryNames = uniqueCategoryNames(names);
  if (!categoryNames.length) return [] as Category[];

  const slugs = categoryNames.map((name) => toSlug(name));
  const { data: existing, error: existingError } = await supabase.from('categories').select('*').in('slug', slugs);
  if (existingError) throw existingError;

  const existingCategories = (existing ?? []) as Category[];
  const existingSlugSet = new Set(existingCategories.map((category) => category.slug));
  const newRows = categoryNames
    .map((name) => ({ name, slug: toSlug(name) }))
    .filter((row) => row.slug && !existingSlugSet.has(row.slug));

  let createdCategories: Category[] = [];
  if (newRows.length) {
    const { data: created, error: createError } = await supabase.from('categories').insert(newRows).select('*');
    if (createError) {
      // A concurrent insert can race with this request. In that case, reload by slug and reuse the existing rows.
      if (createError.code !== '23505') throw createError;
    } else {
      createdCategories = (created ?? []) as Category[];
    }
  }

  const expectedCount = categoryNames.length;
  const combined = [...existingCategories, ...createdCategories];
  if (combined.length >= expectedCount) return combined;

  const { data: reloaded, error: reloadError } = await supabase.from('categories').select('*').in('slug', slugs);
  if (reloadError) throw reloadError;
  return (reloaded ?? []) as Category[];
}

export async function replaceBlogPostCategories(blogPostId: string, categoryNames: string[]) {
  const categories = await getOrCreateCategoriesByName(categoryNames);
  const { error: deleteError } = await supabase.from('blog_post_categories').delete().eq('blog_post_id', blogPostId);
  if (deleteError) throw deleteError;
  if (!categories.length) return categories;
  const rows = categories.map((category) => ({ blog_post_id: blogPostId, category_id: category.id }));
  const { error } = await supabase.from('blog_post_categories').insert(rows);
  if (error) throw error;
  return categories;
}

export async function replaceProjectCategories(projectId: string, categoryNames: string[]) {
  const categories = await getOrCreateCategoriesByName(categoryNames);
  const { error: deleteError } = await supabase.from('project_categories').delete().eq('project_id', projectId);
  if (deleteError) throw deleteError;
  if (!categories.length) return categories;
  const rows = categories.map((category) => ({ project_id: projectId, category_id: category.id }));
  const { error } = await supabase.from('project_categories').insert(rows);
  if (error) throw error;
  return categories;
}

export async function updateCategory(id: string, payload: Partial<Category>) {
  const { data, error } = await supabase
    .from('categories')
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return data as Category;
}

export async function deleteCategory(id: string) {
  const { error } = await supabase.from('categories').delete().eq('id', id);
  if (error) throw error;
}

export async function getShareSettings() {
  const { data, error } = await supabase.from('social_share_settings').select('*').eq('id', 'default').maybeSingle();
  if (error || !data) {
    return {
      id: 'default',
      auto_share_on_publish: true,
      active_platforms: ['linkedin', 'x', 'facebook', 'whatsapp', 'telegram', 'email'] as SharePlatform[],
      default_message_template: 'New {{type}}: {{title}} {{url}}',
      updated_at: new Date().toISOString()
    } satisfies ShareSettings;
  }
  return data as ShareSettings;
}

export async function updateShareSettings(payload: Pick<ShareSettings, 'auto_share_on_publish' | 'active_platforms' | 'default_message_template'>) {
  const { data, error } = await supabase
    .from('social_share_settings')
    .upsert({ id: 'default', ...payload, updated_at: new Date().toISOString() })
    .select('*')
    .single();
  if (error) throw error;
  return data as ShareSettings;
}

export async function getSocialApiConnections() {
  const { data, error } = await supabase.from('social_api_connections').select('*').order('platform');
  if (error) {
    console.warn('Cannot load social API connections:', error.message);
    return [] as SocialApiConnection[];
  }
  return data as SocialApiConnection[];
}

export async function upsertSocialApiConnection(
  payload: Pick<SocialApiConnection, 'platform' | 'label' | 'is_enabled' | 'api_base_url' | 'api_code' | 'api_token' | 'api_secret' | 'account_id' | 'extra_config'>
) {
  const { data, error } = await supabase
    .from('social_api_connections')
    .upsert({ ...payload, updated_at: new Date().toISOString() }, { onConflict: 'platform' })
    .select('*')
    .single();
  if (error) throw error;
  return data as SocialApiConnection;
}

export async function getShareQueue() {
  const { data, error } = await supabase
    .from('social_share_queue')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) {
    console.warn('Cannot load share queue:', error.message);
    return [] as SocialShareQueueItem[];
  }
  return data as SocialShareQueueItem[];
}

export async function enqueueShareJobs(input: {
  entityType: Extract<EntityType, 'blog' | 'project'>;
  entityId: string;
  platforms: SharePlatform[];
  payload: Record<string, unknown>;
}) {
  if (!input.platforms.length) return;
  const rows = input.platforms.map((platform) => ({
    entity_type: input.entityType,
    entity_id: input.entityId,
    platform,
    status: 'ready',
    payload: input.payload,
    scheduled_at: new Date().toISOString()
  }));

  const { error } = await supabase.from('social_share_queue').insert(rows);
  if (error) console.warn('Share queue insert failed:', error.message);
}

export async function runSocialShareProcessor() {
  const response = await fetch('/api/webhooks/social-share', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ limit: 10 })
  });

  if (!response.ok) throw new Error(await response.text());
  return (await response.json()) as { processed?: number; failed?: number; message?: string };
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
