'use client'

import {
  ChangeEvent,
  FormEvent,
  PointerEvent as ReactPointerEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import {
  Download,
  Eye,
  FileDown,
  FileText,
  Image as ImageIcon,
  Pencil,
  Plus,
  Search,
  Trash2,
  Upload,
  X,
} from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { getCustomersFromSupabase } from '@/features/crm/services/customerSupabase'
import type { Customer } from '@/features/crm/types/customer'

type ExecutionTime = 'Jornada normal' | 'Fin de semana' | 'Extraordinaria'
type EstimatedTimeUnit = 'Horas' | 'Días' | 'Semanas' | 'Meses'

type SurveyAttachment = {
  id: string
  name: string
  type: string
  size: number
  dataUrl: string
}

type SiteSurvey = {
  id: string
  clientName: string
  date: string
  location: string
  requestedBy: string
  performedBy: string
  description: string
  executionTimes: ExecutionTime[]
  estimatedTime: string
  attachments: SurveyAttachment[]
  drawing: string
  createdAt: string
  updatedAt: string
}

type SurveyForm = Omit<SiteSurvey, 'id' | 'createdAt' | 'updatedAt'>

const STORAGE_KEY = 'nedvi_site_surveys'
const EXECUTION_OPTIONS: ExecutionTime[] = ['Jornada normal', 'Fin de semana', 'Extraordinaria']
const ESTIMATED_TIME_UNITS: EstimatedTimeUnit[] = ['Horas', 'Días', 'Semanas', 'Meses']
const MAX_FILES = 30
const MAX_FILE_BYTES = 1_250_000
const MAX_TOTAL_BYTES = 4_000_000

function today() {
  return new Date().toISOString().slice(0, 10)
}

function emptyForm(): SurveyForm {
  return {
    clientName: '',
    date: today(),
    location: '',
    requestedBy: '',
    performedBy: '',
    description: '',
    executionTimes: [],
    estimatedTime: '',
    attachments: [],
    drawing: '',
  }
}

function parseEstimatedTime(value: string): { amount: string; unit: EstimatedTimeUnit } {
  const amount = value.match(/\d+(?:\.\d+)?/)?.[0] ?? ''
  const normalized = value.toLowerCase()
  if (normalized.includes('hora')) return { amount, unit: 'Horas' }
  if (normalized.includes('semana')) return { amount, unit: 'Semanas' }
  if (normalized.includes('mes')) return { amount, unit: 'Meses' }
  return { amount, unit: 'Días' }
}

function formatEstimatedTime(amount: string, unit: EstimatedTimeUnit) {
  const numeric = Number(amount)
  if (!Number.isFinite(numeric) || numeric <= 0) return ''
  if (numeric !== 1) return `${amount} ${unit}`

  const singular: Record<EstimatedTimeUnit, string> = {
    Horas: 'Hora',
    Días: 'Día',
    Semanas: 'Semana',
    Meses: 'Mes',
  }
  return `${amount} ${singular[unit]}`
}

function readSurveys(): SiteSurvey[] {
  if (typeof window === 'undefined') return []
  const raw = window.localStorage.getItem(STORAGE_KEY)
  if (!raw) return []

  try {
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []

    return parsed
      .filter((item): item is Record<string, unknown> => typeof item === 'object' && item !== null)
      .map((item) => ({
        id: typeof item.id === 'string' ? item.id : crypto.randomUUID(),
        clientName: typeof item.clientName === 'string' ? item.clientName : '',
        date: typeof item.date === 'string' ? item.date : today(),
        location: typeof item.location === 'string' ? item.location : '',
        requestedBy: typeof item.requestedBy === 'string' ? item.requestedBy : '',
        performedBy: typeof item.performedBy === 'string' ? item.performedBy : '',
        description: typeof item.description === 'string' ? item.description : '',
        executionTimes: Array.isArray(item.executionTimes)
          ? item.executionTimes.filter((value): value is ExecutionTime => EXECUTION_OPTIONS.includes(value as ExecutionTime))
          : [],
        estimatedTime: typeof item.estimatedTime === 'string' ? item.estimatedTime : '',
        attachments: Array.isArray(item.attachments)
          ? item.attachments
              .filter((file): file is Record<string, unknown> => typeof file === 'object' && file !== null)
              .map((file) => ({
                id: typeof file.id === 'string' ? file.id : crypto.randomUUID(),
                name: typeof file.name === 'string' ? file.name : 'Archivo',
                type: typeof file.type === 'string' ? file.type : 'application/octet-stream',
                size: typeof file.size === 'number' ? file.size : 0,
                dataUrl: typeof file.dataUrl === 'string' ? file.dataUrl : '',
              }))
              .filter((file) => file.dataUrl)
          : [],
        drawing: typeof item.drawing === 'string' ? item.drawing : '',
        createdAt: typeof item.createdAt === 'string' ? item.createdAt : new Date().toISOString(),
        updatedAt: typeof item.updatedAt === 'string' ? item.updatedAt : new Date().toISOString(),
      }))
  } catch {
    return []
  }
}

function writeSurveys(values: SiteSurvey[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(values))
}

function formatDate(value: string) {
  if (!value) return 'Sin fecha'
  const date = new Date(`${value}T12:00:00`)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }).format(date)
}

function fileSize(value: number) {
  if (value < 1024) return `${value} B`
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`
  return `${(value / (1024 * 1024)).toFixed(1)} MB`
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function dataUrlFromFile(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '')
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

export default function SiteSurveysPage() {
  const [surveys, setSurveys] = useState<SiteSurvey[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [viewing, setViewing] = useState<SiteSurvey | null>(null)
  const [form, setForm] = useState<SurveyForm>(emptyForm())
  const [estimatedTimeUnit, setEstimatedTimeUnit] = useState<EstimatedTimeUnit>('Días')

  useEffect(() => {
    setSurveys(readSurveys())
  }, [])

  useEffect(() => {
    let active = true

    const loadCustomers = async () => {
      try {
        const nextCustomers = await getCustomersFromSupabase()
        if (active) setCustomers(nextCustomers)
      } catch (error) {
        console.error('Error al cargar clientes de Levantamientos desde Supabase:', error)
        if (active) setCustomers([])
      }
    }

    void loadCustomers()

    const handleFocus = () => void loadCustomers()
    window.addEventListener('focus', handleFocus)

    return () => {
      active = false
      window.removeEventListener('focus', handleFocus)
    }
  }, [])

  const customerOptions = useMemo(
    () => [...customers].sort((a, b) => a.company.localeCompare(b.company, 'es')),
    [customers],
  )

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return surveys

    return surveys.filter((survey) =>
      [
        survey.clientName,
        survey.location,
        survey.requestedBy,
        survey.performedBy,
        survey.description,
        survey.estimatedTime,
        survey.executionTimes.join(' '),
      ]
        .join(' ')
        .toLowerCase()
        .includes(query),
    )
  }, [search, surveys])

  function openNew() {
    setEditingId(null)
    setEstimatedTimeUnit('Días')
    setForm(emptyForm())
    setOpen(true)
  }

  function openEdit(survey: SiteSurvey) {
    const clientStillExists = customers.some((customer) => customer.company === survey.clientName)
    const estimated = parseEstimatedTime(survey.estimatedTime)
    setEditingId(survey.id)
    setEstimatedTimeUnit(estimated.unit)
    setForm({
      clientName: clientStillExists ? survey.clientName : '',
      date: survey.date,
      location: survey.location,
      requestedBy: survey.requestedBy,
      performedBy: survey.performedBy,
      description: survey.description,
      executionTimes: [...survey.executionTimes],
      estimatedTime: estimated.amount,
      attachments: [...survey.attachments],
      drawing: survey.drawing,
    })
    setOpen(true)
  }

  function closeForm() {
    setOpen(false)
    setEditingId(null)
    setEstimatedTimeUnit('Días')
    setForm(emptyForm())
  }

  function toggleExecution(value: ExecutionTime) {
    setForm((current) => ({
      ...current,
      executionTimes: current.executionTimes.includes(value)
        ? current.executionTimes.filter((item) => item !== value)
        : [...current.executionTimes, value],
    }))
  }

  async function handleFiles(event: ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files ?? [])
    event.target.value = ''
    if (!selected.length) return

    if (form.attachments.length + selected.length > MAX_FILES) {
      window.alert(`Puedes guardar hasta ${MAX_FILES} archivos por levantamiento.`)
      return
    }

    const tooLarge = selected.find((file) => file.size > MAX_FILE_BYTES)
    if (tooLarge) {
      window.alert(`${tooLarge.name} excede el límite de ${fileSize(MAX_FILE_BYTES)} por archivo.`)
      return
    }

    const currentBytes = form.attachments.reduce((sum, file) => sum + file.size, 0)
    const newBytes = selected.reduce((sum, file) => sum + file.size, 0)
    if (currentBytes + newBytes > MAX_TOTAL_BYTES) {
      window.alert(`Los archivos del levantamiento no pueden superar ${fileSize(MAX_TOTAL_BYTES)} en total.`)
      return
    }

    try {
      const attachments = await Promise.all(
        selected.map(async (file) => ({
          id: crypto.randomUUID(),
          name: file.name,
          type: file.type || 'application/octet-stream',
          size: file.size,
          dataUrl: await dataUrlFromFile(file),
        })),
      )
      setForm((current) => ({ ...current, attachments: [...current.attachments, ...attachments] }))
    } catch {
      window.alert('No se pudo leer uno de los archivos seleccionados.')
    }
  }

  function removeAttachment(id: string) {
    setForm((current) => ({
      ...current,
      attachments: current.attachments.filter((file) => file.id !== id),
    }))
  }

  function saveSurvey(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const selectedCustomer = customers.find((customer) => customer.company === form.clientName)
    if (!selectedCustomer) {
      window.alert('Selecciona un cliente registrado en Clientes.')
      return
    }
    if (!form.description.trim()) return
    if (!form.estimatedTime.trim() || Number(form.estimatedTime) <= 0) {
      window.alert('Captura el número del tiempo estimado.')
      return
    }

    const estimatedTime = formatEstimatedTime(form.estimatedTime.trim(), estimatedTimeUnit)
    const now = new Date().toISOString()
    let next: SiteSurvey[]

    if (editingId) {
      next = surveys.map((survey) =>
        survey.id === editingId
          ? {
              ...survey,
              ...form,
              clientName: selectedCustomer.company,
              location: form.location.trim(),
              requestedBy: form.requestedBy.trim(),
              performedBy: form.performedBy.trim(),
              description: form.description.trim(),
              estimatedTime,
              updatedAt: now,
            }
          : survey,
      )
    } else {
      next = [
        {
          id: crypto.randomUUID(),
          ...form,
          clientName: selectedCustomer.company,
          location: form.location.trim(),
          requestedBy: form.requestedBy.trim(),
          performedBy: form.performedBy.trim(),
          description: form.description.trim(),
          estimatedTime,
          createdAt: now,
          updatedAt: now,
        },
        ...surveys,
      ]
    }

    try {
      writeSurveys(next)
      setSurveys(next)
      closeForm()
    } catch {
      window.alert('No se pudo guardar el levantamiento. Reduce el tamaño o cantidad de archivos adjuntos.')
    }
  }

  function deleteSurvey(survey: SiteSurvey) {
    if (!window.confirm(`¿Eliminar el levantamiento de ${survey.clientName}?`)) return
    const next = surveys.filter((item) => item.id !== survey.id)
    writeSurveys(next)
    setSurveys(next)
    if (viewing?.id === survey.id) setViewing(null)
  }

  function downloadAttachment(file: SurveyAttachment) {
    const anchor = document.createElement('a')
    anchor.href = file.dataUrl
    anchor.download = file.name
    anchor.click()
  }

  function printSurvey(survey: SiteSurvey) {
    const popup = window.open('', '_blank', 'width=1100,height=900')
    if (!popup) {
      window.alert('Permite ventanas emergentes para generar el PDF.')
      return
    }

    const imageAttachments = survey.attachments.filter((file) => file.type.startsWith('image/'))
    const otherAttachments = survey.attachments.filter((file) => !file.type.startsWith('image/'))
    const origin = window.location.origin

    popup.document.write(`<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<title>Levantamiento_${escapeHtml(survey.clientName)}_${escapeHtml(survey.date)}</title>
<style>
  @page { size: A4 portrait; margin: 0; }
  * { box-sizing: border-box; }
  body { margin: 0; width: 210mm; min-height: 297mm; padding: 12mm; font-family: Arial, Helvetica, sans-serif; color: #172033; font-size: 10px; line-height: 1.45; }
  .header { display:flex; justify-content:space-between; gap:16px; align-items:center; border-bottom:2px solid #5496CC; padding-bottom:10px; }
  .logo { width:54px; height:54px; object-fit:contain; }
  h1 { margin:0; font-size:21px; }
  .muted { color:#697386; }
  .section { margin-top:12px; border:1px solid #e2e8f0; border-radius:10px; overflow:hidden; break-inside:avoid; }
  .section-title { background:#f5f7fa; padding:7px 9px; font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:.08em; color:#5496CC; }
  .content { padding:10px; }
  .grid { display:grid; grid-template-columns:1fr 1fr; gap:8px 18px; }
  .label { color:#697386; font-size:8px; text-transform:uppercase; margin-bottom:2px; }
  .value { font-weight:600; }
  .description { white-space:pre-wrap; min-height:55px; }
  .chips { display:flex; flex-wrap:wrap; gap:6px; }
  .chip { padding:4px 7px; border-radius:999px; background:#eef6fc; color:#316f9f; border:1px solid #cfe3f3; font-weight:700; font-size:8px; }
  .photos { display:grid; grid-template-columns:1fr 1fr; gap:8px; }
  .photos img { width:100%; height:150px; object-fit:cover; border:1px solid #e2e8f0; border-radius:8px; }
  .drawing { width:100%; max-height:250px; object-fit:contain; border:1px solid #e2e8f0; border-radius:8px; background:white; }
  .files { margin:0; padding-left:18px; }
  .signatures { display:grid; grid-template-columns:1fr 1fr; gap:24px; margin-top:34px; break-inside:avoid; }
  .signature { padding-top:42px; border-top:1px solid #172033; text-align:center; }
  .signature strong { display:block; margin-top:5px; }
  .footer { margin-top:18px; text-align:center; color:#697386; font-size:8px; }
  @media print { body { print-color-adjust:exact; -webkit-print-color-adjust:exact; } }
</style>
</head>
<body>
  <div class="header">
    <div style="display:flex;align-items:center;gap:12px">
      <img class="logo" src="${origin}/icon.png" alt="NEDVI" />
      <div><h1>LEVANTAMIENTO / VISITA</h1><div class="muted">NEDVI Constructora</div></div>
    </div>
    <div style="text-align:right"><strong>${escapeHtml(formatDate(survey.date))}</strong><div class="muted">Comercial y Ventas</div></div>
  </div>

  <div class="section"><div class="section-title">Datos generales</div><div class="content grid">
    <div><div class="label">Nombre del cliente</div><div class="value">${escapeHtml(survey.clientName)}</div></div>
    <div><div class="label">Fecha</div><div class="value">${escapeHtml(formatDate(survey.date))}</div></div>
    <div><div class="label">Ciudad / Zona</div><div class="value">${escapeHtml(survey.location || 'Sin especificar')}</div></div>
    <div><div class="label">Solicita</div><div class="value">${escapeHtml(survey.requestedBy || 'Sin especificar')}</div></div>
    <div><div class="label">Realiza</div><div class="value">${escapeHtml(survey.performedBy || 'Sin especificar')}</div></div>
    <div><div class="label">Tiempo estimado</div><div class="value">${escapeHtml(survey.estimatedTime || 'Sin especificar')}</div></div>
  </div></div>

  <div class="section"><div class="section-title">Descripción del levantamiento</div><div class="content description">${escapeHtml(survey.description)}</div></div>

  <div class="section"><div class="section-title">Tiempo de ejecución</div><div class="content chips">${
    survey.executionTimes.length
      ? survey.executionTimes.map((value) => `<span class="chip">${escapeHtml(value)}</span>`).join('')
      : '<span class="muted">Sin opción seleccionada</span>'
  }</div></div>

  ${survey.drawing ? `<div class="section"><div class="section-title">Croquis / Plano dibujado</div><div class="content"><img class="drawing" src="${survey.drawing}" alt="Croquis" /></div></div>` : ''}

  ${imageAttachments.length ? `<div class="section"><div class="section-title">Evidencia fotográfica</div><div class="content photos">${imageAttachments.map((file) => `<div><img src="${file.dataUrl}" alt="${escapeHtml(file.name)}" /><div class="muted" style="margin-top:3px">${escapeHtml(file.name)}</div></div>`).join('')}</div></div>` : ''}

  ${otherAttachments.length ? `<div class="section"><div class="section-title">Archivos adjuntos</div><div class="content"><ul class="files">${otherAttachments.map((file) => `<li>${escapeHtml(file.name)} · ${escapeHtml(fileSize(file.size))}</li>`).join('')}</ul></div></div>` : ''}

  <div class="signatures">
    <div class="signature">Firma de quien realizó el levantamiento (VISITA)<strong>${escapeHtml(survey.performedBy || '')}</strong></div>
    <div class="signature">Firma del cliente<strong>${escapeHtml(survey.clientName)}</strong></div>
  </div>
  <div class="footer">NEDVI Constructora · Documento de levantamiento de obra</div>
  <script>window.onload = () => { setTimeout(() => window.print(), 350) }</script>
</body>
</html>`)
    popup.document.close()
  }

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-[1600px] space-y-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#5496CC]">Comercial y Ventas</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-[var(--foreground)]">Levantamientos</h1>
            <p className="mt-2 max-w-3xl text-sm text-[var(--muted)]">Registra visitas, alcance de obra, tiempos, evidencia, planos y croquis antes de preparar una cotización.</p>
          </div>
          <button type="button" onClick={openNew} className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#5496CC] px-4 text-sm font-semibold text-white transition hover:brightness-95">
            <Plus size={16} /> Nuevo levantamiento
          </button>
        </header>

        <div className="grid gap-4 sm:grid-cols-3">
          <Metric label="Levantamientos" value={surveys.length.toString()} detail="Total registrados" />
          <Metric label="Con archivos" value={surveys.filter((item) => item.attachments.length).length.toString()} detail="Fotos, planos o documentos" />
          <Metric label="Con croquis" value={surveys.filter((item) => item.drawing).length.toString()} detail="Plano dibujado en NEDVI OS" />
        </div>

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm">
          <div className="relative max-w-2xl">
            <Search size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar cliente, ciudad, solicita, realiza o descripción..." className="w-full rounded-xl border border-[var(--border)] bg-transparent py-3 pl-11 pr-4 text-sm text-[var(--foreground)] outline-none focus:border-[#5496CC]" />
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
          {filtered.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <FileText className="mx-auto text-[#5496CC]" size={34} />
              <h2 className="mt-4 text-lg font-bold text-[var(--foreground)]">No hay levantamientos</h2>
              <p className="mt-2 text-sm text-[var(--muted)]">Crea el primer levantamiento para documentar una visita de obra.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1250px] text-left text-sm">
                <thead className="border-b border-[var(--border)] bg-[var(--surface-soft)] text-xs uppercase tracking-wide text-[var(--muted)]">
                  <tr><th className="px-5 py-4">Cliente</th><th className="px-5 py-4">Fecha</th><th className="px-5 py-4">Ciudad / Zona</th><th className="px-5 py-4">Solicita</th><th className="px-5 py-4">Realiza</th><th className="px-5 py-4">Ejecución</th><th className="px-5 py-4">Archivos</th><th className="px-5 py-4">Acciones</th></tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {filtered.map((survey) => (
                    <tr key={survey.id} className="hover:bg-[var(--surface-soft)]">
                      <td className="px-5 py-4 font-semibold text-[var(--foreground)]">{survey.clientName}</td>
                      <td className="px-5 py-4 text-[var(--foreground)]">{formatDate(survey.date)}</td>
                      <td className="px-5 py-4 text-[var(--foreground)]">{survey.location || 'Sin especificar'}</td>
                      <td className="px-5 py-4 text-[var(--foreground)]">{survey.requestedBy || 'Sin especificar'}</td>
                      <td className="px-5 py-4 text-[var(--foreground)]">{survey.performedBy || 'Sin especificar'}</td>
                      <td className="px-5 py-4"><div className="flex flex-wrap gap-1">{survey.executionTimes.length ? survey.executionTimes.map((value) => <span key={value} className="rounded-full bg-[#5496CC]/10 px-2 py-1 text-[10px] font-semibold text-[#5496CC]">{value}</span>) : <span className="text-[var(--muted)]">—</span>}</div></td>
                      <td className="px-5 py-4 text-[var(--foreground)]">{survey.attachments.length}</td>
                      <td className="px-5 py-4"><div className="flex flex-wrap gap-2">
                        <button type="button" onClick={() => setViewing(survey)} className="rounded-lg border border-[var(--border)] p-2 text-[var(--foreground)] hover:border-[#5496CC] hover:text-[#5496CC]" title="Ver levantamiento"><Eye size={15} /></button>
                        <button type="button" onClick={() => openEdit(survey)} className="rounded-lg border border-[var(--border)] p-2 text-[var(--foreground)] hover:border-[#5496CC] hover:text-[#5496CC]" title="Editar levantamiento"><Pencil size={15} /></button>
                        <button type="button" onClick={() => printSurvey(survey)} className="rounded-lg border border-[#5496CC]/30 p-2 text-[#5496CC] hover:bg-[#5496CC]/10" title="PDF"><FileDown size={15} /></button>
                        <button type="button" onClick={() => deleteSurvey(survey)} className="rounded-lg border border-red-500/20 p-2 text-red-500 hover:bg-red-500/10" title="Eliminar"><Trash2 size={15} /></button>
                      </div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="max-h-[94vh] w-full max-w-6xl overflow-y-auto rounded-2xl bg-[var(--surface)] shadow-2xl">
            <div className="sticky top-0 z-20 flex items-start justify-between border-b border-[var(--border)] bg-[var(--surface)] p-5">
              <div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#5496CC]">Comercial y Ventas</p><h2 className="mt-1 text-xl font-bold text-[var(--foreground)]">{editingId ? 'Editar levantamiento' : 'Nuevo levantamiento'}</h2></div>
              <button type="button" onClick={closeForm} className="rounded-lg p-2 text-[var(--muted)] hover:bg-[var(--surface-soft)]"><X size={18} /></button>
            </div>

            <form onSubmit={saveSurvey} className="space-y-6 p-5">
              <section className="rounded-2xl border border-[var(--border)] p-5">
                <h3 className="mb-4 font-bold text-[var(--foreground)]">Datos generales</h3>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  <Field label="Nombre del cliente *">
                    <select required value={form.clientName} onChange={(e) => setForm({ ...form, clientName: e.target.value })} className="survey-input">
                      <option value="">Seleccionar cliente registrado</option>
                      {customerOptions.map((customer) => (
                        <option key={customer.id} value={customer.company}>
                          {customer.company}{customer.folio ? ` — ${customer.folio}` : ''}
                        </option>
                      ))}
                    </select>
                    {customerOptions.length === 0 ? <span className="block text-xs text-amber-500">Primero registra un cliente en Comercial y Ventas → Clientes.</span> : null}
                  </Field>
                  <Field label="Fecha"><input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="survey-input" /></Field>
                  <Field label="Ciudad / Zona"><input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Ej. Tijuana, Ensenada, Tecate..." className="survey-input" /></Field>
                  <Field label="Solicita"><input value={form.requestedBy} onChange={(e) => setForm({ ...form, requestedBy: e.target.value })} placeholder="Quién solicita el levantamiento" className="survey-input" /></Field>
                  <Field label="Realiza"><input value={form.performedBy} onChange={(e) => setForm({ ...form, performedBy: e.target.value })} placeholder="Quién realiza la visita" className="survey-input" /></Field>
                  <Field label="Tiempo estimado *">
                    <div className="grid grid-cols-[minmax(0,1fr)_145px] gap-2">
                      <input required type="number" min="1" step="1" value={form.estimatedTime} onChange={(e) => setForm({ ...form, estimatedTime: e.target.value })} placeholder="Ej. 5" className="survey-input" />
                      <select required value={estimatedTimeUnit} onChange={(e) => setEstimatedTimeUnit(e.target.value as EstimatedTimeUnit)} className="survey-input">
                        {ESTIMATED_TIME_UNITS.map((unit) => <option key={unit}>{unit}</option>)}
                      </select>
                    </div>
                  </Field>
                </div>
              </section>

              <section className="rounded-2xl border border-[var(--border)] p-5">
                <h3 className="font-bold text-[var(--foreground)]">Descripción *</h3>
                <p className="mt-1 text-xs text-[var(--muted)]">Describe con detalle el trabajo, alcance, condiciones existentes, medidas, materiales, restricciones y observaciones de la obra.</p>
                <textarea required rows={9} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Escribe toda la información del levantamiento..." className="survey-input mt-4 resize-y" />
              </section>

              <section className="rounded-2xl border border-[var(--border)] p-5">
                <h3 className="font-bold text-[var(--foreground)]">Tiempo de ejecución</h3>
                <p className="mt-1 text-xs text-[var(--muted)]">Puedes seleccionar una o varias opciones.</p>
                <div className="mt-4 flex flex-wrap gap-3">{EXECUTION_OPTIONS.map((option) => {
                  const active = form.executionTimes.includes(option)
                  return <button key={option} type="button" onClick={() => toggleExecution(option)} className={`rounded-xl border px-4 py-2.5 text-sm font-semibold transition ${active ? 'border-[#5496CC] bg-[#5496CC] text-white' : 'border-[var(--border)] text-[var(--foreground)] hover:border-[#5496CC]/60'}`}>{active ? '✓ ' : ''}{option}</button>
                })}</div>
              </section>

              <section className="rounded-2xl border border-[var(--border)] p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div><h3 className="font-bold text-[var(--foreground)]">Archivos, fotos, planos y datos</h3><p className="mt-1 text-xs text-[var(--muted)]">Adjunta imágenes, PDF, planos CAD o documentos. Máximo {MAX_FILES} archivos.</p></div>
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-[#5496CC]/40 px-4 py-2.5 text-sm font-semibold text-[#5496CC] hover:bg-[#5496CC]/10"><Upload size={15} /> Subir archivos<input type="file" multiple accept="image/*,.pdf,.dwg,.dxf,.doc,.docx,.xls,.xlsx,.csv,.txt" onChange={handleFiles} className="hidden" /></label>
                </div>
                {form.attachments.length ? <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{form.attachments.map((file) => <div key={file.id} className="flex items-center gap-3 rounded-xl border border-[var(--border)] p-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#5496CC]/10 text-[#5496CC]">{file.type.startsWith('image/') ? <ImageIcon size={17} /> : <FileText size={17} />}</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-[var(--foreground)]">{file.name}</p><p className="text-xs text-[var(--muted)]">{fileSize(file.size)}</p></div><button type="button" onClick={() => removeAttachment(file.id)} className="rounded-lg p-2 text-red-500 hover:bg-red-500/10"><Trash2 size={14} /></button></div>)}</div> : <div className="mt-4 rounded-xl border border-dashed border-[var(--border)] p-8 text-center text-sm text-[var(--muted)]">Todavía no hay archivos adjuntos.</div>}
              </section>

              <section className="rounded-2xl border border-[var(--border)] p-5">
                <h3 className="font-bold text-[var(--foreground)]">Croquis / Plano rápido</h3>
                <p className="mt-1 text-xs text-[var(--muted)]">Dibuja directamente con mouse, pluma o pantalla táctil. El croquis se guardará junto con el levantamiento y aparecerá en el PDF.</p>
                <div className="mt-4"><DrawingPad value={form.drawing} onChange={(drawing) => setForm((current) => ({ ...current, drawing }))} /></div>
              </section>

              <div className="flex justify-end gap-3"><button type="button" onClick={closeForm} className="rounded-xl border border-[var(--border)] px-5 py-3 font-semibold text-[var(--foreground)]">Cancelar</button><button type="submit" className="rounded-xl bg-[#5496CC] px-5 py-3 font-semibold text-white">{editingId ? 'Guardar cambios' : 'Guardar levantamiento'}</button></div>
            </form>
          </div>
        </div>
      ) : null}

      {viewing ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="max-h-[94vh] w-full max-w-5xl overflow-y-auto rounded-2xl bg-[var(--surface)] shadow-2xl">
            <div className="sticky top-0 z-10 flex items-start justify-between border-b border-[var(--border)] bg-[var(--surface)] p-5"><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#5496CC]">Levantamiento · {formatDate(viewing.date)}</p><h2 className="mt-1 text-2xl font-bold text-[var(--foreground)]">{viewing.clientName}</h2><p className="mt-1 text-sm text-[var(--muted)]">{viewing.location || 'Sin ciudad / zona'}</p></div><button type="button" onClick={() => setViewing(null)} className="rounded-lg p-2 text-[var(--muted)] hover:bg-[var(--surface-soft)]"><X size={18} /></button></div>
            <div className="space-y-5 p-5">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Info label="Fecha" value={formatDate(viewing.date)} /><Info label="Ciudad / Zona" value={viewing.location || 'Sin especificar'} /><Info label="Solicita" value={viewing.requestedBy || 'Sin especificar'} /><Info label="Realiza" value={viewing.performedBy || 'Sin especificar'} /></div>
              <section className="rounded-2xl border border-[var(--border)] p-5"><p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Descripción</p><p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[var(--foreground)]">{viewing.description}</p></section>
              <div className="grid gap-4 md:grid-cols-2"><section className="rounded-2xl border border-[var(--border)] p-5"><p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Tiempo de ejecución</p><div className="mt-3 flex flex-wrap gap-2">{viewing.executionTimes.length ? viewing.executionTimes.map((value) => <span key={value} className="rounded-full bg-[#5496CC]/10 px-3 py-1.5 text-xs font-semibold text-[#5496CC]">{value}</span>) : <span className="text-sm text-[var(--muted)]">Sin opciones</span>}</div></section><Info label="Tiempo estimado" value={viewing.estimatedTime || 'Sin especificar'} large /></div>
              {viewing.drawing ? <section className="rounded-2xl border border-[var(--border)] p-5"><p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Croquis / Plano</p><img src={viewing.drawing} alt="Croquis del levantamiento" className="mt-4 max-h-[480px] w-full rounded-xl border border-[var(--border)] bg-white object-contain" /></section> : null}
              <section className="rounded-2xl border border-[var(--border)] p-5"><p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Archivos adjuntos</p>{viewing.attachments.length ? <div className="mt-4 grid gap-3 sm:grid-cols-2">{viewing.attachments.map((file) => <div key={file.id} className="flex items-center gap-3 rounded-xl bg-[var(--surface-soft)] p-3"><span className="text-[#5496CC]">{file.type.startsWith('image/') ? <ImageIcon size={18} /> : <FileText size={18} />}</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{file.name}</p><p className="text-xs text-[var(--muted)]">{fileSize(file.size)}</p></div><button type="button" onClick={() => downloadAttachment(file)} className="rounded-lg p-2 text-[#5496CC] hover:bg-[#5496CC]/10"><Download size={15} /></button></div>)}</div> : <p className="mt-3 text-sm text-[var(--muted)]">Sin archivos adjuntos.</p>}</section>
              <div className="flex flex-wrap justify-end gap-3"><button type="button" onClick={() => { setViewing(null); openEdit(viewing) }} className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] px-5 py-3 font-semibold text-[var(--foreground)]"><Pencil size={15} /> Editar</button><button type="button" onClick={() => printSurvey(viewing)} className="inline-flex items-center gap-2 rounded-xl bg-[#5496CC] px-5 py-3 font-semibold text-white"><FileDown size={16} /> PDF</button></div>
            </div>
          </div>
        </div>
      ) : null}

      <style jsx global>{`.survey-input{width:100%;border:1px solid var(--border);border-radius:.75rem;background:transparent;padding:.75rem 1rem;color:var(--foreground);outline:none}.survey-input:focus{border-color:#5496CC}`}</style>
    </AppShell>
  )
}

function DrawingPad({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const drawingRef = useRef(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const context = canvas.getContext('2d')
    if (!context) return

    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, canvas.width, canvas.height)
    if (!value) return

    const image = new Image()
    image.onload = () => {
      context.fillStyle = '#ffffff'
      context.fillRect(0, 0, canvas.width, canvas.height)
      context.drawImage(image, 0, 0, canvas.width, canvas.height)
    }
    image.src = value
  }, [value])

  function point(event: ReactPointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    return {
      x: ((event.clientX - rect.left) / rect.width) * canvas.width,
      y: ((event.clientY - rect.top) / rect.height) * canvas.height,
    }
  }

  function start(event: ReactPointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.setPointerCapture(event.pointerId)
    const context = canvas.getContext('2d')
    if (!context) return
    const current = point(event)
    context.beginPath()
    context.moveTo(current.x, current.y)
    context.strokeStyle = '#172033'
    context.lineWidth = 3
    context.lineCap = 'round'
    context.lineJoin = 'round'
    drawingRef.current = true
  }

  function move(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return
    const canvas = canvasRef.current
    if (!canvas) return
    const context = canvas.getContext('2d')
    if (!context) return
    const current = point(event)
    context.lineTo(current.x, current.y)
    context.stroke()
  }

  function finish(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return
    drawingRef.current = false
    const canvas = canvasRef.current
    if (!canvas) return
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId)
    onChange(canvas.toDataURL('image/png'))
  }

  function clear() {
    const canvas = canvasRef.current
    if (!canvas) return
    const context = canvas.getContext('2d')
    if (!context) return
    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, canvas.width, canvas.height)
    onChange('')
  }

  return (
    <div>
      <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-white">
        <canvas ref={canvasRef} width={1100} height={480} onPointerDown={start} onPointerMove={move} onPointerUp={finish} onPointerCancel={finish} className="block h-[360px] w-full touch-none cursor-crosshair sm:h-[420px]" />
      </div>
      <div className="mt-3 flex justify-end"><button type="button" onClick={clear} className="rounded-lg border border-[var(--border)] px-3 py-2 text-xs font-semibold text-[var(--foreground)] hover:border-red-400 hover:text-red-500">Limpiar croquis</button></div>
    </div>
  )
}

function Metric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm"><p className="text-2xl font-bold text-[var(--foreground)]">{value}</p><p className="mt-1 text-sm font-semibold text-[var(--foreground)]">{label}</p><p className="mt-1 text-xs text-[var(--muted)]">{detail}</p></div>
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="space-y-2"><span className="text-sm font-semibold text-[var(--foreground)]">{label}</span>{children}</label>
}

function Info({ label, value, large = false }: { label: string; value: string; large?: boolean }) {
  return <div className={`rounded-2xl border border-[var(--border)] p-4 ${large ? '' : 'bg-[var(--surface)]'}`}><p className="text-xs uppercase text-[var(--muted)]">{label}</p><p className={`${large ? 'mt-2 text-xl' : 'mt-1 text-sm'} font-bold text-[var(--foreground)]`}>{value}</p></div>
}
