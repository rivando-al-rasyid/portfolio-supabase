import { useLoaderData } from 'react-router-dom';
import { ContentCard } from '../../components/ContentCard';
import { EmptyState } from '../../components/EmptyState';
import type { ProjectListLoaderData } from '../../routes/loaders/contentLoaders';
import { SEO } from '../seo/SEO';

export function ProjectListPage() {
  const { projects } = useLoaderData() as ProjectListLoaderData;

  return (
    <>
      <SEO title="Projects" description="Selected projects, case studies, and engineering work." path="/projects" />
      <section className="mx-auto max-w-6xl px-4 py-10">
        <div className="mb-8 max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-primary">Projects</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight md:text-5xl">Work that connects product and engineering.</h1>
          <p className="mt-4 text-muted-foreground">Showcase projects, link repositories, and connect each work item to topics.</p>
        </div>

        {projects.length === 0 ? (
          <EmptyState title="No projects yet" description="Create and publish projects from the protected admin dashboard." />
        ) : null}

        <div className="grid gap-5 md:grid-cols-2">
          {projects.map((project) => (
            <ContentCard key={project.id} item={project} type="project" />
          ))}
        </div>
      </section>
    </>
  );
}
