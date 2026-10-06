'use client'
import { createProjectInSupabase } from '@/features/projects/services/projectSupabaseService'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { getCustomersFromSupabase } from '@/features/crm/services/customerSupabase'
import type { Customer } from '@/features/crm/types/customer'

type QuoteStatus = 'Borrador' | 'Enviada' | 'Aprobada' | 'Rechazada' | 'Vencida'
type QuoteCurrency = 'MXN' | 'USD'
type UnitMeasure =
  | 'Kilómetros'
  | 'Metros Cuadrados'
  | 'Metros Cúbicos'
  | 'Metros Lineales'
  | 'Piezas'
  | 'Litros'
  | 'Otros'

type QuoteItem = {
  id: string
  description: string
  unit: UnitMeasure
  quantity: number | ''
  unitPrice: number | ''
}

type QuoteCustomerInfo = {
  folio: string
  contact: string
  phone: string
  email: string
  address: string
  rfc: string
}

type Quote = {
  id: string
  folio: string
  customerId: string
  client: string
  customerInfo?: QuoteCustomerInfo
  project: string
  createdAt: string
  validUntil: string
  items?: QuoteItem[]
  concepts: QuoteItem[]
  currency: QuoteCurrency
  taxRate: number
  subtotal: number
  tax: number
  total: number
  status: QuoteStatus
  owner: string
  notes: string
  convertedToProject?: boolean
}

const STORAGE_KEY = 'nedvi_quotes'
const SEQUENCE_KEY = 'nedvi_quotes_sequence'
const PROJECT_INTAKE_KEY = 'nedvi_projects_from_quotes'

const monthOptions = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

const unitOptions: UnitMeasure[] = [
  'Kilómetros',
  'Metros Cuadrados',
  'Metros Cúbicos',
  'Metros Lineales',
  'Piezas',
  'Litros',
  'Otros',
]

const emptyItem = (): QuoteItem => ({
  id: crypto.randomUUID(),
  description: '',
  unit: 'Piezas',
  quantity: '',
  unitPrice: '',
})

function normalizeItem(item: QuoteItem): QuoteItem {
  return {
    ...item,
    unit: unitOptions.includes(item.unit as UnitMeasure) ? item.unit : 'Piezas',
    quantity: item.quantity ?? '',
    unitPrice: item.unitPrice ?? '',
  }
}

function customerSnapshot(customer?: Customer): QuoteCustomerInfo | undefined {
  if (!customer) return undefined

  return {
    folio: customer.folio ?? '',
    contact: customer.contact,
    phone: customer.phone,
    email: customer.email,
    address: customer.address,
    rfc: customer.rfc,
  }
}

function money(value: number, currency: QuoteCurrency = 'MXN') {
  const amount = new Intl.NumberFormat('es-MX', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
  return `${currency} $${amount}`
}

function nextFolio() {
  const year = new Date().getFullYear()
  const raw = localStorage.getItem(SEQUENCE_KEY)
  let sequence = 1

  if (raw) {
    try {
      const saved = JSON.parse(raw) as { year: number; sequence: number }
      sequence = saved.year === year ? saved.sequence + 1 : 1
    } catch {
      sequence = 1
    }
  }

  localStorage.setItem(SEQUENCE_KEY, JSON.stringify({ year, sequence }))
  return `NV-${year}-${String(sequence).padStart(4, '0')}`
}

function quoteTotals(concepts: QuoteItem[], taxRate: number) {
  const subtotal = concepts.reduce(
    (sum, item) => sum + Number(item.quantity || 0) * Number(item.unitPrice || 0),
    0,
  )
  const tax = subtotal * (taxRate / 100)
  return { subtotal, tax, total: subtotal + tax }
}

function statusClass(status: QuoteStatus) {
  const classes: Record<QuoteStatus, string> = {
    Borrador: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200',
    Enviada: 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300',
    Aprobada: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300',
    Rechazada: 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300',
    Vencida: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300',
  }
  return classes[status]
}

function splitDate(value: string) {
  if (!value) return { year: '', month: '', day: '' }
  const [year = '', month = '', day = ''] = value.split('-')
  return { year, month, day }
}

function daysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate()
}

function isValidQuoteItem(item: QuoteItem) {
  return (
    item.description.trim() &&
    item.quantity !== '' &&
    Number(item.quantity) > 0 &&
    item.unitPrice !== '' &&
    Number(item.unitPrice) >= 0
  )
}

function normalizeSavedItems(items: QuoteItem[]) {
  return items.filter(isValidQuoteItem).map((item) => ({
    ...item,
    quantity: Number(item.quantity),
    unitPrice: Number(item.unitPrice),
  }))
}

export default function QuotesPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [quotesLoaded, setQuotesLoaded] = useState(false)
  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'Todas' | QuoteStatus>('Todas')
  const [clientName, setClientName] = useState('')
  const [selectedCustomerInfo, setSelectedCustomerInfo] = useState<QuoteCustomerInfo | undefined>()
  const [project, setProject] = useState('')
  const [validUntil, setValidUntil] = useState('')
  const [taxRate, setTaxRate] = useState('16')
  const [quoteCurrency, setQuoteCurrency] = useState<QuoteCurrency>('MXN')
  const [owner, setOwner] = useState('')
  const [notes, setNotes] = useState('')
  const [status, setStatus] = useState<QuoteStatus>('Borrador')
  const [concepts, setConcepts] = useState<QuoteItem[]>([emptyItem()])
  const [printQuote, setPrintQuote] = useState<Quote | null>(null)

  useEffect(() => {
    let active = true

    async function refreshCustomers() {
      try {
        const nextCustomers = await getCustomersFromSupabase()
        if (active) setCustomers(nextCustomers)
      } catch (error) {
        console.error('Error al cargar clientes para cotizaciones:', error)
        if (active) setCustomers([])
      }
    }

    void refreshCustomers()
    const handleFocus = () => void refreshCustomers()
    window.addEventListener('focus', handleFocus)

    return () => {
      active = false
      window.removeEventListener('focus', handleFocus)
    }
  }, [])

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY)

    if (!raw) {
      setQuotesLoaded(true)
      return
    }

    try {
      const parsed = JSON.parse(raw) as Quote[]
      if (Array.isArray(parsed)) {
        const normalized: Quote[] = parsed.map((quote): Quote => {
          const legacyItems = Array.isArray(quote.items) ? quote.items.map(normalizeItem) : []
          const savedConcepts = Array.isArray(quote.concepts) ? quote.concepts.map(normalizeItem) : []
          const mergedConcepts = [...legacyItems, ...savedConcepts]
          const safeTaxRate =
            typeof quote.taxRate === 'number'
              ? quote.taxRate
              : quote.subtotal > 0
                ? Number(((quote.tax / quote.subtotal) * 100).toFixed(2))
                : 16
          const recalculated = quoteTotals(mergedConcepts, safeTaxRate)

          return {
            ...quote,
            customerId: quote.customerId ?? '',
            customerInfo: quote.customerInfo,
            currency: (quote.currency === 'USD' ? 'USD' : 'MXN') as QuoteCurrency,
            items: [],
            concepts: mergedConcepts,
            taxRate: safeTaxRate,
            ...recalculated,
            notes: quote.notes ?? '',
            owner: quote.owner ?? '',
          }
        })
        setQuotes(normalized)
      }
    } catch {
      console.warn('No se pudieron leer las cotizaciones guardadas.')
    } finally {
      setQuotesLoaded(true)
    }
  }, [])

  useEffect(() => {
    if (!quotesLoaded) return
    localStorage.setItem(STORAGE_KEY, JSON.stringify(quotes))
  }, [quotes, quotesLoaded])

  const totals = useMemo(
    () => quoteTotals(concepts, Number(taxRate || 0)),
    [concepts, taxRate],
  )

  const filtered = useMemo(() => {
    const value = search.trim().toLowerCase()
    return quotes.filter((quote) => {
      const matchesText = [quote.folio, quote.client, quote.project, quote.owner]
        .join(' ')
        .toLowerCase()
        .includes(value)
      const matchesStatus = statusFilter === 'Todas' || quote.status === statusFilter
      return matchesText && matchesStatus
    })
  }, [quotes, search, statusFilter])

  const selectedDate = splitDate(validUntil)
  const currentYear = new Date().getFullYear()
  const yearOptions = Array.from({ length: 16 }, (_, index) => currentYear + index)
  const maxDays =
    selectedDate.month && selectedDate.year
      ? daysInMonth(Number(selectedDate.year), Number(selectedDate.month))
      : 31
  const dayOptions = Array.from({ length: maxDays }, (_, index) => index + 1)

  function updateValidUntil(part: 'day' | 'month' | 'year', value: string) {
    const current = splitDate(validUntil)
    const next = { ...current, [part]: value }

    if (part === 'month' || part === 'year') {
      const targetYear = Number(next.year || currentYear)
      const targetMonth = Number(next.month || 1)
      const maximum = daysInMonth(targetYear, targetMonth)
      if (Number(next.day) > maximum) next.day = String(maximum).padStart(2, '0')
    }

    if (next.year && next.month && next.day) {
      setValidUntil(`${next.year}-${next.month.padStart(2, '0')}-${next.day.padStart(2, '0')}`)
      return
    }

    setValidUntil([next.year, next.month, next.day].join('-'))
  }

  function handleClientChange(value: string) {
    setClientName(value)
    const matchedCustomer = customers.find((customer) => customer.company === value)

    if (!matchedCustomer) {
      setSelectedCustomerInfo(undefined)
      return
    }

    setSelectedCustomerInfo(customerSnapshot(matchedCustomer))
    if (matchedCustomer.assignedSalesperson) {
      setOwner(matchedCustomer.assignedSalesperson)
    }
  }

  function resetForm() {
    setClientName('')
    setSelectedCustomerInfo(undefined)
    setProject('')
    setValidUntil('')
    setTaxRate('16')
    setQuoteCurrency('MXN')
    setOwner('')
    setNotes('')
    setStatus('Borrador')
    setConcepts([emptyItem()])
    setEditingId(null)
  }

  function closeForm() {
    setOpen(false)
    resetForm()
  }

  function openNew() {
    resetForm()
    setOpen(true)
  }

  function openEdit(quote: Quote) {
    const matchedCustomer = customers.find(
      (customer) => customer.id === quote.customerId || customer.company === quote.client,
    )

    setEditingId(quote.id)
    setClientName(quote.client)
    setSelectedCustomerInfo(quote.customerInfo ?? customerSnapshot(matchedCustomer))
    setProject(quote.project)
    setValidUntil(quote.validUntil)
    setTaxRate(String(quote.taxRate))
    setQuoteCurrency(quote.currency === 'USD' ? 'USD' : 'MXN')
    setOwner(quote.owner)
    setNotes(quote.notes)
    setStatus(quote.status)
    setConcepts(quote.concepts?.length ? quote.concepts.map(normalizeItem) : [emptyItem()])
    setOpen(true)
  }

  function updateConcept(id: string, field: keyof QuoteItem, value: string) {
    setConcepts((current) =>
      current.map((item) => {
        if (item.id !== id) return item
        if (field === 'description') return { ...item, description: value }
        if (field === 'unit') return { ...item, unit: value as UnitMeasure }

        const numericValue: number | '' = value === '' ? '' : Number(value)
        if (field === 'quantity') return { ...item, quantity: numericValue }
        return { ...item, unitPrice: numericValue }
      }),
    )
  }

  function addConcept() {
    setConcepts((current) => [...current, emptyItem()])
  }

  function removeConcept(id: string) {
    setConcepts((current) =>
      current.length === 1 ? current : current.filter((item) => item.id !== id),
    )
  }

  function saveQuote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const cleanClientName = clientName.trim()
    const matchedCustomer = customers.find((customer) => customer.company === cleanClientName)

    if (!matchedCustomer) {
      alert('Selecciona un cliente registrado.')
      return
    }

    if (!project.trim()) {
      alert('El proyecto o servicio es obligatorio.')
      return
    }

    if (validUntil && validUntil.split('-').some((part) => !part)) {
      alert('Selecciona día, mes y año para la vigencia.')
      return
    }

    const normalizedConcepts = normalizeSavedItems(concepts)

    if (normalizedConcepts.length === 0) {
      alert('Agrega al menos un concepto válido a la cotización.')
      return
    }

    const savedCustomerInfo = customerSnapshot(matchedCustomer)
    const calculated = quoteTotals(normalizedConcepts, Number(taxRate || 0))

    if (editingId) {
      setQuotes((current) =>
        current.map((quote) =>
          quote.id === editingId
            ? {
                ...quote,
                customerId: matchedCustomer.id,
                client: matchedCustomer.company,
                customerInfo: savedCustomerInfo,
                project: project.trim(),
                validUntil,
                items: [],
                concepts: normalizedConcepts,
                currency: quoteCurrency,
                taxRate: Number(taxRate || 0),
                ...calculated,
                status,
                owner: owner.trim(),
                notes: notes.trim(),
              }
            : quote,
        ),
      )
    } else {
      const quote: Quote = {
        id: crypto.randomUUID(),
        folio: nextFolio(),
        customerId: matchedCustomer.id,
        client: matchedCustomer.company,
        customerInfo: savedCustomerInfo,
        project: project.trim(),
        createdAt: new Date().toISOString().slice(0, 10),
        validUntil,
        items: [],
        concepts: normalizedConcepts,
        currency: quoteCurrency,
        taxRate: Number(taxRate || 0),
        ...calculated,
        status,
        owner: owner.trim(),
        notes: notes.trim(),
      }

      setQuotes((current) => [quote, ...current])
    }

    closeForm()
  }

  function duplicateQuote(quote: Quote) {
    const duplicated: Quote = {
      ...quote,
      id: crypto.randomUUID(),
      folio: nextFolio(),
      createdAt: new Date().toISOString().slice(0, 10),
      status: 'Borrador',
      convertedToProject: false,
      items: [],
      concepts: (quote.concepts ?? []).map((item) => ({ ...item, id: crypto.randomUUID() })),
    }
    setQuotes((current) => [duplicated, ...current])
  }

  function deleteQuote(quote: Quote) {
    if (!window.confirm(`¿Eliminar la cotización ${quote.folio}?`)) return
    setQuotes((current) => current.filter((item) => item.id !== quote.id))
  }

  function changeStatus(id: string, nextStatus: QuoteStatus) {
    setQuotes((current) =>
      current.map((quote) =>
        quote.id === id ? { ...quote, status: nextStatus } : quote,
      ),
    )
  }

  async function convertToProject(quote: Quote) {
    if (quote.status !== 'Aprobada') {
      alert('Primero cambia la cotización a estado Aprobada.')
      return
    }

    try {
      const project = await createProjectInSupabase({
        name: quote.project,
        clientId: quote.customerId,
        client: quote.client,
        clientContact: quote.customerInfo?.contact ?? '',
        projectType: 'Commercial',
        address: quote.customerInfo?.address ?? '',
        latitude: 0,
        longitude: 0,
        budget: quote.total,
        startDate: '',
        estimatedCompletion: '',
        manager: quote.owner ?? '',
        status: 'Planning',
        description: `Proyecto creado desde la cotización ${quote.folio}.`,
      })

      setQuotes((current) =>
        current.map((item) =>
          item.id === quote.id ? { ...item, convertedToProject: true } : item,
        ),
      )

      alert(`Proyecto ${project.folio ?? project.name} creado en Supabase desde ${quote.folio}.`)
    } catch (error) {
      console.error('Error al crear proyecto desde cotización:', error)
      alert(
        error instanceof Error
          ? `No se pudo crear el proyecto: ${error.message}`
          : 'No se pudo crear el proyecto en Supabase.',
      )
    }
  }

  function printPdf(quote: Quote) {
    setPrintQuote(quote)
    window.setTimeout(() => window.print(), 50)
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-6 print:hidden">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm text-slate-500 dark:text-slate-400">Comercial y Ventas</p>
            <h1 className="text-3xl font-bold tracking-tight">Cotizaciones</h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">El folio NV-AÑO-#### identifica el expediente durante todo el proceso.</p>
          </div>
          <button onClick={openNew} className="rounded-xl bg-[#7BAEE3] px-5 py-3 font-semibold text-slate-950 transition hover:brightness-95">+ Nueva cotización</button>
        </div>

        <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 md:grid-cols-[1fr_220px]">
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por folio, cliente, proyecto o responsable..." className="w-full rounded-xl border border-slate-200 bg-transparent px-4 py-3 outline-none focus:border-[#7BAEE3] dark:border-slate-700" />
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as 'Todas' | QuoteStatus)} className="rounded-xl border border-slate-200 bg-transparent px-4 py-3 outline-none focus:border-[#7BAEE3] dark:border-slate-700">
            <option>Todas</option><option>Borrador</option><option>Enviada</option><option>Aprobada</option><option>Rechazada</option><option>Vencida</option>
          </select>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-100 text-left text-xs uppercase text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                <tr><th className="px-4 py-3">Folio</th><th className="px-4 py-3">Cliente</th><th className="px-4 py-3">Proyecto</th><th className="px-4 py-3">Total</th><th className="px-4 py-3">Estado</th><th className="px-4 py-3">Acciones</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filtered.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-12 text-center text-slate-500">Todavía no hay cotizaciones.</td></tr>
                ) : filtered.map((quote) => (
                  <tr key={quote.id} className="align-top hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="px-4 py-4 font-semibold text-[#5B93C9]">{quote.folio}</td>
                    <td className="px-4 py-4"><div>{quote.client}</div>{quote.customerInfo?.contact ? <div className="mt-1 text-xs text-slate-500">{quote.customerInfo.contact}</div> : null}</td>
                    <td className="px-4 py-4"><div className="font-medium">{quote.project}</div><div className="mt-1 text-xs text-slate-500">{quote.owner || 'Sin responsable'}</div></td>
                    <td className="px-4 py-4 font-semibold">{money(quote.total, quote.currency)}</td>
                    <td className="px-4 py-4">
                      <select value={quote.status} onChange={(event) => changeStatus(quote.id, event.target.value as QuoteStatus)} className={`rounded-full border-0 px-3 py-1.5 text-xs font-semibold outline-none ${statusClass(quote.status)}`}>
                        <option>Borrador</option><option>Enviada</option><option>Aprobada</option><option>Rechazada</option><option>Vencida</option>
                      </select>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex max-w-[360px] flex-wrap gap-2">
                        <button onClick={() => openEdit(quote)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold dark:border-slate-700">Editar</button>
                        <button onClick={() => duplicateQuote(quote)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold dark:border-slate-700">Duplicar</button>
                        <button onClick={() => printPdf(quote)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold dark:border-slate-700">PDF</button>
                        <button onClick={() => convertToProject(quote)} disabled={quote.convertedToProject} className="rounded-lg border border-emerald-200 px-3 py-1.5 text-xs font-semibold text-emerald-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-emerald-900 dark:text-emerald-300">{quote.convertedToProject ? 'Proyecto creado' : 'Crear proyecto'}</button>
                        <button onClick={() => deleteQuote(quote)} className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 dark:border-red-900 dark:text-red-400">Eliminar</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {open && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900">
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold">{editingId ? 'Editar cotización' : 'Nueva cotización'}</h2>
                  <p className="mt-1 text-xs text-slate-500">{editingId ? 'El folio existente se conserva.' : 'El folio se asignará automáticamente al guardar.'}</p>
                </div>
                <button onClick={closeForm} className="text-sm text-slate-500">Cerrar</button>
              </div>

              <form onSubmit={saveQuote} className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="space-y-2">
                    <span className="text-sm font-semibold">Cliente *</span>
                    <select value={clientName} onChange={(event) => handleClientChange(event.target.value)} required className="w-full rounded-xl border border-slate-200 bg-transparent px-4 py-3 outline-none focus:border-[#7BAEE3] dark:border-slate-700">
                      <option value="">Seleccionar cliente</option>
                      {customers.map((customer) => <option key={customer.id} value={customer.company}>{customer.company} — {customer.contact}</option>)}
                    </select>
                    <p className="text-[11px] text-slate-500">Solo aparecen clientes registrados en el apartado Clientes.</p>
                  </label>

                  <label className="space-y-2"><span className="text-sm font-semibold">Proyecto / servicio *</span><input value={project} onChange={(e) => setProject(e.target.value)} placeholder="Ej. Remodelación de oficinas" className="w-full rounded-xl border border-slate-200 bg-transparent px-4 py-3 dark:border-slate-700" /></label>

                  <div className="space-y-2">
                    <span className="text-sm font-semibold">Vigencia</span>
                    <div className="grid grid-cols-[0.8fr_1.45fr_1fr] gap-2">
                      <select aria-label="Día de vigencia" value={selectedDate.day ? String(Number(selectedDate.day)) : ''} onChange={(event) => updateValidUntil('day', event.target.value)} className="w-full rounded-xl border border-slate-200 bg-transparent px-3 py-3 dark:border-slate-700"><option value="">Día</option>{dayOptions.map((day) => <option key={day} value={day}>{day}</option>)}</select>
                      <select aria-label="Mes de vigencia" value={selectedDate.month ? String(Number(selectedDate.month)) : ''} onChange={(event) => updateValidUntil('month', event.target.value)} className="w-full rounded-xl border border-slate-200 bg-transparent px-3 py-3 dark:border-slate-700"><option value="">Mes</option>{monthOptions.map((month, index) => <option key={month} value={index + 1}>{month}</option>)}</select>
                      <select aria-label="Año de vigencia" value={selectedDate.year} onChange={(event) => updateValidUntil('year', event.target.value)} className="w-full rounded-xl border border-slate-200 bg-transparent px-3 py-3 dark:border-slate-700"><option value="">Año</option>{yearOptions.map((year) => <option key={year} value={year}>{year}</option>)}</select>
                    </div>
                  </div>

                  <label className="space-y-2"><span className="text-sm font-semibold">Responsable</span><input value={owner} onChange={(e) => setOwner(e.target.value)} placeholder="Responsable comercial" className="w-full rounded-xl border border-slate-200 bg-transparent px-4 py-3 dark:border-slate-700" /></label>
                  <label className="space-y-2"><span className="text-sm font-semibold">Estado</span><select value={status} onChange={(e) => setStatus(e.target.value as QuoteStatus)} className="w-full rounded-xl border border-slate-200 bg-transparent px-4 py-3 dark:border-slate-700"><option>Borrador</option><option>Enviada</option><option>Aprobada</option><option>Rechazada</option><option>Vencida</option></select></label>
                  <label className="space-y-2"><span className="text-sm font-semibold">IVA (%)</span><input type="number" min="0" step="0.01" value={taxRate} onChange={(e) => setTaxRate(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-transparent px-4 py-3 dark:border-slate-700" /></label>
                  <label className="space-y-2"><span className="text-sm font-semibold">Moneda</span><select value={quoteCurrency} onChange={(e) => setQuoteCurrency(e.target.value as QuoteCurrency)} className="w-full rounded-xl border border-slate-200 bg-transparent px-4 py-3 dark:border-slate-700"><option value="MXN">Pesos mexicanos (MXN)</option><option value="USD">Dólares estadounidenses (USD)</option></select></label>
                </div>

                {selectedCustomerInfo ? (
                  <section className="rounded-2xl border border-[#5496CC]/30 bg-[#5496CC]/[0.07] p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div><h3 className="text-sm font-semibold">Datos del cliente</h3><p className="text-xs text-slate-500">Información tomada automáticamente del apartado Clientes.</p></div>
                      {selectedCustomerInfo.folio ? <span className="rounded-full bg-[#5496CC]/15 px-3 py-1 text-xs font-semibold text-[#5496CC]">{selectedCustomerInfo.folio}</span> : null}
                    </div>
                    <div className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
                      <div><p className="text-xs text-slate-500">Contacto</p><p className="font-medium">{selectedCustomerInfo.contact || 'Sin registrar'}</p></div>
                      <div><p className="text-xs text-slate-500">Teléfono</p><p className="font-medium">{selectedCustomerInfo.phone || 'Sin registrar'}</p></div>
                      <div><p className="text-xs text-slate-500">Correo</p><p className="font-medium">{selectedCustomerInfo.email || 'Sin registrar'}</p></div>
                      <div><p className="text-xs text-slate-500">RFC</p><p className="font-medium">{selectedCustomerInfo.rfc || 'Sin registrar'}</p></div>
                      <div className="sm:col-span-2"><p className="text-xs text-slate-500">Dirección</p><p className="font-medium">{selectedCustomerInfo.address || 'Sin registrar'}</p></div>
                    </div>
                  </section>
                ) : null}

                <section>
                  <div className="mb-3 flex items-center justify-between">
                    <div><h3 className="font-semibold">Conceptos</h3><p className="text-xs text-slate-500">El subtotal se calcula automáticamente.</p></div>
                    <button type="button" onClick={addConcept} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold dark:border-slate-700">+ Agregar conceptos</button>
                  </div>
                  <div className="space-y-3">
                    <div className="hidden gap-2 px-3 text-xs font-semibold text-slate-500 md:grid md:grid-cols-[minmax(220px,1fr)_150px_100px_160px_auto] dark:text-slate-400">
                      <span>Concepto</span><span>UM</span><span>Cantidad</span><span>Precio por unidad ({quoteCurrency})</span><span aria-hidden="true" />
                    </div>
                    {concepts.map((concept, index) => (
                      <div key={concept.id} className="grid gap-2 rounded-xl border border-slate-200 p-3 dark:border-slate-700 md:grid-cols-[minmax(220px,1fr)_150px_100px_160px_auto]">
                        <input value={concept.description} onChange={(e) => updateConcept(concept.id, 'description', e.target.value)} placeholder={`Concepto ${index + 1}`} className="rounded-lg border border-slate-200 bg-transparent px-3 py-2 dark:border-slate-700" />
                        <select aria-label="Unidad de medida del concepto" value={concept.unit} onChange={(e) => updateConcept(concept.id, 'unit', e.target.value)} className="rounded-lg border border-slate-200 bg-transparent px-3 py-2 dark:border-slate-700">{unitOptions.map((unit) => <option key={unit} value={unit}>{unit}</option>)}</select>
                        <input type="number" min="0.01" step="0.01" value={concept.quantity} onChange={(e) => updateConcept(concept.id, 'quantity', e.target.value)} placeholder="Cantidad" className="rounded-lg border border-slate-200 bg-transparent px-3 py-2 dark:border-slate-700" />
                        <input type="number" min="0" step="0.01" value={concept.unitPrice} onChange={(e) => updateConcept(concept.id, 'unitPrice', e.target.value)} placeholder={`Precio ${quoteCurrency}`} className="rounded-lg border border-slate-200 bg-transparent px-3 py-2 dark:border-slate-700" />
                        <button type="button" onClick={() => removeConcept(concept.id)} disabled={concepts.length === 1} className="rounded-lg px-3 py-2 text-sm text-red-500 disabled:opacity-30">Quitar</button>
                      </div>
                    ))}
                  </div>
                </section>

                <label className="block space-y-2"><span className="text-sm font-semibold">Notas / condiciones</span><textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Condiciones de pago, alcance, vigencia, exclusiones..." className="w-full rounded-xl border border-slate-200 bg-transparent px-4 py-3 dark:border-slate-700" /></label>

                <div className="grid gap-3 rounded-2xl bg-slate-50 p-4 dark:bg-slate-950 md:grid-cols-3">
                  <div><p className="text-xs uppercase text-slate-500">Subtotal</p><p className="mt-1 text-lg font-bold">{money(totals.subtotal, quoteCurrency)}</p></div>
                  <div><p className="text-xs uppercase text-slate-500">IVA</p><p className="mt-1 text-lg font-bold">{money(totals.tax, quoteCurrency)}</p></div>
                  <div><p className="text-xs uppercase text-slate-500">Total</p><p className="mt-1 text-lg font-bold text-[#5B93C9]">{money(totals.total, quoteCurrency)}</p></div>
                </div>

                <div className="flex justify-end gap-3">
                  <button type="button" onClick={closeForm} className="rounded-xl border border-slate-200 px-5 py-3 font-semibold dark:border-slate-700">Cancelar</button>
                  <button type="submit" className="rounded-xl bg-[#7BAEE3] px-5 py-3 font-semibold text-slate-950">{editingId ? 'Guardar cambios' : 'Crear cotización'}</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>

      {printQuote && (
        <>
          <style>{`
            @media print {
              html, body { background: #ffffff !important; color: #000000 !important; }
              body * { visibility: hidden !important; }
              #quote-print, #quote-print * { visibility: visible !important; }
              #quote-print {
                display: block !important;
                position: absolute !important;
                inset: 0 !important;
                width: 100% !important;
                min-height: 100vh !important;
                margin: 0 !important;
                background: #ffffff !important;
                color: #000000 !important;
              }
            }
          `}</style>
          <section id="quote-print" className="hidden min-h-screen w-full bg-white text-black print:block">
            <div className="mx-auto max-w-4xl bg-white px-10 py-8">
              <div className="mb-6 flex items-center justify-between border-b border-slate-300 pb-5">
                <div className="flex items-center gap-4">
                  <img src="/icon.png" alt="NEDVI Constructora" className="h-20 w-20 object-contain" />
                  <div><h1 className="text-3xl font-bold tracking-tight">NEDVI CONSTRUCTORA</h1><p className="mt-1 text-sm text-slate-600">Cotización comercial</p></div>
                </div>
                <div className="text-right"><p className="text-xl font-bold">{printQuote.folio}</p><p className="mt-1 text-sm">Fecha: {printQuote.createdAt}</p>{printQuote.validUntil ? <p className="text-sm">Vigencia: {printQuote.validUntil}</p> : null}</div>
              </div>

              <div className="mb-6 rounded-xl border border-slate-200 p-4">
                <p className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-500">Datos de la empresa</p>
                <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
                  <div><span className="font-semibold">RFC:</span> NED260326S59</div>
                  <div><span className="font-semibold">Denominación/Razón Social:</span> NEDVI</div>
                  <div className="col-span-2"><span className="font-semibold">Victor Muciño:</span> victorm@nedviconstructora.com</div>
                  <div className="col-span-2"><span className="font-semibold">Nestor Ortiz:</span> Nestor.ortiz@nedviconstrucciones.com</div>
                </div>
              </div>

              <div className="mb-5 grid grid-cols-3 gap-6 border-b border-slate-200 pb-5">
                <div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Cliente</p><p className="mt-1 font-semibold">{printQuote.client}</p></div>
                <div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Proyecto / servicio</p><p className="mt-1 font-semibold">{printQuote.project}</p></div>
                <div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Responsable</p><p className="mt-1 font-semibold">{printQuote.owner || 'Sin responsable'}</p></div>
              </div>

              {printQuote.customerInfo ? (
                <div className="mb-7 grid grid-cols-3 gap-x-6 gap-y-3 border-b border-slate-200 pb-5 text-sm">
                  <div><p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Contacto</p><p className="mt-1">{printQuote.customerInfo.contact || 'Sin registrar'}</p></div>
                  <div><p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Teléfono</p><p className="mt-1">{printQuote.customerInfo.phone || 'Sin registrar'}</p></div>
                  <div><p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Correo</p><p className="mt-1">{printQuote.customerInfo.email || 'Sin registrar'}</p></div>
                  <div><p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">RFC</p><p className="mt-1">{printQuote.customerInfo.rfc || 'Sin registrar'}</p></div>
                  <div className="col-span-2"><p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Dirección</p><p className="mt-1">{printQuote.customerInfo.address || 'Sin registrar'}</p></div>
                </div>
              ) : null}

              {(printQuote.concepts ?? []).length > 0 ? (
                <div>
                  <h2 className="mb-2 text-sm font-bold uppercase tracking-wide">Conceptos</h2>
                  <table className="w-full border-collapse bg-white text-sm">
                    <thead><tr className="border-b-2 border-slate-400 bg-white"><th className="py-3 text-left">Concepto</th><th className="py-3 text-center">UM</th><th className="py-3 text-right">Cantidad</th><th className="py-3 text-right">Precio por unidad ({printQuote.currency})</th><th className="py-3 text-right">Importe</th></tr></thead>
                    <tbody>{(printQuote.concepts ?? []).map((concept) => <tr key={concept.id} className="border-b border-slate-200 bg-white"><td className="py-3">{concept.description}</td><td className="py-3 text-center">{concept.unit}</td><td className="py-3 text-right">{concept.quantity}</td><td className="py-3 text-right">{money(Number(concept.unitPrice), printQuote.currency)}</td><td className="py-3 text-right">{money(Number(concept.quantity) * Number(concept.unitPrice), printQuote.currency)}</td></tr>)}</tbody>
                  </table>
                </div>
              ) : null}

              <div className="ml-auto mt-7 w-80 space-y-2 text-sm">
                <div className="flex justify-between"><span>Subtotal</span><strong>{money(printQuote.subtotal, printQuote.currency)}</strong></div>
                <div className="flex justify-between"><span>IVA ({printQuote.taxRate}%)</span><strong>{money(printQuote.tax, printQuote.currency)}</strong></div>
                <div className="flex justify-between border-t border-slate-400 pt-3 text-lg"><span>Total</span><strong>{money(printQuote.total, printQuote.currency)}</strong></div>
              </div>

              {printQuote.notes ? <div className="mt-8 border-t border-slate-200 pt-5"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Notas / condiciones</p><p className="mt-2 whitespace-pre-wrap text-sm">{printQuote.notes}</p></div> : null}
            </div>
          </section>
        </>
      )}
    </AppShell>
  )
}
