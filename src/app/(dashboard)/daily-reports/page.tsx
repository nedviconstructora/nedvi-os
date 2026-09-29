'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import { FileText, Plus, Printer, Search, Trash2, X } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import {
  DAILY_REPORTS_STORAGE_KEY,
  PROGRESS_STORAGE_KEY,
  type DailyReport,
  type OperationProject,
  type ProgressRecord,
  readDailyReports,
  readOperationProjects,
  readProgressRecords,
  writeDailyReports,
} from '@/features/operations/services/operationsStorage'

function today() {
  return new Date().toISOString().slice(0, 10)
}

function formatDate(value: string) {
  if (!value) return 'Sin fecha'
  const date = new Date(`${value}T12:00:00`)
  if (Number.isNaN(date.getTime())) return value

  return new Intl.DateTimeFormat('es-MX', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(date)
}

export default function DailyReportsPage() {
  const [projects, setProjects] = useState<OperationProject[]>([])
  const [reports, setReports] = useState<DailyReport[]>([])
  const [progressRecords, setProgressRecords] = useState<ProgressRecord[]>([])
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const [printReport, setPrintReport] = useState<DailyReport | null>(null)
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
    const currentProgress = readProgressRecords().filter((record) => validIds.has(record.quoteId))

    setProjects(currentProjects)
    setReports(currentReports)
    setProgressRecords(currentProgress)
    writeDailyReports(currentReports)
  }

  useEffect(() => {
    loadData()
    const handleStorage = (event: StorageEvent) => {
      if (
        event.key === 'nedvi_quotes' ||
        event.key === DAILY_REPORTS_STORAGE_KEY ||
        event.key === PROGRESS_STORAGE_KEY
      ) {
        loadData()
      }
    }
    window.addEventListener('storage', handleStorage)
    window.addEventListener('focus', loadData)
    return () => {
      window.removeEventListener('storage', handleStorage)
      window.removeEventListener('focus', loadData)
    }
  }, [])

  const projectById = useMemo(
    () => new Map(projects.map((project) => [project.id, project])),
    [projects],
  )

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

  function progressForReport(report: DailyReport) {
    const matches = progressRecords
      .filter((record) => record.quoteId === report.quoteId && record.date <= report.date)
      .sort((a, b) => b.date.localeCompare(a.date))

    if (matches.length) return matches[0]

    return progressRecords
      .filter((record) => record.quoteId === report.quoteId)
      .sort((a, b) => b.date.localeCompare(a.date))[0]
  }

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

  function printPdf(report: DailyReport) {
    setPrintReport(report)

    window.setTimeout(() => {
      const previousTitle = document.title
      document.title = `Reporte_Diario_${report.folio}_${report.date}`

      const restoreTitle = () => {
        document.title = previousTitle
        window.removeEventListener('afterprint', restoreTitle)
      }

      window.addEventListener('afterprint', restoreTitle)
      window.print()
    }, 120)
  }

  const printableProject = printReport ? projectById.get(printReport.quoteId) : undefined
  const printableProgress = printReport ? progressForReport(printReport) : undefined

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-[1600px] space-y-6 print:hidden">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#5496CC]">Operaciones / Obra</p>
            <h1 className="mt-2 text-3xl font-bold text-[var(--foreground)]">Reportes diarios</h1>
            <p className="mt-2 text-sm text-[var(--muted)]">Bitácora diaria de actividades, personal, clima, avance y bloqueos de obra.</p>
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
            const progress = progressForReport(report)
            return <article key={report.id} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div><p className="text-xs font-semibold text-[#5496CC]">{report.folio} · {report.date}</p><h2 className="mt-1 text-lg font-bold">{project?.project ?? 'Proyecto'}</h2><p className="mt-1 text-sm text-[var(--muted)]">{project?.client ?? ''} · {report.author || 'Sin autor'}</p></div>
                <div className="flex gap-2">
                  <button onClick={() => printPdf(report)} className="inline-flex items-center gap-2 rounded-lg border border-[#5496CC]/40 px-3 py-2 text-xs font-semibold text-[#5496CC] hover:bg-[#5496CC]/10"><Printer size={15} /> PDF</button>
                  <button onClick={() => remove(report.id)} className="rounded-lg p-2 text-red-500 hover:bg-red-500/10"><Trash2 size={16} /></button>
                </div>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-4"><Info label="Clima" value={report.weather || 'Sin registrar'} /><Info label="Personal" value={`${report.workers} personas`} /><Info label="Responsable" value={project?.owner || 'Sin responsable'} /><Info label="Avance de obra" value={progress ? `${progress.percent}%` : 'Sin registrar'} /></div>
              {progress ? <div className="mt-4 rounded-xl border border-[#5496CC]/20 bg-[#5496CC]/10 p-4"><p className="text-xs font-semibold uppercase tracking-wide text-[#5496CC]">Proceso actual de la obra</p><p className="mt-2 text-sm font-semibold">{progress.percent}% · {progress.milestone || 'Avance registrado'}</p>{progress.notes ? <p className="mt-1 text-sm text-[var(--muted)]">{progress.notes}</p> : null}</div> : null}
              <div className="mt-4 rounded-xl bg-[var(--surface-soft)] p-4"><p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Actividades realizadas</p><p className="mt-2 whitespace-pre-wrap text-sm leading-6">{report.summary}</p></div>
              {report.blockers ? <div className="mt-3 rounded-xl border border-amber-500/20 bg-amber-500/10 p-4"><p className="text-xs font-semibold uppercase tracking-wide text-amber-600">Bloqueos / pendientes</p><p className="mt-2 whitespace-pre-wrap text-sm">{report.blockers}</p></div> : null}
            </article>
          })}
        </div>
      </div>

      {open ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 print:hidden"><div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-[var(--surface)] p-6 shadow-2xl"><div className="mb-5 flex items-center justify-between"><div><p className="text-xs font-semibold uppercase tracking-wide text-[#5496CC]">Bitácora de obra</p><h2 className="text-xl font-bold">Nuevo reporte diario</h2></div><button onClick={() => setOpen(false)}><X size={18} /></button></div><form onSubmit={save} className="space-y-4">
        <label className="block space-y-2"><span className="text-sm font-semibold">Proyecto</span><select required value={quoteId} onChange={(e) => setQuoteId(e.target.value)} className="w-full rounded-xl border border-[var(--border)] bg-transparent px-4 py-3"><option value="">Seleccionar proyecto</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.folio} — {project.project}</option>)}</select></label>
        <div className="grid gap-4 sm:grid-cols-2"><label className="space-y-2"><span className="text-sm font-semibold">Fecha</span><input type="date" required value={date} onChange={(e) => setDate(e.target.value)} className="w-full rounded-xl border border-[var(--border)] bg-transparent px-4 py-3" /></label><label className="space-y-2"><span className="text-sm font-semibold">Clima</span><input value={weather} onChange={(e) => setWeather(e.target.value)} placeholder="Ej. Soleado, 26°C" className="w-full rounded-xl border border-[var(--border)] bg-transparent px-4 py-3" /></label></div>
        <div className="grid gap-4 sm:grid-cols-2"><label className="space-y-2"><span className="text-sm font-semibold">Personal en obra</span><input type="number" min="0" value={workers} onChange={(e) => setWorkers(e.target.value)} className="w-full rounded-xl border border-[var(--border)] bg-transparent px-4 py-3" /></label><label className="space-y-2"><span className="text-sm font-semibold">Elaboró</span><input value={author} onChange={(e) => setAuthor(e.target.value)} className="w-full rounded-xl border border-[var(--border)] bg-transparent px-4 py-3" /></label></div>
        <label className="block space-y-2"><span className="text-sm font-semibold">Actividades realizadas *</span><textarea required rows={5} value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="Describe los trabajos realizados durante la jornada..." className="w-full rounded-xl border border-[var(--border)] bg-transparent px-4 py-3" /></label>
        <label className="block space-y-2"><span className="text-sm font-semibold">Bloqueos / pendientes</span><textarea rows={3} value={blockers} onChange={(e) => setBlockers(e.target.value)} className="w-full rounded-xl border border-[var(--border)] bg-transparent px-4 py-3" /></label>
        <div className="flex justify-end gap-3"><button type="button" onClick={() => setOpen(false)} className="rounded-xl border border-[var(--border)] px-5 py-3 font-semibold">Cancelar</button><button type="submit" className="rounded-xl bg-[#5496CC] px-5 py-3 font-semibold text-white">Guardar reporte</button></div>
      </form></div></div> : null}

      {printReport && printableProject ? (
        <>
          <style>{`
            @media print {
              @page { size: A4; margin: 14mm; }
              html, body { background: #fff !important; color: #111827 !important; }
              body * { visibility: hidden !important; }
              #daily-report-print, #daily-report-print * { visibility: visible !important; }
              #daily-report-print {
                display: block !important;
                position: absolute !important;
                inset: 0 !important;
                width: 100% !important;
                margin: 0 !important;
                background: #fff !important;
                color: #111827 !important;
              }
            }
          `}</style>
          <section id="daily-report-print" className="hidden bg-white text-slate-900 print:block">
            <div className="mx-auto max-w-4xl bg-white">
              <header className="flex items-center justify-between border-b-2 border-[#5496CC] pb-5">
                <div className="flex items-center gap-4">
                  <img src="/icon.png" alt="NEDVI Constructora" className="h-16 w-16 object-contain" />
                  <div>
                    <h1 className="text-2xl font-bold tracking-tight">NEDVI CONSTRUCTORA</h1>
                    <p className="mt-1 text-sm text-slate-600">Reporte diario de obra</p>
                  </div>
                </div>
                <div className="text-right text-sm">
                  <p className="font-bold text-[#5496CC]">{printReport.folio}</p>
                  <p>{formatDate(printReport.date)}</p>
                </div>
              </header>

              <section className="mt-5 grid grid-cols-2 gap-4 text-sm">
                <div className="rounded-xl border border-slate-200 p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Datos de NEDVI</p>
                  <div className="mt-3 space-y-1.5">
                    <p><strong>Razón social:</strong> NEDVI</p>
                    <p><strong>RFC:</strong> NED260326S59</p>
                    <p><strong>Victor Muciño:</strong> victorm@nedviconstructora.com</p>
                    <p><strong>Nestor Ortiz:</strong> Nestor.ortiz@nedviconstrucciones.com</p>
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200 p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Datos del cliente</p>
                  <div className="mt-3 space-y-1.5">
                    <p><strong>Cliente:</strong> {printableProject.client}</p>
                    <p><strong>Contacto:</strong> {printableProject.contact || 'Sin registrar'}</p>
                    <p><strong>Teléfono:</strong> {printableProject.phone || 'Sin registrar'}</p>
                    <p><strong>Correo:</strong> {printableProject.email || 'Sin registrar'}</p>
                    <p><strong>RFC:</strong> {printableProject.rfc || 'Sin registrar'}</p>
                    <p><strong>Dirección:</strong> {printableProject.address || 'Sin registrar'}</p>
                  </div>
                </div>
              </section>

              <section className="mt-5 rounded-xl border border-slate-200 p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Información del proyecto</p>
                <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                  <p><strong>Proyecto:</strong> {printableProject.project}</p>
                  <p><strong>Responsable:</strong> {printableProject.owner || 'Sin responsable'}</p>
                  <p><strong>Elaboró:</strong> {printReport.author || 'Sin registrar'}</p>
                  <p><strong>Personal en obra:</strong> {printReport.workers} personas</p>
                  <p><strong>Clima:</strong> {printReport.weather || 'Sin registrar'}</p>
                  <p><strong>Fecha:</strong> {formatDate(printReport.date)}</p>
                </div>
              </section>

              <section className="mt-5 rounded-xl border border-[#5496CC]/40 bg-[#5496CC]/5 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-[#5496CC]">Proceso / avance de obra</p>
                    <p className="mt-2 text-lg font-bold">{printableProgress ? `${printableProgress.percent}%` : 'Sin avance registrado'}</p>
                    <p className="mt-1 text-sm font-semibold">{printableProgress?.milestone || 'No hay hito registrado para este proyecto.'}</p>
                  </div>
                  {printableProgress ? <div className="text-right text-xs text-slate-500">Actualizado: {formatDate(printableProgress.date)}</div> : null}
                </div>
                <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-slate-200">
                  <div className="h-full rounded-full bg-[#5496CC]" style={{ width: `${printableProgress?.percent ?? 0}%` }} />
                </div>
                {printableProgress?.notes ? <p className="mt-3 text-sm leading-6 text-slate-700">{printableProgress.notes}</p> : null}
              </section>

              <section className="mt-5">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Actividades realizadas</p>
                <div className="mt-2 min-h-28 rounded-xl border border-slate-200 p-4 text-sm leading-6 whitespace-pre-wrap">{printReport.summary}</div>
              </section>

              <section className="mt-5">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Bloqueos / pendientes</p>
                <div className="mt-2 min-h-20 rounded-xl border border-slate-200 p-4 text-sm leading-6 whitespace-pre-wrap">{printReport.blockers || 'Sin bloqueos o pendientes registrados.'}</div>
              </section>

              <footer className="mt-8 border-t border-slate-200 pt-4 text-xs text-slate-500">
                Documento generado desde NEDVI OS · Reporte diario de obra {printReport.folio}
              </footer>
            </div>
          </section>
        </>
      ) : null}
    </AppShell>
  )
}

function Metric({ label, value }: { label: string; value: string }) { return <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5"><FileText className="text-[#5496CC]" size={19} /><p className="mt-3 text-2xl font-bold">{value}</p><p className="mt-1 text-sm text-[var(--muted)]">{label}</p></div> }
function Info({ label, value }: { label: string; value: string }) { return <div className="rounded-xl border border-[var(--border)] p-3"><p className="text-xs text-[var(--muted)]">{label}</p><p className="mt-1 text-sm font-semibold">{value}</p></div> }
