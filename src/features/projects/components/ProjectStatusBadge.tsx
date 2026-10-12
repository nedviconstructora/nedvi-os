import type { ProjectStatus } from '@/features/projects/types/project'
import { getProjectStatusLabel } from '@/features/projects/utils/projectUtils'

type ProjectStatusBadgeProps = { status: ProjectStatus }

const styles: Record<ProjectStatus, string> = {
  Planning: 'nedvi-project-status-planning',
  Active: 'nedvi-project-status-active',
  'At Risk': 'nedvi-project-status-risk',
  Completed: 'nedvi-project-status-completed',
  'On Hold': 'nedvi-project-status-hold',
}

export function ProjectStatusBadge({ status }: ProjectStatusBadgeProps) {
  return <span className={`inline-flex items-center gap-1.5 nedvi-project-status rounded-full border px-2.5 py-1 text-[10px] font-bold ${styles[status]}`}><span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />{getProjectStatusLabel(status)}</span>
}
