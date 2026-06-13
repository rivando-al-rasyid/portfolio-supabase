import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { getBlogPostBySlug } from '../../lib/contentService';
import { formatDate, getCanonicalUrl } from '../../lib/utils';
import { renderMarkdown } from '../../lib/markdown';
import { ShareButton } from '../share/ShareButton';
import { SEO } from '../seo/SEO';

export function BlogDetailPage() {
  const { slug = '' } = useParams();
  const { data: post, isLoading } = useQuery({ queryKey: ['blog-post', slug], queryFn: () => getBlogPostBySlug(slug), enabled: Boolean(slug) });

  if (isLoading) {
    return <div className="mx-auto max-w-3xl px-4 py-12"><div className="h-96 animate-pulse rounded-xl bg-muted" /></div>;
  }

  if (!post) {
    return (
      <section className="mx-auto max-w-3xl px-4 py-16">
        <h1 className="text-3xl font-bold">Post not found</h1>
        <Button asChild className="mt-6" variant="outline">
          <Link to="/blog">Back to blog</Link>
        </Button>
      </section>
    );
  }

  const url = getCanonicalUrl(`/blog/${post.slug}`);

  return (
    <>
      <SEO title={post.meta_title || post.title} description={post.meta_description || post.excerpt} image={post.cover_image} path={`/blog/${post.slug}`} type="article" />
      <article className="mx-auto max-w-3xl px-4 py-10">
        <Button asChild variant="ghost" className="mb-6 -ml-3">
          <Link to="/blog">
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
        </Button>
        <div className="mb-5 flex flex-wrap items-center gap-2">
          <Badge>Blog</Badge>
          <span className="text-sm text-muted-foreground">{formatDate(post.published_at || post.created_at)}</span>
        </div>
        <h1 className="text-4xl font-bold tracking-tight md:text-5xl">{post.title}</h1>
        {post.excerpt ? <p className="mt-5 text-lg text-muted-foreground">{post.excerpt}</p> : null}
        {post.cover_image ? (
          <img src={post.cover_image} alt={post.title} className="mt-8 aspect-video w-full rounded-2xl border object-cover shadow-sm" />
        ) : null}
        <div className="mt-6 flex flex-wrap gap-2">
          {post.topics?.map((topic) => (
            <Badge key={topic.id} variant="outline">
              {topic.name}
            </Badge>
          ))}
        </div>
        <div className="mt-8 flex justify-end">
          <ShareButton entityType="blog" entityId={post.id} title={post.title} text={post.excerpt ?? ''} url={url} />
        </div>
        <div className="markdown-body mt-10 border-t pt-8">{renderMarkdown(post.content)}</div>
      </article>
    </>
  );
}
