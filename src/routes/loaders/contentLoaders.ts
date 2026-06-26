import { type LoaderFunctionArgs } from 'react-router-dom';
import { buildGraphData } from '../../lib/graphBuilder';
import {
  getBlogPostBySlug,
  getProjectBySlug,
  getPublishedBlogPosts,
  getPublishedProjects,
  getSiteSettings,
  getTopics
} from '../../lib/contentService';
import type { BlogPost, GraphData, Project, SiteSettings, Topic } from '../../types/content';

export interface HomeLoaderData {
  site: SiteSettings;
  posts: BlogPost[];
  projects: Project[];
  topics: Topic[];
  graphData: GraphData;
}

export interface BlogListLoaderData {
  posts: BlogPost[];
}

export interface BlogDetailLoaderData {
  post: BlogPost | null;
}

export interface ProjectListLoaderData {
  projects: Project[];
}

export interface ProjectDetailLoaderData {
  project: Project | null;
}

export interface GraphLoaderData {
  graphData: GraphData;
}

export async function loadPublishedContent() {
  const [posts, projects, topics] = await Promise.all([
    getPublishedBlogPosts(),
    getPublishedProjects(),
    getTopics()
  ]);

  return { posts, projects, topics };
}

export async function homeLoader(): Promise<HomeLoaderData> {
  const [site, content] = await Promise.all([getSiteSettings(), loadPublishedContent()]);

  return {
    site,
    posts: content.posts,
    projects: content.projects,
    topics: content.topics,
    graphData: buildGraphData(content.posts, content.projects, content.topics)
  };
}

export async function blogListLoader(): Promise<BlogListLoaderData> {
  return { posts: await getPublishedBlogPosts() };
}

export async function blogDetailLoader({ params }: LoaderFunctionArgs): Promise<BlogDetailLoaderData> {
  const slug = params.slug;
  if (!slug) return { post: null };

  return { post: await getBlogPostBySlug(slug) };
}

export async function projectListLoader(): Promise<ProjectListLoaderData> {
  return { projects: await getPublishedProjects() };
}

export async function projectDetailLoader({ params }: LoaderFunctionArgs): Promise<ProjectDetailLoaderData> {
  const slug = params.slug;
  if (!slug) return { project: null };

  return { project: await getProjectBySlug(slug) };
}

export async function graphLoader(): Promise<GraphLoaderData> {
  const { posts, projects, topics } = await loadPublishedContent();

  return { graphData: buildGraphData(posts, projects, topics) };
}
