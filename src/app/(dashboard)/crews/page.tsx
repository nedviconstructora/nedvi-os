'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import { FileSpreadsheet, Pencil, Plus, Search, Trash2, UserRound, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { parseCrewExcel, type ImportedWorker } from '@/features/operations/services/crewExcelImport'
import { AppShell } from '@/components/layout/AppShell'
import { readAccessSession } from '@/features/access/services/accessStorage'
import {
  CREWS_STORAGE_KEY,
  type Crew,
  readCrews,
  writeCrews,
} from '@/features/operations/services/operationsStorage'

type CrewForm = {
  project_id: string
  name: string
  foreman: string
  specialty: string
  members: string
  active: boolean
}

const emptyForm: CrewForm = {
  project_id: '',
  name: '',
  foreman: '',
  specialty: '',
  members: '',
  active: true,
}

export default function CrewsPage() {
  const [crews, setCrews] = useState<Crew[]>([])
  const [projects, setProjects] = useState<Array<{id:string;name:string;folio:string|null}>>([])
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<CrewForm>(emptyForm)
  const [imported, setImported] = useState<ImportedWorker[]>([])
  const [importWarnings, setImportWarnings] = useState<string[]>([])
  const [importError, setImportError] = useState('')
  const [saving, setSaving] = useState(false)
  const [viewingCrew, setViewingCrew] = useState<string | null>(null)
  const [details, setDetails] = useState<Array<ImportedWorker & {id:string;employee_number?:string}>>([])
  const [detailsError, setDetailsError] = useState('')
  const [sessionName, setSessionName] = useState('')
  const [selectedFiles, setSelectedFiles] = useState<string[]>([])
  const [credentials, setCredentials] = useState<Array<{name:string;employeeNumber:string;pin:string}>>([])
  const [credentialsInfo, setCredentialsInfo] = useState('')
  const [credentialsBusy, setCredentialsBusy] = useState(false)
  const [pinCrewId,setPinCrewId]=useState<string|null>(null)
  const [pinWorkers,setPinWorkers]=useState<Array<{id:string;name:string;pin:string|null;needsReset:boolean}>>([])
  const [pinVisible,setPinVisible]=useState(false)
  const [pinError,setPinError]=useState('')

  async function refreshCrews(){ try { const r=await fetch('/api/crews',{cache:'no-store'}); if(!r.ok)return;const d=await r.json();if(!d.crews.length&&readCrews().length)return;setCrews(d.crews);writeCrews(d.crews) }catch{} }
  function loadData() {
    setCrews(readCrews())
    setSessionName(readAccessSession()?.name?.trim() || '')
  }

  useEffect(() => {
    loadData()
    void refreshCrews()
    void createClient().from('projects').select('id,name,folio').order('name').then(({data}) => {if(data)setProjects(data)})
    const interval=window.setInterval(()=>{if(document.visibilityState==='visible')void refreshCrews()},15000)
    const handleStorage = (event: StorageEvent) => {
      if (event.key === CREWS_STORAGE_KEY) loadData()
    }
    window.addEventListener('storage', handleStorage)
    window.addEventListener('focus', refreshCrews)
    return () => {
      window.removeEventListener('storage', handleStorage)
      window.removeEventListener('focus', refreshCrews)
      window.clearInterval(interval)
    }
  }, [])

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return crews
    return crews.filter((crew) =>
      [crew.name, crew.foreman, crew.specialty, crew.members.join(' '), projects.find(p=>p.id===crew.project_id)?.name || '']
        .join(' ')
        .toLowerCase()
        .includes(query),
    )
  }, [crews, search, projects])

  function openNew() {
    setEditingId(null)
    setImported([])
    setImportWarnings([])
    setImportError('')
    setSelectedFiles([])
    setForm({ ...emptyForm, foreman: readAccessSession()?.name?.trim() || '' })
    setOpen(true)
  }

  function openEdit(crew: Crew) {
    setImported([])
    setImportWarnings([])
    setImportError('')
    setSelectedFiles([])
    setEditingId(crew.id)
    setForm({
      project_id: crew.project_id || '',
      name: crew.name,
      foreman: crew.foreman,
      specialty: crew.specialty,
      members: crew.members.join('\n'),
      active: crew.active,
    })
    setOpen(true)
  }

  async function importExcel(files: FileList | null) {
    if (!files?.length) return
    setImportError('')
    setSelectedFiles(Array.from(files).map(file => file.name))
    try {
      const results = await Promise.all(Array.from(files).map(file => parseCrewExcel(file)))
      const workers = results.flatMap(result => result.workers)
      const warnings = results.flatMap((result, index) => result.warnings.map(w => files[index].name + ': ' + w))
      const seen = new Set<string>()
      const unique = workers.filter(worker => {
        const key = (worker.curp || worker.social_security_number || worker.full_name).trim().toUpperCase()
        if (seen.has(key)) { warnings.push('Registro duplicado omitido: ' + worker.full_name); return false }
        seen.add(key)
        return true
      })
      setImported(unique)
      setImportWarnings(warnings)
    } catch (error) {
      setImported([])
      setImportError(error instanceof Error ? error.message : 'No se pudo leer el archivo.')
    }
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (saving) return
    setSaving(true)
    setImportError('')
    const manualNames = form.members.split(/\n|,/).map(value => value.trim()).filter(Boolean)
    const uniqueNames = Array.from(new Set([...manualNames, ...imported.map(worker => worker.full_name)]))
    const crewId = editingId ?? crypto.randomUUID()
    const responsible = readAccessSession()?.name?.trim()
    if (!responsible) { setImportError('Inicia sesión nuevamente para identificar al responsable.'); setSaving(false); return }
    try {
      // Personal identifiers and salaries are NEVER written to localStorage.
      // Only authorized administrators can insert them into Supabase (RLS).
      if (imported.length) {
        const supabase = createClient()
        const { error } = await supabase.from('crew_workers').insert(
          imported.map(worker => ({ ...worker, crew_id: crewId }))
        )
        if (error) throw new Error('No se pudo guardar el expediente protegido: ' + error.message)
      }
      const crew: Crew = {
        id: crewId,
        project_id: form.project_id || null,
        name: form.name.trim(),
        foreman: responsible,
        specialty: form.specialty.trim(),
        members: uniqueNames,
        active: form.active,
      }
      const next = editingId
        ? crews.map(item => item.id === editingId ? crew : item)
        : [crew, ...crews]
      const res=await fetch('/api/crews',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({crews:[crew]})})
      if(!res.ok)throw new Error('No fue posible compartir esta cuadrilla en Supabase.')
      setCrews(next)
      writeCrews(next)
      await issueCredentials(crew)
      setOpen(false)
      setEditingId(null)
      setImported([])
      setForm(emptyForm)
    } catch (error) {
      setImportError(error instanceof Error ? error.message : 'Error al guardar la cuadrilla.')
    } finally {
      setSaving(false)
    }
  }

  async function issueCredentials(crew: Crew) {
    if (credentialsBusy) return
    setCredentialsBusy(true)
    setCredentialsInfo('')
    setCredentials([])
    try {
      const response = await fetch('/api/crews/credentials', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({crewId:crew.id,names:crew.members})})
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'No se pudieron generar las credenciales.')
      setCredentials(result.credentials || [])
      setCredentialsInfo(result.credentials?.length ? 'Entrega estos PIN iniciales de forma individual. Se muestran una sola vez.' : 'Los trabajadores ya tienen PIN asignado. Para protegerlos, no pueden volver a consultarse.')
    } catch (error) { setCredentialsInfo(error instanceof Error ? error.message : 'Error al generar PIN.') }
    finally { setCredentialsBusy(false) }
  }

  async function viewPins(crewId:string){
    setPinCrewId(crewId);setPinWorkers([]);setPinError('');setPinVisible(false)
    try{const response=await fetch('/api/crews/credentials?crewId='+encodeURIComponent(crewId),{cache:'no-store'});const result=await response.json();if(!response.ok)throw new Error(result.error||'Error al consultar PIN');setPinWorkers(result.workers||[])}catch(e){setPinError(e instanceof Error?e.message:'No se pudieron consultar los PIN.')}
  }

  async function resetPin(workerId:string) {
    if(!viewingCrew || credentialsBusy || !window.confirm('¿Restablecer el PIN de este trabajador? El PIN anterior dejará de funcionar.'))return
    setCredentialsBusy(true)
    try{
      const response=await fetch('/api/crews/credentials',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({crewId:viewingCrew,resetWorkerId:workerId})})
      const result=await response.json()
      if(!response.ok)throw new Error(result.error || 'No se pudo restablecer el PIN.')
      setCredentials(result.credentials || [])
      setCredentialsInfo('PIN restablecido. Entrégalo personalmente: solo se mostrará una vez.')
      setViewingCrew(null)
    }catch(error){setDetailsError(error instanceof Error?error.message:'Error al restablecer PIN.')}
    finally{setCredentialsBusy(false)}
  }

  async function viewDetails(crewId: string) {
    setDetails([])
    setDetailsError('')
    setViewingCrew(crewId)
    try {
      const { data, error } = await createClient().from('crew_workers')
        .select('id,full_name,employee_number,social_security_number,position,salary,salary_period,work_hours,entry_time,exit_time,entry_supervisor,curp,rfc')
        .eq('crew_id', crewId).order('full_name')
      if (error) throw error
      setDetails((data || []) as Array<ImportedWorker & {id:string;employee_number?:string}>)
    } catch (error) {
      setDetailsError(error instanceof Error ? error.message : 'No se pudieron consultar los expedientes.')
    }
  }

  async function remove(id: string) {
    if (!window.confirm('¿Eliminar esta cuadrilla de la lista compartida? Se conservarán los expedientes y la asistencia histórica por seguridad.')) return
    try {
      const response = await fetch('/api/crews?id=' + encodeURIComponent(id), {method:'DELETE'})
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'No se pudo eliminar la cuadrilla.')
      const next = readCrews().filter(item => item.id !== id)
      writeCrews(next)
      setCrews(current => current.filter(item => item.id !== id))
      await refreshCrews()
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Error al eliminar la cuadrilla.')
    }
  }

  async function migrateLocal(){const local=readCrews();if(!local.length)return;const res=await fetch('/api/crews',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({crews:local})});if(res.ok)await refreshCrews();else window.alert('No se pudieron compartir las cuadrillas guardadas en esta PC.')}

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

        {filtered.length === 0 ? <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-6 py-16 text-center"><UserRound className="mx-auto text-[#5496CC]" size={32} /><h2 className="mt-4 text-lg font-bold">Todavía no hay cuadrillas</h2><p className="mt-2 text-sm text-[var(--muted)]">Crea la primera cuadrilla para comenzar a organizar al personal de obra.</p></div> : <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">{filtered.map((crew) => <article key={crew.id} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm">
          <div className="flex items-start justify-between gap-4"><div><div className="flex items-center gap-2"><h2 className="text-lg font-bold">{crew.name}</h2><span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${crew.active ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-500/10 text-slate-500'}`}>{crew.active ? 'Activa' : 'Inactiva'}</span></div><p className="mt-1 text-sm text-[var(--muted)]">{crew.specialty || 'Sin especialidad'}</p></div><div className="flex gap-1"><button onClick={() => openEdit(crew)} className="rounded-lg p-2 hover:bg-[var(--surface-soft)]"><Pencil size={15} /></button><button onClick={() => remove(crew.id)} className="rounded-lg p-2 text-red-500 hover:bg-red-500/10"><Trash2 size={15} /></button></div></div>
          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-[var(--muted)]">
            <span><span className="font-semibold text-[var(--foreground)]">Proyecto:</span> {projects.find(p=>p.id===crew.project_id)?.name || 'Sin proyecto asignado'}</span><span><span className="font-semibold text-[var(--foreground)]">Responsable:</span> {crew.foreman || 'Sin asignar'}</span>
            <span className="inline-flex items-center gap-1.5"><UserRound size={14} className="text-[#5496CC]" /><strong className="text-[var(--foreground)]">{crew.members.length}</strong> integrantes</span>
          </div>
          <button type="button" onClick={() => void viewPins(crew.id)} className="mt-3 mr-2 inline-flex items-center rounded-lg border border-[#5496CC] px-3 py-2 text-xs font-semibold text-[#5496CC]">Consultar PIN</button>
          <button type="button" disabled={credentialsBusy} onClick={() => void issueCredentials(crew)} className="mt-3 mr-2 inline-flex items-center rounded-lg bg-[#5496CC] px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">Generar PIN individuales</button>
          <button type="button" onClick={() => void viewDetails(crew.id)} className="mt-3 inline-flex items-center rounded-lg border border-[#5496CC]/50 px-3 py-2 text-xs font-semibold text-[#5496CC] transition hover:bg-[#5496CC]/10">Ver expedientes de integrantes</button>
        </article>)}</div>}
      </div>

      {pinCrewId ? <div className="fixed inset-0 z-[75] flex items-center justify-center bg-black/70 p-4"><div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-[var(--surface)] p-5 shadow-2xl"><h2 className="text-xl font-bold">PIN de trabajadores · Acceso restringido</h2><p className="mt-2 text-xs text-[var(--muted)]">Solo personal autorizado. Evita exponerlos a terceros. Los PIN anteriores sin copia cifrada necesitan restablecerse.</p><button type="button" className="mt-3 rounded-lg border border-[var(--border)] px-3 py-2 text-sm" onClick={()=>setPinVisible(v=>!v)}>{pinVisible?'Ocultar PIN':'Mostrar PIN'}</button>{pinError?<p role="alert" className="mt-3 text-sm text-red-500">{pinError}</p>:null}<div className="mt-4 space-y-2">{pinWorkers.map(w=><div key={w.id} className="flex items-center justify-between gap-2 rounded-lg border border-[var(--border)] p-3"><span className="text-sm font-semibold">{w.name}</span><span className="font-mono text-sm">{w.pin?(pinVisible?w.pin:'••••'):(w.needsReset?'Restablecer PIN':'Sin PIN')}</span></div>)}</div><button type="button" onClick={()=>{setPinCrewId(null);setPinWorkers([]);setPinVisible(false)}} className="mt-5 w-full rounded-xl bg-[#5496CC] px-4 py-3 font-semibold text-white">Cerrar</button></div></div> : null}
      {(credentialsInfo || credentials.length > 0) ? <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4"><div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-[var(--surface)] p-5 shadow-2xl"><h2 className="text-xl font-bold">PIN individuales de trabajadores</h2><p className="mt-2 text-sm text-[var(--muted)]">{credentialsInfo}</p><div className="mt-4 space-y-2">{credentials.map(item=><div key={item.employeeNumber} className="flex items-center justify-between gap-3 rounded-xl border border-[var(--border)] p-3"><div><p className="text-sm font-semibold">{item.name}</p></div><span className="font-mono text-xl font-bold tracking-widest">{item.pin}</span></div>)}</div><button type="button" className="mt-5 w-full rounded-xl bg-[#5496CC] px-5 py-3 font-semibold text-white" onClick={()=>{setCredentials([]);setCredentialsInfo('')}}>Cerrar y ocultar PIN</button></div></div> : null}
      {viewingCrew ? <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
        <div className="max-h-[90vh] w-full max-w-6xl overflow-y-auto rounded-2xl bg-[var(--surface)] p-5 shadow-2xl">
          <div className="mb-4 flex items-center justify-between gap-4"><div><h2 className="text-xl font-bold">Expedientes de personal</h2><p className="text-xs text-[var(--muted)]">Solo administradores autorizados. Información confidencial.</p></div><button type="button" onClick={() => setViewingCrew(null)} aria-label="Cerrar expedientes"><X size={20}/></button></div>
          {detailsError ? <p role="alert" className="text-sm text-red-500">{detailsError}</p> : null}
          {!detailsError && !details.length ? <p className="text-sm text-[var(--muted)]">No hay expedientes importados en esta cuadrilla.</p> : null}
          {details.length ? <div className="overflow-x-auto"><table className="w-full min-w-[1300px] text-left text-xs"><thead><tr className="border-b border-[var(--border)]">{['Nombre','NSS','Puesto','Salario','Periodicidad','Horas','Entrada','Salida','Supervisor','CURP','RFC','PIN'].map(column => <th key={column} className="px-3 py-2">{column}</th>)}</tr></thead><tbody>{details.map((worker, index) => <tr key={index} className="border-b border-[var(--border)]">{[worker.full_name,worker.social_security_number,worker.position,worker.salary === null ? '' : String(worker.salary),worker.salary_period,worker.work_hours,worker.entry_time,worker.exit_time,worker.entry_supervisor,worker.curp,worker.rfc].map((value, i) => <td key={i} className="px-3 py-2">{value || '—'}</td>)}<td className="px-3 py-2"><button type="button" disabled={credentialsBusy} onClick={()=>void resetPin(worker.id)} className="rounded-lg bg-[#5496CC] px-3 py-2 font-semibold text-white disabled:opacity-50">Restablecer PIN</button></td></tr>)}</tbody></table></div> : null}
        </div>
      </div> : null}
      {open ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4"><div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-[var(--surface)] p-6 shadow-2xl"><div className="mb-5 flex items-center justify-between"><div><p className="text-xs font-semibold uppercase tracking-wide text-[#5496CC]">Personal de obra</p><h2 className="text-xl font-bold">{editingId ? 'Editar cuadrilla' : 'Nueva cuadrilla'}</h2></div><button onClick={() => setOpen(false)}><X size={18} /></button></div><form onSubmit={save} className="space-y-4">
        <label className="block space-y-2"><span className="text-sm font-semibold">Asignar a proyecto *</span><select required value={form.project_id} onChange={e=>setForm(current=>({...current,project_id:e.target.value}))} className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3"><option value="">Selecciona un proyecto</option>{projects.map(p=><option key={p.id} value={p.id}>{p.folio ? p.folio + ' · ' : ''}{p.name}</option>)}</select><span className="block text-xs text-[var(--muted)]">Esta cuadrilla quedará asignada al proyecto seleccionado.</span></label>
        <label className="block space-y-2"><span className="text-sm font-semibold">Nombre de la cuadrilla *</span><input required value={form.name} onChange={(e) => setForm((current) => ({ ...current, name: e.target.value }))} placeholder="Ej. Cuadrilla Albañilería A" className="w-full rounded-xl border border-[var(--border)] bg-transparent px-4 py-3" /></label>
        <div className="grid gap-4 sm:grid-cols-2"><label className="space-y-2"><span className="text-sm font-semibold">Responsable / Cabo *</span><input required readOnly value={sessionName || form.foreman} title="Responsable asignado según la sesión activa" className="w-full rounded-xl border border-[var(--border)] bg-transparent px-4 py-3" /></label><label className="space-y-2"><span className="text-sm font-semibold">Especialidad</span><input value={form.specialty} onChange={(e) => setForm((current) => ({ ...current, specialty: e.target.value }))} placeholder="Ej. Instalaciones eléctricas" className="w-full rounded-xl border border-[var(--border)] bg-transparent px-4 py-3" /></label></div>
        <label className="block space-y-2"><span className="text-sm font-semibold">Integrantes</span><textarea rows={6} value={form.members} onChange={(e) => setForm((current) => ({ ...current, members: e.target.value }))} placeholder="Un nombre por línea o separados por comas" className="w-full rounded-xl border border-[var(--border)] bg-transparent px-4 py-3" /></label>
        <div className="space-y-3 rounded-xl border border-[#5496CC]/40 bg-[var(--surface-soft)] p-4">
          <div className="flex items-center gap-2 font-semibold"><FileSpreadsheet size={20} className="text-[#5496CC]" /> Importar integrantes desde Excel</div>
          <p className="text-xs text-[var(--muted)]">Selecciona el Excel de empleados (.xlsx) o un CSV. Se reconocerán nombre, NSS, puesto, salario, horarios, supervisor, CURP y RFC. Los expedientes sensibles se guardan solo en Supabase con acceso administrativo.</p>
          <input type="file" multiple accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv" onChange={event => void importExcel(event.target.files)} className="block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-[#5496CC] file:px-3 file:py-2 file:font-semibold file:text-white" />
          {selectedFiles.length ? <p className="text-xs text-[var(--muted)]">Archivos seleccionados: {selectedFiles.join(', ')}</p> : null}
          {imported.length ? <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3">
            <p className="text-sm font-semibold">{imported.length} integrantes listos para importar</p>
            <p className="mt-1 text-xs text-[var(--muted)]">Vista previa (primeros 5): {imported.slice(0, 5).map(worker => worker.full_name + (worker.position ? ' — ' + worker.position : '')).join('; ')}</p>
            <button type="button" className="mt-2 text-xs text-red-500 underline" onClick={() => setImported([])}>Quitar importación</button>
          </div> : null}
          {importWarnings.length ? <p className="text-xs text-amber-600">{importWarnings.length} avisos: {importWarnings.slice(0, 3).join(' ')}</p> : null}
          {importError ? <p role="alert" className="text-sm font-medium text-red-500">{importError}</p> : null}
        </div>
        <label className="flex items-center gap-3 rounded-xl border border-[var(--border)] p-4"><input type="checkbox" checked={form.active} onChange={(e) => setForm((current) => ({ ...current, active: e.target.checked }))} /><span className="text-sm font-semibold">Cuadrilla activa</span></label>
        <div className="flex justify-end gap-3"><button type="button" onClick={() => setOpen(false)} className="rounded-xl border border-[var(--border)] px-5 py-3 font-semibold">Cancelar</button><button type="submit" disabled={saving} className="rounded-xl bg-[#5496CC] px-5 py-3 font-semibold text-white disabled:opacity-50">{saving ? "Guardando..." : "Guardar cuadrilla"}</button></div>
      </form></div></div> : null}
    </AppShell>
  )
}

function Metric({ label, value }: { label: string; value: string }) { return <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5"><UserRound className="text-[#5496CC]" size={19} /><p className="mt-3 text-2xl font-bold">{value}</p><p className="mt-1 text-sm text-[var(--muted)]">{label}</p></div> }
