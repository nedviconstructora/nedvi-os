'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import { CalendarDays, Plus, Search, Trash2, UsersRound, X } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import {
  ATTENDANCE_STORAGE_KEY,
  CREWS_STORAGE_KEY,
  type AttendanceRecord,
  type AttendanceStatus,
  type Crew,
  type OperationProject,
  readAttendance,
  readCrews,
  readOperationProjects,
  writeAttendance,
} from '@/features/operations/services/operationsStorage'

function today() {
  return new Date().toISOString().slice(0, 10)
}

export default function AttendancePage() {
  const [projects, setProjects] = useState<OperationProject[]>([])
  const [crews, setCrews] = useState<Crew[]>([])
  const [records, setRecords] = useState<AttendanceRecord[]>([])
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const [quoteId, setQuoteId] = useState('')
  const [crewId, setCrewId] = useState('')
  const [person, setPerson] = useState('')
  const [date, setDate] = useState(today())
  const [status, setStatus] = useState<AttendanceStatus>('Presente')
  const [checkIn, setCheckIn] = useState('')
  const [checkOut, setCheckOut] = useState('')

  function loadData() {
    const currentProjects = readOperationProjects()
    const currentCrews = readCrews()
    const validProjectIds = new Set(currentProjects.map((project) => project.id))
    const currentRecords = readAttendance().filter((record) => validProjectIds.has(record.quoteId))
    setProjects(currentProjects)
    setCrews(currentCrews)
    setRecords(currentRecords)
    writeAttendance(currentRecords)
  }

  useEffect(() => {
    loadData()
    const handleStorage = (event: StorageEvent) => {
      if (
        event.key === 'nedvi_quotes' ||
        event.key === ATTENDANCE_STORAGE_KEY ||
        event.key === CREWS_STORAGE_KEY
      ) loadData()
    }
    window.addEventListener('storage', handleStorage)
    window.addEventListener('focus', loadData)
    return () => {
      window.removeEventListener('storage', handleStorage)
      window.removeEventListener('focus', loadData)
    }
  }, [])

  const projectById = useMemo(() => new Map(projects.map((project) => [project.id, project])), [projects])
  const crewById = useMemo(() => new Map(crews.map((crew) => [crew.id, crew])), [crews])
  const selectedCrew = crews.find((crew) => crew.id === crewId)

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return records
    return records.filter((record) => {
      const project = projectById.get(record.quoteId)
      const crew = record.crewId ? crewById.get(record.crewId) : undefined
      return [record.person, record.folio, project?.project ?? '', crew?.name ?? '', record.date, record.status]
        .join(' ')
        .toLowerCase()
        .includes(query)
    })
  }, [records, search, projectById, crewById])

  const todayRecords = records.filter((record) => record.date === today())
  const presentToday = todayRecords.filter((record) => record.status === 'Presente').length
  const lateToday = todayRecords.filter((record) => record.status === 'Retardo').length
  const absentToday = todayRecords.filter((record) => record.status === 'Ausente').length

  function resetForm() {
    setQuoteId('')
    setCrewId('')
    setPerson('')
    setDate(today())
    setStatus('Presente')
    setCheckIn('')
    setCheckOut('')
  }

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const project = projects.find((item) => item.id === quoteId)
    if (!project || !person.trim()) return

    const record: AttendanceRecord = {
      id: crypto.randomUUID(),
      quoteId: project.id,
      folio: project.folio,
      crewId: crewId || undefined,
      person: person.trim(),
      date,
      status,
      checkIn,
      checkOut,
    }

    const next = [record, ...records]
    setRecords(next)
    writeAttendance(next)
    setOpen(false)
    resetForm()
  }

  function remove(id: string) {
    if (!window.confirm('¿Eliminar este registro de asistencia?')) return
    const next = records.filter((record) => record.id !== id)
    setRecords(next)
    writeAttendance(next)
  }

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-[1600px] space-y-6">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#5496CC]">Operaciones / Obra</p>
            <h1 className="mt-2 text-3xl font-bold text-[var(--foreground)]">Asistencias</h1>
            <p className="mt-2 text-sm text-[var(--muted)]">Registra asistencia, retardos y horarios del personal en obra.</p>
          </div>
          <button onClick={() => setOpen(true)} className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#5496CC] px-4 text-sm font-semibold text-white"><Plus size={16} /> Registrar asistencia</button>
        </header>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Metric label="Registros de hoy" value={todayRecords.length.toString()} /><Metric label="Presentes" value={presentToday.toString()} /><Metric label="Retardos" value={lateToday.toString()} /><Metric label="Ausentes" value={absentToday.toString()} /></div>

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4"><div className="relative max-w-xl"><Search size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--muted)]" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar persona, proyecto, cuadrilla o fecha..." className="w-full rounded-xl border border-[var(--border)] bg-transparent py-3 pl-11 pr-4 text-sm outline-none focus:border-[#5496CC]" /></div></div>

        <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
          {filtered.length === 0 ? <div className="px-6 py-16 text-center"><UsersRound className="mx-auto text-[#5496CC]" size={32} /><h2 className="mt-4 text-lg font-bold">Todavía no hay asistencias</h2><p className="mt-2 text-sm text-[var(--muted)]">Registra la primera asistencia del personal de obra.</p></div> : <div className="overflow-x-auto"><table className="min-w-[1050px] w-full text-left text-sm"><thead className="bg-[var(--surface-soft)] text-xs uppercase text-[var(--muted)]"><tr><th className="px-5 py-4">Fecha</th><th className="px-5 py-4">Persona</th><th className="px-5 py-4">Proyecto</th><th className="px-5 py-4">Cuadrilla</th><th className="px-5 py-4">Estado</th><th className="px-5 py-4">Entrada</th><th className="px-5 py-4">Salida</th><th className="px-5 py-4">Acción</th></tr></thead><tbody className="divide-y divide-[var(--border)]">{filtered.map((record) => {
            const project = projectById.get(record.quoteId)
            const crew = record.crewId ? crewById.get(record.crewId) : undefined
            return <tr key={record.id}><td className="px-5 py-4">{record.date}</td><td className="px-5 py-4 font-semibold">{record.person}</td><td className="px-5 py-4"><p>{project?.project ?? 'Proyecto'}</p><p className="mt-1 text-xs text-[#5496CC]">{record.folio}</p></td><td className="px-5 py-4">{crew?.name ?? 'Sin cuadrilla'}</td><td className="px-5 py-4"><span className={`rounded-full px-3 py-1.5 text-xs font-semibold ${record.status === 'Presente' ? 'bg-emerald-500/10 text-emerald-500' : record.status === 'Retardo' ? 'bg-amber-500/10 text-amber-500' : 'bg-red-500/10 text-red-500'}`}>{record.status}</span></td><td className="px-5 py-4">{record.checkIn || '—'}</td><td className="px-5 py-4">{record.checkOut || '—'}</td><td className="px-5 py-4"><button onClick={() => remove(record.id)} className="text-red-500"><Trash2 size={15} /></button></td></tr>
          })}</tbody></table></div>}
        </div>
      </div>

      {open ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4"><div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-[var(--surface)] p-6 shadow-2xl"><div className="mb-5 flex items-center justify-between"><div><p className="text-xs font-semibold uppercase tracking-wide text-[#5496CC]">Control de personal</p><h2 className="text-xl font-bold">Registrar asistencia</h2></div><button onClick={() => setOpen(false)}><X size={18} /></button></div><form onSubmit={save} className="space-y-4">
        <label className="block space-y-2"><span className="text-sm font-semibold">Proyecto</span><select required value={quoteId} onChange={(e) => setQuoteId(e.target.value)} className="w-full rounded-xl border border-[var(--border)] bg-transparent px-4 py-3"><option value="">Seleccionar proyecto</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.folio} — {project.project}</option>)}</select></label>
        <div className="grid gap-4 sm:grid-cols-2"><label className="space-y-2"><span className="text-sm font-semibold">Cuadrilla</span><select value={crewId} onChange={(e) => { setCrewId(e.target.value); setPerson('') }} className="w-full rounded-xl border border-[var(--border)] bg-transparent px-4 py-3"><option value="">Sin cuadrilla</option>{crews.filter((crew) => crew.active).map((crew) => <option key={crew.id} value={crew.id}>{crew.name}</option>)}</select></label><label className="space-y-2"><span className="text-sm font-semibold">Fecha</span><input type="date" required value={date} onChange={(e) => setDate(e.target.value)} className="w-full rounded-xl border border-[var(--border)] bg-transparent px-4 py-3" /></label></div>
        {selectedCrew && selectedCrew.members.length ? <label className="block space-y-2"><span className="text-sm font-semibold">Persona</span><select required value={person} onChange={(e) => setPerson(e.target.value)} className="w-full rounded-xl border border-[var(--border)] bg-transparent px-4 py-3"><option value="">Seleccionar integrante</option>{selectedCrew.members.map((member) => <option key={member} value={member}>{member}</option>)}</select></label> : <label className="block space-y-2"><span className="text-sm font-semibold">Persona</span><input required value={person} onChange={(e) => setPerson(e.target.value)} className="w-full rounded-xl border border-[var(--border)] bg-transparent px-4 py-3" /></label>}
        <label className="block space-y-2"><span className="text-sm font-semibold">Estado</span><select value={status} onChange={(e) => setStatus(e.target.value as AttendanceStatus)} className="w-full rounded-xl border border-[var(--border)] bg-transparent px-4 py-3"><option>Presente</option><option>Retardo</option><option>Ausente</option></select></label>
        <div className="grid gap-4 sm:grid-cols-2"><label className="space-y-2"><span className="text-sm font-semibold">Hora entrada</span><input type="time" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} className="w-full rounded-xl border border-[var(--border)] bg-transparent px-4 py-3" /></label><label className="space-y-2"><span className="text-sm font-semibold">Hora salida</span><input type="time" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} className="w-full rounded-xl border border-[var(--border)] bg-transparent px-4 py-3" /></label></div>
        <div className="flex justify-end gap-3"><button type="button" onClick={() => setOpen(false)} className="rounded-xl border border-[var(--border)] px-5 py-3 font-semibold">Cancelar</button><button type="submit" className="rounded-xl bg-[#5496CC] px-5 py-3 font-semibold text-white">Guardar asistencia</button></div>
      </form></div></div> : null}
    </AppShell>
  )
}

function Metric({ label, value }: { label: string; value: string }) { return <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5"><CalendarDays className="text-[#5496CC]" size={19} /><p className="mt-3 text-2xl font-bold">{value}</p><p className="mt-1 text-sm text-[var(--muted)]">{label}</p></div> }
