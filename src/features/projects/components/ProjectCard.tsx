import Link from 'next/link'
import { ArrowUpRight, CalendarDays, MapPin } from 'lucide-react'
import type { Project } from '@/features/projects/types/project'
import { formatCurrency, formatProjectDate, getProjectInitials } from '@/features/projects/utils/projectUtils'
import { Card } from '@/components/ui/Card'
import { ProgressBar } from '@/features/projects/components/ProgressBar'
import { ProjectStatusBadge } from '@/features/projects/components/ProjectStatusBadge'

type ProjectCardProps = { project: Project }

export function ProjectCard({ project }: ProjectCardProps) {
  return <Card className="overflow-hidden transition duration-200 hover:-translate-y-0.5 hover:border-white/[0.14]"><div className="flex items-start justify-between gap-3 border-b border-white/[0.06] p-5"><div className="flex min-w-0 items-center gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#163DFF]/[0.14] text-xs font-semibold text-[#9aabff]">{getProjectInitials(project)}</span><div className="min-w-0"><Link href={`/projects/${project.id}`} className="block truncate text-sm font-semibold text-white transition hover:text-[#91a2ff]">{project.name}</Link><p className="mt-1 truncate text-xs text-[#9CA3AF]">{project.client}</p></div></div><ProjectStatusBadge status={project.status} /></div><div className="space-y-4 p-5"><div><div className="mb-2 flex items-center justify-between"><span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#646873]">Progress</span><span className="text-xs font-semibold text-white">{project.progress}%</span></div><ProgressBar value={project.progress} showLabel={false} size="sm" /></div><div className="grid grid-cols-2 gap-3"><div><p className="text-[10px] uppercase tracking-[0.1em] text-[#646873]">Budget</p><p className="mt-1 text-xs font-medium text-[#d5d7df]">{formatCurrency(project.budget)}</p></div><div><p className="text-[10px] uppercase tracking-[0.1em] text-[#646873]">Completion</p><p className="mt-1 text-xs font-medium text-[#d5d7df]">{formatProjectDate(project.estimatedCompletion)}</p></div></div><div className="space-y-2 border-t border-white/[0.06] pt-4 text-[11px] text-[#646873]"><p className="flex items-center gap-2 truncate"><MapPin size={13} />{project.address}</p><p className="flex items-center gap-2"><CalendarDays size={13} />Managed by {project.manager}</p></div><Link href={`/projects/${project.id}`} className="inline-flex items-center gap-1 text-xs font-semibold text-[#7187ff] transition hover:text-white">Open project <ArrowUpRight size={13} /></Link></div></Card>
}
