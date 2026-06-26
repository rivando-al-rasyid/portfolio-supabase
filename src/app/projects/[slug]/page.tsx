import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ProjectDetailPage } from '../../../features/projects/ProjectDetailPage';
import { getProjectBySlug } from '../../../lib/contentService';
import { generateSeoDescription, generateSeoTitle } from '../../../lib/utils';

export const dynamic = 'force-dynamic';

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const project = await getProjectBySlug(slug);
  if (!project) return { title: 'Project not found' };

  return {
    title: project.meta_title || generateSeoTitle(project.title),
    description: project.meta_description || generateSeoDescription({ description: project.summary, content: project.content }),
    openGraph: {
      title: project.meta_title || generateSeoTitle(project.title),
      description: project.meta_description || generateSeoDescription({ description: project.summary, content: project.content }),
      images: project.image_url ? [project.image_url] : undefined,
      type: 'article'
    }
  };
}

export default async function Page({ params }: PageProps) {
  const { slug } = await params;
  const project = await getProjectBySlug(slug);
  if (!project) notFound();
  return <ProjectDetailPage project={project} />;
}
