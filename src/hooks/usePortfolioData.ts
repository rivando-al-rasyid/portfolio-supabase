import { useQuery } from '@tanstack/react-query';
import { getCategories, getPublishedBlogPosts, getPublishedProjects, getSiteSettings } from '../lib/contentService';
import { buildGraphData } from '../lib/graphBuilder';

export function useBlogPosts() {
  return useQuery({ queryKey: ['blog-posts'], queryFn: getPublishedBlogPosts });
}

export function useProjects() {
  return useQuery({ queryKey: ['projects'], queryFn: getPublishedProjects });
}

export function useCategories() {
  return useQuery({ queryKey: ['categories'], queryFn: getCategories });
}

export function useSiteSettings() {
  return useQuery({ queryKey: ['site-settings'], queryFn: getSiteSettings });
}

export function useGraphData() {
  return useQuery({
    queryKey: ['graph-data'],
    queryFn: async () => {
      const [posts, projects, categories] = await Promise.all([getPublishedBlogPosts(), getPublishedProjects(), getCategories()]);
      return buildGraphData(posts, projects, categories);
    }
  });
}
