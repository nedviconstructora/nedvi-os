'use client'

import { ChangeEvent, useCallback, useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import { Camera, Clock3, LogIn, LogOut, RefreshCw, ShieldCheck, Trash2, MapPin, FileSpreadsheet, CalendarDays } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { downloadClockWorkbook } from '@/features/time-clock/services/exportXlsx'

type ClockEntry = { id:string; userId:string; name:string; type:'entrada'|'salida'; at:string; photoUrl:string|null; latitude:number|null; longitude:number|null; accuracy:number|null }
type Payload = {entries:ClockEntry[]; me:string; canViewAll:boolean; canDelete:boolean; canClock:boolean; error?:string}

export default function TimeClockPage() {
  const [entries,setEntries] = useState<ClockEntry[]>([])
  const [me,setMe] = useState('')
  const [canViewAll,setCanViewAll] = useState(false)
  const [canDelete,setCanDelete] = useState(false)
  const [canClock,setCanClock] = useState(true)
  const [dateFilter,setDateFilter] = useState('')
  const [allDates,setAllDates] = useState(false)
  const [loading,setLoading] = useState(true)
  const [busy,setBusy] = useState(false)
  const [locationBusy,setLocationBusy] = useState(false)
  const [error,setError] = useState('')
  const [notice,setNotice] = useState('')
  const [photo,setPhoto] = useState<File|null>(null)
  const [preview,setPreview] = useState('')
  const [now,setNow] = useState<Date|null>(null)
  const [incidentEntry,setIncidentEntry]=useState<string|null>(null)
  const [incidentTime,setIncidentTime]=useState('')
  const [incidentReason,setIncidentReason]=useState('')
  const [incidentPhoto,setIncidentPhoto]=useState<File|null>(null)

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/time-clock',{cache:'no-store'})
      const body = await res.json() as Payload
      if (!res.ok) throw new Error([body.error || 'No fue posible cargar asistencias.', (body as Payload & {code?:string}).code ? 'Código: '+(body as Payload & {code?:string}).code : null].filter(Boolean).join(' '))
      setEntries(body.entries)
      setMe(body.me)
      setCanViewAll(body.canViewAll)
      setCanDelete(body.canDelete)
      setCanClock(body.canClock)
      setError('')
    } catch (err) { setError(err instanceof Error ? err.message : 'Error al cargar asistencias.') }
    finally {setLoading(false)}
  },[])

  useEffect(() => {
    void refresh()
    const refreshVisible = () => { if (document.visibilityState === 'visible') {setNow(new Date());void refresh()} }
    const interval = window.setInterval(refreshVisible,30000)
    window.addEventListener('focus',refreshVisible)
    document.addEventListener('visibilitychange',refreshVisible)
    setNow(new Date())
    setDateFilter(new Intl.DateTimeFormat('sv-SE',{timeZone:'America/Tijuana',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()))
    return () => {
      window.clearInterval(interval)
      window.removeEventListener('focus',refreshVisible)
      document.removeEventListener('visibilitychange',refreshVisible)
    }
  },[refresh])

  useEffect(() => {
    if (!photo) {setPreview('');return}
    const url = URL.createObjectURL(photo)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  },[photo])

  const mine = useMemo(() => entries.filter(x => x.userId === me),[entries,me])
  const dayOf = (value:string) => new Intl.DateTimeFormat('sv-SE',{timeZone:'America/Tijuana',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(value))
  const today = now ? dayOf(now.toISOString()) : ''
  const current = mine.find(e => dayOf(e.at) === today)
  const pendingPrevious = mine.filter(e => dayOf(e.at) !== today).filter(e => {const sameDay=mine.filter(v=>dayOf(v.at)===dayOf(e.at)).sort((a,b)=>b.at.localeCompare(a.at));return sameDay[0]?.id===e.id && e.type==='entrada'})
  const hasEntry = current?.type === 'entrada'
  const nextType = hasEntry ? 'salida' : 'entrada'
  const fmt = (date:string) => new Intl.DateTimeFormat('es-MX',{dateStyle:'medium',timeStyle:'short'}).format(new Date(date))
  const visibleEntries=useMemo(()=>allDates ? entries : entries.filter(item=>dayOf(item.at)===dateFilter),[entries,dateFilter,allDates])
  const dailyRows=useMemo(()=>{
    const groups=new Map<string,{date:string;userId:string;name:string;start:string;end:string;totalMinutes:number;open:string|null}>()
    for(const entry of [...visibleEntries].sort((a,b)=>a.at.localeCompare(b.at))){
      const date=dayOf(entry.at)
      const key=entry.userId+'|'+date
      const group=groups.get(key)??{date,userId:entry.userId,name:entry.name,start:'',end:'',totalMinutes:0,open:null}
      if(entry.type==='entrada'){
        if(!group.start) group.start=entry.at
        group.open=entry.at
      } else {
        group.end=entry.at
        if(group.open) {
          group.totalMinutes+=Math.max(0,Math.round((new Date(entry.at).getTime()-new Date(group.open).getTime())/60000))
          group.open=null
        }
      }
      groups.set(key,group)
    }
    return [...groups.values()].sort((a,b)=>b.date.localeCompare(a.date)||a.name.localeCompare(b.name))
  },[visibleEntries])
  function exportExcel(){
    const localTime=(iso:string)=>iso?new Intl.DateTimeFormat('es-MX',{timeZone:'America/Tijuana',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(iso)):''
    const summary=[
      ['Fecha','Empleado','Entrada','Salida','Horas completadas','Estado'],
      ...dailyRows.map(r=>[r.date,r.name,localTime(r.start),localTime(r.end),(r.totalMinutes/60).toFixed(2),r.open?'Entrada sin salida':'Completo']),
    ]
    const events=[
      ['Fecha','Empleado','Tipo','Hora local','Hora oficial UTC','Latitud GPS','Longitud GPS','Precisión (m)','ID del registro (evidencia en Supabase)'],
      ...visibleEntries.map(e=>[dayOf(e.at),e.name,e.type,localTime(e.at),e.at,String(e.latitude??''),String(e.longitude??''),String(e.accuracy??''),e.id]),
    ]
    downloadClockWorkbook([{name:'Resumen diario',rows:summary},{name:'Eventos',rows:events}], 'NEDVI_Checador_'+(allDates?'historial':dateFilter)+'.xlsx')
  }

  const duration = useMemo(() => {
    if (!hasEntry || !now || !current) return null
    const minutes = Math.max(0,Math.floor((now.getTime()-new Date(current.at).getTime())/60000))
    return `${Math.floor(minutes/60)} h ${minutes%60} min`
  },[hasEntry,current,now])

  function choosePhoto(event:ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (!['image/jpeg','image/png','image/webp'].includes(file.type) || file.size > 5*1024*1024) {
      setError('La fotografía debe ser JPG, PNG o WebP y pesar máximo 5 MB.')
      return
    }
    setError('')
    setPhoto(file)
  }

  async function deleteEntry(id:string) {
    if (!canDelete || busy) return
    const reason = window.prompt('Motivo de la anulación (mínimo 8 caracteres):')
    if (reason === null) return
    if (reason.trim().length < 8) { setError('Escribe un motivo de al menos 8 caracteres.'); return }
    if (!window.confirm('¿Anular esta checada? Solo puede anularse la última checada de cada persona. La acción quedará auditada.')) return
    setBusy(true);setError('');setNotice('')
    try {
      const res = await fetch('/api/time-clock',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,reason:reason.trim()})})
      const data = await res.json() as {error?:string}
      if (!res.ok) throw new Error(data.error || 'No se pudo anular el registro.')
      setNotice('Registro anulado. La auditoría se conserva en Supabase.')
      await refresh()
    } catch (err) {setError(err instanceof Error ? err.message : 'No se pudo anular.')}
    finally {setBusy(false)}
  }

  async function submitIncident() {
    if(!incidentEntry||!incidentPhoto||busy)return
    setBusy(true);setError('');setNotice('')
    try{
      const form=new FormData()
      form.set('entryId',incidentEntry)
      form.set('exitTime',new Date(incidentTime).toISOString())
      form.set('reason',incidentReason)
      form.set('photo',incidentPhoto)
      const response=await fetch('/api/time-clock/exit-request',{method:'POST',body:form})
      const result=await response.json()
      if(!response.ok)throw new Error(result.error||'No se pudo enviar la incidencia.')
      setNotice('Solicitud de salida pendiente enviada a Administración. Tu entrada de hoy no se verá afectada.')
      setIncidentEntry(null);setIncidentPhoto(null);setIncidentTime('');setIncidentReason('')
    }catch(err){setError(err instanceof Error?err.message:'Error al enviar incidencia.')}
    finally{setBusy(false)}
  }

  async function locate(): Promise<GeolocationPosition> {
    if (!navigator.geolocation) throw new Error('Este dispositivo no tiene acceso a ubicación GPS.')
    setLocationBusy(true)
    try {
      return await new Promise<GeolocationPosition>((resolve,reject) =>
        navigator.geolocation.getCurrentPosition(resolve,reject,{enableHighAccuracy:true,timeout:20000,maximumAge:0}))
    } catch {
      throw new Error('Permite el acceso a tu ubicación en el navegador para registrar entrada o salida.')
    } finally {setLocationBusy(false)}
  }

  async function register() {
    if (!canClock || !photo || busy || loading) return
    setBusy(true);setError('');setNotice('')
    try {
      const position = await locate()
      const form = new FormData()
      form.set('latitude',String(position.coords.latitude))
      form.set('longitude',String(position.coords.longitude))
      form.set('accuracy',String(position.coords.accuracy))
      form.set('type',nextType)
      form.set('photo',photo)
      const res = await fetch('/api/time-clock',{method:'POST',body:form})
      const data = await res.json() as {error?:string}
      if (!res.ok) throw new Error(data.error || 'No se pudo guardar el registro.')
      setPhoto(null)
      setNotice(nextType === 'entrada' ? 'Entrada guardada en Supabase. Consultando el historial…' : 'Salida guardada en Supabase. Consultando el historial…')
      await refresh()
    } catch (err) {setError(err instanceof Error ? err.message : 'No se pudo registrar.')}
    finally {setBusy(false)}
  }

  return (
    <AppShell>
      <main className="mx-auto max-w-6xl space-y-6 pb-12 text-[var(--foreground)]">
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#5496CC]">Control de personal</p>
            <h1 className="mt-2 text-3xl font-bold">Checador · Equipo NEDVI</h1>
            <p className="mt-1 text-sm text-[var(--muted)]">Uso exclusivo del equipo interno de NEDVI. La asistencia de trabajadores de obra se registra en Operaciones → Asistencias.</p>
          </div>
          <button type="button" onClick={() => void refresh()} className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] px-4 py-2 text-sm"><RefreshCw size={16}/>Actualizar</button>
        </header>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          {canClock && <section className="space-y-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
            <div className="flex items-center justify-between gap-2"><h2 className="text-xl font-semibold">Mi jornada</h2>
              <span className={`rounded-full px-3 py-1 text-xs font-bold ${hasEntry ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' : 'bg-slate-500/10 text-[var(--muted)]'}`}>{loading ? 'Cargando' : hasEntry ? 'En turno' : 'Fuera de turno'}</span>
            </div>
            <div className="rounded-xl border border-[var(--border)] p-4">
              <p className="text-xs text-[var(--muted)]">Último registro</p>
              <p className="mt-2 text-lg font-semibold">{current ? `${current.type === 'entrada' ? 'Entrada' : 'Salida'} · ${fmt(current.at)}` : 'Aún no hay registros'}</p>
              {duration && <p className="mt-1 text-sm text-[#5496CC]">Tiempo en turno: {duration}</p>}
            </div>
            {pendingPrevious.length>0 && <div className="rounded-xl border border-amber-400/40 bg-amber-400/10 p-3 text-sm"><p className="font-semibold">Jornada anterior pendiente de salida</p><p className="mt-1">Encontramos una entrada sin salida de {fmt(pendingPrevious[0].at)}. Puedes registrar tu entrada de hoy normalmente. La salida anterior requiere revisión. Una foto tomada hoy se conservará como evidencia actual, no como fotografía del día anterior.</p><button type="button" className="mt-3 rounded-lg bg-amber-500 px-3 py-2 font-semibold text-black" onClick={()=>{setIncidentEntry(pendingPrevious[0].id);setIncidentTime(dayOf(pendingPrevious[0].at)+'T17:00')}}>Solicitar regularización de salida</button></div>}
            {incidentEntry && <div className="space-y-3 rounded-xl border border-[#5496CC] p-4"><h3 className="font-semibold">Regularizar salida anterior</h3><p className="text-xs text-[var(--muted)]">Indica la hora en que realmente saliste. Una fotografía tomada hoy se guarda con fecha de captura actual. Administración deberá validar la incidencia.</p><label className="block text-sm">Fecha y hora de salida declarada<input type="datetime-local" className="mt-1 block w-full rounded-lg border border-[var(--border)] bg-[var(--background)] p-2" value={incidentTime} onChange={e=>setIncidentTime(e.target.value)}/></label><label className="block text-sm">Motivo<textarea className="mt-1 block w-full rounded-lg border border-[var(--border)] bg-[var(--background)] p-2" rows={3} value={incidentReason} onChange={e=>setIncidentReason(e.target.value)} placeholder="Ej. Corte de energía en instalaciones; no pude registrar mi salida."/></label><label className="block text-sm">Fotografía actual de respaldo<input type="file" accept="image/jpeg,image/png,image/webp" capture="user" className="mt-1 block w-full text-sm" onChange={e=>setIncidentPhoto(e.target.files?.[0]||null)}/></label><div className="flex flex-wrap gap-2"><button type="button" disabled={busy||!incidentPhoto||incidentReason.trim().length<12||!incidentTime} onClick={()=>void submitIncident()} className="rounded-lg bg-[#317FC1] px-4 py-2 font-semibold text-white disabled:opacity-40">Enviar a revisión</button><button type="button" onClick={()=>setIncidentEntry(null)} className="rounded-lg border border-[var(--border)] px-4 py-2">Cancelar</button></div></div>}
            <div className="space-y-3">
              <p className="text-sm font-semibold">Fotografía obligatoria para {nextType}</p>
              <div className="flex flex-wrap gap-2">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-[var(--border)] px-4 py-3 text-sm font-semibold"><Camera size={17}/>Tomar foto<input className="sr-only" type="file" accept="image/*" capture="user" onChange={choosePhoto}/></label>
              </div>
              <p className="flex items-center gap-2 text-xs text-[var(--muted)]"><MapPin size={15}/>Al confirmar se solicitará tu ubicación GPS actual. Debes otorgar permiso al navegador.</p>
              {preview && <img src={preview} alt="Vista previa de la evidencia" className="max-h-56 w-full rounded-xl border border-[var(--border)] object-contain" />}
              <div className="grid grid-cols-2 gap-3">
                <button type="button" disabled={!photo || hasEntry || loading || busy || locationBusy} onClick={() => void register()} className="flex items-center justify-center gap-2 rounded-xl bg-[#317FC1] px-3 py-3 font-bold text-white disabled:cursor-not-allowed disabled:opacity-40"><LogIn size={19}/>{busy && !hasEntry ? 'Guardando...' : 'Checar entrada'}</button>
                <button type="button" disabled={!photo || !hasEntry || loading || busy || locationBusy} onClick={() => void register()} className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-3 py-3 font-bold text-white disabled:cursor-not-allowed disabled:opacity-40"><LogOut size={19}/>{busy && hasEntry ? 'Guardando...' : 'Checar salida'}</button>
              </div>
              <p className="text-xs text-[var(--muted)]">{locationBusy ? 'Obteniendo tu ubicación…' : hasEntry ? 'Tu entrada está activa. Adjunta una foto para habilitar Checar salida.' : 'Adjunta una fotografía para habilitar Checar entrada. Primero debe registrarse una entrada para poder salir.'}</p>
              <p className="flex items-start gap-2 text-xs text-[var(--muted)]"><ShieldCheck size={16} className="shrink-0"/>La hora la asigna el servidor. Los trabajadores no pueden editar registros. Administración y Contabilidad pueden consultar todas las asistencias. Solo Administración puede anular registros.</p>
              {error && <p role="alert" className="rounded-xl bg-red-500/10 p-3 text-sm text-red-500">{error}</p>}
              {notice && <p role="status" className="rounded-xl bg-emerald-500/10 p-3 text-sm text-emerald-600">{notice}</p>}
            </div>
          </section>}
          <section className="space-y-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
            <div className="flex items-center gap-2"><Clock3 size={20} className="text-[#5496CC]"/><h2 className="text-xl font-semibold">{canViewAll ? 'Historial del personal' : 'Mis registros'}</h2></div>
            <p className="text-sm text-[var(--muted)]">Historial diario almacenado en Supabase · horario de Tijuana. Las fotos permanecen privadas.</p>
            <div className="flex flex-wrap items-end gap-2">
              <label className="text-xs font-semibold text-[var(--muted)]"><span className="mb-1 flex items-center gap-1"><CalendarDays size={14}/>Fecha</span><input type="date" value={dateFilter} onChange={e=>{setDateFilter(e.target.value);setAllDates(false)}} className="block rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)]"/></label>
              <button type="button" onClick={()=>setAllDates(v=>!v)} className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm">{allDates?'Ver solo fecha':'Ver historial'}</button>
              {canViewAll && <button type="button" onClick={exportExcel} disabled={!visibleEntries.length} className="inline-flex items-center gap-2 rounded-lg bg-[#317FC1] px-3 py-2 text-sm font-semibold text-white disabled:opacity-40"><FileSpreadsheet size={16}/>Exportar Excel (.xlsx)</button>}
            </div>
            <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
              <table className="w-full min-w-[460px] text-left text-xs"><thead className="bg-[var(--surface-soft)]"><tr><th className="p-2">Fecha</th><th className="p-2">Empleado</th><th className="p-2">Entrada</th><th className="p-2">Salida</th><th className="p-2">Horas</th></tr></thead>
              <tbody>{dailyRows.map(row=><tr key={row.userId+row.date} className="border-t border-[var(--border)]"><td className="p-2">{row.date}</td><td className="p-2">{row.name}</td><td className="p-2">{row.start?new Intl.DateTimeFormat('es-MX',{timeZone:'America/Tijuana',hour:'2-digit',minute:'2-digit'}).format(new Date(row.start)):'—'}</td><td className="p-2">{row.end?new Intl.DateTimeFormat('es-MX',{timeZone:'America/Tijuana',hour:'2-digit',minute:'2-digit'}).format(new Date(row.end)):'—'}</td><td className="p-2">{(row.totalMinutes/60).toFixed(2)} h{row.open?' · En turno':''}</td></tr>)}</tbody></table>
              {!dailyRows.length && <p className="p-4 text-sm text-[var(--muted)]">No hay checadas para esta fecha.</p>}
            </div>
            <div className="max-h-[480px] space-y-3 overflow-y-auto">
              {!visibleEntries.length && <p className="rounded-xl border border-[var(--border)] p-4 text-sm text-[var(--muted)]">Todavía no existen registros.</p>}
              {visibleEntries.map(item => <div key={item.id} className="flex items-center justify-between gap-3 rounded-xl border border-[var(--border)] p-3">
                <div className="min-w-0"><p className="truncate text-sm font-semibold">{item.name}</p><p className="text-xs text-[var(--muted)]">{item.type==='entrada'?'Entrada':'Salida'} · {fmt(item.at)}</p>{item.latitude != null && item.longitude != null && <a className="inline-flex items-center gap-1 text-xs text-[#5496CC] underline" href={`https://www.google.com/maps?q=${item.latitude},${item.longitude}`} target="_blank" rel="noreferrer"><MapPin size={13}/>Ver ubicación GPS (±{Math.round(item.accuracy ?? 0)} m)</a>}</div>
                <div className="flex shrink-0 items-center gap-2">
                  {item.photoUrl ? <ClockPhoto url={item.photoUrl} name={item.name} type={item.type}/> : <span className="text-xs text-[var(--muted)]">Sin foto</span>}
                  {canDelete && entries.find(x => x.userId === item.userId)?.id === item.id && <button type="button" disabled={busy} onClick={() => void deleteEntry(item.id)} aria-label="Anular registro" title="Anular checada (Administración)" className="rounded-lg border border-red-400/30 p-2 text-red-500 hover:bg-red-500/10 disabled:opacity-40"><Trash2 size={16}/></button>}
                </div>
              </div>)}
            </div>
          </section>
        </div>
      </main>
    </AppShell>
  )
}

function ClockPhoto({url,name,type}:{url:string;name:string;type:ClockEntry['type']}) {
  const [failed,setFailed] = useState(false)
  const [retry,setRetry] = useState(0)
  return <div className="space-y-1 text-center">
    <a href={url} target="_blank" rel="noreferrer" className="block text-xs font-semibold text-[#5496CC] underline">
      {!failed && <Image key={retry} unoptimized src={`${url}&retry=${retry}`} width={64} height={64} alt={`Foto de ${type} de ${name}`} onError={()=>setFailed(true)} className="mb-1 h-16 w-16 rounded-lg border border-[var(--border)] object-cover"/>}
      Ver foto
    </a>
    {failed && <button type="button" onClick={()=>{setRetry(value=>value+1);setFailed(false)}} className="text-xs text-[#5496CC] underline" aria-label={`Reintentar foto de ${name}`}>Reintentar foto</button>}
  </div>
}
