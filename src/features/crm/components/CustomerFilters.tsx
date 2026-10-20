'use client'

import { Filter, RotateCcw } from 'lucide-react'
import type { CustomerFiltersState } from '@/features/crm/hooks/useCustomerFilters'
import type {
  CustomerStatus,
  LeadSource,
  ProjectType,
} from '@/features/crm/types/customer'
import {
  customerStatuses,
  leadSources,
  projectTypes,
} from '@/features/crm/types/customer'
import { getCustomerStatusLabel } from '@/features/crm/utils/customerUtils'

type CustomerFiltersProps = {
  value: CustomerFiltersState
  onChange: (value: CustomerFiltersState) => void
  onClear: () => void
  hasActiveFilters: boolean
}

const selectClassName =
  'h-10 w-full appearance-none rounded-lg border border-[var(--border)] bg-[var(--surface-soft)] px-3 text-xs text-[var(--foreground)] outline-none transition hover:border-[var(--primary)] focus:border-[#163DFF] focus:ring-4 focus:ring-[#163DFF]/10 sm:w-auto sm:min-w-36'

export function CustomerFilters({
  value,
  onChange,
  onClear,
  hasActiveFilters,
}: CustomerFiltersProps) {
  const update = <Key extends keyof CustomerFiltersState>(
    key: Key,
    nextValue: CustomerFiltersState[Key]
  ) => {
    onChange({ ...value, [key]: nextValue })
  }

  return (
    <div className="flex flex-col gap-3 border-t border-[var(--border)] pt-4 sm:flex-row sm:flex-wrap sm:items-center">
      <span className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
        <Filter size={14} />
        Filtros
      </span>

      <label className="sr-only" htmlFor="customer-status-filter">
        Estado
      </label>
      <select
        id="customer-status-filter"
        value={value.status}
        onChange={(event) =>
          update('status', event.target.value as CustomerStatus)
        }
        className={selectClassName}
      >
        <option value="all">Todos los estados</option>
        {customerStatuses.map((status) => (
          <option value={status} key={status}>
            {getCustomerStatusLabel(status)}
          </option>
        ))}
      </select>

      <label className="sr-only" htmlFor="customer-project-filter">
        Tipo de proyecto
      </label>
      <select
        id="customer-project-filter"
        value={value.projectType}
        onChange={(event) =>
          update('projectType', event.target.value as ProjectType)
        }
        className={selectClassName}
      >
        <option value="all">Todos los tipos de proyecto</option>
        {projectTypes.map((type) => (
          <option value={type} key={type}>
            {type}
          </option>
        ))}
      </select>

      <label className="sr-only" htmlFor="customer-source-filter">
        Origen del prospecto
      </label>
      <select
        id="customer-source-filter"
        value={value.leadSource}
        onChange={(event) =>
          update('leadSource', event.target.value as LeadSource)
        }
        className={selectClassName}
      >
        <option value="all">Todos los orígenes</option>
        {leadSources.map((source) => (
          <option value={source} key={source}>
            {source}
          </option>
        ))}
      </select>

      {hasActiveFilters ? (
        <button
          type="button"
          onClick={onClear}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg px-3 text-xs font-medium text-[var(--muted)] transition hover:bg-white/[0.05] hover:text-[var(--primary)]"
        >
          <RotateCcw size={13} />
          Limpiar filtros
        </button>
      ) : null}
    </div>
  )
}
