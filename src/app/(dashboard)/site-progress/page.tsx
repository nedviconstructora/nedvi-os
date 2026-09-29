'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import { BarChart3, Eye, Plus, Search, Trash2, X } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import {
  PROGRESS_STORAGE_KEY,
  type OperationProject,
  type ProgressItem,
  type ProgressRecord,
  readOperationProjects,
  readProgressRecords,
  writeProgressRecords,
} from '@/features/operations/services/operationsStorage'

type DraftProgressItem = {
  id: string
  concept: string
  unit: string
  po: string
  quantity: string
  accumulatedPrevious: string
  previousExecution: string
  executed: string
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

function formatDate(value: string) {
  if (!value) return 'Sin fecha'
  const date = new Date(`${value}T12:00:00`)
  if (Number.isNaN(date.getTime())) return value

  return new Intl.DateTimeFormat('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

function numberValue(value: string | number) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
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

function newDraftItem(): DraftProgressItem {
  return {
    id: crypto.randomUUID(),
    concept: '',
    unit: '',
    po: '',
    quantity: '',
    accumulatedPrevious: '0',
    previousExecution: '0',
    executed: '0',
  }
}

function draftFromPrevious(item: ProgressItem): DraftProgressItem {
  return {
    id: crypto.randomUUID(),
    concept: item.concept,
    unit: item.unit,
    po: String(item.po),
    quantity: String(item.quantity),
    accumulatedPrevious: String(item.accumulatedPrevious + item.executed),
    previousExecution: String(item.executed),
    executed: '0',
  }
}

function itemTotal(item: DraftProgressItem) {
  return Math.max(0, numberValue(item.po)) * Math.max(0, numberValue(item.quantity))
}

function itemRemaining(item: DraftProgressItem) {
  return Math.max(
    0,
    itemTotal(item) - Math.max(0, numberValue(item.accumulatedPrevious)) - Math.max(0, numberValue(item.executed)),
  )
}

export default function SiteProgressPage() {
  const [projects, setProjects] = useState<OperationProject[]>([])
  const [records, setRecords] = useState<ProgressRecord[]>([])
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const [viewingQuoteId, setViewingQuoteId] = useState('')
  const [quoteId, setQuoteId] = useState('')
  const [date, setDate] = useState(today())
  const [notes, setNotes] = useState('')
  const [items, setItems] = useState<DraftProgressItem[]>([newDraftItem()])

  function loadData() {
    const currentProjects = readOperationProjects()
    const validIds = new Set(currentProjects.map((project) => project.id))
    const currentRecords = readProgressRecords().filter((record) => validIds.has(record.quoteId))
    setProjects(currentProjects)
    setRecords(currentRecords)
    writeProgressRecords(currentRecords)
  }

  useEffect(() => {
    loadData()

    const handleStorage = (event: StorageEvent) => {
      if (event.key === 'nedvi_quotes' || event.key === PROGRESS_STORAGE_KEY) loadData()
    }

    window.addEventListener('storage', handleStorage)
    window.addEventListener('focus', loadData)

    return () => {
      window.removeEventListener('storage', handleStorage)
      window.removeEventListener('focus', loadData)
    }
  }, [])

  const recordsByProject = useMemo(() => {
    const map = new Map<string, ProgressRecord[]>()

    for (const project of projects) {
      map.set(
        project.id,
        records
          .filter((record) => record.quoteId === project.id)
          .sort((a, b) => b.date.localeCompare(a.date)),
      )
    }

    return map
  }, [projects, records])

  const latestByProject = useMemo(() => {
    const map = new Map<string, ProgressRecord>()
    for (const [projectId, projectRecords] of recordsByProject) {
      if (projectRecords[0]) map.set(projectId, projectRecords[0])
    }
    return map
  }, [recordsByProject])

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return projects

    return projects.filter((project) => {
      const projectRecords = recordsByProject.get(project.id) ?? []
      const searchable = [
        project.folio,
        project.project,
        project.client,
        project.owner,
        ...projectRecords.flatMap((record) => [
          record.date,
          record.notes,
          String(record.percent),
          ...record.items.flatMap((item) => [item.concept, item.unit]),
        ]),
      ]
        .join(' ')
        .toLowerCase()

      return searchable.includes(query)
    })
  }, [projects, recordsByProject, search])

  const average = projects.length
    ? Math.round(
        projects.reduce((sum, project) => sum + (latestByProject.get(project.id)?.percent ?? 0), 0) /
          projects.length,
      )
    : 0

  const viewingProject = viewingQuoteId
    ? projects.find((project) => project.id === viewingQuoteId)
    : undefined
  const viewingRecords = viewingQuoteId ? recordsByProject.get(viewingQuoteId) ?? [] : []

  function openNew(project?: OperationProject) {
    const selectedProjectId = project?.id ?? ''
    const latest = latestByProject.get(selectedProjectId)

    setQuoteId(selectedProjectId)
    setDate(today())
    setNotes('')
    setItems(latest?.items.length ? latest.items.map(draftFromPrevious) : [newDraftItem()])
    setOpen(true)
  }

  function handleProjectChange(value: string) {
    setQuoteId(value)
    const latest = latestByProject.get(value)
    setItems(latest?.items.length ? latest.items.map(draftFromPrevious) : [newDraftItem()])
  }

  function updateItem(id: string, field: keyof Omit<DraftProgressItem, 'id'>, value: string) {
    setItems((current) => current.map((item) => (item.id === id ? { ...item, [field]: value } : item)))
  }

  function removeDraftItem(id: string) {
    setItems((current) => {
      const next = current.filter((item) => item.id !== id)
      return next.length ? next : [newDraftItem()]
    })
  }

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const project = projects.find((item) => item.id === quoteId)
    if (!project) return

    const validItems = items.filter((item) => item.concept.trim())
    if (!validItems.length) {
      window.alert('Agrega al menos un concepto para guardar el avance.')
      return
    }

    const savedItems: ProgressItem[] = validItems.map((item) => {
      const po = Math.max(0, numberValue(item.po))
      const qty = Math.max(0, numberValue(item.quantity))
      const total = po * qty
      const accumulatedPrevious = Math.max(0, numberValue(item.accumulatedPrevious))
      const previousExecution = Math.max(0, numberValue(item.previousExecution))
      const executed = Math.max(0, numberValue(item.executed))

      return {
        id: crypto.randomUUID(),
        concept: item.concept.trim(),
        unit: item.unit.trim(),
        po,
        quantity: qty,
        total,
        accumulatedPrevious,
        previousExecution,
        executed,
        totalToExecute: Math.max(0, total - accumulatedPrevious - executed),
      }
    })

    const totalContract = savedItems.reduce((sum, item) => sum + item.total, 0)
    const totalAccumulated = savedItems.reduce(
      (sum, item) => sum + item.accumulatedPrevious + item.executed,
      0,
    )
    const percent = totalContract > 0 ? Math.min(100, Math.round((totalAccumulated / totalContract) * 100)) : 0

    const record: ProgressRecord = {
      id: crypto.randomUUID(),
      quoteId: project.id,
      folio: project.folio,
      date,
      percent,
      milestone: `${savedItems.length} concepto${savedItems.length === 1 ? '' : 's'} actualizado${savedItems.length === 1 ? '' : 's'}`,
      notes: notes.trim(),
      items: savedItems,
    }

    const next = [record, ...records]
    setRecords(next)
    writeProgressRecords(next)
    setOpen(false)
  }

  function remove(recordId: string) {
    if (!window.confirm('¿Eliminar este registro de avance?')) return
    const next = records.filter((record) => record.id !== recordId)
    setRecords(next)
    writeProgressRecords(next)
  }

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-[1700px] space-y-6">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#5496CC]">Operaciones / Obra</p>
            <h1 className="mt-2 text-3xl font-bold text-[var(--foreground)]">Avance de obra</h1>
            <p className="mt-2 text-sm text-[var(--muted)]">Control de ejecución por concepto y proyecto en formato de tabla.</p>
          </div>
          <button onClick={() => openNew()} className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#5496CC] px-4 text-sm font-semibold text-white">
            <Plus size={16} /> Registrar avance
          </button>
        </header>

        <div className="grid gap-4 sm:grid-cols-3">
          <Metric label="Proyectos" value={projects.length.toString()} />
          <Metric label="Avance promedio" value={`${average}%`} />
          <Metric label="Registros de avance" value={records.length.toString()} />
        </div>

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
          <div className="relative max-w-xl">
            <Search size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar proyecto, cliente, folio o concepto..."
              className="w-full rounded-xl border border-[var(--border)] bg-transparent py-3 pl-11 pr-4 text-sm outline-none focus:border-[#5496CC]"
            />
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-6 py-16 text-center">
            <BarChart3 className="mx-auto text-[#5496CC]" size={32} />
            <h2 className="mt-4 text-lg font-bold">No hay proyectos para mostrar</h2>
            <p className="mt-2 text-sm text-[var(--muted)]">Los proyectos creados desde cotizaciones aparecerán aquí.</p>
          </div>
        ) : (
          <div className="space-y-5">
            {filtered.map((project) => {
              const projectRecords = recordsByProject.get(project.id) ?? []
              const latest = projectRecords[0]
              const rows = latest?.items ?? []
              const totals = rows.reduce(
                (acc, row) => ({
                  total: acc.total + row.total,
                  accumulatedPrevious: acc.accumulatedPrevious + row.accumulatedPrevious,
                  previousExecution: acc.previousExecution + row.previousExecution,
                  executed: acc.executed + row.executed,
                  totalToExecute: acc.totalToExecute + row.totalToExecute,
                }),
                { total: 0, accumulatedPrevious: 0, previousExecution: 0, executed: 0, totalToExecute: 0 },
              )

              return (
                <section key={project.id} className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
                  <div className="flex flex-col gap-4 border-b border-[var(--border)] px-5 py-4 xl:flex-row xl:items-center xl:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <h2 className="text-lg font-bold text-[var(--foreground)]">{project.project}</h2>
                        <span className="rounded-full bg-[#5496CC]/10 px-2.5 py-1 text-xs font-bold text-[#5496CC]">{latest?.percent ?? 0}%</span>
                      </div>
                      <p className="mt-1 text-sm text-[var(--muted)]">{project.client} · {project.folio} · {project.owner || 'Sin responsable'}</p>
                      {latest ? <p className="mt-1 text-xs text-[var(--muted)]">Última actualización: {formatDate(latest.date)}</p> : null}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {projectRecords.length ? (
                        <button type="button" onClick={() => setViewingQuoteId(project.id)} className="inline-flex items-center gap-2 rounded-lg border border-[#5496CC]/40 px-3 py-2 text-xs font-semibold text-[#5496CC] hover:bg-[#5496CC]/10"><Eye size={14} /> Ver historial</button>
                      ) : null}
                      <button type="button" onClick={() => openNew(project)} className="inline-flex items-center gap-2 rounded-lg bg-[#5496CC] px-3 py-2 text-xs font-semibold text-white"><Plus size={14} /> {latest ? 'Actualizar avance' : 'Registrar avance'}</button>
                    </div>
                  </div>

                  {rows.length ? (
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[1450px] text-left text-sm">
                        <thead className="bg-[var(--surface-soft)] text-xs uppercase tracking-wide text-[var(--muted)]">
                          <tr>
                            <th className="px-4 py-3">Concepto</th>
                            <th className="px-4 py-3">Unidad</th>
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
                          {rows.map((row) => (
                            <tr key={row.id} className="hover:bg-[var(--surface-soft)]">
                              <td className="px-4 py-4 font-semibold text-[var(--foreground)]">{row.concept}</td>
                              <td className="px-4 py-4 text-[var(--foreground)]">{row.unit || '—'}</td>
                              <td className="px-4 py-4 text-right">{money(row.po)}</td>
                              <td className="px-4 py-4 text-right">{quantity(row.quantity)}</td>
                              <td className="px-4 py-4 text-right font-semibold">{money(row.total)}</td>
                              <td className="px-4 py-4 text-right">{money(row.accumulatedPrevious)}</td>
                              <td className="px-4 py-4 text-right">{money(row.previousExecution)}</td>
                              <td className="px-4 py-4 text-right font-semibold text-[#5496CC]">{money(row.executed)}</td>
                              <td className="px-4 py-4 text-right font-semibold">{money(row.totalToExecute)}</td>
                            </tr>
                          ))}
                        </tbody>
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
                      </table>
                    </div>
                  ) : (
                    <div className="px-6 py-10 text-center text-sm text-[var(--muted)]">
                      {latest ? 'Este proyecto tiene registros anteriores, pero aún no tiene conceptos en el nuevo formato de tabla.' : 'Todavía no hay avance registrado para este proyecto.'}
                    </div>
                  )}
                </section>
              )
            })}
          </div>
        )}
      </div>

      {viewingProject ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="max-h-[94vh] w-full max-w-[1500px] overflow-y-auto rounded-2xl bg-[var(--surface)] shadow-2xl">
            <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-[var(--border)] bg-[var(--surface)] p-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#5496CC]">Historial de avance · {viewingProject.folio}</p>
                <h2 className="mt-1 text-xl font-bold">{viewingProject.project}</h2>
                <p className="mt-1 text-sm text-[var(--muted)]">{viewingProject.client} · {viewingRecords.length} registro{viewingRecords.length === 1 ? '' : 's'}</p>
              </div>
              <button type="button" onClick={() => setViewingQuoteId('')} className="rounded-lg p-2 text-[var(--muted)] hover:bg-[var(--surface-soft)]"><X size={19} /></button>
            </div>

            <div className="space-y-5 p-5">
              {viewingRecords.map((record, index) => (
                <section key={record.id} className="overflow-hidden rounded-2xl border border-[var(--border)]">
                  <div className="flex flex-col gap-3 bg-[var(--surface-soft)] px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-wrap items-center gap-3"><span className="rounded-full bg-[#5496CC]/10 px-3 py-1 text-xs font-bold text-[#5496CC]">{record.percent}%</span><span className="text-sm font-semibold">{formatDate(record.date)}</span>{index === 0 ? <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold uppercase text-emerald-500">Actual</span> : null}</div>
                    <button type="button" onClick={() => remove(record.id)} className="self-start rounded-lg p-2 text-red-500 hover:bg-red-500/10"><Trash2 size={16} /></button>
                  </div>
                  {record.items.length ? <ProgressTable rows={record.items} /> : <div className="px-5 py-8 text-sm text-[var(--muted)]">Registro anterior sin tabla de conceptos. Avance registrado: {record.percent}%.</div>}
                  {record.notes ? <div className="border-t border-[var(--border)] px-5 py-4"><p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Observaciones</p><p className="mt-2 whitespace-pre-wrap text-sm">{record.notes}</p></div> : null}
                </section>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="max-h-[94vh] w-full max-w-[1550px] overflow-y-auto rounded-2xl bg-[var(--surface)] shadow-2xl">
            <div className="sticky top-0 z-20 flex items-start justify-between border-b border-[var(--border)] bg-[var(--surface)] p-5">
              <div><p className="text-xs font-semibold uppercase tracking-wide text-[#5496CC]">Operaciones / Obra</p><h2 className="mt-1 text-xl font-bold">Registrar avance por conceptos</h2></div>
              <button type="button" onClick={() => setOpen(false)}><X size={18} /></button>
            </div>

            <form onSubmit={save} className="space-y-5 p-5">
              <div className="grid gap-4 lg:grid-cols-[1fr_240px]">
                <label className="space-y-2"><span className="text-sm font-semibold">Proyecto</span><select required value={quoteId} onChange={(event) => handleProjectChange(event.target.value)} className="w-full rounded-xl border border-[var(--border)] bg-transparent px-4 py-3"><option value="">Seleccionar proyecto</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.folio} — {project.project}</option>)}</select></label>
                <label className="space-y-2"><span className="text-sm font-semibold">Fecha</span><input type="date" required value={date} onChange={(event) => setDate(event.target.value)} className="w-full rounded-xl border border-[var(--border)] bg-transparent px-4 py-3" /></label>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-[var(--border)]">
                <table className="w-full min-w-[1500px] text-left text-sm">
                  <thead className="bg-[var(--surface-soft)] text-xs uppercase tracking-wide text-[var(--muted)]"><tr><th className="px-3 py-3">Concepto</th><th className="px-3 py-3">Unidad</th><th className="px-3 py-3">P.O</th><th className="px-3 py-3">Cantidad</th><th className="px-3 py-3">Total</th><th className="px-3 py-3">Acumulado Anterior</th><th className="px-3 py-3">Ejecución Anterior</th><th className="px-3 py-3">Ejecutado</th><th className="px-3 py-3">Total por ejecutar</th><th className="w-12"></th></tr></thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {items.map((item) => (
                      <tr key={item.id}>
                        <td className="p-2"><input required value={item.concept} onChange={(e) => updateItem(item.id, 'concept', e.target.value)} placeholder="Ej. Muro de block" className="table-input min-w-[230px]" /></td>
                        <td className="p-2"><input value={item.unit} onChange={(e) => updateItem(item.id, 'unit', e.target.value)} placeholder="m², pza..." className="table-input min-w-[100px]" /></td>
                        <td className="p-2"><input type="number" min="0" step="0.01" value={item.po} onChange={(e) => updateItem(item.id, 'po', e.target.value)} className="table-input min-w-[120px]" /></td>
                        <td className="p-2"><input type="number" min="0" step="0.01" value={item.quantity} onChange={(e) => updateItem(item.id, 'quantity', e.target.value)} className="table-input min-w-[110px]" /></td>
                        <td className="p-2 text-right font-semibold">{money(itemTotal(item))}</td>
                        <td className="p-2"><input type="number" min="0" step="0.01" value={item.accumulatedPrevious} onChange={(e) => updateItem(item.id, 'accumulatedPrevious', e.target.value)} className="table-input min-w-[150px]" /></td>
                        <td className="p-2"><input type="number" min="0" step="0.01" value={item.previousExecution} onChange={(e) => updateItem(item.id, 'previousExecution', e.target.value)} className="table-input min-w-[150px]" /></td>
                        <td className="p-2"><input type="number" min="0" step="0.01" value={item.executed} onChange={(e) => updateItem(item.id, 'executed', e.target.value)} className="table-input min-w-[130px] border-[#5496CC]/50" /></td>
                        <td className="p-2 text-right font-semibold">{money(itemRemaining(item))}</td>
                        <td className="p-2"><button type="button" onClick={() => removeDraftItem(item.id)} className="rounded-lg p-2 text-red-500 hover:bg-red-500/10"><Trash2 size={15} /></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <button type="button" onClick={() => setItems((current) => [...current, newDraftItem()])} className="inline-flex items-center gap-2 rounded-xl border border-[#5496CC]/40 px-4 py-2.5 text-sm font-semibold text-[#5496CC] hover:bg-[#5496CC]/10"><Plus size={15} /> Agregar concepto</button>

              <label className="block space-y-2"><span className="text-sm font-semibold">Observaciones</span><textarea rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} className="w-full rounded-xl border border-[var(--border)] bg-transparent px-4 py-3" /></label>

              <div className="flex justify-end gap-3"><button type="button" onClick={() => setOpen(false)} className="rounded-xl border border-[var(--border)] px-5 py-3 font-semibold">Cancelar</button><button type="submit" className="rounded-xl bg-[#5496CC] px-5 py-3 font-semibold text-white">Guardar avance</button></div>
            </form>
          </div>
        </div>
      ) : null}

      <style jsx global>{`.table-input{width:100%;border:1px solid var(--border);background:transparent;border-radius:.65rem;padding:.65rem .75rem;outline:none}.table-input:focus{border-color:#5496CC}`}</style>
    </AppShell>
  )
}

function ProgressTable({ rows }: { rows: ProgressItem[] }) {
  const totals = rows.reduce(
    (acc, row) => ({
      total: acc.total + row.total,
      accumulatedPrevious: acc.accumulatedPrevious + row.accumulatedPrevious,
      previousExecution: acc.previousExecution + row.previousExecution,
      executed: acc.executed + row.executed,
      totalToExecute: acc.totalToExecute + row.totalToExecute,
    }),
    { total: 0, accumulatedPrevious: 0, previousExecution: 0, executed: 0, totalToExecute: 0 },
  )

  return <div className="overflow-x-auto"><table className="w-full min-w-[1450px] text-left text-sm"><thead className="bg-[var(--surface-soft)] text-xs uppercase tracking-wide text-[var(--muted)]"><tr><th className="px-4 py-3">Concepto</th><th className="px-4 py-3">Unidad</th><th className="px-4 py-3 text-right">P.O</th><th className="px-4 py-3 text-right">Cantidad</th><th className="px-4 py-3 text-right">Total</th><th className="px-4 py-3 text-right">Acumulado Anterior</th><th className="px-4 py-3 text-right">Ejecución Anterior</th><th className="px-4 py-3 text-right">Ejecutado</th><th className="px-4 py-3 text-right">Total por ejecutar</th></tr></thead><tbody className="divide-y divide-[var(--border)]">{rows.map((row) => <tr key={row.id}><td className="px-4 py-4 font-semibold">{row.concept}</td><td className="px-4 py-4">{row.unit || '—'}</td><td className="px-4 py-4 text-right">{money(row.po)}</td><td className="px-4 py-4 text-right">{quantity(row.quantity)}</td><td className="px-4 py-4 text-right font-semibold">{money(row.total)}</td><td className="px-4 py-4 text-right">{money(row.accumulatedPrevious)}</td><td className="px-4 py-4 text-right">{money(row.previousExecution)}</td><td className="px-4 py-4 text-right font-semibold text-[#5496CC]">{money(row.executed)}</td><td className="px-4 py-4 text-right font-semibold">{money(row.totalToExecute)}</td></tr>)}</tbody><tfoot className="border-t border-[var(--border)] bg-[var(--surface-soft)] font-bold"><tr><td className="px-4 py-4" colSpan={4}>Totales</td><td className="px-4 py-4 text-right">{money(totals.total)}</td><td className="px-4 py-4 text-right">{money(totals.accumulatedPrevious)}</td><td className="px-4 py-4 text-right">{money(totals.previousExecution)}</td><td className="px-4 py-4 text-right text-[#5496CC]">{money(totals.executed)}</td><td className="px-4 py-4 text-right">{money(totals.totalToExecute)}</td></tr></tfoot></table></div>
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
      <BarChart3 className="text-[#5496CC]" size={19} />
      <p className="mt-3 text-2xl font-bold">{value}</p>
      <p className="mt-1 text-sm text-[var(--muted)]">{label}</p>
    </div>
  )
}
