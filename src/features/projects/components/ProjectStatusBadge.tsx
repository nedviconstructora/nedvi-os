import type { ProjectStatus } from '@/features/projects/types/project'
import { getProjectStatusLabel } from '@/features/projects/utils/projectUtils'

type ProjectStatusBadgeProps = { status: ProjectStatus }

const styles: Record<ProjectStatus, string> = {
  Planning: 'border-sky-400/20 bg-sky-400/10 text-sky-300',
  Active: 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300',
  'At Risk': 'border-amber-400/20 bg-amber-400/10 text-amber-300',
  Completed: 'border-violet-400/20 bg-violet-400/10 text-violet-300',
  'On Hold': 'border-white/10 bg-white/[0.05] text-[#9CA3AF]',
}

export function ProjectStatusBadge({ status }: ProjectStatusBadgeProps) {
  return <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold ${styles[status]}`}><span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />{getProjectStatusLabel(status)}</span>
}
