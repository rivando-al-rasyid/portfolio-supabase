import { ContentCard } from '../../components/ContentCard';
import { EmptyState } from '../../components/EmptyState';
import type { BlogPost } from '../../types/content';

export function BlogListPage({ posts }: { posts: BlogPost[] }) {
  return (
    <section className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-8 max-w-2xl">
        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-primary">Blog</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight md:text-5xl">Notes, decisions, and build logs.</h1>
        <p className="mt-4 text-muted-foreground">Write public articles from the admin dashboard and connect them to categories automatically.</p>
      </div>

      {posts.length === 0 ? <EmptyState title="No posts yet" description="Publish a blog post from /admin after creating your Supabase user and running the schema." /> : null}

      <div className="grid gap-5 md:grid-cols-2">
        {posts.map((post) => <ContentCard key={post.id} item={post} type="blog" />)}
      </div>
    </section>
  );
}
