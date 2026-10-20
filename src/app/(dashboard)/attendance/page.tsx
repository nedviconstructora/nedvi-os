'use client'

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import { CalendarDays, Plus, Search, Trash2, UsersRound, X, Clock3, LogIn, LogOut } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { parseCrewExcel } from '@/features/operations/services/crewExcelImport'
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
  const [supervisorCrew, setSupervisorCrew] = useState('')
  const [supervisorDate, setSupervisorDate] = useState(new Intl.DateTimeFormat('en-CA',{timeZone:'America/Tijuana',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()))
  const [workerQuery,setWorkerQuery]=useState('')
  const [workerFilter,setWorkerFilter]=useState<'Todos'|'Pendientes'|'Presentes'|'Ausentes'>('Todos')
  const [selectedWorkerId,setSelectedWorkerId]=useState('')
  const [workers, setWorkers] = useState<Array<{id:string;full_name:string;position:string;entry_time:string}>>([])
  const [crewEntries,setCrewEntries] = useState<Array<{worker_id:string;status:string;check_in:string|null;check_out:string|null;entry_photo_url:string|null;exit_photo_url:string|null}>>([])
  const [photos,setPhotos] = useState<Record<string,File>>({})
  const [photoSources,setPhotoSources]=useState<Record<string,'camera'|'upload'>>({})
  const [canUploadPhoto,setCanUploadPhoto]=useState(false)
  const [cameraWorker,setCameraWorker] = useState<string|null>(null)
  const [cameraError,setCameraError] = useState('')
  const [cameraReady,setCameraReady] = useState(false)
  const cameraVideo=useRef<HTMLVideoElement|null>(null)
  const cameraStream=useRef<MediaStream|null>(null)
  useEffect(()=>{
    if(!cameraWorker)return
    let cancelled=false
    setCameraReady(false)
    setCameraError('')
    async function startCamera(){
      try{
        if(!navigator.mediaDevices?.getUserMedia)throw new Error('La cámara no está disponible en este navegador. Abre NEDVI OS desde HTTPS y concede permiso a la cámara.')
        const stream=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:{ideal:'user'}}})
        if(cancelled){stream.getTracks().forEach(track=>track.stop());return}
        cameraStream.current=stream
        const video=cameraVideo.current
        if(!video)throw new Error('No se pudo iniciar la vista de cámara.')
        video.srcObject=stream
        await video.play()
        if(!cancelled)setCameraReady(true)
      }catch(err){
        if(!cancelled)setCameraError(err instanceof Error?err.message:'No se pudo abrir la cámara. Comprueba los permisos.')
      }
    }
    void startCamera()
    return ()=>{cancelled=true;cameraStream.current?.getTracks().forEach(track=>track.stop());cameraStream.current=null}
  },[cameraWorker])
  const selectWorkerPhoto=(workerId:string,file:File|undefined)=>{
    if(!file)return
    if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>5*1024*1024){
      setSupervisorError('Selecciona una fotografía JPG, PNG o WebP de máximo 5 MB.')
      return
    }
    if(!canUploadPhoto){setSupervisorError('Tu cuenta no tiene habilitada la carga de archivos. Usa la cámara.');return}
    setSupervisorError('')
    setPhotos(current=>({...current,[workerId]:file}))
    setPhotoSources(current=>({...current,[workerId]:'upload'}))
  }
  const takeCameraPhoto=()=>{
    const video=cameraVideo.current
    if(!cameraWorker||!video||!video.videoWidth)return
    const canvas=document.createElement('canvas')
    const scale=Math.min(1,1600/video.videoWidth)
    canvas.width=Math.round(video.videoWidth*scale);canvas.height=Math.round(video.videoHeight*scale)
    const context=canvas.getContext('2d')
    if(!context){setCameraError('No se pudo capturar la imagen.');return}
    context.drawImage(video,0,0,canvas.width,canvas.height)
    canvas.toBlob(blob=>{
      if(!blob){setCameraError('No se pudo guardar la fotografía.');return}
      const file=new File([blob],'asistencia-'+Date.now()+'.jpg',{type:'image/jpeg'})
      if(file.size>5*1024*1024){setCameraError('La fotografía no puede superar 5 MB.');return}
      setPhotos(current=>({...current,[cameraWorker]:file}))
      setPhotoSources(current=>({...current,[cameraWorker]:'camera'}))
      setPhotoSources(current=>({...current,[cameraWorker]:'camera'}))
      setCameraWorker(null)
    },'image/jpeg',0.82)
  }

  const [excelBusy,setExcelBusy] = useState(false)
  const [excelNotice,setExcelNotice] = useState('')
  const [supervisorError,setSupervisorError] = useState('')
  const [supervisorLoading,setSupervisorLoading] = useState(false)
  const [supervisorBusy,setSupervisorBusy] = useState('')
  const [syncTick,setSyncTick] = useState(0)
  async function refreshSharedCrews(){try{const r=await fetch('/api/crews',{cache:'no-store'});if(!r.ok)return;const d=await r.json();setCrews(d.crews)}catch{}}
  const reloadSupervisor = async (id:string,day:string) => {
    if (!id) {setWorkers([]);setCrewEntries([]);return}
    setSupervisorLoading(true);setSupervisorError('')
    try {
      const response=await fetch('/api/crew-attendance?crewId='+encodeURIComponent(id)+'&date='+encodeURIComponent(day),{cache:'no-store'})
      const payload=await response.json()
      if(!response.ok) throw new Error(payload.error||'No se pudo cargar la cuadrilla.')
      setWorkers(payload.workers||[])
      setCanUploadPhoto(Boolean(payload.canUploadPhoto))
      setCrewEntries(payload.entries||[])
    } catch(error) {setSupervisorError(error instanceof Error?error.message:'Error al cargar asistencias.')}
    finally {setSupervisorLoading(false)}
  }
  useEffect(()=>{const refresh=()=>setSyncTick(t=>t+1);window.addEventListener('focus',refresh);const interval=window.setInterval(()=>{if(document.visibilityState==='visible')refresh()},15000);return ()=>{window.removeEventListener('focus',refresh);window.clearInterval(interval)}},[])
  useEffect(()=>{void refreshSharedCrews();if(supervisorCrew)void reloadSupervisor(supervisorCrew,supervisorDate)},[syncTick,supervisorCrew,supervisorDate])
  const crewRecordByWorker=useMemo(()=>new Map(crewEntries.map(entry=>[entry.worker_id,entry])),[crewEntries])
  const counts=useMemo(()=>({presentes:workers.filter(worker=>!!crewRecordByWorker.get(worker.id)?.check_in).length,ausentes:workers.filter(worker=>crewRecordByWorker.get(worker.id)?.status==='Ausente').length}),[workers,crewRecordByWorker])
  const listedWorkers=useMemo(()=>workers.filter(worker=>{
    const entry=crewRecordByWorker.get(worker.id)
    const state=entry?.status==='Ausente'?'Ausentes':entry?.check_in?'Presentes':'Pendientes'
    return (workerFilter==='Todos'||workerFilter===state)&&(worker.full_name+' '+worker.position).toLocaleLowerCase('es').includes(workerQuery.trim().toLocaleLowerCase('es'))
  }),[workers,crewRecordByWorker,workerFilter,workerQuery])
  const activeWorker=listedWorkers.find(w=>w.id===selectedWorkerId)??listedWorkers[0]
  const activeRecord=activeWorker?crewRecordByWorker.get(activeWorker.id):undefined
  const fmtCrewTime=(value:string|null|undefined)=>value?new Intl.DateTimeFormat('es-MX',{timeZone:'America/Tijuana',hour:'2-digit',minute:'2-digit'}).format(new Date(value)):'—'
  const workerBusy=!!supervisorBusy||supervisorLoading
  const uploadExcel = async (file:File|undefined) => {
    if(!file||!supervisorCrew)return
    setExcelBusy(true);setSupervisorError('');setExcelNotice('')
    try{
      const parsed=await parseCrewExcel(file)
      if(!parsed.workers.length)throw new Error('El archivo no contiene empleados.')
      const response=await fetch('/api/crew-attendance',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({crewId:supervisorCrew,workers:parsed.workers})})
      const payload=await response.json()
      if(!response.ok)throw new Error([payload.error, payload.code ? 'Código: '+payload.code : '', payload.detail || ''].filter(Boolean).join(' · ') || 'No se pudo importar.')
      setExcelNotice(payload.imported+' trabajadores nuevos importados. '+(payload.message||''))
      await reloadSupervisor(supervisorCrew,supervisorDate)
    }catch(error){setSupervisorError(error instanceof Error?error.message:'Error al leer Excel.')}
    finally{setExcelBusy(false)}
  }
  const resetAttendance=async(workerId:string,name:string)=>{
    const reason=window.prompt('Motivo de restablecimiento de '+name+' (mínimo 12 caracteres).')
    if(reason===null)return
    if(reason.trim().length<12){setSupervisorError('Escribe un motivo de al menos 12 caracteres.');return}
    if(!window.confirm('¿Restablecer la checada de '+name+'? Las fotos originales quedarán en la bitácora.'))return
    setSupervisorBusy(workerId);setSupervisorError('')
    try{
      const response=await fetch('/api/crew-attendance',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({crewId:supervisorCrew,workerId,date:supervisorDate,reason:reason.trim()})})
      const result=await response.json()
      if(!response.ok)throw new Error(result.error||'No se pudo restablecer.')
      setPhotos(current=>{const next={...current};delete next[workerId];return next})
      await reloadSupervisor(supervisorCrew,supervisorDate)
    }catch(error){setSupervisorError(error instanceof Error?error.message:'No se pudo restablecer.')}
    finally{setSupervisorBusy('')}
  }
  const registerSupervisor = async (workerId:string,action:'entrada'|'salida'|'ausente') => {
    if(action!=='ausente'&&!photos[workerId]){setSupervisorError('Toma o selecciona una fotografía del trabajador antes de registrar '+action+'.');return}
    setSupervisorBusy(workerId);setSupervisorError('')
    try {
      const form=new FormData()
      form.set('workerId',workerId);form.set('crewId',supervisorCrew);form.set('date',supervisorDate);form.set('action',action)
      if(action!=='ausente'){form.set('photo',photos[workerId]);form.set('photoSource',photoSources[workerId]||'camera')}
      const response=await fetch('/api/crew-attendance',{method:'POST',body:form})
      const payload=await response.json()
      if(!response.ok)throw new Error(payload.error||'No se pudo guardar.')
      setPhotos(current=>{const next={...current};delete next[workerId];return next})
      setPhotoSources(current=>{const next={...current};delete next[workerId];return next})
      await reloadSupervisor(supervisorCrew,supervisorDate)
    } catch(error) {setSupervisorError(error instanceof Error?error.message:'Error al registrar.')}
    finally {setSupervisorBusy('')}
  }

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
      <div className="mx-auto w-full min-w-0 max-w-[1600px] space-y-4 sm:space-y-6">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#5496CC]">Operaciones / Obra</p>
            <h1 className="mt-2 text-2xl font-bold leading-tight text-[var(--foreground)] sm:text-3xl">Asistencias · Personal de obra</h1>
            <p className="mt-2 text-sm text-[var(--muted)]">Checador de trabajadores por cuadrilla: el supervisor registra las entradas, salidas y ausencias. No se mezcla con el checador del equipo interno.</p>
          </div>
          <button onClick={() => setOpen(true)} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#5496CC] px-4 text-sm font-semibold text-white sm:w-auto"><Plus size={16} /> Registrar asistencia</button>
        </header>

        <section className="min-w-0 space-y-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3 sm:p-5">
          <div><h2 className="flex items-center gap-2 text-lg font-bold"><Clock3 size={20} className="text-[#5496CC]"/> Checador de trabajadores · Pase de lista por supervisor</h2><p className="mt-1 text-sm text-[var(--muted)]">Selecciona la cuadrilla y registra cada entrada o salida desde el celular del supervisor. El servidor asigna la hora; este registro es independiente del checador del equipo NEDVI.</p></div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1"><span className="text-xs font-semibold">Cuadrilla</span><select className="min-w-0 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] p-3 text-sm" value={supervisorCrew} onChange={e=>{setSupervisorCrew(e.target.value);void reloadSupervisor(e.target.value,supervisorDate)}}><option value="">Seleccionar cuadrilla</option>{crews.filter(c=>c.active).map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
            <label className="space-y-1"><span className="text-xs font-semibold">Fecha (consulta)</span><input type="date" className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] p-3 text-sm" value={supervisorDate} onChange={e=>{setSupervisorDate(e.target.value);void reloadSupervisor(supervisorCrew,e.target.value)}}/></label>
          </div>
          {supervisorCrew && <div className="flex flex-wrap items-center gap-3 rounded-xl border border-[var(--border)] p-3"><label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-[#5496CC]/50 px-3 py-2 text-xs font-semibold text-[#5496CC]">Importar trabajadores de Excel (.xlsx o .csv)<input type="file" accept=".xlsx,.csv" className="sr-only" disabled={excelBusy} onChange={e=>{void uploadExcel(e.target.files?.[0]);e.target.value=''}}/></label><span className="text-xs text-[var(--muted)]">{excelBusy?'Importando…':'Se omiten nombres ya registrados en esta cuadrilla.'}</span></div>}
          {excelNotice && <p role="status" className="rounded-lg bg-emerald-500/10 p-3 text-sm text-emerald-600">{excelNotice}</p>}
          {supervisorError && <p role="alert" className="rounded-lg bg-red-500/10 p-3 text-sm text-red-500">{supervisorError}</p>}
          {supervisorLoading && <p className="text-sm text-[var(--muted)]">Cargando integrantes…</p>}
          {supervisorCrew && !supervisorLoading && workers.length===0 && !supervisorError && <p className="text-sm text-[var(--muted)]">No hay trabajadores asociados a esta cuadrilla en Supabase.</p>}
          {workers.length>0 && <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
              {([{label:'Presentes',count:counts.presentes,style:'text-emerald-500'},{label:'Pendientes',count:workers.length-counts.presentes-counts.ausentes,style:'text-amber-500'},{label:'Ausentes',count:counts.ausentes,style:'text-red-500'},{label:'Total trabajadores',count:workers.length,style:'text-[#5496CC]'}]).map(item=><div key={item.label} className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-3"><strong className={`text-2xl ${item.style}`}>{item.count}</strong><p className="text-xs text-[var(--muted)]">{item.label}</p></div>)}
            </div>
            <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(340px,1fr)]">
              <div className="min-w-0 space-y-3">
                <div className="relative"><Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]"/><input value={workerQuery} onChange={e=>setWorkerQuery(e.target.value)} placeholder="Buscar trabajador o puesto..." className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] py-3 pl-10 pr-3 text-sm"/></div>
                <div className="flex flex-wrap gap-2">{(['Todos','Pendientes','Presentes','Ausentes'] as const).map(option=><button key={option} type="button" onClick={()=>setWorkerFilter(option)} className={`rounded-full border px-3 py-2 text-xs font-semibold ${workerFilter===option?'border-[#317FC1] bg-[#317FC1] text-white':'border-[var(--border)]'}`}>{option}</button>)}</div>
                <div className="max-h-[520px] overflow-auto rounded-xl border border-[var(--border)]">
                  {listedWorkers.length===0&&<p className="p-5 text-sm text-[var(--muted)]">No hay trabajadores para este filtro.</p>}
                  {listedWorkers.map(worker=>{
                    const entry=crewRecordByWorker.get(worker.id)
                    const label=entry?.status==='Ausente'?'Ausente':entry?.check_in?'Presente':'Pendiente'
                    return <button key={worker.id} type="button" onClick={()=>setSelectedWorkerId(worker.id)} className={`flex w-full items-center justify-between gap-3 border-b border-[var(--border)] p-3 text-left last:border-b-0 hover:bg-[#317FC1]/10 ${activeWorker?.id===worker.id?'bg-[#317FC1]/15':''}`}>
                      <div className="min-w-0"><p className="truncate text-sm font-semibold">{worker.full_name}</p><p className="truncate text-xs text-[var(--muted)]">{worker.position||'Sin puesto'}</p></div>
                      <div className="flex shrink-0 items-center gap-3"><span className={`text-xs font-semibold ${label==='Presente'?'text-emerald-500':label==='Ausente'?'text-red-500':'text-amber-500'}`}>{label}</span><span className="hidden text-xs text-[var(--muted)] sm:inline">{fmtCrewTime(entry?.check_in)}</span><span aria-hidden="true" className="text-[#5496CC]">›</span></div>
                    </button>
                  })}
                </div>
                <p className="text-xs text-[var(--muted)]">Mostrando {listedWorkers.length} de {workers.length} trabajadores. Selecciona uno para registrar su asistencia.</p>
              </div>
              <div className="min-w-0 space-y-3 rounded-xl border border-[var(--border)] bg-[var(--background)] p-4">
                {activeWorker?<><div className="flex items-start justify-between gap-2"><div><h3 className="font-bold">{activeWorker.full_name}</h3><p className="text-xs text-[var(--muted)]">{activeWorker.position||'Sin puesto'}</p></div><span className="rounded-full border border-[var(--border)] px-2 py-1 text-xs">{activeRecord?.status||'Pendiente'}</span></div>
                  <div className="grid grid-cols-2 gap-2 rounded-xl bg-[var(--surface)] p-3 text-sm"><div><p className="text-xs text-[var(--muted)]">Entrada</p><strong>{fmtCrewTime(activeRecord?.check_in)}</strong></div><div><p className="text-xs text-[var(--muted)]">Salida</p><strong>{fmtCrewTime(activeRecord?.check_out)}</strong></div></div>
                  <button type="button" onClick={()=>setCameraWorker(activeWorker.id)} className="w-full rounded-lg border border-[var(--border)] p-3 text-sm font-semibold">📷 {photos[activeWorker.id]?'Foto lista · Volver a tomar':'Abrir cámara y tomar foto'}</button>
                  {canUploadPhoto&&<label className="block cursor-pointer rounded-lg border border-[var(--border)] p-3 text-center text-sm font-semibold">Cargar foto autorizada<input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={e=>{selectWorkerPhoto(activeWorker.id,e.target.files?.[0]);e.target.value=''}}/></label>}
                  {photos[activeWorker.id]&&<p className="text-center text-xs text-emerald-500">Fotografía lista para registrar</p>}
                  <div className="grid grid-cols-3 gap-2">
                    <button type="button" disabled={workerBusy||!photos[activeWorker.id]||!!activeRecord?.check_in||activeRecord?.status==='Ausente'} onClick={()=>void registerSupervisor(activeWorker.id,'entrada')} className="rounded-lg bg-[#317FC1] p-3 text-xs font-semibold text-white disabled:opacity-40"><LogIn size={15} className="inline"/> Entrada</button>
                    <button type="button" disabled={workerBusy||!photos[activeWorker.id]||!activeRecord?.check_in||!!activeRecord?.check_out} onClick={()=>void registerSupervisor(activeWorker.id,'salida')} className="rounded-lg bg-emerald-600 p-3 text-xs font-semibold text-white disabled:opacity-40"><LogOut size={15} className="inline"/> Salida</button>
                    <button type="button" disabled={workerBusy||!!activeRecord?.check_in||activeRecord?.status==='Ausente'} onClick={()=>void registerSupervisor(activeWorker.id,'ausente')} className="rounded-lg border border-red-500/50 p-3 text-xs font-semibold text-red-500 disabled:opacity-40">Ausente</button>
                  </div>
                  {(activeRecord?.entry_photo_url||activeRecord?.exit_photo_url)&&<div className="flex flex-wrap gap-3 text-xs">{activeRecord.entry_photo_url&&<a href={activeRecord.entry_photo_url} target="_blank" rel="noreferrer" className="text-[#5496CC] underline">Ver foto entrada</a>}{activeRecord.exit_photo_url&&<a href={activeRecord.exit_photo_url} target="_blank" rel="noreferrer" className="text-[#5496CC] underline">Ver foto salida</a>}</div>}
                  {(activeRecord?.check_in||activeRecord?.check_out||activeRecord?.status==='Ausente')&&<button type="button" disabled={workerBusy} onClick={()=>void resetAttendance(activeWorker.id,activeWorker.full_name)} className="w-full rounded-lg border border-amber-500/50 p-2 text-xs font-semibold text-amber-500 disabled:opacity-40">Restablecer checada (autorizados)</button>}
                  {listedWorkers.length>1&&<button type="button" onClick={()=>setSelectedWorkerId(listedWorkers[(listedWorkers.findIndex(w=>w.id===activeWorker.id)+1)%listedWorkers.length].id)} className="w-full rounded-lg border border-[var(--border)] p-2 text-sm">Siguiente trabajador →</button>}
                </>:<p className="text-sm text-[var(--muted)]">Selecciona un trabajador para revisar sus checadas.</p>}
              </div>
            </div>
          </div>}
        </section>

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

      {cameraWorker && <div role="dialog" aria-modal="true" aria-label="Tomar fotografía de asistencia" className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-3">
        <div className="w-full max-w-lg space-y-3 rounded-2xl bg-[var(--surface)] p-4 text-[var(--foreground)]">
          <div className="flex items-center justify-between gap-3"><h2 className="text-base font-bold">Cámara · {workers.find(w=>w.id===cameraWorker)?.full_name||'Trabajador seleccionado'}</h2><button type="button" aria-label="Cerrar cámara" onClick={()=>setCameraWorker(null)} className="rounded-lg border border-[var(--border)] px-3 py-2"><X size={18}/></button></div>
          <video ref={cameraVideo} playsInline autoPlay muted className="aspect-[3/4] max-h-[65dvh] w-full rounded-xl bg-black object-contain"/>
          {cameraError && <p role="alert" className="rounded-lg bg-red-500/10 p-3 text-sm text-red-500">{cameraError}</p>}
          <button type="button" disabled={!cameraReady} onClick={takeCameraPhoto} className="min-h-12 w-full rounded-xl bg-[#5496CC] px-4 font-semibold text-white disabled:opacity-40">📷 Capturar fotografía</button>
          <p className="text-center text-xs text-[var(--muted)]">La cámara se orienta hacia el rostro. Confirma el nombre del trabajador antes de registrar su asistencia.</p>
        </div>
      </div>}
      {open ? <div className="fixed inset-0 z-[120] flex items-center justify-center overflow-y-auto bg-slate-950/55 p-4 backdrop-blur-md"><div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-[var(--surface)] p-6 shadow-2xl"><div className="mb-5 flex items-center justify-between"><div><p className="text-xs font-semibold uppercase tracking-wide text-[#5496CC]">Control de personal</p><h2 className="text-xl font-bold">Registrar asistencia</h2></div><button onClick={() => setOpen(false)}><X size={18} /></button></div><form onSubmit={save} className="space-y-4">
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
