import { PurchasingCloudMigration } from '@/features/purchasing/PurchasingCloudMigration'
'use client'

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { ClipboardList, Eye, Plus, Search, Trash2, X } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import {
  PURCHASING_UPDATED_EVENT,
  REQUISITIONS_STORAGE_KEY,
  nextRequisitionFolio,
  readConvertedProjects,
  readRequisitions,
  requisitionEstimatedTotal,
  writeRequisitions,
  type PurchasingProject,
  type PurchasingUnit,
  type Requisition,
  type RequisitionPriority,
  type RequisitionStatus,
} from '@/features/purchasing/purchasingStorage'

type DraftItem = {
  id: string
  description: string
  unit: PurchasingUnit
  quantity: string
  estimatedUnitPrice: string
}

const units: PurchasingUnit[] = [
  'Kilómetros',
  'Metros Cuadrados',
  'Metros Cúbicos',
  'Metros Lineales',
  'Piezas',
  'Litros',
  'Servicios',
  'Otros',
]
const priorities: RequisitionPriority[] = ['Baja', 'Media', 'Alta', 'Urgente']
const statuses: RequisitionStatus[] = [
  'Borrador',
  'Pendiente de aprobación',
  'Aprobada',
  'Rechazada',
  'Ordenada',
]

function emptyItem(): DraftItem {
  return { id: crypto.randomUUID(), description: '', unit: 'Piezas', quantity: '', estimatedUnitPrice: '' }
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

function money(value: number) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(value)
}

function statusClass(status: RequisitionStatus) {
  if (status === 'Aprobada') return 'bg-emerald-500/10 text-emerald-500'
  if (status === 'Rechazada') return 'bg-red-500/10 text-red-500'
  if (status === 'Ordenada') return 'bg-blue-500/10 text-blue-500'
  if (status === 'Pendiente de aprobación') return 'bg-amber-500/10 text-amber-500'
  return 'bg-slate-500/10 text-slate-500'
}

export default function RequisitionsPage() {
  const [projects, setProjects] = useState<PurchasingProject[]>([])
  const [requisitions, setRequisitions] = useState<Requisition[]>([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'Todas' | RequisitionStatus>('Todas')
  const [open, setOpen] = useState(false)
  const [viewing, setViewing] = useState<Requisition | null>(null)
  const [projectId, setProjectId] = useState('')
  const [requester, setRequester] = useState('')
  const [requestedAt, setRequestedAt] = useState(today())
  const [neededBy, setNeededBy] = useState('')
  const [priority, setPriority] = useState<RequisitionPriority>('Media')
  const [status, setStatus] = useState<RequisitionStatus>('Borrador')
  const [items, setItems] = useState<DraftItem[]>([emptyItem()])
  const [notes, setNotes] = useState('')

  const loadData = useCallback(() => {
    setProjects(readConvertedProjects())
    setRequisitions(readRequisitions())
  }, [])

  useEffect(() => {
    loadData()
    const handleStorage = (event: StorageEvent) => {
      if (event.key === REQUISITIONS_STORAGE_KEY || event.key === 'nedvi_quotes') loadData()
    }
    window.addEventListener('storage', handleStorage)
    window.addEventListener(PURCHASING_UPDATED_EVENT, loadData)
    window.addEventListener('focus', loadData)
    return () => {
      window.removeEventListener('storage', handleStorage)
      window.removeEventListener(PURCHASING_UPDATED_EVENT, loadData)
      window.removeEventListener('focus', loadData)
    }
  }, [loadData])

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    return requisitions.filter((requisition) => {
      const matchesText = [
        requisition.folio,
        requisition.projectFolio,
        requisition.projectName,
        requisition.client,
        requisition.requester,
      ]
        .join(' ')
        .toLowerCase()
        .includes(query)
      const matchesStatus = statusFilter === 'Todas' || requisition.status === statusFilter
      return matchesText && matchesStatus
    })
  }, [requisitions, search, statusFilter])

  const pendingCount = requisitions.filter((item) => item.status === 'Pendiente de aprobación').length
  const approvedCount = requisitions.filter((item) => item.status === 'Aprobada').length
  const orderedCount = requisitions.filter((item) => item.status === 'Ordenada').length
  const formEstimated = items.reduce(
    (sum, item) => sum + Number(item.quantity || 0) * Number(item.estimatedUnitPrice || 0),
    0,
  )

  function resetForm() {
    setProjectId('')
    setRequester('')
    setRequestedAt(today())
    setNeededBy('')
    setPriority('Media')
    setStatus('Borrador')
    setItems([emptyItem()])
    setNotes('')
  }

  function closeForm() {
    setOpen(false)
    resetForm()
  }

  function updateItem(id: string, field: keyof DraftItem, value: string) {
    setItems((current) => current.map((item) => (item.id === id ? { ...item, [field]: value } : item)))
  }

  function saveRequisition(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const project = projects.find((item) => item.id === projectId)
    if (!project) {
      alert('Selecciona un proyecto.')
      return
    }

    const cleanItems = items
      .filter((item) => item.description.trim() && Number(item.quantity) > 0)
      .map((item) => ({
        id: item.id,
        description: item.description.trim(),
        unit: item.unit,
        quantity: Number(item.quantity),
        estimatedUnitPrice: Number(item.estimatedUnitPrice || 0),
      }))

    if (!cleanItems.length) {
      alert('Agrega al menos un artículo o servicio válido.')
      return
    }

    const requisition: Requisition = {
      id: crypto.randomUUID(),
      folio: nextRequisitionFolio(),
      projectQuoteId: project.id,
      projectFolio: project.folio,
      projectName: project.project,
      client: project.client,
      requester: requester.trim(),
      requestedAt,
      neededBy,
      priority,
      status,
      items: cleanItems,
      notes: notes.trim(),
      createdAt: new Date().toISOString(),
    }

    const next = [requisition, ...requisitions]
    writeRequisitions(next)
    setRequisitions(next)
    closeForm()
  }

  function changeStatus(id: string, nextStatus: RequisitionStatus) {
    const next = requisitions.map((item) => (item.id === id ? { ...item, status: nextStatus } : item))
    writeRequisitions(next)
    setRequisitions(next)
  }

  function deleteRequisition(requisition: Requisition) {
    if (requisition.status === 'Ordenada') {
      alert('No se puede eliminar una requisición que ya tiene orden de compra.')
      return
    }
    if (!window.confirm(`¿Eliminar la requisición ${requisition.folio}?`)) return
    const next = requisitions.filter((item) => item.id !== requisition.id)
    writeRequisitions(next)
    setRequisitions(next)
  }

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-[1600px] space-y-6">
        <PurchasingCloudMigration />
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#5496CC]">Compras y Suministros</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-[var(--foreground)]">Requisiciones</h1>
            <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">Solicita materiales, equipo y servicios vinculados a los proyectos de NEDVI.</p>
          </div>
          <button type="button" onClick={() => { resetForm(); setOpen(true) }} className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#5496CC] px-4 text-sm font-semibold text-white transition hover:brightness-95"><Plus size={16} /> Nueva requisición</button>
        </header>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Metric label="Total" value={requisitions.length.toString()} detail="Requisiciones registradas" />
          <Metric label="Pendientes" value={pendingCount.toString()} detail="Esperando aprobación" />
          <Metric label="Aprobadas" value={approvedCount.toString()} detail="Listas para comprar" />
          <Metric label="Ordenadas" value={orderedCount.toString()} detail="Con orden de compra" />
        </div>

        <div className="grid gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm md:grid-cols-[1fr_240px]">
          <div className="relative"><Search size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--muted)]" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar folio, proyecto, cliente o solicitante..." className="w-full rounded-xl border border-[var(--border)] bg-transparent py-3 pl-11 pr-4 text-sm text-[var(--foreground)] outline-none focus:border-[#5496CC]" /></div>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as 'Todas' | RequisitionStatus)} className="rounded-xl border border-[var(--border)] bg-transparent px-4 py-3 text-sm text-[var(--foreground)] outline-none focus:border-[#5496CC]"><option>Todas</option>{statuses.map((item) => <option key={item}>{item}</option>)}</select>
        </div>

        <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
          {filtered.length === 0 ? (
            <div className="px-6 py-16 text-center"><ClipboardList className="mx-auto text-[#5496CC]" size={34} /><h2 className="mt-4 text-lg font-bold text-[var(--foreground)]">No hay requisiciones</h2><p className="mt-2 text-sm text-[var(--muted)]">Crea una requisición para un proyecto existente.</p></div>
          ) : (
            <div className="overflow-x-auto"><table className="w-full min-w-[1200px] text-left text-sm"><thead className="border-b border-[var(--border)] bg-[var(--surface-soft)] text-xs uppercase tracking-wide text-[var(--muted)]"><tr><th className="px-5 py-4">Folio</th><th className="px-5 py-4">Proyecto</th><th className="px-5 py-4">Solicitante</th><th className="px-5 py-4">Prioridad</th><th className="px-5 py-4">Estimado</th><th className="px-5 py-4">Necesario para</th><th className="px-5 py-4">Estado</th><th className="px-5 py-4">Acciones</th></tr></thead><tbody className="divide-y divide-[var(--border)]">
              {filtered.map((requisition) => (
                <tr key={requisition.id} className="hover:bg-[var(--surface-soft)]">
                  <td className="px-5 py-4 font-semibold text-[#5496CC]">{requisition.folio}</td>
                  <td className="px-5 py-4"><p className="font-semibold text-[var(--foreground)]">{requisition.projectName}</p><p className="mt-1 text-xs text-[var(--muted)]">{requisition.projectFolio} · {requisition.client}</p></td>
                  <td className="px-5 py-4 text-[var(--foreground)]">{requisition.requester || 'Sin asignar'}</td>
                  <td className="px-5 py-4 text-[var(--foreground)]">{requisition.priority}</td>
                  <td className="px-5 py-4 font-semibold text-[var(--foreground)]">{money(requisitionEstimatedTotal(requisition))}</td>
                  <td className="px-5 py-4 text-[var(--foreground)]">{requisition.neededBy || 'Sin fecha'}</td>
                  <td className="px-5 py-4"><select value={requisition.status} disabled={requisition.status === 'Ordenada'} onChange={(event) => changeStatus(requisition.id, event.target.value as RequisitionStatus)} className={`rounded-full border-0 px-3 py-1.5 text-xs font-semibold outline-none ${statusClass(requisition.status)}`}>{statuses.map((item) => <option key={item}>{item}</option>)}</select></td>
                  <td className="px-5 py-4"><div className="flex gap-2"><button type="button" onClick={() => setViewing(requisition)} className="rounded-lg border border-[var(--border)] p-2 text-[var(--foreground)] hover:border-[#5496CC] hover:text-[#5496CC]" aria-label="Ver requisición"><Eye size={15} /></button><button type="button" onClick={() => deleteRequisition(requisition)} className="rounded-lg border border-red-500/20 p-2 text-red-500 hover:bg-red-500/10" aria-label="Eliminar requisición"><Trash2 size={15} /></button></div></td>
                </tr>
              ))}
            </tbody></table></div>
          )}
        </div>
      </div>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4"><div className="max-h-[94vh] w-full max-w-5xl overflow-y-auto rounded-2xl bg-[var(--surface)] p-6 shadow-2xl">
          <div className="mb-5 flex items-start justify-between"><div><p className="text-xs font-semibold uppercase tracking-wide text-[#5496CC]">Compras y Suministros</p><h2 className="mt-1 text-xl font-bold text-[var(--foreground)]">Nueva requisición</h2></div><button type="button" onClick={closeForm} className="rounded-lg p-2 text-[var(--muted)] hover:bg-[var(--surface-soft)]"><X size={18} /></button></div>
          <form onSubmit={saveRequisition} className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Field label="Proyecto *"><select required value={projectId} onChange={(e) => setProjectId(e.target.value)} className="req-input"><option value="">Seleccionar proyecto</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.folio} — {project.project}</option>)}</select></Field>
              <Field label="Solicitante"><input value={requester} onChange={(e) => setRequester(e.target.value)} placeholder="Nombre del solicitante" className="req-input" /></Field>
              <Field label="Prioridad"><select value={priority} onChange={(e) => setPriority(e.target.value as RequisitionPriority)} className="req-input">{priorities.map((item) => <option key={item}>{item}</option>)}</select></Field>
              <Field label="Fecha de solicitud"><input type="date" value={requestedAt} onChange={(e) => setRequestedAt(e.target.value)} className="req-input" /></Field>
              <Field label="Necesario para"><input type="date" value={neededBy} onChange={(e) => setNeededBy(e.target.value)} className="req-input" /></Field>
              <Field label="Estado"><select value={status} onChange={(e) => setStatus(e.target.value as RequisitionStatus)} className="req-input">{statuses.filter((item) => item !== 'Ordenada').map((item) => <option key={item}>{item}</option>)}</select></Field>
            </div>

            <section><div className="mb-3 flex items-center justify-between"><div><h3 className="font-semibold text-[var(--foreground)]">Artículos / servicios</h3><p className="text-xs text-[var(--muted)]">Registra cantidades y precio estimado.</p></div><button type="button" onClick={() => setItems((current) => [...current, emptyItem()])} className="rounded-lg border border-[var(--border)] px-3 py-2 text-xs font-semibold text-[var(--foreground)]">+ Agregar</button></div>
              <div className="space-y-3">{items.map((item) => <div key={item.id} className="grid gap-2 rounded-xl border border-[var(--border)] p-3 md:grid-cols-[minmax(220px,1fr)_150px_110px_160px_auto]"><input value={item.description} onChange={(e) => updateItem(item.id, 'description', e.target.value)} placeholder="Descripción" className="req-input" /><select value={item.unit} onChange={(e) => updateItem(item.id, 'unit', e.target.value)} className="req-input">{units.map((unit) => <option key={unit}>{unit}</option>)}</select><input type="number" min="0.01" step="0.01" value={item.quantity} onChange={(e) => updateItem(item.id, 'quantity', e.target.value)} placeholder="Cantidad" className="req-input" /><input type="number" min="0" step="0.01" value={item.estimatedUnitPrice} onChange={(e) => updateItem(item.id, 'estimatedUnitPrice', e.target.value)} placeholder="Precio estimado" className="req-input" /><button type="button" disabled={items.length === 1} onClick={() => setItems((current) => current.filter((entry) => entry.id !== item.id))} className="rounded-lg px-3 py-2 text-sm text-red-500 disabled:opacity-30">Quitar</button></div>)}</div>
            </section>

            <Field label="Notas"><textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Justificación, especificaciones, observaciones..." className="req-input" /></Field>
            <div className="rounded-2xl bg-[var(--surface-soft)] p-4"><p className="text-xs uppercase text-[var(--muted)]">Total estimado</p><p className="mt-1 text-xl font-bold text-[var(--foreground)]">{money(formEstimated)}</p></div>
            <div className="flex justify-end gap-3"><button type="button" onClick={closeForm} className="rounded-xl border border-[var(--border)] px-5 py-3 font-semibold text-[var(--foreground)]">Cancelar</button><button type="submit" className="rounded-xl bg-[#5496CC] px-5 py-3 font-semibold text-white">Crear requisición</button></div>
          </form>
        </div></div>
      ) : null}

      {viewing ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4"><div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-[var(--surface)] p-6 shadow-2xl"><div className="flex items-start justify-between border-b border-[var(--border)] pb-5"><div><p className="text-xs font-semibold uppercase tracking-wide text-[#5496CC]">{viewing.folio}</p><h2 className="mt-1 text-2xl font-bold text-[var(--foreground)]">{viewing.projectName}</h2><p className="mt-1 text-sm text-[var(--muted)]">{viewing.client} · {viewing.requester || 'Sin solicitante'}</p></div><button type="button" onClick={() => setViewing(null)} className="rounded-lg p-2 text-[var(--muted)]"><X size={18} /></button></div>
          <div className="mt-5 grid gap-3 sm:grid-cols-4"><Metric label="Estado" value={viewing.status} detail="Estado actual" /><Metric label="Prioridad" value={viewing.priority} detail="Nivel de atención" /><Metric label="Artículos" value={viewing.items.length.toString()} detail="Partidas solicitadas" /><Metric label="Estimado" value={money(requisitionEstimatedTotal(viewing))} detail="Antes de IVA" /></div>
          <div className="mt-5 overflow-hidden rounded-2xl border border-[var(--border)]"><table className="w-full text-left text-sm"><thead className="bg-[var(--surface-soft)] text-xs uppercase text-[var(--muted)]"><tr><th className="px-5 py-4">Descripción</th><th className="px-5 py-4">UM</th><th className="px-5 py-4 text-right">Cantidad</th><th className="px-5 py-4 text-right">Precio estimado</th><th className="px-5 py-4 text-right">Importe</th></tr></thead><tbody className="divide-y divide-[var(--border)]">{viewing.items.map((item) => <tr key={item.id}><td className="px-5 py-4 text-[var(--foreground)]">{item.description}</td><td className="px-5 py-4 text-[var(--muted)]">{item.unit}</td><td className="px-5 py-4 text-right text-[var(--foreground)]">{item.quantity}</td><td className="px-5 py-4 text-right text-[var(--foreground)]">{money(item.estimatedUnitPrice)}</td><td className="px-5 py-4 text-right font-semibold text-[var(--foreground)]">{money(item.quantity * item.estimatedUnitPrice)}</td></tr>)}</tbody></table></div>
          <div className="mt-5 grid gap-4 md:grid-cols-2"><div className="rounded-2xl border border-[var(--border)] p-4 text-sm"><p className="text-xs font-semibold uppercase text-[var(--muted)]">Fechas</p><p className="mt-3 text-[var(--foreground)]">Solicitud: {viewing.requestedAt || 'Sin fecha'}</p><p className="mt-2 text-[var(--foreground)]">Necesario para: {viewing.neededBy || 'Sin fecha'}</p></div><div className="rounded-2xl border border-[var(--border)] p-4"><p className="text-xs font-semibold uppercase text-[var(--muted)]">Notas</p><p className="mt-3 whitespace-pre-wrap text-sm text-[var(--foreground)]">{viewing.notes || 'Sin notas registradas.'}</p></div></div>
        </div></div>
      ) : null}

      <style jsx global>{`.req-input{width:100%;border:1px solid var(--border);border-radius:.75rem;background:transparent;padding:.7rem .9rem;color:var(--foreground);outline:none}.req-input:focus{border-color:#5496CC}`}</style>
    </AppShell>
  )
}

function Metric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm"><p className="break-words text-2xl font-bold text-[var(--foreground)]">{value}</p><p className="mt-1 text-sm font-semibold text-[var(--foreground)]">{label}</p><p className="mt-1 text-xs text-[var(--muted)]">{detail}</p></div>
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block space-y-2"><span className="text-sm font-semibold text-[var(--foreground)]">{label}</span>{children}</label>
}
