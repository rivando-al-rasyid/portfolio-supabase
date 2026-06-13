import { useQuery } from '@tanstack/react-query';
import { buildGraphData } from '../lib/graphBuilder';
import { getPublishedBlogPosts, getPublishedProjects, getSiteSettings, getTopics } from '../lib/contentService';

export function useSiteSettings() {
  return useQuery({ queryKey: ['site-settings'], queryFn: getSiteSettings });
}

export function usePublishedBlogPosts() {
  return useQuery({ queryKey: ['blog-posts', 'published'], queryFn: getPublishedBlogPosts });
}

export function usePublishedProjects() {
  return useQuery({ queryKey: ['projects', 'published'], queryFn: getPublishedProjects });
}

export function useTopics() {
  return useQuery({ queryKey: ['topics'], queryFn: getTopics });
}

export function useGraphData() {
  return useQuery({
    queryKey: ['graph-data'],
    queryFn: async () => {
      const [posts, projects, topics] = await Promise.all([getPublishedBlogPosts(), getPublishedProjects(), getTopics()]);
      return buildGraphData(posts, projects, topics);
    }
  });
}
