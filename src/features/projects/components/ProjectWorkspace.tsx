'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  FolderKanban,
  Plus,
  RefreshCw,
  ShieldAlert,
  Timer,
  TrendingUp,
} from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { ProjectCard } from '@/features/projects/components/ProjectCard'
import { ProjectFilters } from '@/features/projects/components/ProjectFilters'
import { ProjectSearch } from '@/features/projects/components/ProjectSearch'
import { ProjectTable } from '@/features/projects/components/ProjectTable'
import { useProjectFilters } from '@/features/projects/hooks/useProjectFilters'
import { readProjectsFromSupabase } from '@/features/projects/services/projectSupabaseService'
import type { Project } from '@/features/projects/types/project'

const PAGE_SIZE = 6

export function ProjectWorkspace() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadProjects = useCallback(async () => {
    setError(null)

    try {
      const nextProjects = await readProjectsFromSupabase()
      setProjects(nextProjects)
    } catch (loadError) {
      console.error('Error al cargar proyectos desde Supabase:', loadError)
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'No se pudieron cargar los proyectos desde Supabase.',
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadProjects()

    const handleFocus = () => void loadProjects()
    window.addEventListener('focus', handleFocus)

    return () => window.removeEventListener('focus', handleFocus)
  }, [loadProjects])

  const {
    query,
    filters,
    sortKey,
    sortDirection,
    page,
    filteredProjects,
    setPage,
    updateQuery,
    updateFilters,
    toggleSort,
    clearFilters,
  } = useProjectFilters(projects)

  const totalPages = Math.max(1, Math.ceil(filteredProjects.length / PAGE_SIZE))
  const visibleProjects = filteredProjects.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE
  )

  const hasActiveFilters = Boolean(
    query || filters.status !== 'all' || filters.projectType !== 'all'
  )

  const activeProjects = projects.filter(
    (project) => project.status === 'Active'
  ).length
  const atRiskProjects = projects.filter(
    (project) => project.status === 'At Risk'
  ).length
  const planningProjects = projects.filter(
    (project) => project.status === 'Planning'
  ).length

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-7">
      <header className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7187ff]">
            Operación
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-white sm:text-4xl">
            Proyectos
          </h1>
          <p className="mt-2 max-w-xl text-sm text-[#9CA3AF]">
            Controla avance, presupuesto, clientes y responsables de cada proyecto de NEDVI.
          </p>
        </div>

        <Link
          href="/projects/new"
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#163DFF] px-4 text-xs font-semibold text-white shadow-[0_10px_25px_rgba(22,61,255,0.2)] transition hover:bg-[#3155ff] hover:shadow-[0_14px_30px_rgba(22,61,255,0.3)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#163DFF]/30"
        >
          <Plus size={16} />
          Nuevo proyecto
        </Link>
      </header>

      {error ? (
        <div className="flex flex-col gap-4 rounded-2xl border border-red-400/20 bg-red-400/[0.06] p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-white">No pudimos cargar Proyectos desde Supabase</p>
            <p className="mt-1 text-xs leading-5 text-red-200">{error}</p>
          </div>
          <button
            type="button"
            onClick={() => void loadProjects()}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-red-300/20 px-4 text-xs font-semibold text-red-100 transition hover:bg-red-300/10"
          >
            <RefreshCw size={14} /> Reintentar
          </button>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Total de proyectos"
          value={projects.length.toString()}
          detail="En todas las etapas"
          icon={FolderKanban}
        />
        <MetricCard
          label="Proyectos activos"
          value={activeProjects.toString()}
          detail="Actualmente en ejecución"
          icon={TrendingUp}
          accent="emerald"
        />
        <MetricCard
          label="Proyectos en riesgo"
          value={atRiskProjects.toString()}
          detail="Requieren atención"
          icon={ShieldAlert}
          accent="amber"
        />
        <MetricCard
          label="En planeación"
          value={planningProjects.toString()}
          detail="Preparándose para iniciar"
          icon={Timer}
          accent="sky"
        />
      </div>

      <Card className="p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
          <ProjectSearch value={query} onChange={updateQuery} />
          <span className="text-xs text-[#646873]">
            {loading
              ? 'Cargando desde Supabase...'
              : `${filteredProjects.length} ${filteredProjects.length === 1 ? 'proyecto' : 'proyectos'}`}
          </span>
        </div>
        <ProjectFilters
          value={filters}
          onChange={updateFilters}
          onClear={clearFilters}
          hasActiveFilters={hasActiveFilters}
        />
      </Card>

      {loading ? (
        <div className="rounded-2xl border border-white/[0.07] bg-[#20232A] p-8 text-sm text-[#9CA3AF]">
          Cargando proyectos desde Supabase...
        </div>
      ) : visibleProjects.length ? (
        <>
          <ProjectTable
            projects={visibleProjects}
            sortKey={sortKey}
            sortDirection={sortDirection}
            onSort={toggleSort}
          />

          <div className="grid gap-4 md:grid-cols-2 lg:hidden">
            {visibleProjects.map((project) => (
              <ProjectCard project={project} key={project.id} />
            ))}
          </div>

          <div className="flex flex-col items-center justify-between gap-3 text-xs text-[#646873] sm:flex-row">
            <span>
              Mostrando {(page - 1) * PAGE_SIZE + 1}-
              {Math.min(page * PAGE_SIZE, filteredProjects.length)} de{' '}
              {filteredProjects.length}
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
          icon={FolderKanban}
          title="No encontramos proyectos"
          description={
            hasActiveFilters
              ? 'Ajusta la búsqueda o los filtros para encontrar un proyecto.'
              : error
                ? 'Corrige la conexión con Supabase y vuelve a intentar.'
                : 'La cartera de proyectos está lista para registrar el primer proyecto.'
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
                href="/projects/new"
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#163DFF] px-4 text-xs font-semibold text-white transition hover:bg-[#3155ff]"
              >
                <Plus size={14} />
                Agregar proyecto
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
  icon: typeof FolderKanban
  accent?: 'blue' | 'emerald' | 'amber' | 'sky'
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
      : accent === 'amber'
        ? 'bg-amber-400/[0.1] text-amber-300'
        : accent === 'sky'
          ? 'bg-sky-400/[0.1] text-sky-300'
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
          PMO
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
