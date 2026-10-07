'use client'

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react'
import {
  Eye,
  FileImage,
  FileText,
  ImagePlus,
  LoaderCircle,
  MapPin,
  Plus,
  Printer,
  ReceiptText,
  Search,
  Trash2,
  X,
} from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import {
  DAILY_REPORTS_STORAGE_KEY,
  PROGRESS_STORAGE_KEY,
  type DailyReport,
  type DailyReportImage,
  type OperationProject,
  type ProgressItem,
  type ProgressRecord,
  readDailyReports,
  readOperationProjects,
  readProgressRecords,
  writeDailyReports,
} from '@/features/operations/services/operationsStorage'

const MAX_REPORT_IMAGES = 30

const REPORT_AUTHORS = [
  'Nestor Ortiz',
  'Cristian Medina',
  'Victor Muciño',
  'Edgardo Fierro',
  'Pedro Garcia',
] as const

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

function money(value: number) {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2,
  }).format(value)
}

function quantity(value: number) {
  return new Intl.NumberFormat('es-MX', { maximumFractionDigits: 2 }).format(value)
}

function escapeHtml(value: string | number) {
  return String(value).replace(/[&<>'\"]/g, (character) => {
    const entities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '\"': '&quot;',
    }
    return entities[character] ?? character
  })
}

function textBlock(value: string) {
  return escapeHtml(value).replace(/\n/g, '<br />')
}

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '')
    reader.onerror = () => reject(reader.error ?? new Error('No se pudo leer la imagen.'))
    reader.readAsDataURL(file)
  })
}

async function prepareReportImage(file: File): Promise<DailyReportImage> {
  const source = await fileToDataUrl(file)

  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const preview = new Image()
    preview.onload = () => resolve(preview)
    preview.onerror = () => reject(new Error(`No se pudo procesar ${file.name}.`))
    preview.src = source
  })

  const maxSide = 1200
  const longestSide = Math.max(image.naturalWidth, image.naturalHeight)
  const scale = longestSide > maxSide ? maxSide / longestSide : 1
  const width = Math.max(1, Math.round(image.naturalWidth * scale))
  const height = Math.max(1, Math.round(image.naturalHeight * scale))
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height

  const context = canvas.getContext('2d')
  if (!context) {
    return { id: crypto.randomUUID(), name: file.name, dataUrl: source }
  }

  context.drawImage(image, 0, 0, width, height)

  return {
    id: crypto.randomUUID(),
    name: file.name,
    dataUrl: canvas.toDataURL('image/jpeg', 0.72),
  }
}

function progressTotals(rows: ProgressItem[]) {
  return rows.reduce(
    (acc, row) => ({
      total: acc.total + row.total,
      accumulatedPrevious: acc.accumulatedPrevious + row.accumulatedPrevious,
      previousExecution: acc.previousExecution + row.previousExecution,
      executed: acc.executed + row.executed,
      totalToExecute: acc.totalToExecute + row.totalToExecute,
    }),
    { total: 0, accumulatedPrevious: 0, previousExecution: 0, executed: 0, totalToExecute: 0 },
  )
}

export default function DailyReportsPage() {
  const [projects, setProjects] = useState<OperationProject[]>([])
  const [reports, setReports] = useState<DailyReport[]>([])
  const [progressRecords, setProgressRecords] = useState<ProgressRecord[]>([])
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const [viewingQuoteId, setViewingQuoteId] = useState<string | null>(null)
  const [quoteId, setQuoteId] = useState('')
  const [projectName, setProjectName] = useState('')
  const [clientInvoice, setClientInvoice] = useState('')
  const [date, setDate] = useState(today())
  const [weather, setWeather] = useState('')
  const [workers, setWorkers] = useState('')
  const [summary, setSummary] = useState('')
  const [blockers, setBlockers] = useState('')
  const [author, setAuthor] = useState('Pedro Garcia')
  const [images, setImages] = useState<DailyReportImage[]>([])
  const [processingImages, setProcessingImages] = useState(false)
  const [latitude, setLatitude] = useState<number | undefined>()
  const [longitude, setLongitude] = useState<number | undefined>()
  const [locationAccuracy, setLocationAccuracy] = useState<number | undefined>()
  const [locating, setLocating] = useState(false)

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

  function progressForProjectDate(projectId: string, reportDate: string) {
    const matches = progressRecords
      .filter((record) => record.quoteId === projectId && record.date <= reportDate)
      .sort((a, b) => b.date.localeCompare(a.date))

    if (matches.length) return matches[0]

    return progressRecords
      .filter((record) => record.quoteId === projectId)
      .sort((a, b) => b.date.localeCompare(a.date))[0]
  }

  function progressForReport(report: DailyReport) {
    return progressForProjectDate(report.quoteId, report.date)
  }

  const selectedProgress = quoteId ? progressForProjectDate(quoteId, date) : undefined

  const reportGroups = useMemo(() => {
    const query = search.trim().toLowerCase()

    return projects
      .map((project) => {
        const projectReports = reports
          .filter((report) => report.quoteId === project.id)
          .sort((a, b) => b.date.localeCompare(a.date))

        return {
          project,
          reports: projectReports,
          latest: projectReports[0],
        }
      })
      .filter((group) => group.reports.length > 0)
      .filter((group) => {
        if (!query) return true

        const searchable = [
          group.project.project,
          group.project.client,
          group.project.folio,
          group.project.owner,
          ...group.reports.flatMap((report) => [
            report.projectName,
            report.clientInvoice,
            report.author,
            report.summary,
            report.blockers,
            report.weather,
            report.date,
          ]),
        ]
          .join(' ')
          .toLowerCase()

        return searchable.includes(query)
      })
      .sort((a, b) => (b.latest?.date ?? '').localeCompare(a.latest?.date ?? ''))
  }, [projects, reports, search])

  const viewingGroup = useMemo(() => {
    if (!viewingQuoteId) return undefined
    const project = projectById.get(viewingQuoteId)
    if (!project) return undefined

    const projectReports = reports
      .filter((report) => report.quoteId === viewingQuoteId)
      .sort((a, b) => b.date.localeCompare(a.date))

    return { project, reports: projectReports }
  }, [viewingQuoteId, projectById, reports])

  function resetForm() {
    setQuoteId('')
    setProjectName('')
    setClientInvoice('')
    setDate(today())
    setWeather('')
    setWorkers('')
    setSummary('')
    setBlockers('')
    setAuthor('Pedro Garcia')
    setImages([])
    setProcessingImages(false)
    setLatitude(undefined)
    setLongitude(undefined)
    setLocationAccuracy(undefined)
    setLocating(false)
  }

  function handleProjectChange(value: string) {
    setQuoteId(value)
    const project = projects.find((item) => item.id === value)
    setProjectName(project?.project ?? '')
  }

  function captureLocation() {
    if (!('geolocation' in navigator)) {
      window.alert('Este dispositivo no permite obtener la ubicación.')
      return
    }

    setLocating(true)

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude)
        setLongitude(position.coords.longitude)
        setLocationAccuracy(position.coords.accuracy)
        setLocating(false)
      },
      (error) => {
        console.error('No se pudo obtener la ubicación:', error)
        setLocating(false)
        window.alert('No pudimos obtener tu ubicación. Revisa el permiso de ubicación del navegador.')
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 30000,
      },
    )
  }

  async function handleImages(event: ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files ?? []).filter((file) =>
      file.type.startsWith('image/'),
    )
    event.target.value = ''

    if (!selected.length) return

    const available = MAX_REPORT_IMAGES - images.length
    if (available <= 0) {
      window.alert(`Puedes agregar hasta ${MAX_REPORT_IMAGES} imágenes por reporte.`)
      return
    }

    const files = selected.slice(0, available)
    setProcessingImages(true)

    try {
      const prepared = await Promise.all(files.map(prepareReportImage))
      setImages((current) => [...current, ...prepared].slice(0, MAX_REPORT_IMAGES))

      if (selected.length > available) {
        window.alert(`Se agregaron ${available} imágenes. El máximo es ${MAX_REPORT_IMAGES} por reporte.`)
      }
    } catch {
      window.alert('No se pudieron procesar una o más imágenes. Intenta con archivos JPG o PNG.')
    } finally {
      setProcessingImages(false)
    }
  }

  function removeSelectedImage(imageId: string) {
    setImages((current) => current.filter((image) => image.id !== imageId))
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
      projectName: projectName.trim() || project.project,
      clientInvoice: clientInvoice.trim(),
      weather: weather.trim(),
      workers: Number(workers || 0),
      summary: summary.trim(),
      blockers: blockers.trim(),
      author: author.trim(),
      latitude,
      longitude,
      locationAccuracy,
      images,
    }

    const next = [report, ...reports]

    try {
      writeDailyReports(next)
      setReports(next)
      setOpen(false)
      resetForm()
    } catch {
      window.alert('No se pudo guardar el reporte. Reduce la cantidad o tamaño de las imágenes e inténtalo nuevamente.')
    }
  }

  function remove(id: string) {
    if (!window.confirm('¿Eliminar este reporte diario?')) return
    const next = reports.filter((report) => report.id !== id)
    setReports(next)
    writeDailyReports(next)

    if (viewingQuoteId && !next.some((report) => report.quoteId === viewingQuoteId)) {
      setViewingQuoteId(null)
    }
  }

  function printPdf(report: DailyReport) {
    const project = projectById.get(report.quoteId)
    if (!project) return

    const progress = progressForReport(report)
    const progressRows = progress?.items ?? []
    const totals = progressTotals(progressRows)
    const progressPercent = Math.max(0, Math.min(100, progress?.percent ?? 0))
    const printWindow = window.open('', '_blank', 'width=900,height=1000')

    if (!printWindow) {
      window.alert('Permite las ventanas emergentes para generar el PDF del reporte.')
      return
    }

    const logoUrl = `${window.location.origin}/icon.png`
    const title = `Reporte_Diario_${report.folio}_${report.date}`
    const reportProjectName = report.projectName || project.project
    const progressTableSection = progressRows.length
      ? `<section class="section progress-table-section">
          <p class="section-title">Avance real por concepto</p>
          <div class="table-wrap">
            <table class="progress-table">
              <thead>
                <tr>
                  <th>Concepto</th>
                  <th>UM</th>
                  <th class="num">P.O</th>
                  <th class="num">Cantidad</th>
                  <th class="num">Total</th>
                  <th class="num">Acum. anterior</th>
                  <th class="num">Ejec. anterior</th>
                  <th class="num">Ejecutado</th>
                  <th class="num">Por ejecutar</th>
                </tr>
              </thead>
              <tbody>
                ${progressRows.map((item) => `<tr>
                  <td>${escapeHtml(item.concept)}</td>
                  <td>${escapeHtml(item.unit || '—')}</td>
                  <td class="num">${escapeHtml(money(item.po))}</td>
                  <td class="num">${escapeHtml(quantity(item.quantity))}</td>
                  <td class="num strong">${escapeHtml(money(item.total))}</td>
                  <td class="num">${escapeHtml(money(item.accumulatedPrevious))}</td>
                  <td class="num">${escapeHtml(money(item.previousExecution))}</td>
                  <td class="num blue strong">${escapeHtml(money(item.executed))}</td>
                  <td class="num strong">${escapeHtml(money(item.totalToExecute))}</td>
                </tr>`).join('')}
              </tbody>
              <tfoot>
                <tr>
                  <td colspan="4"><strong>Totales</strong></td>
                  <td class="num strong">${escapeHtml(money(totals.total))}</td>
                  <td class="num strong">${escapeHtml(money(totals.accumulatedPrevious))}</td>
                  <td class="num strong">${escapeHtml(money(totals.previousExecution))}</td>
                  <td class="num blue strong">${escapeHtml(money(totals.executed))}</td>
                  <td class="num strong">${escapeHtml(money(totals.totalToExecute))}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </section>`
      : `<section class="section"><p class="section-title">Avance real por concepto</p><div class="empty-table">No hay tabla de avance por conceptos registrada para esta fecha.</div></section>`

    const imageSection = report.images.length
      ? `<section class="section photo-section">
          <p class="section-title">Evidencia fotográfica</p>
          <div class="photos">
            ${report.images
              .map(
                (image, index) => `<figure class="photo-card">
                  <img src="${escapeHtml(image.dataUrl)}" alt="Evidencia ${index + 1}" />
                  <figcaption>${escapeHtml(image.name || `Imagen ${index + 1}`)}</figcaption>
                </figure>`,
              )
              .join('')}
          </div>
        </section>`
      : ''

    printWindow.document.open()
    printWindow.document.write(`<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <style>
    @page { size: A4 portrait; margin: 0; }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; background: #ffffff; color: #172033; }
    body {
      width: 210mm;
      min-height: 297mm;
      padding: 11mm 12mm;
      font-family: Arial, Helvetica, sans-serif;
      font-size: 9px;
      line-height: 1.38;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .document { width: 100%; margin: 0; background: #ffffff; }
    .header { display: flex; align-items: center; justify-content: space-between; gap: 18px; padding-bottom: 11px; border-bottom: 2px solid #5496CC; }
    .brand { display: flex; align-items: center; gap: 11px; }
    .logo { width: 42px; height: 42px; object-fit: contain; }
    h1 { margin: 0; font-size: 17px; line-height: 1.15; color: #101827; }
    .subtitle { margin: 4px 0 0; color: #657083; }
    .folio { text-align: right; }
    .folio strong { color: #5496CC; font-size: 11px; }
    .folio p { margin: 4px 0 0; }
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 10px; }
    .card { padding: 10px 11px; border: 0; border-radius: 8px; background: #f7f9fb; }
    .section { margin-top: 10px; }
    .section-title { margin: 0 0 6px; color: #697386; font-size: 7.5px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; }
    .rows { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 4px 10px; }
    .rows p, .card p { margin: 0 0 3px; overflow-wrap: anywhere; }
    .rows p:last-child, .card p:last-child { margin-bottom: 0; }
    .progress-card { margin-top: 10px; padding: 10px 11px; border-radius: 8px; background: #f5f9fd; }
    .progress-head { display: flex; justify-content: space-between; gap: 12px; }
    .progress-label { margin: 0; color: #5496CC; font-size: 7.5px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; }
    .progress-value { margin: 4px 0 0; font-size: 14px; font-weight: 700; }
    .progress-milestone { margin: 2px 0 0; font-weight: 600; }
    .progress-date { color: #7a8494; font-size: 7.5px; white-space: nowrap; }
    .bar { margin-top: 7px; height: 5px; overflow: hidden; border-radius: 999px; background: #e5eaf0; }
    .bar > div { height: 100%; border-radius: inherit; background: #5496CC; }
    .progress-notes { margin: 6px 0 0; color: #4c5668; }
    .text-box { min-height: 48px; padding: 9px 10px; border-radius: 7px; background: #f8fafc; }
    .text-box p { margin: 0; }
    .table-wrap { width: 100%; overflow: hidden; border-radius: 7px; border: 1px solid #e4e8ee; }
    .progress-table { width: 100%; border-collapse: collapse; table-layout: fixed; font-size: 5.6px; }
    .progress-table th { padding: 5px 2.5px; background: #f2f5f8; color: #5f6b7c; text-align: left; text-transform: uppercase; font-size: 5.1px; line-height: 1.15; letter-spacing: .01em; overflow-wrap: anywhere; }
    .progress-table td { padding: 5px 2.5px; border-top: 1px solid #edf0f3; vertical-align: top; line-height: 1.2; overflow-wrap: anywhere; }
    .progress-table th:first-child, .progress-table td:first-child { width: 16%; }
    .progress-table th:nth-child(2), .progress-table td:nth-child(2) { width: 10%; }
    .progress-table .num { text-align: right; }
    .progress-table .strong { font-weight: 700; }
    .progress-table .blue { color: #397db4; }
    .progress-table tfoot td { background: #f7f9fb; border-top: 1.5px solid #d9e0e8; }
    .empty-table { padding: 10px; border-radius: 7px; background: #f8fafc; color: #7a8494; }
    .photos { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
    .photo-card { margin: 0; padding: 0; break-inside: avoid; page-break-inside: avoid; }
    .photo-card img { display: block; width: 100%; height: 175px; object-fit: cover; border-radius: 7px; background: #eef2f6; }
    .photo-card figcaption { margin-top: 3px; color: #7a8494; font-size: 7px; overflow-wrap: anywhere; }
    .footer { margin-top: 12px; padding-top: 7px; border-top: 1px solid #e5e7eb; color: #7b8493; font-size: 7px; }
    strong { color: #111827; }
    .progress-table-section { break-inside: avoid; page-break-inside: avoid; }
    @media print {
      html, body { background: #ffffff !important; }
      body { width: 210mm !important; min-height: 297mm !important; margin: 0 !important; }
      .photo-section { break-before: auto; }
      .photo-card { break-inside: avoid; page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <main class="document">
    <header class="header">
      <div class="brand">
        <img class="logo" src="${escapeHtml(logoUrl)}" alt="NEDVI Constructora" />
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
        <p><strong>Nombre del proyecto:</strong> ${escapeHtml(reportProjectName)}</p>
        <p><strong>Responsable:</strong> ${escapeHtml(project.owner || 'Sin responsable')}</p>
        <p><strong>Factura / referencia cliente:</strong> ${escapeHtml(report.clientInvoice || 'Sin registrar')}</p>
        <p><strong>Elaboró:</strong> ${escapeHtml(report.author || 'Sin registrar')}</p>
        <p><strong>Personal en obra:</strong> ${escapeHtml(report.workers)} personas</p>
        <p><strong>Clima:</strong> ${escapeHtml(report.weather || 'Sin registrar')}</p>
        <p><strong>Fecha:</strong> ${escapeHtml(formatDate(report.date))}</p>
        <p><strong>Evidencia:</strong> ${escapeHtml(report.images.length)} imagen${report.images.length === 1 ? '' : 'es'}</p>
      </div>
    </section>

    <section class="progress-card">
      <div class="progress-head">
        <div>
          <p class="progress-label">Proceso / avance de obra</p>
          <p class="progress-value">${progress ? `${escapeHtml(progress.percent)}%` : 'Sin avance registrado'}</p>
          <p class="progress-milestone">${escapeHtml(progress?.milestone || 'No hay avance registrado para este proyecto.')}</p>
        </div>
        ${progress ? `<div class="progress-date">Actualizado: ${escapeHtml(formatDate(progress.date))}</div>` : ''}
      </div>
      <div class="bar"><div style="width:${progressPercent}%"></div></div>
      ${progress?.notes ? `<p class="progress-notes">${textBlock(progress.notes)}</p>` : ''}
    </section>

    ${progressTableSection}

    <section class="section">
      <p class="section-title">Actividades realizadas</p>
      <div class="text-box"><p>${textBlock(report.summary)}</p></div>
    </section>

    <section class="section">
      <p class="section-title">Bloqueos / pendientes</p>
      <div class="text-box"><p>${textBlock(report.blockers || 'Sin bloqueos o pendientes registrados.')}</p></div>
    </section>

    ${imageSection}

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

    const printableImages = Array.from(printWindow.document.images)
    if (!printableImages.length) {
      startPrint()
      return
    }

    Promise.all(
      printableImages.map(
        (image) =>
          new Promise<void>((resolve) => {
            if (image.complete) {
              resolve()
              return
            }
            image.addEventListener('load', () => resolve(), { once: true })
            image.addEventListener('error', () => resolve(), { once: true })
          }),
      ),
    ).then(startPrint)
  }

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-[1600px] space-y-6">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#5496CC]">Operaciones / Obra</p>
            <h1 className="mt-2 text-3xl font-bold text-[var(--foreground)]">Reportes diarios</h1>
            <p className="mt-2 text-sm text-[var(--muted)]">Bitácora diaria con información del cliente, avance real por concepto y evidencia fotográfica.</p>
          </div>
          <button onClick={() => setOpen(true)} className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#5496CC] px-4 text-sm font-semibold text-white"><Plus size={16} /> Nuevo reporte</button>
        </header>

        <div className="grid gap-4 sm:grid-cols-3">
          <Metric label="Reportes" value={reports.length.toString()} />
          <Metric label="Proyectos con reporte" value={new Set(reports.map((report) => report.quoteId)).size.toString()} />
          <Metric label="Imágenes registradas" value={reports.reduce((sum, report) => sum + report.images.length, 0).toString()} />
        </div>

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
          <div className="relative max-w-xl">
            <Search size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar cliente, proyecto, factura, folio o actividad..." className="w-full rounded-xl border border-[var(--border)] bg-transparent py-3 pl-11 pr-4 text-sm outline-none focus:border-[#5496CC]" />
          </div>
        </div>

        {reportGroups.length === 0 ? (
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-6 py-16 text-center">
            <FileText className="mx-auto text-[#5496CC]" size={32} />
            <h2 className="mt-4 text-lg font-bold">Todavía no hay reportes diarios</h2>
            <p className="mt-2 text-sm text-[var(--muted)]">Crea el primer reporte para documentar la jornada de obra.</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1040px] text-left text-sm">
                <thead className="border-b border-[var(--border)] bg-[var(--surface-soft)] text-xs uppercase tracking-wide text-[var(--muted)]">
                  <tr>
                    <th className="px-5 py-4">Proyecto / Cliente</th>
                    <th className="px-5 py-4">Último reporte</th>
                    <th className="px-5 py-4">Avance</th>
                    <th className="px-5 py-4">Reportes</th>
                    <th className="px-5 py-4">Evidencia</th>
                    <th className="px-5 py-4">Responsable</th>
                    <th className="px-5 py-4 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {reportGroups.map(({ project, reports: projectReports, latest }) => {
                    const latestProgress = latest ? progressForReport(latest) : undefined
                    const imageCount = projectReports.reduce((sum, report) => sum + report.images.length, 0)

                    return (
                      <tr key={project.id} className="hover:bg-[var(--surface-soft)]">
                        <td className="px-5 py-4">
                          <p className="font-semibold text-[var(--foreground)]">{latest?.projectName || project.project}</p>
                          <p className="mt-1 text-xs text-[var(--muted)]">{project.client} · {project.folio}</p>
                        </td>
                        <td className="px-5 py-4">
                          <p className="font-medium text-[var(--foreground)]">{latest ? formatDate(latest.date) : 'Sin fecha'}</p>
                          <p className="mt-1 text-xs text-[var(--muted)]">{latest?.author || 'Sin autor'}</p>
                        </td>
                        <td className="px-5 py-4">
                          <span className="inline-flex rounded-full bg-[#5496CC]/10 px-2.5 py-1 text-xs font-semibold text-[#5496CC]">
                            {latestProgress ? `${latestProgress.percent}%` : 'Sin registrar'}
                          </span>
                        </td>
                        <td className="px-5 py-4 font-semibold text-[var(--foreground)]">{projectReports.length}</td>
                        <td className="px-5 py-4 text-[var(--foreground)]">{imageCount} imagen{imageCount === 1 ? '' : 'es'}</td>
                        <td className="px-5 py-4 text-[var(--foreground)]">{project.owner || 'Sin responsable'}</td>
                        <td className="px-5 py-4 text-right">
                          <button type="button" onClick={() => setViewingQuoteId(project.id)} className="inline-flex items-center gap-2 rounded-lg border border-[#5496CC]/40 px-3 py-2 text-xs font-semibold text-[#5496CC] transition hover:bg-[#5496CC]/10">
                            <Eye size={15} /> Ver reportes
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {viewingGroup ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="max-h-[94vh] w-full max-w-[1500px] overflow-y-auto rounded-2xl bg-[var(--surface)] shadow-2xl">
            <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-[var(--border)] bg-[var(--surface)] p-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#5496CC]">Historial de reportes diarios</p>
                <h2 className="mt-1 text-xl font-bold text-[var(--foreground)]">{viewingGroup.project.project}</h2>
                <p className="mt-1 text-sm text-[var(--muted)]">{viewingGroup.project.client} · {viewingGroup.project.folio} · {viewingGroup.reports.length} reporte{viewingGroup.reports.length === 1 ? '' : 's'}</p>
              </div>
              <button type="button" onClick={() => setViewingQuoteId(null)} className="rounded-lg p-2 text-[var(--muted)] hover:bg-[var(--surface-soft)]" aria-label="Cerrar historial"><X size={19} /></button>
            </div>

            <div className="space-y-4 p-5">
              {viewingGroup.reports.map((report) => {
                const progress = progressForReport(report)

                return (
                  <article key={report.id} className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)]">
                    <div className="p-5">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                          <p className="text-xs font-semibold text-[#5496CC]">{formatDate(report.date)}</p>
                          <h3 className="mt-1 text-base font-bold text-[var(--foreground)]">{report.projectName || viewingGroup.project.project}</h3>
                          <p className="mt-1 text-sm text-[var(--muted)]">Elaboró: {report.author || 'Sin registrar'}</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button type="button" onClick={() => printPdf(report)} className="inline-flex items-center gap-2 rounded-lg border border-[#5496CC]/40 px-3 py-2 text-xs font-semibold text-[#5496CC] hover:bg-[#5496CC]/10"><Printer size={15} /> PDF</button>
                          <button type="button" onClick={() => remove(report.id)} className="inline-flex items-center gap-2 rounded-lg border border-red-500/20 px-3 py-2 text-xs font-semibold text-red-500 hover:bg-red-500/10"><Trash2 size={15} /> Eliminar</button>
                        </div>
                      </div>

                      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                        <Info label="Clima" value={report.weather || 'Sin registrar'} />
                        <Info label="Personal" value={`${report.workers} personas`} />
                        <Info label="Avance de obra" value={progress ? `${progress.percent}%` : 'Sin registrar'} />
                        <Info label="Factura / referencia" value={report.clientInvoice || 'Sin registrar'} />
                        <Info label="Imágenes" value={report.images.length.toString()} />
                        <Info
                          label="Ubicación"
                          value={
                            typeof report.latitude === 'number' && typeof report.longitude === 'number'
                              ? `${report.latitude.toFixed(5)}, ${report.longitude.toFixed(5)}`
                              : 'Sin registrar'
                          }
                        />
                      </div>

                      <div className="mt-4 grid gap-4 lg:grid-cols-[1.3fr_1fr]">
                        <div className="rounded-xl bg-[var(--surface)] p-4">
                          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Actividades realizadas</p>
                          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[var(--foreground)]">{report.summary}</p>
                        </div>
                        <div className={`rounded-xl p-4 ${report.blockers ? 'border border-amber-500/20 bg-amber-500/10' : 'bg-[var(--surface)]'}`}>
                          <p className={`text-xs font-semibold uppercase tracking-wide ${report.blockers ? 'text-amber-600' : 'text-[var(--muted)]'}`}>Bloqueos / pendientes</p>
                          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[var(--foreground)]">{report.blockers || 'Sin bloqueos o pendientes registrados.'}</p>
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-[var(--border)]">
                      <div className="bg-[var(--surface)] px-5 py-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#5496CC]">Avance real por concepto</p>
                      </div>
                      <ReportProgressTable rows={progress?.items ?? []} />
                    </div>

                    {report.images.length ? (
                      <div className="border-t border-[var(--border)] p-5">
                        <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]"><FileImage size={15} /> Evidencia fotográfica</div>
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                          {report.images.map((image) => (
                            <figure key={image.id} className="overflow-hidden rounded-xl bg-[var(--surface)]">
                              <img src={image.dataUrl} alt={image.name} className="h-44 w-full object-cover" />
                              <figcaption className="truncate px-3 py-2 text-xs text-[var(--muted)]">{image.name}</figcaption>
                            </figure>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </article>
                )
              })}
            </div>
          </div>
        </div>
      ) : null}

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4">
          <div className="max-h-[94vh] w-full max-w-6xl overflow-y-auto rounded-2xl bg-[var(--surface)] p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-[#5496CC]">Bitácora de obra</p>
                <h2 className="text-xl font-bold">Nuevo reporte diario</h2>
              </div>
              <button type="button" onClick={() => { setOpen(false); resetForm() }}><X size={18} /></button>
            </div>

            <form onSubmit={save} className="space-y-4">
              <label className="block space-y-2">
                <span className="text-sm font-semibold">Proyecto vinculado</span>
                <select required value={quoteId} onChange={(event) => handleProjectChange(event.target.value)} className="w-full rounded-xl border border-[var(--border)] bg-transparent px-4 py-3">
                  <option value="">Seleccionar proyecto</option>
                  {projects.map((project) => <option key={project.id} value={project.id}>{project.folio} — {project.project}</option>)}
                </select>
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-semibold">Nombre del proyecto *</span>
                <input required value={projectName} onChange={(event) => setProjectName(event.target.value)} placeholder="Nombre que aparecerá en el reporte y PDF" className="w-full rounded-xl border border-[var(--border)] bg-transparent px-4 py-3 outline-none focus:border-[#5496CC]" />
              </label>

              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="flex items-center gap-2 text-sm font-semibold text-[var(--foreground)]">
                      <MapPin size={16} className="text-[#5496CC]" /> Ubicación del reporte
                    </p>
                    <p className="mt-1 text-xs text-[var(--muted)]">
                      Guarda la ubicación actual como evidencia del registro en campo.
                    </p>
                    {typeof latitude === 'number' && typeof longitude === 'number' ? (
                      <p className="mt-2 text-xs font-semibold text-[#5496CC]">
                        {latitude.toFixed(5)}, {longitude.toFixed(5)}
                        {typeof locationAccuracy === 'number' ? ` · precisión ±${Math.round(locationAccuracy)} m` : ''}
                      </p>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    onClick={captureLocation}
                    disabled={locating}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#5496CC]/40 px-4 py-2.5 text-sm font-semibold text-[#5496CC] transition hover:bg-[#5496CC]/10 disabled:opacity-60"
                  >
                    {locating ? <LoaderCircle size={16} className="animate-spin" /> : <MapPin size={16} />}
                    {locating ? 'Obteniendo...' : latitude ? 'Actualizar ubicación' : 'Usar ubicación actual'}
                  </button>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-2"><span className="text-sm font-semibold">Fecha</span><input type="date" required value={date} onChange={(event) => setDate(event.target.value)} className="w-full rounded-xl border border-[var(--border)] bg-transparent px-4 py-3" /></label>
                <label className="space-y-2"><span className="text-sm font-semibold">Clima</span><input value={weather} onChange={(event) => setWeather(event.target.value)} placeholder="Ej. Soleado, 26°C" className="w-full rounded-xl border border-[var(--border)] bg-transparent px-4 py-3" /></label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-2"><span className="text-sm font-semibold">Personal en obra</span><input type="number" min="0" value={workers} onChange={(event) => setWorkers(event.target.value)} className="w-full rounded-xl border border-[var(--border)] bg-transparent px-4 py-3" /></label>
                <label className="space-y-2">
                  <span className="text-sm font-semibold">Elaboró</span>
                  <select
                    value={author}
                    onChange={(event) => setAuthor(event.target.value)}
                    className="w-full rounded-xl border border-[var(--border)] bg-transparent px-4 py-3"
                  >
                    {REPORT_AUTHORS.map((name) => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="block space-y-2">
                <span className="flex items-center gap-2 text-sm font-semibold"><ReceiptText size={16} className="text-[#5496CC]" /> Factura / referencia entregada por el cliente</span>
                <input value={clientInvoice} onChange={(event) => setClientInvoice(event.target.value)} placeholder="Ej. FAC-4582, orden, referencia o folio del cliente" className="w-full rounded-xl border border-[var(--border)] bg-transparent px-4 py-3 outline-none focus:border-[#5496CC]" />
              </label>

              {quoteId ? (
                <div className="overflow-hidden rounded-2xl border border-[var(--border)]">
                  <div className="flex flex-col gap-1 border-b border-[var(--border)] bg-[var(--surface-soft)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#5496CC]">Avance real que verá el cliente</p>
                      <p className="mt-1 text-xs text-[var(--muted)]">Se toma automáticamente del módulo Avance de obra según la fecha del reporte.</p>
                    </div>
                    <span className="rounded-full bg-[#5496CC]/10 px-3 py-1 text-xs font-bold text-[#5496CC]">{selectedProgress ? `${selectedProgress.percent}%` : 'Sin avance'}</span>
                  </div>
                  <ReportProgressTable rows={selectedProgress?.items ?? []} />
                </div>
              ) : null}

              <label className="block space-y-2"><span className="text-sm font-semibold">Actividades realizadas *</span><textarea required rows={5} value={summary} onChange={(event) => setSummary(event.target.value)} placeholder="Describe los trabajos realizados durante la jornada..." className="w-full rounded-xl border border-[var(--border)] bg-transparent px-4 py-3" /></label>
              <label className="block space-y-2"><span className="text-sm font-semibold">Bloqueos / pendientes</span><textarea rows={3} value={blockers} onChange={(event) => setBlockers(event.target.value)} className="w-full rounded-xl border border-[var(--border)] bg-transparent px-4 py-3" /></label>

              <div className="rounded-2xl border border-dashed border-[#5496CC]/40 bg-[#5496CC]/5 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="flex items-center gap-2 text-sm font-semibold text-[var(--foreground)]"><ImagePlus size={17} className="text-[#5496CC]" /> Evidencia fotográfica</p>
                    <p className="mt-1 text-xs text-[var(--muted)]">Agrega hasta {MAX_REPORT_IMAGES} imágenes. Se optimizan antes de guardar.</p>
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <label className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#5496CC] px-4 py-2.5 text-sm font-semibold text-white">
                      <ImagePlus size={16} />
                      {processingImages ? 'Procesando...' : 'Galería'}
                      <input type="file" accept="image/*" multiple disabled={processingImages || images.length >= MAX_REPORT_IMAGES} onChange={handleImages} className="hidden" />
                    </label>
                    <label className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-[#5496CC]/40 bg-[var(--surface)] px-4 py-2.5 text-sm font-semibold text-[#5496CC]">
                      <ImagePlus size={16} />
                      Tomar foto
                      <input type="file" accept="image/*" capture="environment" disabled={processingImages || images.length >= MAX_REPORT_IMAGES} onChange={handleImages} className="hidden" />
                    </label>
                  </div>
                </div>

                {images.length ? (
                  <div className="mt-4 grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                    {images.map((image) => (
                      <div key={image.id} className="relative overflow-hidden rounded-xl bg-[var(--surface)]">
                        <img src={image.dataUrl} alt={image.name} className="h-32 w-full object-cover" />
                        <div className="flex items-center justify-between gap-2 px-3 py-2">
                          <span className="min-w-0 truncate text-xs text-[var(--muted)]">{image.name}</span>
                          <button type="button" onClick={() => removeSelectedImage(image.id)} className="shrink-0 rounded-md p-1 text-red-500 hover:bg-red-500/10" aria-label={`Quitar ${image.name}`}><X size={14} /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => { setOpen(false); resetForm() }} className="rounded-xl border border-[var(--border)] px-5 py-3 font-semibold">Cancelar</button>
                <button type="submit" disabled={processingImages} className="rounded-xl bg-[#5496CC] px-5 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60">Guardar reporte</button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </AppShell>
  )
}

function ReportProgressTable({ rows }: { rows: ProgressItem[] }) {
  const totals = progressTotals(rows)

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1450px] text-left text-sm">
        <thead className="bg-[var(--surface-soft)] text-xs uppercase tracking-wide text-[var(--muted)]">
          <tr>
            <th className="px-4 py-3">Concepto</th>
            <th className="px-4 py-3">UM</th>
            <th className="px-4 py-3 text-right">P.O</th>
            <th className="px-4 py-3 text-right">Cantidad</th>
            <th className="px-4 py-3 text-right">Total</th>
            <th className="px-4 py-3 text-right">Acumulado Anterior</th>
            <th className="px-4 py-3 text-right">Ejecución Anterior</th>
            <th className="px-4 py-3 text-right">Ejecutado</th>
            <th className="px-4 py-3 text-right">Total por ejecutar</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--border)]">
          {rows.length ? rows.map((row) => (
            <tr key={row.id} className="hover:bg-[var(--surface-soft)]">
              <td className="px-4 py-4 font-semibold">{row.concept}</td>
              <td className="px-4 py-4">{row.unit || '—'}</td>
              <td className="px-4 py-4 text-right">{money(row.po)}</td>
              <td className="px-4 py-4 text-right">{quantity(row.quantity)}</td>
              <td className="px-4 py-4 text-right font-semibold">{money(row.total)}</td>
              <td className="px-4 py-4 text-right">{money(row.accumulatedPrevious)}</td>
              <td className="px-4 py-4 text-right">{money(row.previousExecution)}</td>
              <td className="px-4 py-4 text-right font-semibold text-[#5496CC]">{money(row.executed)}</td>
              <td className="px-4 py-4 text-right font-semibold">{money(row.totalToExecute)}</td>
            </tr>
          )) : (
            <tr><td colSpan={9} className="px-5 py-8 text-center text-sm text-[var(--muted)]">Todavía no hay tabla de avance por conceptos para este proyecto.</td></tr>
          )}
        </tbody>
        {rows.length ? (
          <tfoot className="border-t border-[var(--border)] bg-[var(--surface-soft)] font-bold">
            <tr>
              <td className="px-4 py-4" colSpan={4}>Totales</td>
              <td className="px-4 py-4 text-right">{money(totals.total)}</td>
              <td className="px-4 py-4 text-right">{money(totals.accumulatedPrevious)}</td>
              <td className="px-4 py-4 text-right">{money(totals.previousExecution)}</td>
              <td className="px-4 py-4 text-right text-[#5496CC]">{money(totals.executed)}</td>
              <td className="px-4 py-4 text-right">{money(totals.totalToExecute)}</td>
            </tr>
          </tfoot>
        ) : null}
      </table>
    </div>
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
      <p className="mt-1 break-words text-sm font-semibold">{value}</p>
    </div>
  )
}
