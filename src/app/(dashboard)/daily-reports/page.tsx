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

function escapeHtml(value: string | number) {
  return String(value).replace(/[&<>'"]/g, (character) => {
    const entities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;',
    }
    return entities[character] ?? character
  })
}

function textBlock(value: string) {
  return escapeHtml(value).replace(/\n/g, '<br />')
}

export default function DailyReportsPage() {
  const [projects, setProjects] = useState<OperationProject[]>([])
  const [reports, setReports] = useState<DailyReport[]>([])
  const [progressRecords, setProgressRecords] = useState<ProgressRecord[]>([])
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
      return [
        report.folio,
        project?.project ?? '',
        project?.client ?? '',
        report.author,
        report.summary,
      ]
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
    const project = projectById.get(report.quoteId)
    if (!project) return

    const progress = progressForReport(report)
    const progressPercent = Math.max(0, Math.min(100, progress?.percent ?? 0))
    const printWindow = window.open('', '_blank', 'width=1000,height=800')

    if (!printWindow) {
      window.alert('Permite las ventanas emergentes para generar el PDF del reporte.')
      return
    }

    const logoUrl = `${window.location.origin}/icon.png`
    const title = `Reporte_Diario_${report.folio}_${report.date}`

    printWindow.document.open()
    printWindow.document.write(`<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <style>
    @page { size: A4; margin: 0; }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; background: #ffffff; color: #172033; }
    body {
      width: 210mm;
      min-height: 297mm;
      padding: 12mm 14mm;
      font-family: Arial, Helvetica, sans-serif;
      font-size: 11px;
      line-height: 1.45;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .document { width: 100%; margin: 0; background: #ffffff; }
    .header { display: flex; align-items: center; justify-content: space-between; gap: 24px; padding-bottom: 14px; border-bottom: 2px solid #5496CC; }
    .brand { display: flex; align-items: center; gap: 14px; }
    .logo { width: 48px; height: 48px; object-fit: contain; }
    h1 { margin: 0; font-size: 20px; line-height: 1.15; color: #101827; }
    .subtitle { margin: 5px 0 0; color: #657083; }
    .folio { text-align: right; }
    .folio strong { color: #5496CC; font-size: 12px; }
    .folio p { margin: 4px 0 0; }
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 14px; }
    .card { padding: 13px 14px; border: 0; border-radius: 10px; background: #f7f9fb; }
    .section { margin-top: 14px; }
    .section-title { margin: 0 0 8px; color: #697386; font-size: 9px; font-weight: 700; letter-spacing: .07em; text-transform: uppercase; }
    .rows { display: grid; grid-template-columns: 1fr 1fr; gap: 5px 20px; }
    .rows p, .card p { margin: 0 0 5px; }
    .rows p:last-child, .card p:last-child { margin-bottom: 0; }
    .progress-card { margin-top: 14px; padding: 13px 14px; border-radius: 10px; background: #f5f9fd; }
    .progress-head { display: flex; justify-content: space-between; gap: 16px; }
    .progress-label { margin: 0; color: #5496CC; font-size: 9px; font-weight: 700; letter-spacing: .07em; text-transform: uppercase; }
    .progress-value { margin: 6px 0 0; font-size: 17px; font-weight: 700; }
    .progress-milestone { margin: 3px 0 0; font-weight: 600; }
    .progress-date { color: #7a8494; font-size: 9px; white-space: nowrap; }
    .bar { margin-top: 10px; height: 7px; overflow: hidden; border-radius: 999px; background: #e5eaf0; }
    .bar > div { height: 100%; border-radius: inherit; background: #5496CC; }
    .progress-notes { margin: 9px 0 0; color: #4c5668; }
    .text-box { min-height: 74px; padding: 13px 14px; border-radius: 8px; background: #f8fafc; }
    .text-box p { margin: 0; }
    .footer { margin-top: 18px; padding-top: 10px; border-top: 1px solid #e5e7eb; color: #7b8493; font-size: 9px; }
    strong { color: #111827; }
    @media print {
      html, body { background: #ffffff !important; }
      body { margin: 0 !important; }
    }
  </style>
</head>
<body>
  <main class="document">
    <header class="header">
      <div class="brand">
        <img id="nedvi-logo" class="logo" src="${escapeHtml(logoUrl)}" alt="NEDVI Constructora" />
        <div>
          <h1>NEDVI CONSTRUCTORA</h1>
          <p class="subtitle">Reporte diario de obra</p>
        </div>
      </div>
      <div class="folio">
        <strong>${escapeHtml(report.folio)}</strong>
        <p>${escapeHtml(formatDate(report.date))}</p>
      </div>
    </header>

    <section class="grid-2">
      <div class="card">
        <p class="section-title">Datos de NEDVI</p>
        <p><strong>Razón social:</strong> NEDVI</p>
        <p><strong>RFC:</strong> NED260326S59</p>
        <p><strong>Victor Muciño:</strong> victorm@nedviconstructora.com</p>
        <p><strong>Nestor Ortiz:</strong> Nestor.ortiz@nedviconstrucciones.com</p>
      </div>
      <div class="card">
        <p class="section-title">Datos del cliente</p>
        <p><strong>Cliente:</strong> ${escapeHtml(project.client)}</p>
        <p><strong>Contacto:</strong> ${escapeHtml(project.contact || 'Sin registrar')}</p>
        <p><strong>Teléfono:</strong> ${escapeHtml(project.phone || 'Sin registrar')}</p>
        <p><strong>Correo:</strong> ${escapeHtml(project.email || 'Sin registrar')}</p>
        <p><strong>RFC:</strong> ${escapeHtml(project.rfc || 'Sin registrar')}</p>
        <p><strong>Dirección:</strong> ${escapeHtml(project.address || 'Sin registrar')}</p>
      </div>
    </section>

    <section class="card section">
      <p class="section-title">Información del proyecto</p>
      <div class="rows">
        <p><strong>Proyecto:</strong> ${escapeHtml(project.project)}</p>
        <p><strong>Responsable:</strong> ${escapeHtml(project.owner || 'Sin responsable')}</p>
        <p><strong>Elaboró:</strong> ${escapeHtml(report.author || 'Sin registrar')}</p>
        <p><strong>Personal en obra:</strong> ${escapeHtml(report.workers)} personas</p>
        <p><strong>Clima:</strong> ${escapeHtml(report.weather || 'Sin registrar')}</p>
        <p><strong>Fecha:</strong> ${escapeHtml(formatDate(report.date))}</p>
      </div>
    </section>

    <section class="progress-card">
      <div class="progress-head">
        <div>
          <p class="progress-label">Proceso / avance de obra</p>
          <p class="progress-value">${progress ? `${escapeHtml(progress.percent)}%` : 'Sin avance registrado'}</p>
          <p class="progress-milestone">${escapeHtml(progress?.milestone || 'No hay hito registrado para este proyecto.')}</p>
        </div>
        ${progress ? `<div class="progress-date">Actualizado: ${escapeHtml(formatDate(progress.date))}</div>` : ''}
      </div>
      <div class="bar"><div style="width:${progressPercent}%"></div></div>
      ${progress?.notes ? `<p class="progress-notes">${textBlock(progress.notes)}</p>` : ''}
    </section>

    <section class="section">
      <p class="section-title">Actividades realizadas</p>
      <div class="text-box"><p>${textBlock(report.summary)}</p></div>
    </section>

    <section class="section">
      <p class="section-title">Bloqueos / pendientes</p>
      <div class="text-box"><p>${textBlock(report.blockers || 'Sin bloqueos o pendientes registrados.')}</p></div>
    </section>

    <footer class="footer">Documento generado desde NEDVI OS · Reporte diario de obra ${escapeHtml(report.folio)}</footer>
  </main>
</body>
</html>`)
    printWindow.document.close()

    const startPrint = () => {
      window.setTimeout(() => {
        printWindow.focus()
        printWindow.print()
      }, 100)
    }

    const logo = printWindow.document.getElementById('nedvi-logo') as HTMLImageElement | null
    if (logo && !logo.complete) {
      logo.addEventListener('load', startPrint, { once: true })
      logo.addEventListener('error', startPrint, { once: true })
    } else {
      startPrint()
    }
  }

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-[1600px] space-y-6">
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
          <div className="relative max-w-xl">
            <Search size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por proyecto, folio, autor o actividad..." className="w-full rounded-xl border border-[var(--border)] bg-transparent py-3 pl-11 pr-4 text-sm outline-none focus:border-[#5496CC]" />
          </div>
        </div>

        <div className="space-y-4">
          {filtered.length === 0 ? (
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-6 py-16 text-center">
              <FileText className="mx-auto text-[#5496CC]" size={32} />
              <h2 className="mt-4 text-lg font-bold">Todavía no hay reportes diarios</h2>
              <p className="mt-2 text-sm text-[var(--muted)]">Crea el primer reporte para documentar la jornada de obra.</p>
            </div>
          ) : (
            filtered.map((report) => {
              const project = projectById.get(report.quoteId)
              const progress = progressForReport(report)

              return (
                <article key={report.id} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-xs font-semibold text-[#5496CC]">{report.folio} · {report.date}</p>
                      <h2 className="mt-1 text-lg font-bold">{project?.project ?? 'Proyecto'}</h2>
                      <p className="mt-1 text-sm text-[var(--muted)]">{project?.client ?? ''} · {report.author || 'Sin autor'}</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => printPdf(report)} className="inline-flex items-center gap-2 rounded-lg border border-[#5496CC]/40 px-3 py-2 text-xs font-semibold text-[#5496CC] hover:bg-[#5496CC]/10"><Printer size={15} /> PDF</button>
                      <button onClick={() => remove(report.id)} className="rounded-lg p-2 text-red-500 hover:bg-red-500/10"><Trash2 size={16} /></button>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-4">
                    <Info label="Clima" value={report.weather || 'Sin registrar'} />
                    <Info label="Personal" value={`${report.workers} personas`} />
                    <Info label="Responsable" value={project?.owner || 'Sin responsable'} />
                    <Info label="Avance de obra" value={progress ? `${progress.percent}%` : 'Sin registrar'} />
                  </div>

                  {progress ? (
                    <div className="mt-4 rounded-xl border border-[#5496CC]/20 bg-[#5496CC]/10 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-[#5496CC]">Proceso actual de la obra</p>
                      <p className="mt-2 text-sm font-semibold">{progress.percent}% · {progress.milestone || 'Avance registrado'}</p>
                      {progress.notes ? <p className="mt-1 text-sm text-[var(--muted)]">{progress.notes}</p> : null}
                    </div>
                  ) : null}

                  <div className="mt-4 rounded-xl bg-[var(--surface-soft)] p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Actividades realizadas</p>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6">{report.summary}</p>
                  </div>

                  {report.blockers ? (
                    <div className="mt-3 rounded-xl border border-amber-500/20 bg-amber-500/10 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-amber-600">Bloqueos / pendientes</p>
                      <p className="mt-2 whitespace-pre-wrap text-sm">{report.blockers}</p>
                    </div>
                  ) : null}
                </article>
              )
            })
          )}
        </div>
      </div>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4">
          <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-[var(--surface)] p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-[#5496CC]">Bitácora de obra</p>
                <h2 className="text-xl font-bold">Nuevo reporte diario</h2>
              </div>
              <button type="button" onClick={() => setOpen(false)}><X size={18} /></button>
            </div>

            <form onSubmit={save} className="space-y-4">
              <label className="block space-y-2">
                <span className="text-sm font-semibold">Proyecto</span>
                <select required value={quoteId} onChange={(event) => setQuoteId(event.target.value)} className="w-full rounded-xl border border-[var(--border)] bg-transparent px-4 py-3">
                  <option value="">Seleccionar proyecto</option>
                  {projects.map((project) => <option key={project.id} value={project.id}>{project.folio} — {project.project}</option>)}
                </select>
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-2"><span className="text-sm font-semibold">Fecha</span><input type="date" required value={date} onChange={(event) => setDate(event.target.value)} className="w-full rounded-xl border border-[var(--border)] bg-transparent px-4 py-3" /></label>
                <label className="space-y-2"><span className="text-sm font-semibold">Clima</span><input value={weather} onChange={(event) => setWeather(event.target.value)} placeholder="Ej. Soleado, 26°C" className="w-full rounded-xl border border-[var(--border)] bg-transparent px-4 py-3" /></label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-2"><span className="text-sm font-semibold">Personal en obra</span><input type="number" min="0" value={workers} onChange={(event) => setWorkers(event.target.value)} className="w-full rounded-xl border border-[var(--border)] bg-transparent px-4 py-3" /></label>
                <label className="space-y-2"><span className="text-sm font-semibold">Elaboró</span><input value={author} onChange={(event) => setAuthor(event.target.value)} className="w-full rounded-xl border border-[var(--border)] bg-transparent px-4 py-3" /></label>
              </div>

              <label className="block space-y-2"><span className="text-sm font-semibold">Actividades realizadas *</span><textarea required rows={5} value={summary} onChange={(event) => setSummary(event.target.value)} placeholder="Describe los trabajos realizados durante la jornada..." className="w-full rounded-xl border border-[var(--border)] bg-transparent px-4 py-3" /></label>
              <label className="block space-y-2"><span className="text-sm font-semibold">Bloqueos / pendientes</span><textarea rows={3} value={blockers} onChange={(event) => setBlockers(event.target.value)} className="w-full rounded-xl border border-[var(--border)] bg-transparent px-4 py-3" /></label>

              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setOpen(false)} className="rounded-xl border border-[var(--border)] px-5 py-3 font-semibold">Cancelar</button>
                <button type="submit" className="rounded-xl bg-[#5496CC] px-5 py-3 font-semibold text-white">Guardar reporte</button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </AppShell>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
      <FileText className="text-[#5496CC]" size={19} />
      <p className="mt-3 text-2xl font-bold">{value}</p>
      <p className="mt-1 text-sm text-[var(--muted)]">{label}</p>
    </div>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[var(--border)] p-3">
      <p className="text-xs text-[var(--muted)]">{label}</p>
      <p className="mt-1 text-sm font-semibold">{value}</p>
    </div>
  )
}
