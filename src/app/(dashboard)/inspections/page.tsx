'use client'

import { ChangeEvent, FormEvent, useEffect, useState } from 'react'
import { Camera, ClipboardCheck, Pencil, Plus, RefreshCw, Trash2, X } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { createClient } from '@/lib/supabase/client'

type ProjectOption = { id: string; name: string; folio: string | null }
type CheckItem = { label: string; done: boolean }
type Photo = { path: string; name: string }
type Inspection = {
  id: string; project_id: string; inspection_date: string; area: string; inspector: string
  status: string; notes: string; checklist: CheckItem[]; photos: Photo[]
}
const template = ['Seguridad y EPP', 'Estado de los trabajos', 'Calidad de materiales', 'Orden y limpieza', 'Instalaciones y acabados']
const emptyChecks = (): CheckItem[] => template.map(label => ({ label, done: false }))
const today = () => new Date().toLocaleDateString('en-CA')
const inputClass = 'w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm text-[var(--foreground)]'
const btnClass = 'inline-flex items-center gap-2 rounded-lg border border-[#5496CC]/40 px-3 py-2 text-xs font-semibold text-[#5496CC] hover:bg-[#5496CC]/10'

export default function InspectionsPage() {
  const [projects, setProjects] = useState<ProjectOption[]>([])
  const [records, setRecords] = useState<Inspection[]>([])
  const [photosByPath, setPhotosByPath] = useState<Record<string,string>>({})
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [projectId, setProjectId] = useState('')
  const [date, setDate] = useState(today())
  const [area, setArea] = useState('')
  const [inspector, setInspector] = useState('')
  const [status, setStatus] = useState('Pendiente')
  const [notes, setNotes] = useState('')
  const [checks, setChecks] = useState<CheckItem[]>(emptyChecks)
  const [photos, setPhotos] = useState<Photo[]>([])
  const [files, setFiles] = useState<File[]>([])
  const [filter, setFilter] = useState('')

  async function load() {
    setLoading(true)
    setError('')
    try {
      const supabase = createClient()
      const [projectResult, inspectionResult] = await Promise.all([
        supabase.from('projects').select('id,name,folio').order('created_at', { ascending: false }),
        supabase.from('site_inspections').select('*').order('inspection_date',{ascending:false})
      ])
      if (projectResult.error) throw projectResult.error
      if (inspectionResult.error) throw inspectionResult.error
      setProjects((projectResult.data || []) as ProjectOption[])
      const loaded = (inspectionResult.data || []) as Inspection[]
      setRecords(loaded)
      const all = loaded.flatMap(record => record.photos || []).map(photo => photo.path)
      const urls: Record<string,string> = {}
      await Promise.all(all.map(async path => {
        const {data} = await supabase.storage.from('inspection-photos').createSignedUrl(path,3600)
        if (data?.signedUrl) urls[path]=data.signedUrl
      }))
      setPhotosByPath(urls)
    } catch(e) { setError(e instanceof Error ? e.message : 'No se pudieron cargar las inspecciones.') }
    finally { setLoading(false) }
  }
  useEffect(() => { void load() }, [])

  function newInspection() {
    setEditingId(null); setProjectId(''); setDate(today()); setArea(''); setInspector('')
    setStatus('Pendiente'); setNotes(''); setChecks(emptyChecks()); setPhotos([]); setFiles([]); setOpen(true)
  }
  function editInspection(record: Inspection) {
    setEditingId(record.id); setProjectId(record.project_id); setDate(record.inspection_date)
    setArea(record.area); setInspector(record.inspector); setStatus(record.status)
    setNotes(record.notes); setChecks(record.checklist || emptyChecks()); setPhotos(record.photos || [])
    setFiles([]); setOpen(true)
  }
  function handleFiles(event: ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files || [])
    event.target.value = ''
    const accepted = selected.filter(file => ['image/jpeg','image/png','image/webp'].includes(file.type) && file.size <= 6*1024*1024)
    if (accepted.length !== selected.length) window.alert('Solo JPG, PNG o WEBP de hasta 6 MB por fotografía.')
    setFiles(current => [...current,...accepted].slice(0,12-photos.length))
  }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!projectId || !inspector.trim() || !area.trim()) return
    setSaving(true); setError('')
    const supabase = createClient()
    const uploaded: string[] = []
    try {
      const {data: auth} = await supabase.auth.getUser()
      if (!auth.user) throw new Error('Inicia sesión nuevamente.')
      const payload = {
        project_id: projectId, inspection_date: date, area: area.trim(), inspector: inspector.trim(),
        status, notes: notes.trim(), checklist: checks, photos,
      }
      let id = editingId
      if (id) {
        const {error:e} = await supabase.from('site_inspections').update(payload).eq('id',id)
        if (e) throw e
      } else {
        const {data,error:e} = await supabase.from('site_inspections').insert({...payload,created_by:auth.user.id}).select('id').single()
        if (e || !data) throw e || new Error('No se creó la inspección.')
        id = data.id
      }
      const nextPhotos = [...photos]
      for (const file of files) {
        const path = id + '/' + crypto.randomUUID() + '.' + (file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg')
        const {error:e} = await supabase.storage.from('inspection-photos').upload(path,file,{contentType:file.type,upsert:false})
        if (e) throw e
        uploaded.push(path)
        nextPhotos.push({path,name:file.name})
      }
      if (uploaded.length && id) {
        const {error:e} = await supabase.from('site_inspections').update({photos:nextPhotos}).eq('id',id)
        if (e) throw e
      }
      setOpen(false); await load()
    } catch(e) {
      // Clean uploaded files on failure; keep records and draft visible for retry.
      if (uploaded.length) await supabase.storage.from('inspection-photos').remove(uploaded)
      setError(e instanceof Error ? e.message : 'No se pudo guardar la inspección.')
    } finally { setSaving(false) }
  }
  async function remove(record: Inspection) {
    if (!window.confirm('¿Eliminar esta inspección y sus fotografías? La operación no se puede deshacer.')) return
    setError('')
    try {
      const supabase=createClient()
      const {error:e}=await supabase.from('site_inspections').delete().eq('id',record.id)
      if (e) throw e
      if (record.photos?.length) {
        const {error:storageError}=await supabase.storage.from('inspection-photos').remove(record.photos.map(p=>p.path))
        if(storageError) console.warn('Quedaron archivos para limpieza administrativa:',storageError)
      }
      await load()
    } catch(e) {setError(e instanceof Error?e.message:'No se pudo eliminar la inspección.')}
  }

  const visible = records.filter(r => !filter || r.project_id === filter)
  return <AppShell>
    <div className="mx-auto max-w-[1650px] space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div><p className="text-xs font-semibold uppercase tracking-widest text-[#5496CC]">OPERACIONES / OBRA</p>
          <h1 className="mt-2 text-3xl font-bold">Inspecciones de obra</h1>
          <p className="mt-2 text-sm text-[var(--muted)]">Checklists, observaciones y fotografías vinculadas a proyectos.</p></div>
        <div className="flex gap-2"><button onClick={()=>void load()} className={btnClass}><RefreshCw size={15}/> Actualizar</button>
          <button onClick={newInspection} className="inline-flex items-center gap-2 rounded-lg bg-[#5496CC] px-4 py-2.5 text-sm font-semibold text-white"><Plus size={16}/> Nueva inspección</button></div>
      </header>
      {error && <div role="alert" className="rounded-xl border border-red-400/30 bg-red-400/10 p-4 text-sm text-red-500">{error}</div>}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
        <label className="block text-xs font-semibold text-[var(--muted)]">Filtrar por proyecto</label>
        <select className={inputClass+' mt-2 max-w-xl'} value={filter} onChange={e=>setFilter(e.target.value)}>
          <option value="">Todos los proyectos</option>{projects.map(p=><option key={p.id} value={p.id}>{p.folio||'Sin folio'} · {p.name}</option>)}
        </select>
      </div>
      {loading ? <p className="p-8 text-sm text-[var(--muted)]">Cargando inspecciones…</p> : !visible.length ?
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-12 text-center text-[var(--muted)]"><ClipboardCheck className="mx-auto mb-3" size={34}/> Aún no hay inspecciones registradas.</div> :
        <div className="grid gap-4 lg:grid-cols-2">{visible.map(record=><article key={record.id} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div><p className="text-xs text-[#5496CC]">{record.inspection_date}</p><h2 className="mt-1 text-lg font-bold">{record.area}</h2>
              <p className="text-sm text-[var(--muted)]">{projects.find(p=>p.id===record.project_id)?.name || 'Proyecto'} · {record.inspector}</p></div>
            <span className="rounded-full bg-[#5496CC]/10 px-3 py-1 text-xs font-semibold text-[#5496CC]">{record.status}</span>
          </div>
          <p className="whitespace-pre-wrap text-sm">{record.notes || 'Sin observaciones.'}</p>
          <div className="space-y-1">{(record.checklist||[]).map((c,i)=><p key={i} className="text-xs"><span className={c.done?'text-emerald-500':'text-amber-500'}>{c.done?'✓':'○'}</span> {c.label}</p>)}</div>
          {!!record.photos?.length && <div className="grid grid-cols-3 gap-2">{record.photos.map(p=><a key={p.path} href={photosByPath[p.path]||'#'} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-lg border border-[var(--border)]">{photosByPath[p.path] ? <img src={photosByPath[p.path]} alt={p.name} className="h-28 w-full object-cover"/> : <div className="p-3 text-xs">Foto no disponible</div>}</a>)}</div>}
          <div className="flex justify-end gap-2 border-t border-[var(--border)] pt-3">
            <button onClick={()=>editInspection(record)} className={btnClass}><Pencil size={14}/> Editar</button>
            <button onClick={()=>void remove(record)} className="inline-flex items-center gap-2 rounded-lg border border-red-500/30 px-3 py-2 text-xs font-semibold text-red-500"><Trash2 size={14}/> Eliminar</button>
          </div>
        </article>)}</div>}
    </div>
    {open && <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/65 p-4"><div className="max-h-[94vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-[var(--surface)] p-6 shadow-2xl">
      <div className="flex justify-between gap-3"><h2 className="text-xl font-bold">{editingId?'Editar inspección':'Nueva inspección'}</h2><button onClick={()=>setOpen(false)} aria-label="Cerrar"><X size={18}/></button></div>
      <form className="mt-5 space-y-4" onSubmit={e=>void save(e)}>
        <label className="block text-sm font-semibold">Proyecto<select required className={inputClass+' mt-1'} value={projectId} onChange={e=>setProjectId(e.target.value)}>
          <option value="">Seleccionar proyecto</option>{projects.map(p=><option key={p.id} value={p.id}>{p.folio||'Sin folio'} · {p.name}</option>)}</select></label>
        <div className="grid gap-3 sm:grid-cols-2"><label className="text-sm font-semibold">Fecha<input required type="date" className={inputClass+' mt-1'} value={date} onChange={e=>setDate(e.target.value)}/></label>
          <label className="text-sm font-semibold">Inspector / Responsable<input required className={inputClass+' mt-1'} value={inspector} onChange={e=>setInspector(e.target.value)} placeholder="Nombre del supervisor"/></label></div>
        <div className="grid gap-3 sm:grid-cols-2"><label className="text-sm font-semibold">Área inspeccionada<input required className={inputClass+' mt-1'} value={area} onChange={e=>setArea(e.target.value)} placeholder="Ej. Instalación eléctrica"/></label>
          <label className="text-sm font-semibold">Estado<select className={inputClass+' mt-1'} value={status} onChange={e=>setStatus(e.target.value)}><option>Pendiente</option><option>Con observaciones</option><option>Aprobada</option></select></label></div>
        <div className="rounded-xl border border-[var(--border)] p-4"><h3 className="font-semibold">Lista de verificación</h3><div className="mt-3 space-y-2">{checks.map((c,i)=><label key={i} className="flex items-center gap-3 text-sm"><input type="checkbox" checked={c.done} onChange={e=>setChecks(a=>a.map((x,j)=>j===i?{...x,done:e.target.checked}:x))}/>{c.label}</label>)}</div></div>
        <label className="block text-sm font-semibold">Observaciones<textarea className={inputClass+' mt-1 min-h-24'} value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Hallazgos, correcciones necesarias y seguimiento"/></label>
        <div className="rounded-xl border border-[var(--border)] p-4"><div className="flex items-center gap-2 font-semibold"><Camera size={17}/> Evidencia fotográfica</div>
          <input className="mt-3 block w-full text-sm" type="file" multiple accept="image/jpeg,image/png,image/webp" capture={undefined} onChange={handleFiles}/>
          <p className="mt-2 text-xs text-[var(--muted)]">Hasta 12 fotografías, máximo 6 MB cada una. Almacenamiento privado en Supabase.</p>
          {!!photos.length && <div className="mt-3 space-y-1">{photos.map(p=><div key={p.path} className="flex items-center justify-between gap-2 text-xs"><span>{p.name}</span><button type="button" className="text-red-500" onClick={()=>setPhotos(a=>a.filter(x=>x.path!==p.path))}>Quitar del registro</button></div>)}</div>}
          {!!files.length && <div className="mt-3 space-y-1">{files.map((f,i)=><div key={i} className="flex items-center justify-between gap-2 text-xs"><span>{f.name}</span><button type="button" className="text-red-500" onClick={()=>setFiles(a=>a.filter((_,j)=>j!==i))}>Quitar</button></div>)}</div>}
        </div>
        <div className="flex justify-end gap-2"><button type="button" onClick={()=>setOpen(false)} className={btnClass}>Cancelar</button><button disabled={saving} type="submit" className="rounded-lg bg-[#5496CC] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{saving?'Guardando…':'Guardar inspección'}</button></div>
      </form></div></div>}
  </AppShell>
}
