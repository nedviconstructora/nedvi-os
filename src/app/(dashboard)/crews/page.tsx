'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import { Pencil, Plus, Search, Trash2, UserRound, X } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import {
  CREWS_STORAGE_KEY,
  type Crew,
  readCrews,
  writeCrews,
} from '@/features/operations/services/operationsStorage'

type CrewForm = {
  name: string
  foreman: string
  specialty: string
  members: string
  active: boolean
}

const emptyForm: CrewForm = {
  name: '',
  foreman: '',
  specialty: '',
  members: '',
  active: true,
}

export default function CrewsPage() {
  const [crews, setCrews] = useState<Crew[]>([])
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<CrewForm>(emptyForm)

  function loadData() {
    setCrews(readCrews())
  }

  useEffect(() => {
    loadData()
    const handleStorage = (event: StorageEvent) => {
      if (event.key === CREWS_STORAGE_KEY) loadData()
    }
    window.addEventListener('storage', handleStorage)
    window.addEventListener('focus', loadData)
    return () => {
      window.removeEventListener('storage', handleStorage)
      window.removeEventListener('focus', loadData)
    }
  }, [])

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return crews
    return crews.filter((crew) =>
      [crew.name, crew.foreman, crew.specialty, crew.members.join(' ')]
        .join(' ')
        .toLowerCase()
        .includes(query),
    )
  }, [crews, search])

  function openNew() {
    setEditingId(null)
    setForm(emptyForm)
    setOpen(true)
  }

  function openEdit(crew: Crew) {
    setEditingId(crew.id)
    setForm({
      name: crew.name,
      foreman: crew.foreman,
      specialty: crew.specialty,
      members: crew.members.join('\n'),
      active: crew.active,
    })
    setOpen(true)
  }

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const members = form.members
      .split(/\n|,/)
      .map((value) => value.trim())
      .filter(Boolean)

    const crew: Crew = {
      id: editingId ?? crypto.randomUUID(),
      name: form.name.trim(),
      foreman: form.foreman.trim(),
      specialty: form.specialty.trim(),
      members,
      active: form.active,
    }

    const next = editingId
      ? crews.map((item) => (item.id === editingId ? crew : item))
      : [crew, ...crews]
    setCrews(next)
    writeCrews(next)
    setOpen(false)
    setEditingId(null)
    setForm(emptyForm)
  }

  function remove(id: string) {
    if (!window.confirm('¿Eliminar esta cuadrilla?')) return
    const next = crews.filter((crew) => crew.id !== id)
    setCrews(next)
    writeCrews(next)
  }

  const totalMembers = crews.reduce((sum, crew) => sum + crew.members.length, 0)
  const activeCrews = crews.filter((crew) => crew.active).length

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-[1600px] space-y-6">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#5496CC]">Operaciones / Obra</p>
            <h1 className="mt-2 text-3xl font-bold text-[var(--foreground)]">Cuadrillas</h1>
            <p className="mt-2 text-sm text-[var(--muted)]">Administra responsables, especialidades e integrantes de cada cuadrilla.</p>
          </div>
          <button onClick={openNew} className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#5496CC] px-4 text-sm font-semibold text-white"><Plus size={16} /> Nueva cuadrilla</button>
        </header>

        <div className="grid gap-4 sm:grid-cols-3"><Metric label="Cuadrillas" value={crews.length.toString()} /><Metric label="Activas" value={activeCrews.toString()} /><Metric label="Integrantes" value={totalMembers.toString()} /></div>

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4"><div className="relative max-w-xl"><Search size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--muted)]" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar cuadrilla, responsable o especialidad..." className="w-full rounded-xl border border-[var(--border)] bg-transparent py-3 pl-11 pr-4 text-sm outline-none focus:border-[#5496CC]" /></div></div>

        {filtered.length === 0 ? <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-6 py-16 text-center"><UserRound className="mx-auto text-[#5496CC]" size={32} /><h2 className="mt-4 text-lg font-bold">Todavía no hay cuadrillas</h2><p className="mt-2 text-sm text-[var(--muted)]">Crea la primera cuadrilla para comenzar a organizar al personal de obra.</p></div> : <div className="grid gap-4 xl:grid-cols-2">{filtered.map((crew) => <article key={crew.id} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4"><div><div className="flex items-center gap-2"><h2 className="text-lg font-bold">{crew.name}</h2><span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${crew.active ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-500/10 text-slate-500'}`}>{crew.active ? 'Activa' : 'Inactiva'}</span></div><p className="mt-1 text-sm text-[var(--muted)]">{crew.specialty || 'Sin especialidad'}</p></div><div className="flex gap-1"><button onClick={() => openEdit(crew)} className="rounded-lg p-2 hover:bg-[var(--surface-soft)]"><Pencil size={15} /></button><button onClick={() => remove(crew.id)} className="rounded-lg p-2 text-red-500 hover:bg-red-500/10"><Trash2 size={15} /></button></div></div>
          <div className="mt-4 rounded-xl bg-[var(--surface-soft)] p-4"><p className="text-xs uppercase text-[var(--muted)]">Responsable / Cabo</p><p className="mt-1 font-semibold">{crew.foreman}</p></div>
          <div className="mt-4"><p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Integrantes ({crew.members.length})</p>{crew.members.length ? <div className="mt-2 flex flex-wrap gap-2">{crew.members.map((member) => <span key={member} className="rounded-full border border-[var(--border)] px-3 py-1.5 text-xs">{member}</span>)}</div> : <p className="mt-2 text-sm text-[var(--muted)]">Sin integrantes registrados.</p>}</div>
        </article>)}</div>}
      </div>

      {open ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4"><div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-[var(--surface)] p-6 shadow-2xl"><div className="mb-5 flex items-center justify-between"><div><p className="text-xs font-semibold uppercase tracking-wide text-[#5496CC]">Personal de obra</p><h2 className="text-xl font-bold">{editingId ? 'Editar cuadrilla' : 'Nueva cuadrilla'}</h2></div><button onClick={() => setOpen(false)}><X size={18} /></button></div><form onSubmit={save} className="space-y-4">
        <label className="block space-y-2"><span className="text-sm font-semibold">Nombre de la cuadrilla *</span><input required value={form.name} onChange={(e) => setForm((current) => ({ ...current, name: e.target.value }))} placeholder="Ej. Cuadrilla Albañilería A" className="w-full rounded-xl border border-[var(--border)] bg-transparent px-4 py-3" /></label>
        <div className="grid gap-4 sm:grid-cols-2"><label className="space-y-2"><span className="text-sm font-semibold">Responsable / Cabo *</span><input required value={form.foreman} onChange={(e) => setForm((current) => ({ ...current, foreman: e.target.value }))} className="w-full rounded-xl border border-[var(--border)] bg-transparent px-4 py-3" /></label><label className="space-y-2"><span className="text-sm font-semibold">Especialidad</span><input value={form.specialty} onChange={(e) => setForm((current) => ({ ...current, specialty: e.target.value }))} placeholder="Ej. Instalaciones eléctricas" className="w-full rounded-xl border border-[var(--border)] bg-transparent px-4 py-3" /></label></div>
        <label className="block space-y-2"><span className="text-sm font-semibold">Integrantes</span><textarea rows={6} value={form.members} onChange={(e) => setForm((current) => ({ ...current, members: e.target.value }))} placeholder="Un nombre por línea o separados por comas" className="w-full rounded-xl border border-[var(--border)] bg-transparent px-4 py-3" /></label>
        <label className="flex items-center gap-3 rounded-xl border border-[var(--border)] p-4"><input type="checkbox" checked={form.active} onChange={(e) => setForm((current) => ({ ...current, active: e.target.checked }))} /><span className="text-sm font-semibold">Cuadrilla activa</span></label>
        <div className="flex justify-end gap-3"><button type="button" onClick={() => setOpen(false)} className="rounded-xl border border-[var(--border)] px-5 py-3 font-semibold">Cancelar</button><button type="submit" className="rounded-xl bg-[#5496CC] px-5 py-3 font-semibold text-white">Guardar cuadrilla</button></div>
      </form></div></div> : null}
    </AppShell>
  )
}

function Metric({ label, value }: { label: string; value: string }) { return <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5"><UserRound className="text-[#5496CC]" size={19} /><p className="mt-3 text-2xl font-bold">{value}</p><p className="mt-1 text-sm text-[var(--muted)]">{label}</p></div> }
