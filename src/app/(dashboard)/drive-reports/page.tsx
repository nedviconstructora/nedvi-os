'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  CalendarDays, Cloud, CloudOff, ExternalLink, FileText,
  FolderOpen, RefreshCw, Search, ShieldCheck,
} from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { readAccessSession } from '@/features/access/services/accessStorage'

type DriveReport = {
  file_id: string
  name: string
  mime_type: string
  web_view_link: string
  folder_path: string
  staff_name: string | null
  report_year: number | null
  report_month: number | null
  modified_time: string | null
  size_bytes: number | null
  last_seen_at: string
}
type DriveResponse = {
  items: DriveReport[]
  lastSyncedAt: string | null
  connectionConfigured: boolean
  warning: string | null
  error?: string
}
const months = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre',
]
const managers = new Set([
  'DEVELOPER','Administración','Gerente Comercial',
  'Gerente Administrativo','Gerente Operativo',
])

function displayDate(value: string | null) {
  if (!value) return 'Sin fecha'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Sin fecha' :
    new Intl.DateTimeFormat('es-MX', {
      day: '2-digit', month: 'short', year: 'numeric',
    }).format(date)
}
function reportOwner(item: DriveReport): 'pedro' | 'cristian' | 'otros' {
  const name = (item.staff_name || item.folder_path)
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  if (name.includes('pedro')) return 'pedro'
  if (name.includes('cristian') || name.includes('crisitan')) return 'cristian'
  return 'otros'
}

function displaySyncTimestamp(value: string | null) {
  if (!value) return 'Sin sincronizar'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Sin sincronizar' :
    new Intl.DateTimeFormat('es-MX', {
      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
      timeZone: 'America/Tijuana',
    }).format(date) + ' (Tijuana)'
}

function fileKind(mimeType: string) {
  if (mimeType === 'application/pdf') return 'PDF'
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return 'Excel'
  if (mimeType.includes('document') || mimeType.includes('word')) return 'Word'
  return 'Archivo'
}

export default function DriveReportsPage() {
  const [items, setItems] = useState<DriveReport[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [warning, setWarning] = useState<string | null>(null)
  const [lastSynced, setLastSynced] = useState<string | null>(null)
  const [configured, setConfigured] = useState(false)
  const [canSync, setCanSync] = useState(false)
  const [search, setSearch] = useState('')
  const [staff, setStaff] = useState('all')
  const [month, setMonth] = useState('all')
  const [year, setYear] = useState('all')

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true)
    try {
      const response = await fetch('/api/drive-reports', { cache: 'no-store' })
      const data = await response.json() as DriveResponse
      if (!response.ok) throw new Error(data.error || 'No se pudieron consultar los reportes.')
      setItems(data.items)
      setLastSynced(data.lastSyncedAt)
      setConfigured(data.connectionConfigured)
      setWarning(data.warning)
      setError(null)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Error de conexión.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const session = readAccessSession()
    setCanSync(Boolean(session && managers.has(session.role)))
    void load()
    // Update on return to the app as well as periodically; no background
    // sync requests while the page is hidden.
    const refresh = () => { if (!document.hidden) void load(true) }
    const timer = window.setInterval(refresh, 60 * 1000)
    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', refresh)
    return () => {
      window.clearInterval(timer)
      window.removeEventListener('focus', refresh)
      document.removeEventListener('visibilitychange', refresh)
    }
  }, [load])

  const staffNames = useMemo(() => [...new Set(items.map(item => item.staff_name).filter((x): x is string => Boolean(x)))].sort(), [items])
  const years = useMemo(() => [...new Set(items.map(item => item.report_year).filter((x): x is number => x !== null))].sort((a,b) => b-a), [items])
  const filtered = useMemo(() => {
    const q = search.trim().toLocaleLowerCase('es-MX')
    return items.filter(item => {
      if (staff !== 'all' && item.staff_name !== staff) return false
      if (year !== 'all' && String(item.report_year) !== year) return false
      if (month !== 'all' && String(item.report_month) !== month) return false
      if (!q) return true
      return [item.name,item.staff_name,item.folder_path].join(' ').toLocaleLowerCase('es-MX').includes(q)
    })
  }, [items, search, staff, year, month])

  const reportsByOwner = useMemo(() => ({
    pedro: filtered.filter(item => reportOwner(item) === 'pedro'),
    cristian: filtered.filter(item => reportOwner(item) === 'cristian'),
    otros: filtered.filter(item => reportOwner(item) === 'otros'),
  }), [filtered])

  const newestIndexedAt = Math.max(0, ...items.map(item => new Date(item.last_seen_at).getTime()).filter(Number.isFinite))
  const lastReadByOwner = (owner: 'pedro' | 'cristian') => {
    const dates = items.filter(item => reportOwner(item) === owner).map(item => item.last_seen_at)
    return dates.sort().at(-1) || null
  }
  const pdfCount = items.filter(item => item.mime_type === 'application/pdf').length
  const employeeCount = staffNames.length

  async function syncNow() {
    setSyncing(true)
    setError(null)
    try {
      const response = await fetch('/api/drive-reports/sync', { method: 'POST' })
      const data = await response.json() as { error?: string; warning?: string | null }
      if (!response.ok) throw new Error(data.error || 'La sincronización no se completó.')
      await load(true)
      if (data.warning) setWarning(data.warning)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo sincronizar.')
    } finally {
      setSyncing(false)
    }
  }

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-[1600px] space-y-6 pb-10">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#5496CC]">Gestión documental</p>
            <h1 className="mt-2 text-3xl font-bold text-[var(--foreground)]">Reportes de Google Drive</h1>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Consulta los reportes de actividades por año, mes y responsable. Haz clic en el nombre de un archivo para abrirlo. Solo lectura.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => void load()} disabled={loading || syncing}
              className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm font-semibold text-[var(--foreground)] disabled:opacity-60">
              <RefreshCw size={16} /> Actualizar lista
            </button>
            {canSync && configured ? (
              <button type="button" onClick={() => void syncNow()} disabled={loading || syncing}
                className="inline-flex items-center gap-2 rounded-xl bg-[#267bd4] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
                <Cloud size={16} /> {syncing ? 'Sincronizando...' : 'Sincronizar Drive'}
              </button>
            ) : null}
          </div>
        </header>

        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--foreground)]">
          <div className="flex flex-wrap items-center gap-2">
            <ShieldCheck size={17} className="text-emerald-500" />
            <span className="font-semibold">Acceso exclusivo al equipo NEDVI</span>
            <span className="text-[var(--muted)]">· Los originales permanecen en Google Drive y no pueden modificarse desde esta pantalla.</span>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-[var(--muted)]">
            {configured ? <Cloud size={14} className="text-emerald-500" /> : <CloudOff size={14} />}
            {configured ? 'Conexión de sincronización configurada' : 'Sincronización en vivo pendiente de autorización de Google. Mostrando índice inicial.'}
            {lastSynced ? ' · Última indexación: ' + displayDate(lastSynced) : ''}
          </div>
        </div>

        {error ? <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">{error}</p> : null}
        {warning ? <p role="status" className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-500">{warning}</p> : null}

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            { label: 'Archivos indexados', value: items.length, icon: FileText },
            { label: 'Reportes PDF', value: pdfCount, icon: FileText },
            { label: 'Responsables', value: employeeCount, icon: ShieldCheck },
            { label: 'Meses con archivos', value: new Set(items.map(item => String(item.report_year) + '-' + String(item.report_month))).size, icon: CalendarDays },
          ].map(metric => (
            <div key={metric.label} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5">
              <metric.icon size={21} className="text-[#5496CC]" />
              <p className="mt-4 text-2xl font-bold text-[var(--foreground)]">{metric.value}</p>
              <p className="mt-1 text-xs font-semibold text-[var(--muted)]">{metric.label}</p>
            </div>
          ))}
        </div>

        <div className="grid gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_220px_160px_160px]">
          <div className="relative">
            <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
            <input value={search} onChange={event => setSearch(event.target.value)}
              placeholder="Buscar reporte o responsable..."
              aria-label="Buscar reportes"
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] px-4 py-3 pl-10 text-sm text-[var(--foreground)] outline-none" />
          </div>
          <select aria-label="Filtrar responsable" value={staff} onChange={event => setStaff(event.target.value)} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-3 text-sm text-[var(--foreground)]">
            <option value="all">Todos los responsables</option>
            {staffNames.map(name => <option value={name} key={name}>{name}</option>)}
          </select>
          <select aria-label="Filtrar año" value={year} onChange={event => setYear(event.target.value)} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-3 text-sm text-[var(--foreground)]">
            <option value="all">Todos los años</option>
            {years.map(value => <option key={value} value={String(value)}>{value}</option>)}
          </select>
          <select aria-label="Filtrar mes" value={month} onChange={event => setMonth(event.target.value)} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-3 text-sm text-[var(--foreground)]">
            <option value="all">Todos los meses</option>
            {months.map((value,index) => <option key={value} value={String(index+1)}>{value}</option>)}
          </select>
        </div>

        <section aria-labelledby="report-groups-title" className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 id="report-groups-title" className="text-xl font-bold text-[var(--foreground)]">Reportes por responsable</h2>
            <span className="text-sm text-[var(--muted)]">{filtered.length} archivos con los filtros actuales</span>
          </div>
          <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-2">
            {([
              { key: 'pedro' as const, label: 'Pedro García', caption: 'Sección izquierda' },
              { key: 'cristian' as const, label: 'Cristian Medina', caption: 'Sección derecha' },
            ]).map(group => {
              const reports = reportsByOwner[group.key]
              const lastRead = lastReadByOwner(group.key)
              const age = lastRead ? newestIndexedAt - new Date(lastRead).getTime() : 0
              const needsReview = Boolean(lastRead && newestIndexedAt > 0 && age > 30 * 60 * 1000)
              return (
                <article key={group.key} className="min-w-0 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
                  <header className="border-b border-[var(--border)] bg-[var(--surface-soft)] px-5 py-5">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#5496CC]/15 text-[#267bd4]">
                          <FolderOpen size={23} />
                        </span>
                        <div className="min-w-0">
                          <p className="text-lg font-bold text-[var(--foreground)]">{group.label}</p>
                          <p className="text-xs text-[var(--muted)]">{group.caption}</p>
                        </div>
                      </div>
                      <span className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1 text-sm font-bold text-[var(--foreground)]">{reports.length}</span>
                    </div>
                    <p className="mt-3 text-xs text-[var(--muted)]">Última revisión registrada: {displaySyncTimestamp(lastRead)}</p>
                    {needsReview ? (
                      <p className="mt-2 text-xs font-medium text-amber-600 dark:text-amber-400" role="status">
                        Esta carpeta no figura en la última revisión del índice. Comprueba sus permisos de Drive.
                      </p>
                    ) : null}
                  </header>
                  {loading ? (
                    <div className="px-5 py-12 text-center text-sm text-[var(--muted)]">Cargando reportes…</div>
                  ) : reports.length === 0 ? (
                    <div className="px-5 py-12 text-center text-sm text-[var(--muted)]">
                      No hay reportes de {group.label} para estos filtros.
                    </div>
                  ) : (
                    <ul className="max-h-[780px] divide-y divide-[var(--border)] overflow-y-auto">
                      {reports.map(item => (
                        <li key={item.file_id} className="flex min-w-0 items-start gap-3 px-4 py-4 transition-colors hover:bg-[var(--surface-soft)] sm:px-5">
                          <FileText size={19} className="mt-1 shrink-0 text-[#5496CC]" />
                          <div className="min-w-0 flex-1">
                            <a href={item.web_view_link} target="_blank" rel="noopener noreferrer"
                              className="inline-flex max-w-full items-center gap-1.5 break-words text-sm font-semibold text-[var(--foreground)] hover:text-[#267bd4] hover:underline"
                              title={'Abrir ' + item.name + ' en Google Drive'}>
                              <span className="min-w-0 break-all">{item.name}</span>
                              <ExternalLink size={14} className="shrink-0" aria-hidden="true" />
                            </a>
                            <p className="mt-1 text-xs text-[var(--muted)]">
                              {fileKind(item.mime_type)} · {item.report_month ? months[item.report_month - 1] + ' ' : ''}{item.report_year || 'Sin periodo'} · Modificado {displayDate(item.modified_time)}
                            </p>
                          </div>
                          <a href={item.web_view_link} target="_blank" rel="noopener noreferrer"
                            aria-label={'Abrir ' + item.name}
                            className="shrink-0 rounded-lg border border-[var(--border)] px-3 py-2 text-xs font-semibold text-[var(--foreground)] transition hover:border-[#5496CC]">
                            Abrir
                          </a>
                        </li>
                      ))}
                    </ul>
                  )}
                </article>
              )
            })}
          </div>
          {reportsByOwner.otros.length > 0 ? (
            <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
              <h3 className="mb-3 font-bold text-[var(--foreground)]">Otros reportes sin responsable identificado ({reportsByOwner.otros.length})</h3>
              <ul className="space-y-2">
                {reportsByOwner.otros.map(item => (
                  <li key={item.file_id}>
                    <a href={item.web_view_link} target="_blank" rel="noopener noreferrer"
                      className="text-sm font-medium text-[var(--foreground)] hover:underline">
                      {item.name} <ExternalLink size={13} className="inline-block" />
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </section>
      </div>
    </AppShell>
  )
}
