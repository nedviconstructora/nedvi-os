'use client'

import Link from 'next/link'
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Target,
  TrendingUp,
  UserCheck,
  Users,
} from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { CustomerCard } from '@/features/crm/components/CustomerCard'
import { CustomerFilters } from '@/features/crm/components/CustomerFilters'
import { CustomerSearch } from '@/features/crm/components/CustomerSearch'
import { CustomerTable } from '@/features/crm/components/CustomerTable'
import { useCustomerFilters } from '@/features/crm/hooks/useCustomerFilters'
import type { Customer } from '@/features/crm/types/customer'

const PAGE_SIZE = 8

type CustomerWorkspaceProps = {
  customers: Customer[]
}

export function CustomerWorkspace({ customers }: CustomerWorkspaceProps) {
  const {
    query,
    filters,
    sortKey,
    sortDirection,
    page,
    filteredCustomers,
    setPage,
    updateQuery,
    updateFilters,
    toggleSort,
    clearFilters,
  } = useCustomerFilters(customers)

  const totalPages = Math.max(
    1,
    Math.ceil(filteredCustomers.length / PAGE_SIZE)
  )

  const visibleCustomers = filteredCustomers.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE
  )

  const hasActiveFilters = Boolean(
    query ||
      filters.status !== 'all' ||
      filters.projectType !== 'all' ||
      filters.leadSource !== 'all'
  )

  const activeCustomers = customers.filter(
    (customer) => customer.status === 'Active'
  ).length

  const qualifiedCustomers = customers.filter(
    (customer) => customer.status === 'Qualified'
  ).length

  const proposalCustomers = customers.filter(
    (customer) => customer.status === 'Proposal'
  ).length

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-7">
      <header className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7187ff]">
            Gestión comercial
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-white sm:text-4xl">
            Clientes
          </h1>
          <p className="mt-2 max-w-xl text-sm text-[#9CA3AF]">
            Administra relaciones, oportunidades y el seguimiento comercial de cada cliente de NEDVI.
          </p>
        </div>

        <Link
          href="/crm/new"
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#163DFF] px-4 text-xs font-semibold text-white shadow-[0_10px_25px_rgba(22,61,255,0.2)] transition hover:bg-[#3155ff] hover:shadow-[0_14px_30px_rgba(22,61,255,0.3)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#163DFF]/30"
        >
          <Plus size={16} />
          Nuevo cliente
        </Link>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Total de clientes"
          value={customers.length.toString()}
          detail="En todos los estados"
          icon={Users}
        />
        <MetricCard
          label="Cuentas activas"
          value={activeCustomers.toString()}
          detail="Relaciones en operación"
          icon={UserCheck}
          accent="emerald"
        />
        <MetricCard
          label="Prospectos calificados"
          value={qualifiedCustomers.toString()}
          detail="Listos para seguimiento"
          icon={Target}
          accent="sky"
        />
        <MetricCard
          label="Propuestas abiertas"
          value={proposalCustomers.toString()}
          detail="Pendientes de decisión"
          icon={TrendingUp}
          accent="violet"
        />
      </div>

      <Card className="p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
          <CustomerSearch value={query} onChange={updateQuery} />
          <span className="text-xs text-[#646873]">
            {filteredCustomers.length}{' '}
            {filteredCustomers.length === 1 ? 'resultado' : 'resultados'}
          </span>
        </div>

        <CustomerFilters
          value={filters}
          onChange={updateFilters}
          onClear={clearFilters}
          hasActiveFilters={hasActiveFilters}
        />
      </Card>

      {visibleCustomers.length ? (
        <>
          <CustomerTable
            customers={visibleCustomers}
            sortKey={sortKey}
            sortDirection={sortDirection}
            onSort={toggleSort}
          />

          <div className="grid gap-4 md:grid-cols-2 lg:hidden">
            {visibleCustomers.map((customer) => (
              <CustomerCard customer={customer} key={customer.id} />
            ))}
          </div>

          <div className="flex flex-col items-center justify-between gap-3 text-xs text-[#646873] sm:flex-row">
            <span>
              Mostrando {(page - 1) * PAGE_SIZE + 1}-
              {Math.min(page * PAGE_SIZE, filteredCustomers.length)} de{' '}
              {filteredCustomers.length}
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  setPage((currentPage) => Math.max(1, currentPage - 1))
                }
                disabled={page === 1}
                className="inline-flex h-9 items-center gap-1 rounded-lg border border-white/[0.08] px-3 text-xs font-medium text-[#9CA3AF] transition hover:bg-white/[0.05] hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft size={14} />
                Anterior
              </button>

              <span className="px-2 text-[#9CA3AF]">
                Página {page} de {totalPages}
              </span>

              <button
                type="button"
                onClick={() =>
                  setPage((currentPage) =>
                    Math.min(totalPages, currentPage + 1)
                  )
                }
                disabled={page === totalPages}
                className="inline-flex h-9 items-center gap-1 rounded-lg border border-white/[0.08] px-3 text-xs font-medium text-[#9CA3AF] transition hover:bg-white/[0.05] hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                Siguiente
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </>
      ) : (
        <EmptyState
          icon={Users}
          title="No encontramos clientes"
          description={
            hasActiveFilters
              ? 'Prueba ajustando la búsqueda o los filtros para encontrar un cliente.'
              : 'El directorio de clientes está listo para registrar la primera relación comercial.'
          }
          action={
            hasActiveFilters ? (
              <button
                type="button"
                onClick={clearFilters}
                className="text-xs font-semibold text-[#7187ff] transition hover:text-white"
              >
                Limpiar búsqueda y filtros
              </button>
            ) : (
              <Link
                href="/crm/new"
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#163DFF] px-4 text-xs font-semibold text-white transition hover:bg-[#3155ff]"
              >
                <Plus size={14} />
                Agregar cliente
              </Link>
            )
          }
        />
      )}
    </div>
  )
}

type MetricCardProps = {
  label: string
  value: string
  detail: string
  icon: typeof Users
  accent?: 'blue' | 'emerald' | 'sky' | 'violet'
}

function MetricCard({
  label,
  value,
  detail,
  icon: Icon,
  accent = 'blue',
}: MetricCardProps) {
  const accentClass =
    accent === 'emerald'
      ? 'bg-emerald-400/[0.1] text-emerald-300'
      : accent === 'sky'
        ? 'bg-sky-400/[0.1] text-sky-300'
        : accent === 'violet'
          ? 'bg-violet-400/[0.1] text-violet-300'
          : 'bg-[#163DFF]/[0.12] text-[#7187ff]'

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <span
          className={`flex h-9 w-9 items-center justify-center rounded-xl ${accentClass}`}
        >
          <Icon size={17} strokeWidth={1.8} />
        </span>
        <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#646873]">
          CRM
        </span>
      </div>

      <p className="mt-5 text-2xl font-semibold tracking-[-0.04em] text-white">
        {value}
      </p>
      <p className="mt-1 text-xs font-medium text-[#d5d7df]">{label}</p>
      <p className="mt-2 text-[11px] text-[#646873]">{detail}</p>
    </Card>
  )
}
