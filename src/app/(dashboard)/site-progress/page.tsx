'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import { BarChart3, Eye, Plus, Search, Trash2, X } from 'lucide-react'
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

export default function SiteProgressPage() {
  const [projects, setProjects] = useState<OperationProject[]>([])
  const [records, setRecords] = useState<ProgressRecord[]>([])
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const [viewingQuoteId, setViewingQuoteId] = useState('')
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
        ...projectRecords.flatMap((record) => [record.date, record.milestone, record.notes, String(record.percent)]),
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
            <p className="mt-2 text-sm text-[var(--muted)]">Consulta el avance actual por proyecto y abre su historial completo cuando lo necesites.</p>
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
              placeholder="Buscar proyecto, cliente, folio, hito u observación..."
              className="w-full rounded-xl border border-[var(--border)] bg-transparent py-3 pl-11 pr-4 text-sm outline-none focus:border-[#5496CC]"
            />
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
          {filtered.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <BarChart3 className="mx-auto text-[#5496CC]" size={32} />
              <h2 className="mt-4 text-lg font-bold">No hay proyectos para mostrar</h2>
              <p className="mt-2 text-sm text-[var(--muted)]">Los proyectos creados desde cotizaciones aparecerán aquí.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-[1080px] w-full text-left text-sm">
                <thead className="border-b border-[var(--border)] bg-[var(--surface-soft)] text-xs uppercase tracking-wide text-[var(--muted)]">
                  <tr>
                    <th className="px-5 py-4">Proyecto</th>
                    <th className="px-5 py-4">Cliente</th>
                    <th className="px-5 py-4">Avance actual</th>
                    <th className="px-5 py-4">Última actualización</th>
                    <th className="px-5 py-4">Registros</th>
                    <th className="px-5 py-4">Responsable</th>
                    <th className="px-5 py-4">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {filtered.map((project) => {
                    const projectRecords = recordsByProject.get(project.id) ?? []
                    const latest = projectRecords[0]
                    const currentPercent = latest?.percent ?? 0

                    return (
                      <tr key={project.id} className="hover:bg-[var(--surface-soft)]">
                        <td className="px-5 py-4">
                          <p className="font-semibold text-[var(--foreground)]">{project.project}</p>
                          <p className="mt-1 text-xs font-semibold text-[#5496CC]">{project.folio}</p>
                        </td>
                        <td className="px-5 py-4 text-[var(--foreground)]">{project.client}</td>
                        <td className="px-5 py-4">
                          <div className="flex min-w-[180px] items-center gap-3">
                            <div className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--surface-soft)]">
                              <div className="h-full rounded-full bg-[#5496CC]" style={{ width: `${currentPercent}%` }} />
                            </div>
                            <strong className="w-11 text-right text-[var(--foreground)]">{currentPercent}%</strong>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-[var(--foreground)]">
                          {latest ? (
                            <div>
                              <p>{formatDate(latest.date)}</p>
                              <p className="mt-1 max-w-[220px] truncate text-xs text-[var(--muted)]">{latest.milestone || 'Avance registrado'}</p>
                            </div>
                          ) : (
                            <span className="text-[var(--muted)]">Sin registrar</span>
                          )}
                        </td>
                        <td className="px-5 py-4 font-semibold text-[var(--foreground)]">{projectRecords.length}</td>
                        <td className="px-5 py-4 text-[var(--foreground)]">{project.owner || 'Sin responsable'}</td>
                        <td className="px-5 py-4">
                          <div className="flex flex-wrap gap-2">
                            {projectRecords.length > 0 ? (
                              <button
                                type="button"
                                onClick={() => setViewingQuoteId(project.id)}
                                className="inline-flex items-center gap-2 rounded-lg border border-[#5496CC]/40 px-3 py-2 text-xs font-semibold text-[#5496CC] transition hover:bg-[#5496CC]/10"
                              >
                                <Eye size={14} /> Ver avances
                              </button>
                            ) : null}
                            <button
                              type="button"
                              onClick={() => openNew(project)}
                              className="rounded-lg border border-[var(--border)] px-3 py-2 text-xs font-semibold text-[var(--foreground)] transition hover:border-[#5496CC] hover:text-[#5496CC]"
                            >
                              {latest ? 'Actualizar' : 'Registrar'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {viewingProject ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4">
          <div className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-2xl bg-[var(--surface)] p-6 shadow-2xl">
            <div className="flex flex-col gap-4 border-b border-[var(--border)] pb-5 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#5496CC]">Historial de avance · {viewingProject.folio}</p>
                <h2 className="mt-2 text-2xl font-bold text-[var(--foreground)]">{viewingProject.project}</h2>
                <p className="mt-1 text-sm text-[var(--muted)]">{viewingProject.client} · {viewingProject.owner || 'Sin responsable'}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setViewingQuoteId('')
                    openNew(viewingProject)
                  }}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#5496CC] px-4 py-2.5 text-sm font-semibold text-white"
                >
                  <Plus size={15} /> Nuevo avance
                </button>
                <button type="button" onClick={() => setViewingQuoteId('')} className="rounded-lg p-2 text-[var(--muted)] hover:bg-[var(--surface-soft)]" aria-label="Cerrar historial">
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              {viewingRecords.map((record, index) => (
                <div key={record.id} className="rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] p-4">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="rounded-full bg-[#5496CC]/10 px-3 py-1 text-xs font-bold text-[#5496CC]">{record.percent}%</span>
                        <span className="text-xs text-[var(--muted)]">{formatDate(record.date)}</span>
                        {index === 0 ? <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-500">Actual</span> : null}
                      </div>
                      <h3 className="mt-3 font-bold text-[var(--foreground)]">{record.milestone || 'Avance registrado'}</h3>
                      {record.notes ? <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[var(--muted)]">{record.notes}</p> : <p className="mt-2 text-sm text-[var(--muted)]">Sin observaciones.</p>}
                    </div>
                    <button type="button" onClick={() => remove(record.id)} className="self-start rounded-lg p-2 text-red-500 hover:bg-red-500/10" aria-label="Eliminar avance">
                      <Trash2 size={16} />
                    </button>
                  </div>

                  <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-[var(--surface)]">
                    <div className="h-full rounded-full bg-[#5496CC]" style={{ width: `${record.percent}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-[var(--surface)] p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-[#5496CC]">Operación</p>
                <h2 className="text-xl font-bold">Registrar avance</h2>
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
                <label className="space-y-2"><span className="text-sm font-semibold">Avance (%)</span><input type="number" min="0" max="100" required value={percent} onChange={(event) => setPercent(event.target.value)} className="w-full rounded-xl border border-[var(--border)] bg-transparent px-4 py-3" /></label>
              </div>

              <label className="block space-y-2"><span className="text-sm font-semibold">Hito / actividad principal</span><input value={milestone} onChange={(event) => setMilestone(event.target.value)} placeholder="Ej. Colado de losa nivel 2" className="w-full rounded-xl border border-[var(--border)] bg-transparent px-4 py-3" /></label>
              <label className="block space-y-2"><span className="text-sm font-semibold">Observaciones</span><textarea rows={4} value={notes} onChange={(event) => setNotes(event.target.value)} className="w-full rounded-xl border border-[var(--border)] bg-transparent px-4 py-3" /></label>

              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setOpen(false)} className="rounded-xl border border-[var(--border)] px-5 py-3 font-semibold">Cancelar</button>
                <button type="submit" className="rounded-xl bg-[#5496CC] px-5 py-3 font-semibold text-white">Guardar avance</button>
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
      <BarChart3 className="text-[#5496CC]" size={19} />
      <p className="mt-3 text-2xl font-bold">{value}</p>
      <p className="mt-1 text-sm text-[var(--muted)]">{label}</p>
    </div>
  )
}
