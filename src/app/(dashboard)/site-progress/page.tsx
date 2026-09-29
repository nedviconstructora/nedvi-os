'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import { BarChart3, Plus, Search, Trash2, X } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import {
  PROGRESS_STORAGE_KEY,
  type OperationProject,
  type ProgressRecord,
  readOperationProjects,
  readProgressRecords,
  writeProgressRecords,
} from '@/features/operations/services/operationsStorage'

function today() {
  return new Date().toISOString().slice(0, 10)
}

export default function SiteProgressPage() {
  const [projects, setProjects] = useState<OperationProject[]>([])
  const [records, setRecords] = useState<ProgressRecord[]>([])
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const [quoteId, setQuoteId] = useState('')
  const [date, setDate] = useState(today())
  const [percent, setPercent] = useState('0')
  const [milestone, setMilestone] = useState('')
  const [notes, setNotes] = useState('')

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

  const latestByProject = useMemo(() => {
    const map = new Map<string, ProgressRecord>()
    const sorted = [...records].sort((a, b) => b.date.localeCompare(a.date))
    for (const record of sorted) if (!map.has(record.quoteId)) map.set(record.quoteId, record)
    return map
  }, [records])

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return projects
    return projects.filter((project) =>
      [project.folio, project.project, project.client, project.owner].join(' ').toLowerCase().includes(query),
    )
  }, [projects, search])

  const average = projects.length
    ? Math.round(
        projects.reduce((sum, project) => sum + (latestByProject.get(project.id)?.percent ?? 0), 0) /
          projects.length,
      )
    : 0

  function openNew(project?: OperationProject) {
    setQuoteId(project?.id ?? '')
    setDate(today())
    setPercent(String(latestByProject.get(project?.id ?? '')?.percent ?? 0))
    setMilestone('')
    setNotes('')
    setOpen(true)
  }

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const project = projects.find((item) => item.id === quoteId)
    if (!project) return

    const record: ProgressRecord = {
      id: crypto.randomUUID(),
      quoteId: project.id,
      folio: project.folio,
      date,
      percent: Math.max(0, Math.min(100, Number(percent || 0))),
      milestone: milestone.trim(),
      notes: notes.trim(),
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
      <div className="mx-auto w-full max-w-[1600px] space-y-6">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#5496CC]">Operaciones / Obra</p>
            <h1 className="mt-2 text-3xl font-bold text-[var(--foreground)]">Avance de obra</h1>
            <p className="mt-2 text-sm text-[var(--muted)]">Registra el porcentaje de avance, hitos y observaciones por proyecto.</p>
          </div>
          <button onClick={() => openNew()} className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#5496CC] px-4 text-sm font-semibold text-white">
            <Plus size={16} /> Registrar avance
          </button>
        </header>

        <div className="grid gap-4 sm:grid-cols-3">
          <Metric label="Proyectos" value={projects.length.toString()} />
          <Metric label="Avance promedio" value={`${average}%`} />
          <Metric label="Registros" value={records.length.toString()} />
        </div>

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
          <div className="relative max-w-xl">
            <Search size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar proyecto, folio o cliente..." className="w-full rounded-xl border border-[var(--border)] bg-transparent py-3 pl-11 pr-4 text-sm outline-none focus:border-[#5496CC]" />
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          {filtered.map((project) => {
            const latest = latestByProject.get(project.id)
            return (
              <div key={project.id} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold text-[#5496CC]">{project.folio}</p>
                    <h2 className="mt-1 text-lg font-bold text-[var(--foreground)]">{project.project}</h2>
                    <p className="mt-1 text-sm text-[var(--muted)]">{project.client}</p>
                  </div>
                  <button onClick={() => openNew(project)} className="rounded-lg border border-[var(--border)] px-3 py-2 text-xs font-semibold hover:border-[#5496CC]">Actualizar</button>
                </div>

                <div className="mt-5">
                  <div className="mb-2 flex justify-between text-sm"><span className="text-[var(--muted)]">Avance actual</span><strong>{latest?.percent ?? 0}%</strong></div>
                  <div className="h-3 overflow-hidden rounded-full bg-[var(--surface-soft)]"><div className="h-full rounded-full bg-[#5496CC]" style={{ width: `${latest?.percent ?? 0}%` }} /></div>
                </div>

                {latest ? (
                  <div className="mt-4 rounded-xl bg-[var(--surface-soft)] p-4 text-sm">
                    <p className="font-semibold text-[var(--foreground)]">{latest.milestone || 'Sin hito registrado'}</p>
                    <p className="mt-1 text-xs text-[var(--muted)]">{latest.date}</p>
                    {latest.notes ? <p className="mt-2 text-[var(--muted)]">{latest.notes}</p> : null}
                  </div>
                ) : <p className="mt-4 text-sm text-[var(--muted)]">Sin avances registrados todavía.</p>}
              </div>
            )
          })}
        </div>

        {records.length ? (
          <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
            <div className="border-b border-[var(--border)] px-5 py-4"><h2 className="font-bold">Historial de avances</h2></div>
            <div className="overflow-x-auto">
              <table className="min-w-[900px] w-full text-left text-sm">
                <thead className="bg-[var(--surface-soft)] text-xs uppercase text-[var(--muted)]"><tr><th className="px-5 py-3">Fecha</th><th className="px-5 py-3">Folio</th><th className="px-5 py-3">Avance</th><th className="px-5 py-3">Hito</th><th className="px-5 py-3">Acción</th></tr></thead>
                <tbody className="divide-y divide-[var(--border)]">{records.map((record) => <tr key={record.id}><td className="px-5 py-4">{record.date}</td><td className="px-5 py-4 text-[#5496CC]">{record.folio}</td><td className="px-5 py-4 font-semibold">{record.percent}%</td><td className="px-5 py-4">{record.milestone || '—'}</td><td className="px-5 py-4"><button onClick={() => remove(record.id)} className="text-red-500"><Trash2 size={15} /></button></td></tr>)}</tbody>
              </table>
            </div>
          </div>
        ) : null}
      </div>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-[var(--surface)] p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between"><div><p className="text-xs font-semibold uppercase tracking-wide text-[#5496CC]">Operación</p><h2 className="text-xl font-bold">Registrar avance</h2></div><button onClick={() => setOpen(false)}><X size={18} /></button></div>
            <form onSubmit={save} className="space-y-4">
              <label className="block space-y-2"><span className="text-sm font-semibold">Proyecto</span><select required value={quoteId} onChange={(e) => setQuoteId(e.target.value)} className="w-full rounded-xl border border-[var(--border)] bg-transparent px-4 py-3"><option value="">Seleccionar proyecto</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.folio} — {project.project}</option>)}</select></label>
              <div className="grid gap-4 sm:grid-cols-2"><label className="space-y-2"><span className="text-sm font-semibold">Fecha</span><input type="date" required value={date} onChange={(e) => setDate(e.target.value)} className="w-full rounded-xl border border-[var(--border)] bg-transparent px-4 py-3" /></label><label className="space-y-2"><span className="text-sm font-semibold">Avance (%)</span><input type="number" min="0" max="100" required value={percent} onChange={(e) => setPercent(e.target.value)} className="w-full rounded-xl border border-[var(--border)] bg-transparent px-4 py-3" /></label></div>
              <label className="block space-y-2"><span className="text-sm font-semibold">Hito / actividad principal</span><input value={milestone} onChange={(e) => setMilestone(e.target.value)} placeholder="Ej. Colado de losa nivel 2" className="w-full rounded-xl border border-[var(--border)] bg-transparent px-4 py-3" /></label>
              <label className="block space-y-2"><span className="text-sm font-semibold">Observaciones</span><textarea rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full rounded-xl border border-[var(--border)] bg-transparent px-4 py-3" /></label>
              <div className="flex justify-end gap-3"><button type="button" onClick={() => setOpen(false)} className="rounded-xl border border-[var(--border)] px-5 py-3 font-semibold">Cancelar</button><button type="submit" className="rounded-xl bg-[#5496CC] px-5 py-3 font-semibold text-white">Guardar avance</button></div>
            </form>
          </div>
        </div>
      ) : null}
    </AppShell>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5"><BarChart3 className="text-[#5496CC]" size={19} /><p className="mt-3 text-2xl font-bold">{value}</p><p className="mt-1 text-sm text-[var(--muted)]">{label}</p></div>
}
