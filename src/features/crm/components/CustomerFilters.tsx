'use client'

import { Filter, RotateCcw } from 'lucide-react'
import type { CustomerStatus, LeadSource, ProjectType } from '@/features/crm/types/customer'
import { customerStatuses, leadSources, projectTypes } from '@/features/crm/types/customer'
import type { CustomerFiltersState } from '@/features/crm/hooks/useCustomerFilters'

type CustomerFiltersProps = {
  value: CustomerFiltersState
  onChange: (value: CustomerFiltersState) => void
  onClear: () => void
  hasActiveFilters: boolean
}

const selectClassName = 'h-10 w-full appearance-none rounded-lg border border-white/[0.08] bg-[#17181C] px-3 text-xs text-[#d5d7df] outline-none transition hover:border-white/[0.15] focus:border-[#163DFF] focus:ring-4 focus:ring-[#163DFF]/10 sm:w-auto sm:min-w-36'

export function CustomerFilters({ value, onChange, onClear, hasActiveFilters }: CustomerFiltersProps) {
  const update = <Key extends keyof CustomerFiltersState>(key: Key, nextValue: CustomerFiltersState[Key]) => {
    onChange({ ...value, [key]: nextValue })
  }

  return (
    <div className="flex flex-col gap-3 border-t border-white/[0.06] pt-4 sm:flex-row sm:flex-wrap sm:items-center">
      <span className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#646873]"><Filter size={14} /> Filters</span>
      <label className="sr-only" htmlFor="customer-status-filter">Status</label>
      <select id="customer-status-filter" value={value.status} onChange={(event) => update('status', event.target.value as CustomerStatus)} className={selectClassName}>
        <option value="all">All statuses</option>
        {customerStatuses.map((status) => <option value={status} key={status}>{status}</option>)}
      </select>
      <label className="sr-only" htmlFor="customer-project-filter">Project type</label>
      <select id="customer-project-filter" value={value.projectType} onChange={(event) => update('projectType', event.target.value as ProjectType)} className={selectClassName}>
        <option value="all">All project types</option>
        {projectTypes.map((type) => <option value={type} key={type}>{type}</option>)}
      </select>
      <label className="sr-only" htmlFor="customer-source-filter">Lead source</label>
      <select id="customer-source-filter" value={value.leadSource} onChange={(event) => update('leadSource', event.target.value as LeadSource)} className={selectClassName}>
        <option value="all">All sources</option>
        {leadSources.map((source) => <option value={source} key={source}>{source}</option>)}
      </select>
      {hasActiveFilters ? (
        <button type="button" onClick={onClear} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg px-3 text-xs font-medium text-[#9CA3AF] transition hover:bg-white/[0.05] hover:text-white">
          <RotateCcw size={13} /> Clear filters
        </button>
      ) : null}
    </div>
  )
}
