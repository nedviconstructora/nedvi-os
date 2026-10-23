'use client'

import { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { AppShell } from '@/components/layout/AppShell'
import { createClient } from '@/lib/supabase/client'
import { readSpreadsheetGrid } from '@/features/quotes/services/excelQuoteImport'
import {
  Building2, CalendarClock, CheckCircle2, ChevronLeft, ChevronRight,
  FileSpreadsheet, Filter, Mail, RefreshCw, Search, ShieldAlert,
  UploadCloud, UsersRound, X,
} from 'lucide-react'

type Stage = 'Sin contactar' | 'Contactado' | 'En seguimiento' | 'Interesado' | 'No interesado' | 'No contactar'
type Delivery = 'Sin envío' | 'Pendiente' | 'Enviado' | 'Entregado' | 'Rebotado' | 'Fallido'
type Prospect = {
  id: string; company: string; contact_name: string; department: string
  email: string; email_normalized: string; region: string; phone: string
  source: string; previous_status: string; previous_contact_date: string | null
  suggested_greeting: string; send_eligible: boolean
  stage: Stage; last_delivery_status: Delivery; last_sent_at: string | null
  last_resend_id: string | null; next_followup_at: string | null; notes: string
  customer_id: string | null; updated_at: string; created_at: string
}
type ProspectInput = Omit<Prospect, 'id'|'email_normalized'|'customer_id'|'updated_at'|'created_at'>
type OutreachEvent = {
  id: string; prospect_id: string; event_type: string; event_at: string
  resend_message_id: string | null; subject: string; note: string
}
type Preview = { fileName: string; rows: ProspectInput[]; lot: Array<{
  email: string; messageId: string; status: string; date: string
}>; invalidCount: number; duplicateCount: number }

const stages: Stage[] = ['Sin contactar','Contactado','En seguimiento','Interesado','No interesado','No contactar']
const deliveryStatuses: Delivery[] = ['Sin envío','Pendiente','Enviado','Entregado','Rebotado','Fallido']
const BATCH_SIZE = 70
const PAGE_SIZE = 30
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function clean(value: unknown) { return String(value ?? '').trim() }
function normalized(value: unknown) {
  return clean(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()
}
function mail(value: unknown) { return clean(value).toLowerCase() }
function dateString(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value) && value > 1000 && value < 100000) {
    return new Date(Math.round((value - 25569) * 86400000)).toISOString().slice(0,10)
  }
  const s = clean(value)
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
  const local = s.match(/^(\d{2})[/-](\d{2})[/-](\d{4})$/)
  if (local) return local[3] + '-' + local[2] + '-' + local[1]
  return ''
}
function delivery(value: unknown): Delivery {
  const s = normalized(value)
  if (s.includes('entregad')) return 'Entregado'
  if (s.includes('rebot') || s.includes('bounce')) return 'Rebotado'
  if (s.includes('fall')) return 'Fallido'
  if (s.includes('pendient')) return 'Pendiente'
  if (s.includes('enviad')) return 'Enviado'
  return 'Sin envío'
}
function getColumn(columns: string[], aliases: string[]) {
  return columns.findIndex(v => aliases.includes(normalized(v)))
}
function parseContacts(rows: Array<Array<string | number>>) {
  const headers = (rows[0] || []).map(clean)
  const col = {
    company: getColumn(headers,['empresa','compania']),
    contact: getColumn(headers,['contacto','nombre']),
    department: getColumn(headers,['departamento']),
    email: getColumn(headers,['correo','email','correo electronico']),
    region: getColumn(headers,['zona','region']),
    phone: getColumn(headers,['telefono','tel']),
    prior: getColumn(headers,['status anterior','estado anterior']),
    priorDate: getColumn(headers,['fecha anterior']),
    source: getColumn(headers,['fuente']),
    send: getColumn(headers,['enviar']),
    greeting: getColumn(headers,['saludo sugerido']),
    lastDate: getColumn(headers,['fecha envio nedvi']),
    status: getColumn(headers,['estado entrega 2026','estado entrega']),
  }
  if (col.company < 0 || col.email < 0) throw new Error('El Excel debe incluir las columnas EMPRESA y CORREO de «LISTA LIMPIA NEDVI».')
  const unique = new Map<string, ProspectInput>()
  let invalidCount=0, duplicateCount=0
  for (const row of rows.slice(1)) {
    const pick = (i: number) => i < 0 ? '' : row[i]
    const email = mail(pick(col.email))
    const company = clean(pick(col.company))
    if (!email && !company) continue
    if (!emailPattern.test(email) || !company) { invalidCount++; continue }
    if (unique.has(email)) { duplicateCount++; continue }
    const status=delivery(pick(col.status))
    const prior=clean(pick(col.prior))
    const lastDate=dateString(pick(col.lastDate))
    const allowed=col.send < 0 || ['si','yes','true','1'].includes(normalized(pick(col.send)))
    unique.set(email,{
      company:company.slice(0,240),
      contact_name:clean(pick(col.contact)).slice(0,240),
      department:clean(pick(col.department)).slice(0,120),
      email, region:clean(pick(col.region)).slice(0,160),
      phone:clean(pick(col.phone)).slice(0,120),
      source:clean(pick(col.source)).slice(0,120),
      previous_status:prior.slice(0,200),
      previous_contact_date: dateString(pick(col.priorDate)) || null,
      suggested_greeting:clean(pick(col.greeting)).slice(0,250),
      send_eligible:allowed && status!=='Rebotado' && status!=='Fallido',
      stage:status==='Sin envío' && !prior ? 'Sin contactar' : 'Contactado',
      last_delivery_status:status,
      last_sent_at:lastDate ? new Date(lastDate+'T12:00:00Z').toISOString():null,
      last_resend_id:null, next_followup_at:null, notes:'',
      assigned_to:null,
    })
  }
  return { rows:Array.from(unique.values()),invalidCount,duplicateCount }
}
function parseLot(rows: Array<Array<string | number>>) {
  const headers = (rows[0] || []).map(clean)
  const index = {
    email:getColumn(headers,['correo','email']),
    id:getColumn(headers,['id resend','resend id']),
    status:getColumn(headers,['estado','status']),
    date:getColumn(headers,['fecha']),
  }
  if (index.email<0 || index.id<0) return []
  return rows.slice(1).map(row=>({
    email:mail(row[index.email]),messageId:clean(row[index.id]),
    status:index.status<0?'':clean(row[index.status]),
    date:index.date<0?'':dateString(row[index.date]),
  })).filter(item=>emailPattern.test(item.email) && /^[0-9a-f-]{30,40}$/i.test(item.messageId))
}

function fmtDate(value?:string|null) {
  if (!value) return 'Sin fecha'
  const date = new Date(value.length===10 ? value+'T12:00:00Z' : value)
  return Number.isNaN(date.getTime()) ? 'Sin fecha' : date.toLocaleDateString('es-MX',{day:'2-digit',month:'short',year:'numeric',timeZone:'UTC'})
}
function statusColor(status: string) {
  if (status==='Entregado'||status==='Interesado') return 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
  if (status==='Rebotado'||status==='Fallido'||status==='No contactar') return 'bg-red-500/10 text-red-700 dark:text-red-300'
  if (status==='En seguimiento'||status==='Pendiente') return 'bg-amber-500/10 text-amber-700 dark:text-amber-300'
  return 'bg-[#5496CC]/10 text-[#267bd4] dark:text-[#90cafa]'
}

export default function ProspectingPage() {
  const [prospects,setProspects]=useState<Prospect[]>([])
  const [loading,setLoading]=useState(true)
  const [busy,setBusy]=useState(false)
  const [error,setError]=useState('')
  const [message,setMessage]=useState('')
  const [query,setQuery]=useState('')
  const [stageFilter,setStageFilter]=useState('Todas')
  const [sourceFilter,setSourceFilter]=useState('Todas')
  const [page,setPage]=useState(1)
  const [preview,setPreview]=useState<Preview|null>(null)
  const [selected,setSelected]=useState<Prospect|null>(null)
  const [events,setEvents]=useState<OutreachEvent[]>([])
  const [editStage,setEditStage]=useState<Stage>('Sin contactar')
  const [editFollowup,setEditFollowup]=useState('')
  const [editNotes,setEditNotes]=useState('')
  const [noteText,setNoteText]=useState('')
  const supabase=useMemo(()=>createClient(),[])

  const load=useCallback(async()=>{
    setLoading(true)
    setError('')
    try {
      const all: Prospect[]=[]
      for(let start=0;start<100000;start+=1000){
        const {data,error:dbError}=await supabase.from('commercial_prospects')
          .select('*').order('company',{ascending:true}).order('id',{ascending:true})
          .range(start,start+999)
        if(dbError) throw dbError
        const batch=(data || []) as Prospect[]
        all.push(...batch)
        if(batch.length<1000) break
      }
      setProspects(all)
    } catch (e) {
      console.error('Prospección: no se pudieron cargar los contactos:',e)
      setError(e instanceof Error?e.message:'No se pudo consultar la base comercial.')
    } finally {setLoading(false)}
  },[supabase])

  useEffect(()=>{void load()},[load])
  useEffect(()=>{setPage(1)},[query,stageFilter,sourceFilter])
  const sources=useMemo(()=>Array.from(new Set(prospects.map(p=>p.source).filter(Boolean))).sort(),[prospects])
  const filtered=useMemo(()=>prospects.filter(p=>{
    const q=normalized(query)
    return (!q||normalized([p.company,p.contact_name,p.email,p.region,p.department].join(' ')).includes(q)) &&
      (stageFilter==='Todas'||p.stage===stageFilter) &&
      (sourceFilter==='Todas'||p.source===sourceFilter)
  }),[prospects,query,stageFilter,sourceFilter])
  const pages=Math.max(1,Math.ceil(filtered.length/PAGE_SIZE))
  const visible=filtered.slice((page-1)*PAGE_SIZE,page*PAGE_SIZE)
  const delivered=prospects.filter(p=>p.last_delivery_status==='Entregado').length
  const bounced=prospects.filter(p=>['Rebotado','Fallido'].includes(p.last_delivery_status)).length
  const needsFollowup=prospects.filter(p=>p.next_followup_at&&p.next_followup_at<=new Date().toISOString().slice(0,10)&&p.stage!=='No contactar').length

  async function inspectFile(event:ChangeEvent<HTMLInputElement>){
    const file=event.target.files?.[0]
    event.target.value=''
    if(!file) return
    if(file.size>12*1024*1024){setError('El archivo supera el límite de 12 MB.');return}
    setError('');setMessage('');setBusy(true)
    try {
      const matrix=await readSpreadsheetGrid(file,['LISTA LIMPIA NEDVI'])
      const parsed=parseContacts(matrix)
      if(!parsed.rows.length)throw new Error('No se encontraron contactos válidos.')
      let lot: Preview['lot']=[]
      if(file.name.toLowerCase().endsWith('.xlsx')){
        try {lot=parseLot(await readSpreadsheetGrid(file,['LOTE 23-10-2026']))}
        catch(e){console.warn('El historial de lotes no se pudo leer; contactos intactos:',e)}
      }
      setPreview({fileName:file.name,rows:parsed.rows,lot,
        invalidCount:parsed.invalidCount,duplicateCount:parsed.duplicateCount})
    }catch(e){setPreview(null);setError(e instanceof Error?e.message:'Error al revisar el Excel.')}
    finally{setBusy(false)}
  }

  async function importPreview(){
    if(!preview||busy) return
    setError('');setMessage('');setBusy(true)
    try {
      for(let i=0;i<preview.rows.length;i+=BATCH_SIZE){
        const {error:dbError}=await supabase.from('commercial_prospects')
          .upsert(preview.rows.slice(i,i+BATCH_SIZE),{
            onConflict:'email_normalized',ignoreDuplicates:true,
          })
        if(dbError)throw dbError
      }
      let eventsLoaded=0
      if(preview.lot.length){
        const byMail=new Map<string,string>()
        for(let i=0;i<preview.lot.length;i+=BATCH_SIZE){
          const chunk=preview.lot.slice(i,i+BATCH_SIZE)
          const {data,error:lookupError}=await supabase.from('commercial_prospects')
            .select('id,email_normalized').in('email_normalized',chunk.map(x=>x.email))
          if(lookupError)throw lookupError
          for(const item of data||[])byMail.set(item.email_normalized,item.id)
        }
        const history=preview.lot.filter(l=>byMail.has(l.email)).map(l=>({
          prospect_id:byMail.get(l.email)!,
          resend_message_id:l.messageId,
          channel:'email',
          event_type:(['Entregado','Rebotado','Fallido'].includes(delivery(l.status))?delivery(l.status):'Enviado'),
          event_at:l.date?new Date(l.date+'T12:00:00Z').toISOString():new Date().toISOString(),
          subject:'Presentación corporativa | Soluciones integrales — NEDVI Constructora',
          note:'Importado del registro verificado en Excel; no se envió un correo nuevo.',
        }))
        for(let i=0;i<history.length;i+=BATCH_SIZE){
          const {error:historyError}=await supabase.from('commercial_outreach_events')
            .upsert(history.slice(i,i+BATCH_SIZE),{onConflict:'resend_message_id',ignoreDuplicates:true})
          if(historyError)throw historyError
        }
        eventsLoaded=history.length
      }
      const prior=prospects.length
      setPreview(null)
      await load()
      setMessage('Importación finalizada. Los contactos existentes se conservaron sin sobrescribir; se procesaron '+preview.rows.length+' contactos y '+eventsLoaded+' eventos del lote. Antes había '+prior+' contactos. Los clientes existentes no cambiaron.')
    }catch(e){
      console.error('Error al importar contactos:',e)
      setError('La importación se detuvo: '+(e instanceof Error?e.message:'error de base de datos')+'. Los lotes confirmados permanecen guardados; vuelve a importar el mismo archivo sin crear duplicados.')
    }finally{setBusy(false)}
  }

  const openDetails=async(p:Prospect)=>{
    setSelected(p);setEditStage(p.stage);setEditFollowup(p.next_followup_at||'')
    setEditNotes(p.notes);setNoteText('');setEvents([])
    const {data,error:e}=await supabase.from('commercial_outreach_events').select('*')
      .eq('prospect_id',p.id).order('event_at',{ascending:false}).limit(50)
    if(e){console.error(e);setError('No se pudo consultar el historial.')}
    else setEvents((data||[]) as OutreachEvent[])
  }

  async function saveDetails(event:FormEvent<HTMLFormElement>){
    event.preventDefault()
    if(!selected ||busy)return
    setBusy(true);setError('')
    try{
      const {error:dbError}=await supabase.from('commercial_prospects').update({
        stage:editStage,next_followup_at:editFollowup||null,notes:editNotes,
        updated_at:new Date().toISOString(),
      }).eq('id',selected.id)
      if(dbError)throw dbError
      if(noteText.trim()){
        const {error:eventError}=await supabase.from('commercial_outreach_events').insert({
          prospect_id:selected.id,event_type:'Nota',channel:'note',
          note:noteText.trim().slice(0,3000),
        })
        if(eventError)throw eventError
      }
      setSelected(null);setMessage('Seguimiento comercial guardado.');await load()
    }catch(e){setError(e instanceof Error?e.message:'No se pudo guardar el seguimiento.')}
    finally{setBusy(false)}
  }

  const existingEmails=useMemo(()=>new Set(prospects.map(p=>p.email_normalized)),[prospects])
  const alreadyLoaded=preview?preview.rows.filter(r=>existingEmails.has(r.email)).length:0

  return <AppShell>
    <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-6 text-[var(--foreground)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[#5496CC]">Comercial y Ventas · Fase 2</p>
          <h1 className="mt-1 text-2xl font-bold md:text-3xl">Prospección comercial</h1>
          <p className="mt-2 text-sm text-[var(--muted)]">Contactos de empresas, resultados de campaña y seguimiento compartido. Sin duplicar Clientes.</p>
        </div>
        <button type="button" onClick={()=>void load()} disabled={busy||loading}
          className="inline-flex h-10 items-center gap-2 rounded-xl border border-[var(--border)] px-4 text-sm font-semibold disabled:opacity-50">
          <RefreshCw size={16} className={loading?'animate-spin':''}/> Actualizar
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          {title:'Contactos importados',value:prospects.length,icon:UsersRound},
          {title:'Entregados registrados',value:delivered,icon:CheckCircle2},
          {title:'Rebotes / fallos',value:bounced,icon:ShieldAlert},
          {title:'Seguimientos vencidos',value:needsFollowup,icon:CalendarClock},
        ].map(card=><div key={card.title} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
          <card.icon size={20} className="mb-3 text-[#5496CC]"/>
          <p className="text-2xl font-bold">{card.value.toLocaleString('es-MX')}</p>
          <p className="mt-1 text-xs text-[var(--muted)]">{card.title}</p>
        </div>)}
      </div>

      {error?<div role="alert" className="rounded-xl border border-red-400/35 bg-red-500/10 p-4 text-sm text-red-600 dark:text-red-300">{error}</div>:null}
      {message?<div role="status" className="rounded-xl border border-emerald-400/35 bg-emerald-500/10 p-4 text-sm text-emerald-700 dark:text-emerald-300">{message}</div>:null}

      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 md:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <FileSpreadsheet size={22} className="mt-1 shrink-0 text-[#5496CC]"/>
            <div>
              <h2 className="font-bold">Importar Excel de prospección</h2>
              <p className="mt-1 text-xs text-[var(--muted)]">Admite XLSX y CSV. Lee «LISTA LIMPIA NEDVI» y, si existe, el lote de Resend. No envía correos ni modifica clientes.</p>
            </div>
          </div>
          <label className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-xl bg-[#5496CC] px-4 py-2 text-sm font-bold text-white hover:brightness-110">
            <UploadCloud size={16}/> Revisar Excel
            <input type="file" accept=".xlsx,.csv,.tsv" className="sr-only" disabled={busy} onChange={e=>void inspectFile(e)}/>
          </label>
        </div>
        {preview?<div className="mt-4 space-y-3 rounded-xl border border-[#5496CC]/40 bg-[#5496CC]/5 p-4">
          <div className="flex justify-between gap-2">
            <div>
              <p className="font-semibold">{preview.fileName}</p>
              <p className="text-xs text-[var(--muted)]">Revisión previa: aún no se ha importado este archivo</p>
            </div>
            <button type="button" aria-label="Cancelar importación" onClick={()=>setPreview(null)}><X size={18}/></button>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
            <span>Válidos: <strong>{preview.rows.length}</strong></span>
            <span>Ya existentes: <strong>{alreadyLoaded}</strong></span>
            <span>Inválidos: <strong>{preview.invalidCount}</strong></span>
            <span>Duplicados en archivo: <strong>{preview.duplicateCount}</strong></span>
          </div>
          <p className="text-xs text-[var(--muted)]">Se conservarán los registros existentes, incluso sus seguimientos. Se intentará vincular {preview.lot.length} eventos del lote por identificador de Resend.</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={busy} onClick={()=>void importPreview()} className="rounded-xl bg-[#5496CC] px-4 py-2 text-sm font-bold text-white disabled:opacity-50">
              {busy?'Importando…':'Confirmar importación segura'}
            </button>
            <button type="button" onClick={()=>setPreview(null)} disabled={busy} className="rounded-xl border border-[var(--border)] px-4 py-2 text-sm">Cancelar</button>
          </div>
        </div>:null}
      </section>

      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 md:p-5">
        <div className="mb-4 flex items-center gap-2 font-bold"><Filter size={18} className="text-[#5496CC]"/> Directorio de prospectos</div>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="flex items-center gap-2 rounded-xl border border-[var(--border)] px-3 py-2">
            <Search size={17} className="shrink-0 text-[var(--muted)]"/>
            <input aria-label="Buscar empresa, contacto o correo" className="min-w-0 flex-1 bg-transparent text-sm outline-none" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Empresa, correo, contacto…"/>
          </label>
          <select aria-label="Filtrar etapa comercial" className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm" value={stageFilter} onChange={e=>setStageFilter(e.target.value)}>
            <option>Todas</option>{stages.map(s=><option key={s}>{s}</option>)}
          </select>
          <select aria-label="Filtrar fuente" className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm" value={sourceFilter} onChange={e=>setSourceFilter(e.target.value)}>
            <option>Todas</option>{sources.map(s=><option key={s}>{s}</option>)}
          </select>
        </div>
        <p className="mt-3 text-xs text-[var(--muted)]">{filtered.length.toLocaleString('es-MX')} resultados. Los rebotes y los registros «No contactar» requieren revisión antes de cualquier nuevo envío.</p>

        <div className="mt-4 overflow-x-auto rounded-xl border border-[var(--border)]">
          <table className="w-full min-w-[850px] text-left text-sm">
            <thead className="bg-[var(--surface-soft)] text-xs uppercase text-[var(--muted)]">
              <tr><th className="px-4 py-3">Empresa / contacto</th><th className="px-4 py-3">Correo</th><th className="px-4 py-3">Fuente / zona</th><th className="px-4 py-3">Etapa</th><th className="px-4 py-3">Entrega</th><th className="px-4 py-3">Acción</th></tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {loading?<tr><td colSpan={6} className="px-4 py-10 text-center text-[var(--muted)]">Cargando prospectos desde Supabase…</td></tr>
              :visible.length===0?<tr><td colSpan={6} className="px-4 py-10 text-center text-[var(--muted)]">Sin resultados. Importa el Excel o ajusta los filtros.</td></tr>
              :visible.map(p=><tr key={p.id}>
                <td className="px-4 py-3"><p className="max-w-[230px] font-semibold">{p.company}</p><p className="text-xs text-[var(--muted)]">{p.contact_name||'Sin contacto'}</p></td>
                <td className="px-4 py-3"><a className="break-all text-[#5496CC] hover:underline" href={'mailto:'+p.email}>{p.email}</a></td>
                <td className="px-4 py-3"><p>{p.source||'—'}</p><p className="text-xs text-[var(--muted)]">{p.region||'Sin zona'}</p></td>
                <td className="px-4 py-3"><span className={'inline-flex rounded-lg px-2 py-1 text-xs font-semibold '+statusColor(p.stage)}>{p.stage}</span></td>
                <td className="px-4 py-3"><span className={'inline-flex rounded-lg px-2 py-1 text-xs font-semibold '+statusColor(p.last_delivery_status)}>{p.last_delivery_status}</span></td>
                <td className="px-4 py-3"><button type="button" onClick={()=>void openDetails(p)} className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-semibold hover:border-[#5496CC]">Seguimiento</button></td>
              </tr>)}
            </tbody>
          </table>
        </div>
        <div className="mt-4 flex items-center justify-between gap-3 text-sm">
          <span className="text-[var(--muted)]">Página {Math.min(page,pages)} de {pages}</span>
          <div className="flex gap-2">
            <button type="button" aria-label="Página anterior" disabled={page<=1} onClick={()=>setPage(p=>p-1)} className="rounded-lg border border-[var(--border)] p-2 disabled:opacity-35"><ChevronLeft size={17}/></button>
            <button type="button" aria-label="Página siguiente" disabled={page>=pages} onClick={()=>setPage(p=>p+1)} className="rounded-lg border border-[var(--border)] p-2 disabled:opacity-35"><ChevronRight size={17}/></button>
          </div>
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--muted)]">
        <Building2 size={16}/><span>Prospectos independientes; no se generan clientes automáticamente.</span>
        <Link href="/crm" className="font-semibold text-[#5496CC] hover:underline">Ir a Clientes</Link>
        <Link href="/opportunities" className="font-semibold text-[#5496CC] hover:underline">Ir a Oportunidades</Link>
      </div>
    </div>

    {selected?<div role="dialog" aria-modal="true" aria-label={'Seguimiento '+selected.company} className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/75 p-3 md:p-6">
      <div className="max-h-[94vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 text-[var(--foreground)] shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div><h2 className="text-xl font-bold">{selected.company}</h2><p className="mt-1 text-sm text-[var(--muted)]">{selected.contact_name} · {selected.email}</p></div>
          <button type="button" aria-label="Cerrar seguimiento" onClick={()=>setSelected(null)} className="rounded-lg border border-[var(--border)] p-2"><X size={18}/></button>
        </div>
        {selected.last_delivery_status==='Rebotado'||!selected.send_eligible?<p className="mt-4 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300">Revisar la dirección, el historial y los permisos de contacto antes de nuevos envíos.</p>:null}
        <form className="mt-5 space-y-4" onSubmit={e=>void saveDetails(e)}>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block space-y-1"><span className="text-xs font-semibold">Etapa comercial</span>
              <select value={editStage} onChange={e=>setEditStage(e.target.value as Stage)} className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm">{stages.map(v=><option key={v}>{v}</option>)}</select>
            </label>
            <label className="block space-y-1"><span className="text-xs font-semibold">Próximo seguimiento</span>
              <input type="date" value={editFollowup} onChange={e=>setEditFollowup(e.target.value)} className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"/>
            </label>
          </div>
          <label className="block space-y-1"><span className="text-xs font-semibold">Notas del contacto</span>
            <textarea value={editNotes} onChange={e=>setEditNotes(e.target.value)} rows={3} maxLength={4000} className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm" placeholder="Contexto comercial y próximos pasos"/>
          </label>
          <label className="block space-y-1"><span className="text-xs font-semibold">Agregar nota al historial (opcional)</span>
            <textarea value={noteText} onChange={e=>setNoteText(e.target.value)} rows={2} maxLength={3000} className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm" placeholder="Ej.: solicitó información de mantenimiento de nave industrial"/>
          </label>
          <button type="submit" disabled={busy} className="rounded-xl bg-[#5496CC] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">Guardar seguimiento</button>
        </form>
        <section className="mt-6 border-t border-[var(--border)] pt-4">
          <h3 className="flex items-center gap-2 font-bold"><Mail size={17} className="text-[#5496CC]"/> Historial de contacto</h3>
          {events.length===0?<p className="mt-3 text-sm text-[var(--muted)]">Todavía no hay eventos registrados para este correo.</p>
          :<ul className="mt-3 space-y-2">{events.map(e=><li key={e.id} className="rounded-xl border border-[var(--border)] p-3">
            <div className="flex flex-wrap items-center justify-between gap-2"><strong className="text-sm">{e.event_type}</strong><span className="text-xs text-[var(--muted)]">{fmtDate(e.event_at)}</span></div>
            {e.note?<p className="mt-1 whitespace-pre-wrap text-xs text-[var(--muted)]">{e.note}</p>:null}
            {e.resend_message_id?<p className="mt-1 text-xs text-[var(--muted)]">Resend: {e.resend_message_id}</p>:null}
          </li>)}</ul>}
        </section>
      </div>
    </div>:null}
  </AppShell>
}
