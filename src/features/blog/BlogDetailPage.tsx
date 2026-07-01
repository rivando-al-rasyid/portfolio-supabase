import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { formatDate, getCanonicalUrl } from '../../lib/utils';
import { renderMarkdown } from '../../lib/markdown';
import { ShareButton } from '../share/ShareButton';
import type { BlogPost } from '../../types/content';

export function BlogDetailPage({ post }: { post: BlogPost }) {
  const url = getCanonicalUrl(`/blog/${post.slug}`);

  return (
    <article className="mx-auto max-w-3xl px-4 py-10">
      <Button asChild variant="ghost" className="mb-6 -ml-3">
        <Link href="/blog">
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
        // eslint-disable-next-line @next/next/no-img-element
        <img src={post.cover_image} alt={post.title} className="mt-8 aspect-video w-full rounded-2xl border object-cover shadow-sm" />
      ) : null}
      <div className="mt-8 flex flex-wrap gap-3">
        <ShareButton entityType="blog" entityId={post.id} title={post.title} text={post.excerpt ?? ''} url={url} />
      </div>
      <div className="markdown-body mt-10 border-t pt-8">{renderMarkdown(post.content)}</div>
    </article>
  );
}
