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
    // Refresh the indexed view while the module remains open.
    const timer = window.setInterval(() => { void load(true) }, 5 * 60 * 1000)
    return () => window.clearInterval(timer)
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

  const pdfCount = items.filter(item => item.mime_type === 'application/pdf').length
  const employeeCount = staffNames.length

  async function syncNow() {
    setSyncing(true)
    setError(null)
    try {
      const response = await fetch('/api/drive-reports/sync', { method: 'POST' })
      const data = await response.json() as { error?: string }
      if (!response.ok) throw new Error(data.error || 'La sincronización no se completó.')
      await load(true)
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
              Consulta los reportes de actividades por año, mes y responsable. Solo lectura.
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

        <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
          <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-4 sm:px-6">
            <h2 className="font-bold text-[var(--foreground)]">Archivos disponibles</h2>
            <span className="text-xs text-[var(--muted)]">{filtered.length} resultados</span>
          </div>
          {loading ? (
            <div className="px-6 py-12 text-center text-sm text-[var(--muted)]">Cargando reportes...</div>
          ) : filtered.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <FolderOpen size={33} className="mx-auto text-[#5496CC]" />
              <p className="mt-3 font-semibold text-[var(--foreground)]">No hay reportes para estos filtros.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] text-left text-sm">
                <thead className="bg-[var(--surface-soft)] text-xs text-[var(--muted)]">
                  <tr>
                    <th className="px-5 py-4">Documento</th>
                    <th className="px-5 py-4">Responsable</th>
                    <th className="px-5 py-4">Periodo</th>
                    <th className="px-5 py-4">Modificado</th>
                    <th className="px-5 py-4">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {filtered.map(item => (
                    <tr key={item.file_id} className="hover:bg-[var(--surface-soft)]">
                      <td className="px-5 py-3">
                        <p className="max-w-[340px] truncate font-semibold text-[var(--foreground)]" title={item.name}>{item.name}</p>
                        <p className="mt-1 text-xs text-[var(--muted)]">{fileKind(item.mime_type)}</p>
                      </td>
                      <td className="px-5 py-3 text-[var(--foreground)]">{item.staff_name || 'Sin clasificar'}</td>
                      <td className="px-5 py-3 text-[var(--muted)]">
                        {item.report_month ? months[item.report_month-1] + ' ' : ''}{item.report_year || '—'}
                      </td>
                      <td className="px-5 py-3 text-[var(--muted)]">{displayDate(item.modified_time)}</td>
                      <td className="px-5 py-3">
                        <a href={item.web_view_link} target="_blank" rel="noopener noreferrer"
                           className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] px-3 py-2 font-semibold text-[var(--foreground)] transition hover:border-[#5496CC]">
                          <ExternalLink size={15} /> Abrir en Drive
                        </a>
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
