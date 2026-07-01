import type { Metadata } from 'next';
import { HomePage } from '../features/home/HomePage';
import { buildGraphData } from '../lib/graphBuilder';
import { getCategories, getPublishedBlogPosts, getPublishedProjects, getSiteSettings } from '../lib/contentService';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const site = await getSiteSettings();
  return {
    title: site.site_name || 'Portfolio Knowledge Graph',
    description: site.hero_description || 'A modern portfolio CMS with blog, projects, graph relations, social sharing, and Supabase admin.'
  };
}

export default async function Page() {
  const [site, posts, projects, categories] = await Promise.all([getSiteSettings(), getPublishedBlogPosts(), getPublishedProjects(), getCategories()]);

  return <HomePage site={site} posts={posts} projects={projects} categories={categories} graphData={buildGraphData(posts, projects, categories)} />;
}
