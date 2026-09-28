'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import { AppShell } from '@/components/layout/AppShell'

type OpportunityStage =
  | 'Nueva'
  | 'Contactado'
  | 'Visita / Levantamiento'
  | 'Preparando cotización'
  | 'Cotización enviada'
  | 'Negociación'
  | 'Ganada'
  | 'Perdida'

type OpportunityCurrency = 'MXN' | 'USD'

type Opportunity = {
  id: string
  name: string
  client: string
  service: string
  owner: string
  value: number
  currency: OpportunityCurrency
  probability: number
  closeDate: string
  source: string
  stage: OpportunityStage
  notes: string
  createdAt: string
}

const STORAGE_KEY = 'nedvi_opportunities'

const stages: OpportunityStage[] = [
  'Nueva',
  'Contactado',
  'Visita / Levantamiento',
  'Preparando cotización',
  'Cotización enviada',
  'Negociación',
  'Ganada',
  'Perdida',
]

const sources = [
  'Recomendación',
  'Facebook',
  'Instagram',
  'Sitio web',
  'Correo',
  'Llamada',
  'Visita directa',
  'Otro',
]

function money(value: number, currency: OpportunityCurrency) {
  const amount = new Intl.NumberFormat('es-MX', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
  return `${currency} $${amount}`
}

function stageClass(stage: OpportunityStage) {
  const styles: Record<OpportunityStage, string> = {
    Nueva: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200',
    Contactado: 'bg-sky-100 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300',
    'Visita / Levantamiento': 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300',
    'Preparando cotización': 'bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300',
    'Cotización enviada': 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300',
    Negociación: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300',
    Ganada: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300',
    Perdida: 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300',
  }
  return styles[stage]
}

export default function OpportunitiesPage() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([])
  const [loaded, setLoaded] = useState(false)
  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [stageFilter, setStageFilter] = useState<'Todas' | OpportunityStage>('Todas')
  const [view, setView] = useState<'table' | 'kanban'>('table')

  const [name, setName] = useState('')
  const [client, setClient] = useState('')
  const [service, setService] = useState('')
  const [owner, setOwner] = useState('')
  const [value, setValue] = useState('')
  const [currency, setCurrency] = useState<OpportunityCurrency>('MXN')
  const [probability, setProbability] = useState('25')
  const [closeDate, setCloseDate] = useState('')
  const [source, setSource] = useState('Recomendación')
  const [stage, setStage] = useState<OpportunityStage>('Nueva')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY)

    if (!raw) {
      setLoaded(true)
      return
    }

    try {
      const parsed = JSON.parse(raw) as Opportunity[]
      if (Array.isArray(parsed)) {
        setOpportunities(
          parsed.map((item) => ({
            ...item,
            currency: item.currency === 'USD' ? 'USD' : 'MXN',
            probability: Number(item.probability || 0),
            value: Number(item.value || 0),
          })),
        )
      }
    } catch {
      console.warn('No se pudieron leer las oportunidades guardadas.')
    } finally {
      setLoaded(true)
    }
  }, [])

  useEffect(() => {
    if (!loaded) return
    localStorage.setItem(STORAGE_KEY, JSON.stringify(opportunities))
  }, [opportunities, loaded])

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return opportunities.filter((item) => {
      const matchesText = [item.name, item.client, item.service, item.owner, item.source]
        .join(' ')
        .toLowerCase()
        .includes(term)
      const matchesStage = stageFilter === 'Todas' || item.stage === stageFilter
      return matchesText && matchesStage
    })
  }, [opportunities, search, stageFilter])

  const openOpportunities = opportunities.filter(
    (item) => item.stage !== 'Ganada' && item.stage !== 'Perdida',
  )
  const won = opportunities.filter((item) => item.stage === 'Ganada')
  const closed = opportunities.filter(
    (item) => item.stage === 'Ganada' || item.stage === 'Perdida',
  )
  const pipelineMXN = openOpportunities
    .filter((item) => item.currency === 'MXN')
    .reduce((sum, item) => sum + item.value, 0)
  const pipelineUSD = openOpportunities
    .filter((item) => item.currency === 'USD')
    .reduce((sum, item) => sum + item.value, 0)
  const conversion = closed.length > 0 ? Math.round((won.length / closed.length) * 100) : 0

  function resetForm() {
    setName('')
    setClient('')
    setService('')
    setOwner('')
    setValue('')
    setCurrency('MXN')
    setProbability('25')
    setCloseDate('')
    setSource('Recomendación')
    setStage('Nueva')
    setNotes('')
    setEditingId(null)
  }

  function openNew() {
    resetForm()
    setOpen(true)
  }

  function closeForm() {
    setOpen(false)
    resetForm()
  }

  function openEdit(item: Opportunity) {
    setEditingId(item.id)
    setName(item.name)
    setClient(item.client)
    setService(item.service)
    setOwner(item.owner)
    setValue(String(item.value))
    setCurrency(item.currency)
    setProbability(String(item.probability))
    setCloseDate(item.closeDate)
    setSource(item.source)
    setStage(item.stage)
    setNotes(item.notes)
    setOpen(true)
  }

  function saveOpportunity(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!name.trim() || !client.trim()) {
      alert('Nombre de la oportunidad y cliente/prospecto son obligatorios.')
      return
    }

    const record: Opportunity = {
      id: editingId ?? crypto.randomUUID(),
      name: name.trim(),
      client: client.trim(),
      service: service.trim(),
      owner: owner.trim(),
      value: Number(value || 0),
      currency,
      probability: Math.max(0, Math.min(100, Number(probability || 0))),
      closeDate,
      source,
      stage,
      notes: notes.trim(),
      createdAt:
        editingId
          ? opportunities.find((item) => item.id === editingId)?.createdAt ?? new Date().toISOString().slice(0, 10)
          : new Date().toISOString().slice(0, 10),
    }

    setOpportunities((current) =>
      editingId
        ? current.map((item) => (item.id === editingId ? record : item))
        : [record, ...current],
    )

    closeForm()
  }

  function deleteOpportunity(item: Opportunity) {
    if (!window.confirm(`¿Eliminar la oportunidad “${item.name}”?`)) return
    setOpportunities((current) => current.filter((currentItem) => currentItem.id !== item.id))
  }

  function changeStage(id: string, nextStage: OpportunityStage) {
    setOpportunities((current) =>
      current.map((item) => (item.id === id ? { ...item, stage: nextStage } : item)),
    )
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm text-slate-500 dark:text-slate-400">Comercial y Ventas</p>
            <h1 className="text-3xl font-bold tracking-tight">Oportunidades</h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Controla prospectos, seguimiento comercial y probabilidad de cierre.
            </p>
          </div>
          <button
            type="button"
            onClick={openNew}
            className="rounded-xl bg-[#5496CC] px-5 py-3 font-semibold text-slate-950 transition hover:brightness-95"
          >
            + Nueva oportunidad
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Oportunidades abiertas</p>
            <p className="mt-3 text-3xl font-bold">{openOpportunities.length}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Pipeline MXN</p>
            <p className="mt-3 text-2xl font-bold">{money(pipelineMXN, 'MXN')}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Pipeline USD</p>
            <p className="mt-3 text-2xl font-bold">{money(pipelineUSD, 'USD')}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Conversión</p>
            <p className="mt-3 text-3xl font-bold">{conversion}%</p>
          </div>
        </div>

        <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 md:grid-cols-[1fr_220px_auto]">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por oportunidad, cliente, servicio o responsable..."
            className="w-full rounded-xl border border-slate-200 bg-transparent px-4 py-3 outline-none focus:border-[#5496CC] dark:border-slate-700"
          />
          <select
            value={stageFilter}
            onChange={(event) => setStageFilter(event.target.value as 'Todas' | OpportunityStage)}
            className="rounded-xl border border-slate-200 bg-transparent px-4 py-3 outline-none focus:border-[#5496CC] dark:border-slate-700"
          >
            <option>Todas</option>
            {stages.map((item) => <option key={item}>{item}</option>)}
          </select>
          <div className="flex rounded-xl border border-slate-200 p-1 dark:border-slate-700">
            <button type="button" onClick={() => setView('table')} className={`rounded-lg px-3 py-2 text-xs font-semibold ${view === 'table' ? 'bg-[#5496CC] text-slate-950' : 'text-slate-500'}`}>Tabla</button>
            <button type="button" onClick={() => setView('kanban')} className={`rounded-lg px-3 py-2 text-xs font-semibold ${view === 'kanban' ? 'bg-[#5496CC] text-slate-950' : 'text-slate-500'}`}>Kanban</button>
          </div>
        </div>

        {view === 'table' ? (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-100 text-left text-xs uppercase text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                  <tr>
                    <th className="px-4 py-3">Oportunidad</th>
                    <th className="px-4 py-3">Cliente</th>
                    <th className="px-4 py-3">Valor</th>
                    <th className="px-4 py-3">Probabilidad</th>
                    <th className="px-4 py-3">Cierre estimado</th>
                    <th className="px-4 py-3">Etapa</th>
                    <th className="px-4 py-3">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filtered.length === 0 ? (
                    <tr><td colSpan={7} className="px-4 py-12 text-center text-slate-500">Todavía no hay oportunidades.</td></tr>
                  ) : filtered.map((item) => (
                    <tr key={item.id} className="align-top hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="px-4 py-4"><p className="font-semibold">{item.name}</p><p className="mt-1 text-xs text-slate-500">{item.service || 'Sin servicio definido'}</p></td>
                      <td className="px-4 py-4"><p>{item.client}</p><p className="mt-1 text-xs text-slate-500">{item.owner || 'Sin responsable'}</p></td>
                      <td className="px-4 py-4 font-semibold">{money(item.value, item.currency)}</td>
                      <td className="px-4 py-4"><div className="w-24"><div className="mb-1 flex justify-between text-xs"><span>{item.probability}%</span></div><div className="h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700"><div className="h-full rounded-full bg-[#5496CC]" style={{ width: `${item.probability}%` }} /></div></div></td>
                      <td className="px-4 py-4">{item.closeDate || 'Sin fecha'}</td>
                      <td className="px-4 py-4">
                        <select value={item.stage} onChange={(event) => changeStage(item.id, event.target.value as OpportunityStage)} className={`rounded-full border-0 px-3 py-1.5 text-xs font-semibold outline-none ${stageClass(item.stage)}`}>
                          {stages.map((stageItem) => <option key={stageItem}>{stageItem}</option>)}
                        </select>
                      </td>
                      <td className="px-4 py-4"><div className="flex gap-2"><button type="button" onClick={() => openEdit(item)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold dark:border-slate-700">Editar</button><button type="button" onClick={() => deleteOpportunity(item)} className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 dark:border-red-900 dark:text-red-400">Eliminar</button></div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto pb-2">
            <div className="grid min-w-[1800px] grid-cols-8 gap-4">
              {stages.map((stageItem) => {
                const columnItems = filtered.filter((item) => item.stage === stageItem)
                return (
                  <section key={stageItem} className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950/50">
                    <div className="mb-3 flex items-center justify-between"><h2 className="text-sm font-semibold">{stageItem}</h2><span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs dark:bg-slate-800">{columnItems.length}</span></div>
                    <div className="space-y-3">
                      {columnItems.map((item) => (
                        <article key={item.id} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                          <button type="button" onClick={() => openEdit(item)} className="w-full text-left"><p className="font-semibold">{item.name}</p><p className="mt-1 text-xs text-slate-500">{item.client}</p><p className="mt-3 text-sm font-bold">{money(item.value, item.currency)}</p><p className="mt-1 text-xs text-slate-500">Probabilidad {item.probability}%</p></button>
                        </article>
                      ))}
                      {columnItems.length === 0 ? <p className="py-6 text-center text-xs text-slate-400">Sin oportunidades</p> : null}
                    </div>
                  </section>
                )
              })}
            </div>
          </div>
        )}

        {open && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900">
              <div className="mb-5 flex items-start justify-between gap-4">
                <div><h2 className="text-xl font-bold">{editingId ? 'Editar oportunidad' : 'Nueva oportunidad'}</h2><p className="mt-1 text-xs text-slate-500">Registra el seguimiento comercial del prospecto.</p></div>
                <button type="button" onClick={closeForm} className="text-sm text-slate-500">Cerrar</button>
              </div>

              <form onSubmit={saveOpportunity} className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="space-y-2"><span className="text-sm font-semibold">Nombre de la oportunidad *</span><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej. Remodelación oficinas ABC" className="w-full rounded-xl border border-slate-200 bg-transparent px-4 py-3 outline-none focus:border-[#5496CC] dark:border-slate-700" /></label>
                  <label className="space-y-2"><span className="text-sm font-semibold">Cliente / prospecto *</span><input value={client} onChange={(e) => setClient(e.target.value)} placeholder="Empresa o persona" className="w-full rounded-xl border border-slate-200 bg-transparent px-4 py-3 outline-none focus:border-[#5496CC] dark:border-slate-700" /></label>
                  <label className="space-y-2"><span className="text-sm font-semibold">Proyecto / servicio</span><input value={service} onChange={(e) => setService(e.target.value)} placeholder="Servicio solicitado" className="w-full rounded-xl border border-slate-200 bg-transparent px-4 py-3 dark:border-slate-700" /></label>
                  <label className="space-y-2"><span className="text-sm font-semibold">Responsable</span><input value={owner} onChange={(e) => setOwner(e.target.value)} placeholder="Responsable comercial" className="w-full rounded-xl border border-slate-200 bg-transparent px-4 py-3 dark:border-slate-700" /></label>
                  <label className="space-y-2"><span className="text-sm font-semibold">Valor estimado</span><input type="number" min="0" step="0.01" value={value} onChange={(e) => setValue(e.target.value)} placeholder="0.00" className="w-full rounded-xl border border-slate-200 bg-transparent px-4 py-3 dark:border-slate-700" /></label>
                  <label className="space-y-2"><span className="text-sm font-semibold">Moneda</span><select value={currency} onChange={(e) => setCurrency(e.target.value as OpportunityCurrency)} className="w-full rounded-xl border border-slate-200 bg-transparent px-4 py-3 dark:border-slate-700"><option value="MXN">Pesos mexicanos (MXN)</option><option value="USD">Dólares estadounidenses (USD)</option></select></label>
                  <label className="space-y-2"><span className="text-sm font-semibold">Probabilidad de cierre (%)</span><input type="number" min="0" max="100" value={probability} onChange={(e) => setProbability(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-transparent px-4 py-3 dark:border-slate-700" /></label>
                  <label className="space-y-2"><span className="text-sm font-semibold">Fecha estimada de cierre</span><input type="date" value={closeDate} onChange={(e) => setCloseDate(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-transparent px-4 py-3 dark:border-slate-700" /></label>
                  <label className="space-y-2"><span className="text-sm font-semibold">Origen</span><select value={source} onChange={(e) => setSource(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-transparent px-4 py-3 dark:border-slate-700">{sources.map((item) => <option key={item}>{item}</option>)}</select></label>
                  <label className="space-y-2"><span className="text-sm font-semibold">Etapa</span><select value={stage} onChange={(e) => setStage(e.target.value as OpportunityStage)} className="w-full rounded-xl border border-slate-200 bg-transparent px-4 py-3 dark:border-slate-700">{stages.map((item) => <option key={item}>{item}</option>)}</select></label>
                </div>

                <label className="block space-y-2"><span className="text-sm font-semibold">Notas</span><textarea rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Necesidades del cliente, próximos pasos, acuerdos..." className="w-full rounded-xl border border-slate-200 bg-transparent px-4 py-3 dark:border-slate-700" /></label>

                <div className="flex justify-end gap-3"><button type="button" onClick={closeForm} className="rounded-xl border border-slate-200 px-5 py-3 font-semibold dark:border-slate-700">Cancelar</button><button type="submit" className="rounded-xl bg-[#5496CC] px-5 py-3 font-semibold text-slate-950">{editingId ? 'Guardar cambios' : 'Crear oportunidad'}</button></div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  )
}
