import { ContentCard } from '../../components/ContentCard';
import { EmptyState } from '../../components/EmptyState';
import { usePublishedBlogPosts } from '../../hooks/usePortfolioData';
import { SEO } from '../seo/SEO';

export function BlogListPage() {
  const { data: posts = [], isLoading } = usePublishedBlogPosts();

  return (
    <>
      <SEO title="Blog" description="Posts about web development, portfolio systems, and product engineering." path="/blog" />
      <section className="mx-auto max-w-6xl px-4 py-10">
        <div className="mb-8 max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-primary">Blog</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight md:text-5xl">Notes, decisions, and build logs.</h1>
          <p className="mt-4 text-muted-foreground">Write public articles from the admin dashboard and connect them to topics automatically.</p>
        </div>

        {isLoading ? <div className="grid gap-5 md:grid-cols-2">{[1, 2, 3, 4].map((i) => <div key={i} className="h-56 animate-pulse rounded-xl bg-muted" />)}</div> : null}

        {!isLoading && posts.length === 0 ? (
          <EmptyState title="No posts yet" description="Publish a blog post from /admin after creating your Supabase user and running the schema." />
        ) : null}

        <div className="grid gap-5 md:grid-cols-2">
          {posts.map((post) => (
            <ContentCard key={post.id} item={post} type="blog" />
          ))}
        </div>
      </section>
    </>
  );
}
