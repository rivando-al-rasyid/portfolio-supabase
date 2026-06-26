import type { Metadata } from 'next';
import { ProjectListPage } from '../../features/projects/ProjectListPage';
import { getPublishedProjects } from '../../lib/contentService';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Projects',
  description: 'Selected projects, case studies, and engineering work.'
};

export default async function Page() {
  const projects = await getPublishedProjects();
  return <ProjectListPage projects={projects} />;
}
