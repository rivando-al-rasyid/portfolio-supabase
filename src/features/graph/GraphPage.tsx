import { useLoaderData } from 'react-router-dom';
import { KnowledgeGraph } from './KnowledgeGraph';
import { SEO } from '../seo/SEO';
import type { GraphLoaderData } from '../../routes/loaders/contentLoaders';

export function GraphPage() {
  const { graphData } = useLoaderData() as GraphLoaderData;

  return (
    <>
      <SEO title="Knowledge Graph" description="Interactive map of posts, projects, and categories." path="/graph" />
      <section className="mx-auto max-w-6xl px-4 py-10">
        <div className="mb-8 max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-primary">Graph</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight md:text-5xl">See how the portfolio connects.</h1>
          <p className="mt-4 text-muted-foreground">
            This version uses a lightweight SVG graph, so it does not depend on a heavy graph canvas library. That makes the fresh remake easier to debug and deploy.
          </p>
        </div>
        <KnowledgeGraph data={graphData} />
      </section>
    </>
  );
}
