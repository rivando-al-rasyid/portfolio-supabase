import Link from 'next/link';
import { ArrowLeft, ExternalLink, GitBranch } from 'lucide-react';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { getCanonicalUrl } from '../../lib/utils';
import { renderMarkdown } from '../../lib/markdown';
import { ShareButton } from '../share/ShareButton';
import type { Project } from '../../types/content';

export function ProjectDetailPage({ project }: { project: Project }) {
  const url = getCanonicalUrl(`/projects/${project.slug}`);

  return (
    <article className="mx-auto max-w-3xl px-4 py-10">
      <Button asChild variant="ghost" className="mb-6 -ml-3">
        <Link href="/projects">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
      </Button>
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <Badge variant="secondary">Project</Badge>
        {project.categories?.map((category) => (
          <Badge key={category.id} variant="outline">
            {category.name}
          </Badge>
        ))}
      </div>
      <h1 className="text-4xl font-bold tracking-tight md:text-5xl">{project.title}</h1>
      {project.summary ? <p className="mt-5 text-lg text-muted-foreground">{project.summary}</p> : null}
      {project.image_url ? (
        // eslint-disable-next-line @next/next/no-img-element
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
  );
}
