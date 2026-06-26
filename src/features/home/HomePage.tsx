import Link from 'next/link';
import { ArrowRight, Network } from 'lucide-react';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { ContentCard } from '../../components/ContentCard';
import { KnowledgeGraph } from '../graph/KnowledgeGraph';
import type { BlogPost, Category, GraphData, Project, SiteSettings } from '../../types/content';

interface HomePageProps {
  site: SiteSettings;
  posts: BlogPost[];
  projects: Project[];
  categories: Category[];
  graphData: GraphData;
}

export function HomePage({ site, posts, projects, categories, graphData }: HomePageProps) {
  const featuredProjects = projects.filter((project) => project.is_featured).slice(0, 4);
  const visibleProjects = featuredProjects.length > 0 ? featuredProjects : projects.slice(0, 4);
  const hasMoreProjects = projects.length > visibleProjects.length;

  return (
    <>
      <section className="relative overflow-hidden border-b">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.18),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.16),transparent_30%)]" />
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 md:grid-cols-[1.15fr_0.85fr] md:py-24">
          <div>
            <Badge className="mb-5">{site?.hero_badge ?? 'Next.js + Tailwind 4 + Supabase'}</Badge>
            <h1 className="text-4xl font-bold tracking-tight md:text-6xl">{site?.hero_title ?? 'Portfolio that works like a knowledge graph.'}</h1>
            <p className="mt-5 max-w-2xl text-lg text-muted-foreground">
              {site?.hero_description ?? 'Publish posts, projects, and categories from a protected CMS dashboard. Then connect them through automatic relations and share-ready SEO metadata.'}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href={site?.primary_cta_href ?? '/projects'}>
                  {site?.primary_cta_label ?? 'View projects'} <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href={site?.secondary_cta_href ?? '/graph'}>
                  {site?.secondary_cta_label ?? 'Explore graph'} <Network className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
          <Card className="bg-card/80 backdrop-blur">
            <CardHeader>
              <CardTitle>Projects</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {visibleProjects.length > 0 ? (
                <>
                  {visibleProjects.map((project) => (
                    <Link key={project.id} href={`/projects/${project.slug}`} className="block rounded-lg border bg-background/80 p-4 transition hover:-translate-y-0.5 hover:shadow-md">
                      <h3 className="font-semibold">{project.title}</h3>
                      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{project.summary}</p>
                    </Link>
                  ))}
                  {hasMoreProjects ? (
                    <Button asChild variant="outline" className="w-full">
                      <Link href="/projects">View all projects</Link>
                    </Button>
                  ) : null}
                </>
              ) : (
                <div className="rounded-lg border bg-background/80 p-4 text-sm text-muted-foreground">No published projects yet. Add projects from the CMS dashboard.</div>
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-primary">Projects</p>
            <h2 className="mt-2 text-3xl font-bold">Featured work</h2>
          </div>
          {hasMoreProjects ? (
            <Button asChild variant="ghost">
              <Link href="/projects">All projects</Link>
            </Button>
          ) : null}
        </div>
        {visibleProjects.length > 0 ? (
          <div className="grid gap-5 md:grid-cols-2">
            {visibleProjects.map((project) => <ContentCard key={project.id} item={project} type="project" />)}
          </div>
        ) : (
          <div className="rounded-xl border bg-card p-6 text-sm text-muted-foreground">No published projects yet. Add projects from the CMS dashboard.</div>
        )}
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-primary">Writing</p>
            <h2 className="mt-2 text-3xl font-bold">Latest posts</h2>
          </div>
          <Button asChild variant="ghost">
            <Link href="/blog">All posts</Link>
          </Button>
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          {posts.slice(0, 2).map((post) => <ContentCard key={post.id} item={post} type="blog" />)}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14">
        <div className="mb-8 grid gap-5 md:grid-cols-[0.75fr_1fr]">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-primary">Categories</p>
            <h2 className="mt-2 text-3xl font-bold">Skill map</h2>
          </div>
          <div className="flex flex-wrap gap-2 md:justify-end">
            {categories.map((category) => (
              <Badge key={category.id} variant="outline" className="px-3 py-1 text-sm">
                {category.name}
              </Badge>
            ))}
          </div>
        </div>
        <KnowledgeGraph compact data={graphData} />
      </section>
    </>
  );
}
