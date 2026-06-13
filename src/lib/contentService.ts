import { supabase } from './supabase';
import { mockBlogPosts, mockProjects, mockSiteSettings, mockTopics } from './mockData';
import type { BlogPost, EntityType, Project, SharePlatform, ShareSettings, SiteSettings, Topic } from '../types/content';

const blogSelect = '*, blog_post_topics(topics(*))';
const projectSelect = '*, project_topics(topics(*))';

interface TopicJoinRow {
  topics: Topic | null;
}

interface BlogRow extends BlogPost {
  blog_post_topics?: TopicJoinRow[] | null;
}

interface ProjectRow extends Project {
  project_topics?: TopicJoinRow[] | null;
}

function mapBlog(row: BlogRow): BlogPost {
  return {
    ...row,
    is_featured: row.is_featured ?? false,
    sort_order: row.sort_order ?? 100,
    topics: row.blog_post_topics?.map((item) => item.topics).filter(Boolean) as Topic[] | undefined
  };
}

function mapProject(row: ProjectRow): Project {
  return {
    ...row,
    is_featured: row.is_featured ?? false,
    sort_order: row.sort_order ?? 100,
    topics: row.project_topics?.map((item) => item.topics).filter(Boolean) as Topic[] | undefined
  };
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
  const { data, error } = await supabase
    .from('blog_posts')
    .select(blogSelect)
    .eq('slug', slug)
    .maybeSingle();

  if (error) {
    console.warn('Using mock blog post because Supabase returned:', error.message);
    return mockBlogPosts.find((post) => post.slug === slug) ?? null;
  }

  return data ? mapBlog(data as BlogRow) : mockBlogPosts.find((post) => post.slug === slug) ?? null;
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

  return data ? mapProject(data as ProjectRow) : mockProjects.find((project) => project.slug === slug) ?? null;
}

export async function getTopics() {
  const { data, error } = await supabase.from('topics').select('*').order('name');
  if (error) {
    console.warn('Using mock topics because Supabase returned:', error.message);
    return mockTopics;
  }
  return data as Topic[];
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

export async function replaceBlogPostTopics(blogPostId: string, topicIds: string[]) {
  const { error: deleteError } = await supabase.from('blog_post_topics').delete().eq('blog_post_id', blogPostId);
  if (deleteError) throw deleteError;
  if (!topicIds.length) return;
  const rows = topicIds.map((topicId) => ({ blog_post_id: blogPostId, topic_id: topicId }));
  const { error } = await supabase.from('blog_post_topics').insert(rows);
  if (error) throw error;
}

export async function replaceProjectTopics(projectId: string, topicIds: string[]) {
  const { error: deleteError } = await supabase.from('project_topics').delete().eq('project_id', projectId);
  if (deleteError) throw deleteError;
  if (!topicIds.length) return;
  const rows = topicIds.map((topicId) => ({ project_id: projectId, topic_id: topicId }));
  const { error } = await supabase.from('project_topics').insert(rows);
  if (error) throw error;
}

export async function createTopic(payload: Partial<Topic>) {
  const { data, error } = await supabase.from('topics').insert(payload).select('*').single();
  if (error) throw error;
  return data as Topic;
}

export async function updateTopic(id: string, payload: Partial<Topic>) {
  const { data, error } = await supabase.from('topics').update(payload).eq('id', id).select('*').single();
  if (error) throw error;
  return data as Topic;
}

export async function deleteTopic(id: string) {
  const { error } = await supabase.from('topics').delete().eq('id', id);
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
