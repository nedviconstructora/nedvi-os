'use client'

import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import { AppShell } from '@/components/layout/AppShell'
import { CalendarDays, Download, RefreshCw, ShieldCheck, X, ImageIcon, MapPin } from 'lucide-react'

type Entry={id:string;userId:string;name:string;type:'entrada'|'salida';at:string;photoUrl:string|null;latitude:number|null;longitude:number|null;accuracy:number|null}
const tz='America/Tijuana'
function localDay(value:string){return new Intl.DateTimeFormat('en-CA',{timeZone:tz,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(value))}
function localTime(value:string){return new Intl.DateTimeFormat('es-MX',{timeZone:tz,hour:'2-digit',minute:'2-digit'}).format(new Date(value))}
function hasLocation(entry:Entry){return typeof entry.latitude==='number'&&typeof entry.longitude==='number'&&Number.isFinite(entry.latitude)&&Number.isFinite(entry.longitude)&&Math.abs(entry.latitude)<=90&&Math.abs(entry.longitude)<=180}
function mapLink(entry:Entry){return 'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(String(entry.latitude)+','+String(entry.longitude))}
function today(){return localDay(new Date().toISOString())}
function downloadCsv(rows:string[][]){
 const csv='\uFEFF'+rows.map(row=>row.map(value=>'"'+value.replace(/"/g,'""')+'"').join(',')).join('\r\n')
 const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}))
 const anchor=document.createElement('a');anchor.href=url;anchor.download='NEDVI_consulta_gerencial_checadas.csv';anchor.click();URL.revokeObjectURL(url)
}

export function ManagementAttendanceContent(){
 const [entries,setEntries]=useState<Entry[]>([])
 const [loading,setLoading]=useState(true)
 const [error,setError]=useState('')
 const [date,setDate]=useState(today)
 const [history,setHistory]=useState(false)
 const [search,setSearch]=useState('')
 const [photoViewer,setPhotoViewer]=useState<Entry|null>(null)
 async function refresh(){
  setLoading(true);setError('')
  try{
   const response=await fetch('/api/management-attendance',{cache:'no-store'})
   const result=await response.json() as {entries?:Entry[];error?:string}
   if(!response.ok||!result.entries)throw new Error(result.error||'No se pudieron cargar checadas.')
   setEntries(result.entries)
  }catch(err){setError(err instanceof Error?err.message:'Error de conexión.')}
  finally{setLoading(false)}
 }
 useEffect(()=>{void refresh()},[])
 const visible=useMemo(()=>entries.filter(item=>(history||localDay(item.at)===date)&&item.name.toLowerCase().includes(search.toLowerCase().trim())),[entries,history,date,search])
 const inCount=visible.filter(item=>item.type==='entrada').length
 const outCount=visible.filter(item=>item.type==='salida').length
 const employees=new Set(visible.map(item=>item.userId)).size
 return <>
 <div className="mx-auto max-w-6xl space-y-6">
  <header className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
   <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#5496CC]"><ShieldCheck size={16}/>Consulta exclusiva de Gerencia</p>
   <h1 className="mt-2 text-3xl font-bold">Checadas · Vista Gerencial</h1>
   <p className="mt-2 text-sm text-[var(--muted)]">Supervisión de entradas y salidas del equipo NEDVI. Consulta de solo lectura; las checadas se realizan en el módulo habitual.</p>
  </header>
  <div className="grid gap-3 sm:grid-cols-3">{[{label:'Empleados con registros',value:employees},{label:'Entradas',value:inCount},{label:'Salidas',value:outCount}].map(item=><div key={item.label} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4"><p className="text-sm text-[var(--muted)]">{item.label}</p><p className="mt-2 text-3xl font-bold">{item.value}</p></div>)}</div>
  <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
   <div className="flex flex-wrap items-end gap-3">
    <label className="text-xs font-semibold text-[var(--muted)]"><span className="mb-1 flex items-center gap-1"><CalendarDays size={14}/>Fecha</span><input type="date" value={date} onChange={event=>{setDate(event.target.value);setHistory(false)}} className="block h-10 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)]"/></label>
    <input aria-label="Buscar trabajador" value={search} onChange={event=>setSearch(event.target.value)} placeholder="Buscar trabajador..." className="h-10 min-w-[190px] flex-1 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm"/>
    <button type="button" onClick={()=>setHistory(!history)} className="h-10 rounded-lg border border-[var(--border)] px-3 text-sm font-medium">{history?'Ver solo fecha':'Ver historial completo'}</button>
    <button type="button" onClick={()=>void refresh()} disabled={loading} className="inline-flex h-10 items-center gap-2 rounded-lg border border-[var(--border)] px-3 text-sm"><RefreshCw size={15}/>Actualizar</button>
    <button type="button" disabled={!visible.length} onClick={()=>downloadCsv([['Fecha','Empleado','Tipo','Hora','Latitud','Longitud','Precisión GPS (m)','ID'],...visible.map(x=>[localDay(x.at),x.name,x.type,localTime(x.at),x.latitude==null?'':String(x.latitude),x.longitude==null?'':String(x.longitude),x.accuracy==null?'':String(x.accuracy),x.id])])} className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#317FC1] px-3 text-sm font-semibold text-white disabled:opacity-40"><Download size={16}/>Exportar CSV</button>
   </div>
   {error&&<p role="alert" className="mt-4 rounded-lg bg-red-500/10 p-3 text-sm text-red-500">{error}</p>}
   {loading&&<p className="mt-4 text-sm text-[var(--muted)]">Consultando Supabase...</p>}
   <div className="mt-5 grid gap-4 lg:grid-cols-2">
    {(['entrada','salida'] as const).map(kind=><div key={kind} className="rounded-xl border border-[var(--border)] p-3">
      <div className="mb-3 flex justify-between gap-2"><h2 className="font-bold">{kind==='entrada'?'Entradas':'Salidas'}</h2><span className="text-xs text-[var(--muted)]">{visible.filter(x=>x.type===kind).length} registros</span></div>
      <div className="max-h-[480px] space-y-2 overflow-y-auto">{visible.filter(item=>item.type===kind).map(item=><div key={item.id} className="flex items-center justify-between gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface-soft)] p-3">
        <div className="min-w-0"><p className="break-words text-sm font-semibold">{item.name}</p><p className="mt-1 text-xs text-[var(--muted)]">{localDay(item.at)} · {localTime(item.at)}</p>{hasLocation(item)?<a href={mapLink(item)} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-[#5496CC] underline"><MapPin size={14}/>Ver ubicación GPS</a>:<p className="mt-2 text-xs text-[var(--muted)]">Ubicación no disponible</p>}</div>
        <div className="flex shrink-0 flex-col items-center gap-1">
          {item.photoUrl ? <><button type="button" onClick={()=>setPhotoViewer(item)} aria-label={`Ver foto de ${item.name}`} className="overflow-hidden rounded-lg border border-[var(--border)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#5496CC]"><Image unoptimized src={item.photoUrl} alt={`Foto de checada de ${item.name}`} width={64} height={64} className="h-16 w-16 object-cover"/></button><button type="button" onClick={()=>setPhotoViewer(item)} className="text-xs font-semibold text-[#5496CC] underline">Ver foto</button></> : <span className="flex items-center gap-1 text-xs text-[var(--muted)]"><ImageIcon size={14}/>Sin foto</span>}
        </div>
      </div>)}
      {!visible.some(item=>item.type===kind)&&<p className="p-4 text-sm text-[var(--muted)]">No hay registros para este filtro.</p>}</div>
    </div>)}
   </div>
  </section>
 </div>
 {photoViewer && photoViewer.photoUrl && <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 p-4" role="dialog" aria-modal="true" aria-label={`Fotografía de checada de ${photoViewer.name}`} onClick={()=>setPhotoViewer(null)}><div className="relative flex w-full max-w-xl flex-col items-center gap-3 rounded-2xl bg-[var(--surface)] p-5 shadow-2xl" onClick={event=>event.stopPropagation()}><button type="button" onClick={()=>setPhotoViewer(null)} aria-label="Cerrar fotografía" title="Cerrar fotografía" className="absolute right-3 top-3 z-10 rounded-full bg-[var(--background)] p-2 text-[var(--foreground)] shadow-lg hover:bg-[var(--surface-soft)]"><X size={22}/></button><h2 className="w-full pr-12 text-base font-bold">{photoViewer.name} · {photoViewer.type==='entrada'?'Entrada':'Salida'}</h2><p className="w-full text-xs text-[var(--muted)]">{localDay(photoViewer.at)} · {localTime(photoViewer.at)}</p><Image unoptimized src={photoViewer.photoUrl} width={900} height={900} alt={`Evidencia de ${photoViewer.name}`} className="max-h-[65vh] w-auto max-w-full rounded-xl object-contain"/>{hasLocation(photoViewer)?<a href={mapLink(photoViewer)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-lg bg-[#317FC1] px-4 py-2 text-sm font-semibold text-white"><MapPin size={17}/>Abrir ubicación de la checada en Maps{photoViewer.accuracy!=null?` (±${Math.round(photoViewer.accuracy)} m)`:''}</a>:<p className="text-xs text-[var(--muted)]">Esta checada no tiene coordenadas GPS disponibles.</p>}<button type="button" onClick={()=>setPhotoViewer(null)} className="rounded-lg border border-[var(--border)] px-5 py-2 text-sm font-semibold">Cerrar foto</button></div></div>}
 </>
}

export default function ManagementAttendancePage(){
 return <AppShell><ManagementAttendanceContent /></AppShell>
}
