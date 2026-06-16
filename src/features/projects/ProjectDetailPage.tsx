import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ExternalLink, GitBranch } from 'lucide-react';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { getProjectBySlug } from '../../lib/contentService';
import { generateSeoDescription, generateSeoTitle, getCanonicalUrl } from '../../lib/utils';
import { renderMarkdown } from '../../lib/markdown';
import { ShareButton } from '../share/ShareButton';
import { SEO } from '../seo/SEO';

export function ProjectDetailPage() {
  const { slug = '' } = useParams();
  const { data: project, isLoading } = useQuery({ queryKey: ['project', slug], queryFn: () => getProjectBySlug(slug), enabled: Boolean(slug) });

  if (isLoading) {
    return <div className="mx-auto max-w-3xl px-4 py-12"><div className="h-96 animate-pulse rounded-xl bg-muted" /></div>;
  }

  if (!project) {
    return (
      <section className="mx-auto max-w-3xl px-4 py-16">
        <h1 className="text-3xl font-bold">Project not found</h1>
        <Button asChild className="mt-6" variant="outline">
          <Link to="/projects">Back to projects</Link>
        </Button>
      </section>
    );
  }

  const url = getCanonicalUrl(`/projects/${project.slug}`);

  return (
    <>
      <SEO title={project.meta_title || generateSeoTitle(project.title)} description={project.meta_description || generateSeoDescription({ description: project.summary, content: project.content })} image={project.image_url} path={`/projects/${project.slug}`} type="article" />
      <article className="mx-auto max-w-3xl px-4 py-10">
        <Button asChild variant="ghost" className="mb-6 -ml-3">
          <Link to="/projects">
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
        </Button>
        <div className="mb-5 flex flex-wrap items-center gap-2">
          <Badge variant="secondary">Project</Badge>
          {project.topics?.map((topic) => (
            <Badge key={topic.id} variant="outline">
              {topic.name}
            </Badge>
          ))}
        </div>
        <h1 className="text-4xl font-bold tracking-tight md:text-5xl">{project.title}</h1>
        {project.summary ? <p className="mt-5 text-lg text-muted-foreground">{project.summary}</p> : null}
        {project.image_url ? (
          <img src={project.image_url} alt={project.title} className="mt-8 aspect-video w-full rounded-2xl border object-cover shadow-sm" />
        ) : null}
        <div className="mt-8 flex flex-wrap gap-3">
          {project.demo_url ? (
            <Button asChild>
              <a href={project.demo_url} target="_blank" rel="noreferrer">
                Live demo <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
          ) : null}
          {project.repo_url ? (
            <Button asChild variant="outline">
              <a href={project.repo_url} target="_blank" rel="noreferrer">
                Repository <GitBranch className="h-4 w-4" />
              </a>
            </Button>
          ) : null}
          <ShareButton entityType="project" entityId={project.id} title={project.title} text={project.summary ?? ''} url={url} />
        </div>
        <div className="markdown-body mt-10 border-t pt-8">{renderMarkdown(project.content)}</div>
      </article>
    </>
  );
}
