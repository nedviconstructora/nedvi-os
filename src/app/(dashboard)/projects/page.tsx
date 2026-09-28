'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  BriefcaseBusiness,
  CircleDollarSign,
  FileText,
  FolderKanban,
  RefreshCw,
  Search,
  UserRound,
} from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'

type ProjectCurrency = 'MXN' | 'USD'

type QuoteCustomerInfo = {
  folio?: string
  contact?: string
  phone?: string
  email?: string
  address?: string
  rfc?: string
}

type SavedQuote = {
  id: string
  folio: string
  customerId?: string
  client: string
  customerInfo?: QuoteCustomerInfo
  project: string
  total: number
  currency?: string
  owner?: string
  createdAt: string
  convertedToProject?: boolean
}

type ProjectRow = {
  id: string
  folio: string
  quoteId: string
  name: string
  client: string
  customerContact: string
  responsible: string
  address: string
  budget: number
  currency: ProjectCurrency
  createdAt: string
  source: string
  status: 'Planeación'
}

const QUOTES_STORAGE_KEY = 'nedvi_quotes'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function readJsonArray(key: string): unknown[] {
  if (typeof window === 'undefined') return []

  const raw = window.localStorage.getItem(key)
  if (!raw) return []

  try {
    const parsed = JSON.parse(raw) as unknown
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function readQuotes(): SavedQuote[] {
  return readJsonArray(QUOTES_STORAGE_KEY)
    .filter(isRecord)
    .filter((value) => value.convertedToProject === true)
    .filter(
      (value) =>
        typeof value.id === 'string' &&
        typeof value.folio === 'string' &&
        typeof value.client === 'string' &&
        typeof value.project === 'string' &&
        typeof value.total === 'number' &&
        typeof value.createdAt === 'string',
    )
    .map((value) => ({
      id: value.id as string,
      folio: value.folio as string,
      customerId: typeof value.customerId === 'string' ? value.customerId : undefined,
      client: value.client as string,
      customerInfo: isRecord(value.customerInfo)
        ? {
            folio:
              typeof value.customerInfo.folio === 'string'
                ? value.customerInfo.folio
                : undefined,
            contact:
              typeof value.customerInfo.contact === 'string'
                ? value.customerInfo.contact
                : undefined,
            phone:
              typeof value.customerInfo.phone === 'string'
                ? value.customerInfo.phone
                : undefined,
            email:
              typeof value.customerInfo.email === 'string'
                ? value.customerInfo.email
                : undefined,
            address:
              typeof value.customerInfo.address === 'string'
                ? value.customerInfo.address
                : undefined,
            rfc:
              typeof value.customerInfo.rfc === 'string'
                ? value.customerInfo.rfc
                : undefined,
          }
        : undefined,
      project: value.project as string,
      total: value.total as number,
      currency: typeof value.currency === 'string' ? value.currency : 'MXN',
      owner: typeof value.owner === 'string' ? value.owner : '',
      createdAt: value.createdAt as string,
      convertedToProject: true,
    }))
}

function buildProjects(): ProjectRow[] {
  return readQuotes()
    .map((quote) => ({
      id: `quote-project-${quote.id}`,
      folio: quote.folio,
      quoteId: quote.id,
      name: quote.project,
      client: quote.client,
      customerContact: quote.customerInfo?.contact ?? '',
      responsible: quote.owner ?? '',
      address: quote.customerInfo?.address ?? '',
      budget: quote.total,
      currency: quote.currency === 'USD' ? 'USD' : 'MXN',
      createdAt: quote.createdAt,
      source: 'Cotización aprobada',
      status: 'Planeación' as const,
    }))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

function money(value: number, currency: ProjectCurrency) {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

function formatDate(value: string) {
  if (!value) return 'Sin fecha'
  const date = new Date(`${value}T12:00:00`)
  if (Number.isNaN(date.getTime())) return value

  return new Intl.DateTimeFormat('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<ProjectRow[]>([])
  const [search, setSearch] = useState('')
  const [loaded, setLoaded] = useState(false)

  const loadProjects = useCallback(() => {
    setProjects(buildProjects())
    setLoaded(true)
  }, [])

  useEffect(() => {
    loadProjects()

    const handleStorage = (event: StorageEvent) => {
      if (event.key === QUOTES_STORAGE_KEY) {
        loadProjects()
      }
    }

    window.addEventListener('storage', handleStorage)
    window.addEventListener('focus', loadProjects)

    return () => {
      window.removeEventListener('storage', handleStorage)
      window.removeEventListener('focus', loadProjects)
    }
  }, [loadProjects])

  const filteredProjects = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return projects

    return projects.filter((project) =>
      [
        project.folio,
        project.name,
        project.client,
        project.customerContact,
        project.responsible,
      ]
        .join(' ')
        .toLowerCase()
        .includes(query),
    )
  }, [projects, search])

  const totalBudgetMXN = projects
    .filter((project) => project.currency === 'MXN')
    .reduce((sum, project) => sum + project.budget, 0)

  const totalBudgetUSD = projects
    .filter((project) => project.currency === 'USD')
    .reduce((sum, project) => sum + project.budget, 0)

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-[1600px] space-y-6">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#5496CC]">
              Proyectos
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-[var(--foreground)]">
              Proyectos creados
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">
              Aquí aparecen únicamente las cotizaciones existentes que hayas convertido en proyecto. Si eliminas la cotización, el proyecto también desaparece automáticamente.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={loadProjects}
              className="inline-flex h-11 items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 text-sm font-semibold text-[var(--foreground)] transition hover:border-[#5496CC]"
            >
              <RefreshCw size={16} />
              Actualizar
            </button>
            <Link
              href="/quotes"
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#5496CC] px-4 text-sm font-semibold text-white transition hover:brightness-95"
            >
              <FileText size={16} />
              Ir a cotizaciones
            </Link>
          </div>
        </header>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            icon={FolderKanban}
            label="Total de proyectos"
            value={projects.length.toString()}
            detail="Cotizaciones convertidas vigentes"
          />
          <MetricCard
            icon={BriefcaseBusiness}
            label="En planeación"
            value={projects.length.toString()}
            detail="Etapa inicial"
          />
          <MetricCard
            icon={CircleDollarSign}
            label="Presupuesto MXN"
            value={money(totalBudgetMXN, 'MXN')}
            detail="Cotizaciones convertidas"
          />
          <MetricCard
            icon={CircleDollarSign}
            label="Presupuesto USD"
            value={money(totalBudgetUSD, 'USD')}
            detail="Cotizaciones convertidas"
          />
        </div>

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm">
          <div className="relative max-w-xl">
            <Search
              size={17}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--muted)]"
            />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por folio, proyecto, cliente o responsable..."
              className="w-full rounded-xl border border-[var(--border)] bg-transparent py-3 pl-11 pr-4 text-sm text-[var(--foreground)] outline-none transition placeholder:text-[var(--subtle)] focus:border-[#5496CC]"
            />
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
          {!loaded ? (
            <div className="p-12 text-center text-sm text-[var(--muted)]">
              Cargando proyectos...
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#5496CC]/10 text-[#5496CC]">
                <FolderKanban size={26} />
              </span>
              <h2 className="mt-4 text-lg font-bold text-[var(--foreground)]">
                {projects.length === 0
                  ? 'Todavía no hay proyectos creados'
                  : 'No encontramos proyectos'}
              </h2>
              <p className="mt-2 max-w-lg text-sm text-[var(--muted)]">
                {projects.length === 0
                  ? 'Ve a Cotizaciones, cambia una cotización a Aprobada y presiona Crear proyecto. Solo las cotizaciones que sigan existiendo aparecerán aquí.'
                  : 'Prueba con otro folio, cliente, proyecto o responsable.'}
              </p>
              {projects.length === 0 ? (
                <Link
                  href="/quotes"
                  className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#5496CC] px-4 py-2.5 text-sm font-semibold text-white"
                >
                  <FileText size={16} />
                  Abrir cotizaciones
                </Link>
              ) : null}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-[1050px] w-full text-left text-sm">
                <thead className="border-b border-[var(--border)] bg-[var(--surface-soft)] text-xs uppercase tracking-wide text-[var(--muted)]">
                  <tr>
                    <th className="px-5 py-4">Folio</th>
                    <th className="px-5 py-4">Proyecto</th>
                    <th className="px-5 py-4">Cliente</th>
                    <th className="px-5 py-4">Responsable</th>
                    <th className="px-5 py-4">Presupuesto</th>
                    <th className="px-5 py-4">Estado</th>
                    <th className="px-5 py-4">Fecha</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {filteredProjects.map((project) => (
                    <tr
                      key={project.quoteId}
                      className="transition hover:bg-[var(--surface-soft)]"
                    >
                      <td className="px-5 py-4 font-semibold text-[#5496CC]">
                        {project.folio}
                      </td>
                      <td className="px-5 py-4">
                        <p className="font-semibold text-[var(--foreground)]">
                          {project.name}
                        </p>
                        <p className="mt-1 text-xs text-[var(--muted)]">
                          Origen: {project.source}
                        </p>
                      </td>
                      <td className="px-5 py-4">
                        <p className="font-medium text-[var(--foreground)]">
                          {project.client}
                        </p>
                        {project.customerContact ? (
                          <p className="mt-1 text-xs text-[var(--muted)]">
                            {project.customerContact}
                          </p>
                        ) : null}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2 text-[var(--foreground)]">
                          <UserRound size={15} className="text-[var(--muted)]" />
                          {project.responsible || 'Sin responsable'}
                        </div>
                      </td>
                      <td className="px-5 py-4 font-semibold text-[var(--foreground)]">
                        {money(project.budget, project.currency)}
                      </td>
                      <td className="px-5 py-4">
                        <span className="rounded-full bg-[#5496CC]/10 px-3 py-1.5 text-xs font-semibold text-[#5496CC]">
                          {project.status}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-[var(--muted)]">
                        {formatDate(project.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  )
}

type MetricCardProps = {
  icon: typeof FolderKanban
  label: string
  value: string
  detail: string
}

function MetricCard({ icon: Icon, label, value, detail }: MetricCardProps) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#5496CC]/10 text-[#5496CC]">
        <Icon size={19} />
      </span>
      <p className="mt-4 break-words text-2xl font-bold tracking-tight text-[var(--foreground)]">
        {value}
      </p>
      <p className="mt-1 text-sm font-semibold text-[var(--foreground)]">{label}</p>
      <p className="mt-1 text-xs text-[var(--muted)]">{detail}</p>
    </div>
  )
}
