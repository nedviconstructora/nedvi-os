'use client'

import { Filter, RotateCcw } from 'lucide-react'
import type { ProjectStatus, ProjectType } from '@/features/projects/types/project'
import { projectStatuses, projectTypes } from '@/features/projects/types/project'
import type { ProjectFiltersState } from '@/features/projects/hooks/useProjectFilters'

type ProjectFiltersProps = { value: ProjectFiltersState; onChange: (value: ProjectFiltersState) => void; onClear: () => void; hasActiveFilters: boolean }
const selectClassName = 'h-10 w-full appearance-none rounded-lg border border-white/[0.08] bg-[#17181C] px-3 text-xs text-[#d5d7df] outline-none transition hover:border-white/[0.15] focus:border-[#163DFF] focus:ring-4 focus:ring-[#163DFF]/10 sm:w-auto sm:min-w-36'

export function ProjectFilters({ value, onChange, onClear, hasActiveFilters }: ProjectFiltersProps) {
  return <div className="flex flex-col gap-3 border-t border-white/[0.06] pt-4 sm:flex-row sm:flex-wrap sm:items-center"><span className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#646873]"><Filter size={14} /> Filters</span><label className="sr-only" htmlFor="project-status-filter">Status</label><select id="project-status-filter" value={value.status} onChange={(event) => onChange({ ...value, status: event.target.value as ProjectStatus | 'all' })} className={selectClassName}><option value="all">All statuses</option>{projectStatuses.map((status) => <option value={status} key={status}>{status}</option>)}</select><label className="sr-only" htmlFor="project-type-filter">Project type</label><select id="project-type-filter" value={value.projectType} onChange={(event) => onChange({ ...value, projectType: event.target.value as ProjectType | 'all' })} className={selectClassName}><option value="all">All project types</option>{projectTypes.map((type) => <option value={type} key={type}>{type}</option>)}</select>{hasActiveFilters ? <button type="button" onClick={onClear} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg px-3 text-xs font-medium text-[#9CA3AF] transition hover:bg-white/[0.05] hover:text-white"><RotateCcw size={13} /> Clear filters</button> : null}</div>
}
