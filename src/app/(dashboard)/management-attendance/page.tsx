'use client'

import { useEffect, useMemo, useState } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { CalendarDays, Download, RefreshCw, ShieldCheck } from 'lucide-react'

type Entry={id:string;userId:string;name:string;type:'entrada'|'salida';at:string}
const tz='America/Tijuana'
function localDay(value:string){return new Intl.DateTimeFormat('en-CA',{timeZone:tz,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(value))}
function localTime(value:string){return new Intl.DateTimeFormat('es-MX',{timeZone:tz,hour:'2-digit',minute:'2-digit'}).format(new Date(value))}
function today(){return localDay(new Date().toISOString())}
function downloadCsv(rows:string[][]){
 const csv='\uFEFF'+rows.map(row=>row.map(value=>'"'+value.replace(/"/g,'""')+'"').join(',')).join('\r\n')
 const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}))
 const anchor=document.createElement('a');anchor.href=url;anchor.download='NEDVI_consulta_gerencial_checadas.csv';anchor.click();URL.revokeObjectURL(url)
}

export default function ManagementAttendancePage(){
 const [entries,setEntries]=useState<Entry[]>([])
 const [loading,setLoading]=useState(true)
 const [error,setError]=useState('')
 const [date,setDate]=useState(today)
 const [history,setHistory]=useState(false)
 const [search,setSearch]=useState('')
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
 return <AppShell>
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
    <button type="button" disabled={!visible.length} onClick={()=>downloadCsv([['Fecha','Empleado','Tipo','Hora','ID'],...visible.map(x=>[localDay(x.at),x.name,x.type,localTime(x.at),x.id])])} className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#317FC1] px-3 text-sm font-semibold text-white disabled:opacity-40"><Download size={16}/>Exportar CSV</button>
   </div>
   {error&&<p role="alert" className="mt-4 rounded-lg bg-red-500/10 p-3 text-sm text-red-500">{error}</p>}
   {loading&&<p className="mt-4 text-sm text-[var(--muted)]">Consultando Supabase...</p>}
   <div className="mt-5 grid gap-4 lg:grid-cols-2">
    {(['entrada','salida'] as const).map(kind=><div key={kind} className="rounded-xl border border-[var(--border)] p-3">
      <div className="mb-3 flex justify-between gap-2"><h2 className="font-bold">{kind==='entrada'?'Entradas':'Salidas'}</h2><span className="text-xs text-[var(--muted)]">{visible.filter(x=>x.type===kind).length} registros</span></div>
      <div className="max-h-[480px] space-y-2 overflow-y-auto">{visible.filter(item=>item.type===kind).map(item=><div key={item.id} className="rounded-lg border border-[var(--border)] bg-[var(--surface-soft)] p-3"><p className="text-sm font-semibold">{item.name}</p><p className="mt-1 text-xs text-[var(--muted)]">{localDay(item.at)} · {localTime(item.at)}</p></div>)}
      {!visible.some(item=>item.type===kind)&&<p className="p-4 text-sm text-[var(--muted)]">No hay registros para este filtro.</p>}</div>
    </div>)}
   </div>
  </section>
 </div>
 </AppShell>
}
