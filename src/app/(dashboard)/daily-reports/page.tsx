'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import { FileText, Plus, Search, Trash2, X } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import {
  DAILY_REPORTS_STORAGE_KEY,
  type DailyReport,
  type OperationProject,
  readDailyReports,
  readOperationProjects,
  writeDailyReports,
} from '@/features/operations/services/operationsStorage'

function today() {
  return new Date().toISOString().slice(0, 10)
}

export default function DailyReportsPage() {
  const [projects, setProjects] = useState<OperationProject[]>([])
  const [reports, setReports] = useState<DailyReport[]>([])
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const [quoteId, setQuoteId] = useState('')
  const [date, setDate] = useState(today())
  const [weather, setWeather] = useState('')
  const [workers, setWorkers] = useState('')
  const [summary, setSummary] = useState('')
  const [blockers, setBlockers] = useState('')
  const [author, setAuthor] = useState('Pedro Garcia')

  function loadData() {
    const currentProjects = readOperationProjects()
    const validIds = new Set(currentProjects.map((project) => project.id))
    const currentReports = readDailyReports().filter((report) => validIds.has(report.quoteId))
    setProjects(currentProjects)
    setReports(currentReports)
    writeDailyReports(currentReports)
  }

  useEffect(() => {
    loadData()
    const handleStorage = (event: StorageEvent) => {
      if (event.key === 'nedvi_quotes' || event.key === DAILY_REPORTS_STORAGE_KEY) loadData()
    }
    window.addEventListener('storage', handleStorage)
    window.addEventListener('focus', loadData)
    return () => {
      window.removeEventListener('storage', handleStorage)
      window.removeEventListener('focus', loadData)
    }
  }, [])

  const projectById = useMemo(() => new Map(projects.map((project) => [project.id, project])), [projects])

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return reports
    return reports.filter((report) => {
      const project = projectById.get(report.quoteId)
      return [report.folio, project?.project ?? '', project?.client ?? '', report.author, report.summary]
        .join(' ')
        .toLowerCase()
        .includes(query)
    })
  }, [reports, search, projectById])

  function resetForm() {
    setQuoteId('')
    setDate(today())
    setWeather('')
    setWorkers('')
    setSummary('')
    setBlockers('')
    setAuthor('Pedro Garcia')
  }

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const project = projects.find((item) => item.id === quoteId)
    if (!project || !summary.trim()) return

    const report: DailyReport = {
      id: crypto.randomUUID(),
      quoteId: project.id,
      folio: project.folio,
      date,
      weather: weather.trim(),
      workers: Number(workers || 0),
      summary: summary.trim(),
      blockers: blockers.trim(),
      author: author.trim(),
    }

    const next = [report, ...reports]
    setReports(next)
    writeDailyReports(next)
    setOpen(false)
    resetForm()
  }

  function remove(id: string) {
    if (!window.confirm('¿Eliminar este reporte diario?')) return
    const next = reports.filter((report) => report.id !== id)
    setReports(next)
    writeDailyReports(next)
  }

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-[1600px] space-y-6">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#5496CC]">Operaciones / Obra</p>
            <h1 className="mt-2 text-3xl font-bold text-[var(--foreground)]">Reportes diarios</h1>
            <p className="mt-2 text-sm text-[var(--muted)]">Bitácora diaria de actividades, personal, clima y bloqueos de obra.</p>
          </div>
          <button onClick={() => setOpen(true)} className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#5496CC] px-4 text-sm font-semibold text-white"><Plus size={16} /> Nuevo reporte</button>
        </header>

        <div className="grid gap-4 sm:grid-cols-3">
          <Metric label="Reportes" value={reports.length.toString()} />
          <Metric label="Proyectos con reporte" value={new Set(reports.map((report) => report.quoteId)).size.toString()} />
          <Metric label="Personal reportado" value={reports.reduce((sum, report) => sum + report.workers, 0).toString()} />
        </div>

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
          <div className="relative max-w-xl"><Search size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--muted)]" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por proyecto, folio, autor o actividad..." className="w-full rounded-xl border border-[var(--border)] bg-transparent py-3 pl-11 pr-4 text-sm outline-none focus:border-[#5496CC]" /></div>
        </div>

        <div className="space-y-4">
          {filtered.length === 0 ? <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-6 py-16 text-center"><FileText className="mx-auto text-[#5496CC]" size={32} /><h2 className="mt-4 text-lg font-bold">Todavía no hay reportes diarios</h2><p className="mt-2 text-sm text-[var(--muted)]">Crea el primer reporte para documentar la jornada de obra.</p></div> : filtered.map((report) => {
            const project = projectById.get(report.quoteId)
            return <article key={report.id} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div><p className="text-xs font-semibold text-[#5496CC]">{report.folio} · {report.date}</p><h2 className="mt-1 text-lg font-bold">{project?.project ?? 'Proyecto'}</h2><p className="mt-1 text-sm text-[var(--muted)]">{project?.client ?? ''} · {report.author || 'Sin autor'}</p></div>
                <button onClick={() => remove(report.id)} className="self-start rounded-lg p-2 text-red-500 hover:bg-red-500/10"><Trash2 size={16} /></button>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-3"><Info label="Clima" value={report.weather || 'Sin registrar'} /><Info label="Personal" value={`${report.workers} personas`} /><Info label="Responsable" value={project?.owner || 'Sin responsable'} /></div>
              <div className="mt-4 rounded-xl bg-[var(--surface-soft)] p-4"><p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Actividades realizadas</p><p className="mt-2 whitespace-pre-wrap text-sm leading-6">{report.summary}</p></div>
              {report.blockers ? <div className="mt-3 rounded-xl border border-amber-500/20 bg-amber-500/10 p-4"><p className="text-xs font-semibold uppercase tracking-wide text-amber-600">Bloqueos / pendientes</p><p className="mt-2 whitespace-pre-wrap text-sm">{report.blockers}</p></div> : null}
            </article>
          })}
        </div>
      </div>

      {open ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4"><div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-[var(--surface)] p-6 shadow-2xl"><div className="mb-5 flex items-center justify-between"><div><p className="text-xs font-semibold uppercase tracking-wide text-[#5496CC]">Bitácora de obra</p><h2 className="text-xl font-bold">Nuevo reporte diario</h2></div><button onClick={() => setOpen(false)}><X size={18} /></button></div><form onSubmit={save} className="space-y-4">
        <label className="block space-y-2"><span className="text-sm font-semibold">Proyecto</span><select required value={quoteId} onChange={(e) => setQuoteId(e.target.value)} className="w-full rounded-xl border border-[var(--border)] bg-transparent px-4 py-3"><option value="">Seleccionar proyecto</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.folio} — {project.project}</option>)}</select></label>
        <div className="grid gap-4 sm:grid-cols-2"><label className="space-y-2"><span className="text-sm font-semibold">Fecha</span><input type="date" required value={date} onChange={(e) => setDate(e.target.value)} className="w-full rounded-xl border border-[var(--border)] bg-transparent px-4 py-3" /></label><label className="space-y-2"><span className="text-sm font-semibold">Clima</span><input value={weather} onChange={(e) => setWeather(e.target.value)} placeholder="Ej. Soleado, 26°C" className="w-full rounded-xl border border-[var(--border)] bg-transparent px-4 py-3" /></label></div>
        <div className="grid gap-4 sm:grid-cols-2"><label className="space-y-2"><span className="text-sm font-semibold">Personal en obra</span><input type="number" min="0" value={workers} onChange={(e) => setWorkers(e.target.value)} className="w-full rounded-xl border border-[var(--border)] bg-transparent px-4 py-3" /></label><label className="space-y-2"><span className="text-sm font-semibold">Elaboró</span><input value={author} onChange={(e) => setAuthor(e.target.value)} className="w-full rounded-xl border border-[var(--border)] bg-transparent px-4 py-3" /></label></div>
        <label className="block space-y-2"><span className="text-sm font-semibold">Actividades realizadas *</span><textarea required rows={5} value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="Describe los trabajos realizados durante la jornada..." className="w-full rounded-xl border border-[var(--border)] bg-transparent px-4 py-3" /></label>
        <label className="block space-y-2"><span className="text-sm font-semibold">Bloqueos / pendientes</span><textarea rows={3} value={blockers} onChange={(e) => setBlockers(e.target.value)} className="w-full rounded-xl border border-[var(--border)] bg-transparent px-4 py-3" /></label>
        <div className="flex justify-end gap-3"><button type="button" onClick={() => setOpen(false)} className="rounded-xl border border-[var(--border)] px-5 py-3 font-semibold">Cancelar</button><button type="submit" className="rounded-xl bg-[#5496CC] px-5 py-3 font-semibold text-white">Guardar reporte</button></div>
      </form></div></div> : null}
    </AppShell>
  )
}

function Metric({ label, value }: { label: string; value: string }) { return <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5"><FileText className="text-[#5496CC]" size={19} /><p className="mt-3 text-2xl font-bold">{value}</p><p className="mt-1 text-sm text-[var(--muted)]">{label}</p></div> }
function Info({ label, value }: { label: string; value: string }) { return <div className="rounded-xl border border-[var(--border)] p-3"><p className="text-xs text-[var(--muted)]">{label}</p><p className="mt-1 text-sm font-semibold">{value}</p></div> }
