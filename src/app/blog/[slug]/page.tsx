import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { BlogDetailPage } from '../../../features/blog/BlogDetailPage';
import { getBlogPostBySlug } from '../../../lib/contentService';
import { generateSeoDescription, generateSeoTitle } from '../../../lib/utils';

export const dynamic = 'force-dynamic';

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getBlogPostBySlug(slug);
  if (!post) return { title: 'Post not found' };

  return {
    title: post.meta_title || generateSeoTitle(post.title),
    description: post.meta_description || generateSeoDescription({ description: post.excerpt, content: post.content }),
    openGraph: {
      title: post.meta_title || generateSeoTitle(post.title),
      description: post.meta_description || generateSeoDescription({ description: post.excerpt, content: post.content }),
      images: post.cover_image ? [post.cover_image] : undefined,
      type: 'article'
    }
  };
}

export default async function Page({ params }: PageProps) {
  const { slug } = await params;
  const post = await getBlogPostBySlug(slug);
  if (!post) notFound();
  return <BlogDetailPage post={post} />;
}
