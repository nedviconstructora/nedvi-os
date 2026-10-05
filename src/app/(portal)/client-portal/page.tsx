'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  BarChart3,
  FileText,
  FolderKanban,
  LogOut,
  RefreshCw,
  ShieldCheck,
  UserRound,
} from 'lucide-react'
import {
  clearAccessSession,
  readAccessSession,
  type AccessSession,
} from '@/features/access/services/accessStorage'
import {
  readDailyReports,
  readProgressRecords,
  type DailyReport,
  type OperationProject,
  type ProgressRecord,
} from '@/features/operations/services/operationsStorage'
import { getProjectsFromSupabase } from '@/features/projects/services/projectSupabase'

type ClientQuote = {
  id: string
  folio: string
  customerId?: string
  client: string
  project: string
  createdAt: string
  validUntil?: string
  total?: number
  currency?: 'MXN' | 'USD'
  status?: string
  convertedToProject?: boolean
}

function readQuotes(): ClientQuote[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem('nedvi_quotes')
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    return Array.isArray(parsed) ? (parsed as ClientQuote[]) : []
  } catch {
    return []
  }
}

function money(value = 0, currency: 'MXN' | 'USD' = 'MXN') {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(value)
}

function formatDate(value?: string) {
  if (!value) return '—'
  const date = new Date(`${value}T12:00:00`)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('es-MX', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(date)
}

export default function ClientPortalPage() {
  const router = useRouter()
  const [session, setSession] = useState<AccessSession | null>(null)
  const [projects, setProjects] = useState<OperationProject[]>([])
  const [progress, setProgress] = useState<ProgressRecord[]>([])
  const [reports, setReports] = useState<DailyReport[]>([])
  const [quotes, setQuotes] = useState<ClientQuote[]>([])
  const [ready, setReady] = useState(false)

  async function loadData(activeSession: AccessSession) {
    const clientName = (activeSession.clientName ?? '').trim().toLowerCase()
    const clientId = activeSession.clientId

    const matchingQuotes = readQuotes().filter((quote) => {
      const sameId = Boolean(clientId && quote.customerId === clientId)
      const sameName = Boolean(clientName && quote.client?.trim().toLowerCase() === clientName)
      return sameId || sameName
    })

    const supabaseProjects = await getProjectsFromSupabase()
    const matchingProjects: OperationProject[] = supabaseProjects
      .filter((project) => !clientId || project.clientId === clientId)
      .map((project) => ({
        id: project.id,
        folio: project.folio || 'Sin folio',
        project: project.name,
        client: project.client,
        owner: project.manager,
        contact: project.clientContact,
        phone: '',
        email: '',
        address: project.address,
        rfc: '',
      }))

    const projectIds = new Set(matchingProjects.map((project) => project.id))
    const matchingProgress = readProgressRecords().filter((record) => projectIds.has(record.quoteId))
    const matchingReports = readDailyReports().filter((report) => projectIds.has(report.quoteId))

    setQuotes(matchingQuotes)
    setProjects(matchingProjects)
    setProgress(matchingProgress)
    setReports(matchingReports)
  }

  useEffect(() => {
    const activeSession = readAccessSession()
    if (!activeSession) {
      router.replace('/login')
      return
    }

    if (activeSession.role !== 'Cliente' || !activeSession.clientId || !activeSession.clientFolio) {
      router.replace(activeSession.role === 'Cliente' ? '/login' : '/dashboard')
      return
    }

    setSession(activeSession)

    void loadData(activeSession)
      .catch((loadError) => {
        console.error('Error al cargar el portal del cliente:', loadError)
      })
      .finally(() => {
        setReady(true)
      })

    const refresh = () => {
      void loadData(activeSession).catch((loadError) => {
        console.error('Error al actualizar el portal del cliente:', loadError)
      })
    }
    window.addEventListener('focus', refresh)
    window.addEventListener('storage', refresh)
    return () => {
      window.removeEventListener('focus', refresh)
      window.removeEventListener('storage', refresh)
    }
  }, [router])

  const approvedQuotes = useMemo(
    () => quotes.filter((quote) => quote.status === 'Aprobada'),
    [quotes],
  )

  const projectCards = useMemo(
    () => projects.map((project) => {
      const projectProgress = progress
        .filter((record) => record.quoteId === project.id)
        .sort((a, b) => b.date.localeCompare(a.date))
      const projectReports = reports
        .filter((report) => report.quoteId === project.id)
        .sort((a, b) => b.date.localeCompare(a.date))

      return {
        project,
        latestProgress: projectProgress[0],
        reports: projectReports,
      }
    }),
    [projects, progress, reports],
  )

  function logout() {
    clearAccessSession()
    router.replace('/login')
  }

  if (!ready || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#071118] text-sm text-white/60">
        Cargando Portal NEDVI...
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-[#F5F8FA] text-[#172033]">
      <header className="border-b border-slate-200 bg-white/95 backdrop-blur-xl">
        <div className="mx-auto flex min-h-[88px] max-w-7xl items-center justify-between gap-4 px-5 sm:px-8">
          <div className="flex items-center gap-3">
            <img src="/icon.png" alt="NEDVI Constructora" className="h-12 w-12 rounded-xl object-contain" />
            <div>
              <p className="text-xl font-bold tracking-[-0.04em]">NEDVI <span className="font-medium text-[#5496CC]">Portal</span></p>
              <p className="text-xs text-slate-500">Portal del Cliente</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold">{session.name}</p>
              <p className="text-xs text-slate-500">{session.clientName} · {session.clientFolio}</p>
            </div>
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#7DC6FF] text-xs font-bold text-black">{session.initials}</span>
            <button type="button" onClick={logout} className="rounded-xl border border-slate-200 p-2.5 text-slate-500 transition hover:bg-slate-50 hover:text-red-500" title="Cerrar sesión">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl space-y-7 px-5 py-8 sm:px-8">
        <section className="overflow-hidden rounded-[28px] bg-[#0B1A24] px-6 py-7 text-white shadow-sm sm:px-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8CCBFF]">Bienvenido a NEDVI</p>
              <h1 className="mt-3 text-3xl font-bold tracking-[-0.04em] sm:text-4xl">Hola, {session.firstName}</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-white/65">
                Aquí puedes consultar únicamente los proyectos, avances, reportes y cotizaciones autorizadas de {session.clientName}.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.06] px-5 py-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/50">Folio de cliente</p>
              <p className="mt-1 text-xl font-bold text-[#8CCBFF]">{session.clientFolio}</p>
            </div>
          </div>
        </section>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Metric icon={FolderKanban} label="Mis proyectos" value={projects.length.toString()} />
          <Metric icon={BarChart3} label="Registros de avance" value={progress.length.toString()} />
          <Metric icon={FileText} label="Reportes diarios" value={reports.length.toString()} />
          <Metric icon={ShieldCheck} label="Cotizaciones aprobadas" value={approvedQuotes.length.toString()} />
        </div>

        <section className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold">Mis proyectos</h2>
              <p className="mt-1 text-sm text-slate-500">Información vinculada con tu cuenta de cliente.</p>
            </div>
            <button type="button" onClick={() => void loadData(session)} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 shadow-sm hover:bg-slate-50"><RefreshCw size={14} /> Actualizar</button>
          </div>

          {!projectCards.length ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
              <FolderKanban className="mx-auto text-[#5496CC]" size={34} />
              <h3 className="mt-4 font-bold">Todavía no hay proyectos vinculados</h3>
              <p className="mt-2 text-sm text-slate-500">Cuando NEDVI cree un proyecto vinculado a tu empresa, aparecerá aquí.</p>
            </div>
          ) : (
            <div className="grid gap-5 xl:grid-cols-2">
              {projectCards.map(({ project, latestProgress, reports: projectReports }) => (
                <article key={project.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <div className="border-b border-slate-100 p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold text-[#5496CC]">{project.folio}</p>
                        <h3 className="mt-1 text-lg font-bold">{project.project}</h3>
                        <p className="mt-1 text-sm text-slate-500">Responsable NEDVI: {project.owner || 'Por asignar'}</p>
                      </div>
                      <span className="rounded-full bg-[#5496CC]/10 px-3 py-1.5 text-sm font-bold text-[#3F82B8]">{latestProgress?.percent ?? 0}%</span>
                    </div>
                    <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-[#5496CC]" style={{ width: `${Math.max(0, Math.min(100, latestProgress?.percent ?? 0))}%` }} /></div>
                  </div>

                  <div className="grid gap-3 p-5 sm:grid-cols-3">
                    <Info label="Último avance" value={latestProgress ? formatDate(latestProgress.date) : 'Sin registrar'} />
                    <Info label="Reportes" value={projectReports.length.toString()} />
                    <Info label="Evidencias" value={projectReports.reduce((sum, report) => sum + report.images.length, 0).toString()} />
                  </div>

                  {projectReports[0] ? (
                    <div className="border-t border-slate-100 p-5">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Último reporte diario</p>
                      <p className="mt-2 text-sm leading-6 text-slate-700">{projectReports[0].summary}</p>
                      <p className="mt-2 text-xs text-slate-400">{formatDate(projectReports[0].date)} · {projectReports[0].author || 'NEDVI'}</p>
                      {projectReports[0].images.length ? (
                        <div className="mt-4 grid grid-cols-3 gap-2">
                          {projectReports[0].images.slice(0, 3).map((image) => <img key={image.id} src={image.dataUrl} alt={image.name} className="h-24 w-full rounded-xl object-cover" />)}
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-5">
            <h2 className="text-lg font-bold">Cotizaciones aprobadas</h2>
            <p className="mt-1 text-xs text-slate-500">Solo se muestran cotizaciones de tu empresa con estado Aprobada.</p>
          </div>
          {!approvedQuotes.length ? (
            <div className="p-8 text-center text-sm text-slate-500">No hay cotizaciones aprobadas disponibles.</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {approvedQuotes.map((quote) => (
                <div key={quote.id} className="grid gap-3 p-5 sm:grid-cols-[1fr_180px_180px] sm:items-center">
                  <div>
                    <p className="font-semibold">{quote.project}</p>
                    <p className="mt-1 text-xs text-[#5496CC]">{quote.folio}</p>
                  </div>
                  <div><p className="text-xs text-slate-400">Fecha</p><p className="mt-1 text-sm font-medium">{formatDate(quote.createdAt)}</p></div>
                  <div><p className="text-xs text-slate-400">Total</p><p className="mt-1 text-sm font-bold">{money(quote.total, quote.currency ?? 'MXN')}</p></div>
                </div>
              ))}
            </div>
          )}
        </section>

        <div className="rounded-2xl border border-[#5496CC]/20 bg-[#5496CC]/5 p-4 text-xs leading-5 text-slate-500">
          <div className="flex items-start gap-3"><UserRound size={17} className="mt-0.5 shrink-0 text-[#5496CC]" /><p>Tu cuenta está vinculada al folio <strong className="text-slate-700">{session.clientFolio}</strong>. No tienes acceso a información interna de NEDVI ni a datos de otros clientes.</p></div>
        </div>
      </div>
    </main>
  )
}

function Metric({ icon: Icon, label, value }: { icon: typeof FolderKanban; label: string; value: string }) {
  return <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><Icon size={19} className="text-[#5496CC]" /><p className="mt-3 text-2xl font-bold">{value}</p><p className="mt-1 text-sm text-slate-500">{label}</p></div>
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl bg-slate-50 p-3"><p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</p><p className="mt-1 text-sm font-bold text-slate-700">{value}</p></div>
}
