import { notFound } from 'next/navigation'
import { AppShell } from '@/components/layout/AppShell'
import { ProjectDetail } from '@/features/projects/components/ProjectDetail'
import { getProjectById } from '@/features/projects/services/projectService'

type ProjectDetailPageProps = { params: Promise<{ id: string }> }

export default async function ProjectDetailPage({ params }: ProjectDetailPageProps) {
  const { id } = await params
  const project = getProjectById(id)
  if (!project) notFound()
  return <AppShell><ProjectDetail project={project} /></AppShell>
}
