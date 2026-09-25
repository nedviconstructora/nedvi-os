import { AppShell } from '@/components/layout/AppShell'
import { ProjectWorkspace } from '@/features/projects/components/ProjectWorkspace'
import { getProjects } from '@/features/projects/services/projectService'

export default function ProjectsPage() {
  return <AppShell><ProjectWorkspace projects={getProjects()} /></AppShell>
}
