import { isSupabaseConfigured, supabase } from './supabase';
import { mockBlogPosts, mockCategories, mockProjects, mockSiteSettings } from './mockData';
import { fetchGitHubReadmeFromRepo, fetchMarkdownFromUrl } from './contentImport';
import { toSlug } from './utils';
import type { BlogPost, Category, EntityType, Project, QueueShareItem, SiteSettings } from '../types/content';

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
  if (shouldUseMockData()) return mockSiteSettings;
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
    .upsert({
      id: 'default',
      ...payload,
      updated_at: new Date().toISOString()
    })
    .select('*')
    .single();
  if (error) throw error;
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

export async function getAllBlogPosts() {
  if (shouldUseMockData()) return mockBlogPosts;
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

export async function getAllProjects() {
  if (shouldUseMockData()) return mockProjects;
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
  if (shouldUseMockData()) return mockProjects.find((project) => project.slug === slug) ?? null;
  const { data, error } = await supabase.from('projects').select(projectSelect).eq('slug', slug).maybeSingle();

  if (error) {
    console.warn('Using mock project because Supabase returned:', error.message);
    return mockProjects.find((project) => project.slug === slug) ?? null;
  }

  return data ? resolveProjectContent(mapProject(data as ProjectRow)) : mockProjects.find((project) => project.slug === slug) ?? null;
}


export async function getQueueShareItems() {
  if (shouldUseMockData()) return [] as QueueShareItem[];

  const { data, error } = await supabase
    .from('queue_share')
    .select('id, blog_post_id, project_id, is_posted, created_at, updated_at, blog_post:blog_posts(id, title, slug, status), project:projects(id, title, slug, status)')
    .order('is_posted', { ascending: true })
    .order('created_at', { ascending: false });

  if (error) throw error;

  type QueueShareRow = {
    id: string;
    blog_post_id: string | null;
    project_id: string | null;
    is_posted: boolean;
    created_at: string;
    updated_at: string;
    blog_post?: RelationContent | RelationContent[] | null;
    project?: RelationContent | RelationContent[] | null;
  };

  type RelationContent = { id: string; title: string | null; slug: string | null; status: QueueShareItem['status'] };

  function firstRelation(value: RelationContent | RelationContent[] | null | undefined) {
    return Array.isArray(value) ? value[0] ?? null : value ?? null;
  }

  return ((data ?? []) as unknown as QueueShareRow[]).map((item) => {
    const contentType: Extract<EntityType, 'blog' | 'project'> = item.blog_post_id ? 'blog' : 'project';
    const content = firstRelation(contentType === 'blog' ? item.blog_post : item.project);

    return {
      id: item.id,
      blog_post_id: item.blog_post_id,
      project_id: item.project_id,
      content_id: item.blog_post_id ?? item.project_id,
      content_type: contentType,
      is_posted: item.is_posted,
      created_at: item.created_at,
      updated_at: item.updated_at,
      title: content?.title ?? null,
      slug: content?.slug ?? null,
      status: content?.status ?? null
    };
  });
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
