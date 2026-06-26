import type { Metadata } from 'next';
import { BlogListPage } from '../../features/blog/BlogListPage';
import { getPublishedBlogPosts } from '../../lib/contentService';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Blog',
  description: 'Posts about web development, portfolio systems, and product engineering.'
};

export default async function Page() {
  const posts = await getPublishedBlogPosts();
  return <BlogListPage posts={posts} />;
}
