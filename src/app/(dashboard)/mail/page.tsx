'use client'

import { useEffect, useMemo, useState } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { AlertCircle, ArrowRight, Clock3, Inbox, LockKeyhole, Mail, Paperclip, RefreshCw, Search, ShieldCheck } from 'lucide-react'

type MailListItem = {
  uid:number
  from:string
  email:string
  subject:string
  date:string
  unread:boolean
  size:number
}
type MailDetail = {
  uid:number
  from:string
  email:string
  subject:string
  date:string
  text:string
  attachments:string[]
  previewLimited?:boolean
  size?:number
}
function dateLabel(date:string) {
  const value=new Date(date)
  return Number.isNaN(value.getTime())?'Sin fecha':new Intl.DateTimeFormat('es-MX',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}).format(value)
}
async function readJson(response:Response) {
  const data:unknown = await response.json().catch(()=>null)
  return data && typeof data==='object'?data as Record<string,unknown>:{}
}

export default function MailPage() {
  const [messages,setMessages]=useState<MailListItem[]>([])
  const [loading,setLoading]=useState(true)
  const [error,setError]=useState('')
  const [reload,setReload]=useState(0)
  const [query,setQuery]=useState('')
  const [selected,setSelected]=useState<number|null>(null)
  const [detail,setDetail]=useState<MailDetail|null>(null)
  const [detailLoading,setDetailLoading]=useState(false)
  const [detailError,setDetailError]=useState('')

  useEffect(()=>{
    const controller=new AbortController()
    setLoading(true)
    setError('')
    void fetch('/api/mail/inbox',{cache:'no-store',signal:controller.signal}).then(async response=>{
      const data=await readJson(response)
      if(!response.ok) throw new Error(typeof data.error==='string'?data.error:'No se pudo consultar el buzón.')
      return Array.isArray(data.messages)?data.messages as MailListItem[]:[]
    }).then(items=>{
      if(controller.signal.aborted)return
      setMessages(items)
      setSelected(previous=>previous && items.some(item=>item.uid===previous)?previous:items[0]?.uid??null)
    }).catch(e=>{
      if(controller.signal.aborted)return
      setError(e instanceof Error?e.message:'No se pudo cargar el correo.')
      setMessages([])
      setSelected(null)
    }).finally(()=>{if(!controller.signal.aborted)setLoading(false)})
    return()=>controller.abort()
  },[reload])

  useEffect(()=>{
    if(!selected){setDetail(null);setDetailError('');return}
    const controller=new AbortController()
    setDetail(null)
    setDetailError('')
    setDetailLoading(true)
    void fetch('/api/mail/message?uid='+selected,{cache:'no-store',signal:controller.signal}).then(async response=>{
      const data=await readJson(response)
      if(!response.ok)throw new Error(typeof data.error==='string'?data.error:'No se pudo abrir el mensaje.')
      return data.message as MailDetail
    }).then(message=>{if(!controller.signal.aborted)setDetail(message)}).catch(e=>{
      if(!controller.signal.aborted)setDetailError(e instanceof Error?e.message:'No se pudo abrir el mensaje.')
    }).finally(()=>{if(!controller.signal.aborted)setDetailLoading(false)})
    return()=>controller.abort()
  },[selected,reload])

  const filtered=useMemo(()=>messages.filter(item=>(item.from+' '+item.email+' '+item.subject).toLowerCase().includes(query.toLowerCase())),[messages,query])
  const unread=messages.filter(item=>item.unread).length
  return <AppShell>
    <div className="mx-auto max-w-[1550px] space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.18em] text-[var(--muted)]">COMUNICACIÓN / NEDVI OS</p>
          <h1 className="mt-1 text-3xl font-bold text-[var(--foreground)]">Correo corporativo</h1>
          <p className="mt-2 text-sm text-[var(--muted)]">Consulta los últimos 30 mensajes de Spacemail en modo de solo lectura.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className={'inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-bold '+(error?'border-amber-400/50 bg-amber-400/10 text-amber-600':'border-emerald-400/40 bg-emerald-400/10 text-emerald-600')}>
            <ShieldCheck size={15}/>{loading?'Conectando…':error?'Sin conexión IMAP':'Bandeja conectada · Solo lectura'}
          </span>
          <button type="button" onClick={()=>setReload(v=>v+1)} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm font-semibold text-[var(--foreground)] disabled:opacity-50">
            <RefreshCw size={16} className={loading?'animate-spin':''}/> Actualizar
          </button>
        </div>
      </div>
      <div className="grid min-h-[620px] overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm lg:grid-cols-[205px_330px_minmax(0,1fr)]">
        <aside className="border-b border-[var(--border)] p-4 lg:border-b-0 lg:border-r">
          <div className="mb-5 flex items-center gap-2 rounded-xl bg-[var(--surface-soft)] p-3 text-xs font-semibold text-[var(--foreground)]">
            <Mail size={18} className="shrink-0"/> <span className="min-w-0 break-all">pedrog@nedviconstructora.com</span>
          </div>
          <div className="flex items-center gap-3 rounded-xl bg-[#1f6feb] px-4 py-3 text-sm font-semibold text-white">
            <Inbox size={17}/> Recibidos <span className="ml-auto">{unread}</span>
          </div>
          <div className="mt-3 flex items-center gap-2 px-4 text-xs text-[var(--muted)]"><LockKeyhole size={14}/> Envíos y respuestas: próxima fase</div>
          <div className="mt-6 rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] p-3 text-xs leading-5 text-[var(--muted)]">
            Abrir un mensaje no lo marcará como leído. No se modifica ni elimina correo en Spacemail.
          </div>
        </aside>
        <section className="min-w-0 border-b border-[var(--border)] lg:border-b-0 lg:border-r">
          <div className="border-b border-[var(--border)] p-4">
            <label className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] px-3">
              <Search size={17} className="text-[var(--muted)]"/>
              <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Buscar entre mensajes cargados..." className="h-11 min-w-0 flex-1 bg-transparent text-sm text-[var(--foreground)] outline-none"/>
            </label>
            <p className="mt-2 text-xs text-[var(--muted)]">{loading?'Consultando buzón…':messages.length+' mensajes cargados · '+unread+' sin leer'}</p>
          </div>
          <div className="max-h-[610px] overflow-y-auto">
            {loading?<div className="p-6 text-sm text-[var(--muted)]">Cargando correos de Spacemail…</div>:error?<div className="p-5 text-sm text-[var(--muted)]"><AlertCircle size={24} className="mb-3 text-amber-500"/>{error}<p className="mt-2 text-xs">Verifica la configuración IMAP y vuelve a intentar.</p></div>:filtered.length?filtered.map(item=>
              <button key={item.uid} type="button" onClick={()=>setSelected(item.uid)} className={'w-full border-b border-[var(--border)] p-4 text-left transition hover:bg-[var(--surface-soft)] '+(selected===item.uid?'bg-[#1f6feb]/10':'')}>
                <div className="flex items-start justify-between gap-2"><span className={'min-w-0 truncate text-sm text-[var(--foreground)] '+(item.unread?'font-bold':'font-medium')}>{item.from}</span><span className="shrink-0 text-[10px] text-[var(--muted)]">{dateLabel(item.date)}</span></div>
                <p className="mt-2 truncate text-sm font-semibold text-[var(--foreground)]">{item.subject}</p>
                <p className="mt-1 truncate text-xs text-[var(--muted)]">{item.email}</p>
                {item.unread?<span className="mt-2 inline-flex items-center gap-1 text-[10px] font-semibold text-[#1f6feb]"><span className="h-1.5 w-1.5 rounded-full bg-[#1f6feb]"/>Sin leer</span>:null}
              </button>):<div className="p-6 text-center text-sm text-[var(--muted)]">No hay mensajes para mostrar.</div>}
          </div>
        </section>
        <section className="min-w-0 p-5 sm:p-7">
          {detailLoading?<p className="text-sm text-[var(--muted)]">Abriendo mensaje…</p>:detailError?<div className="rounded-xl border border-amber-400/40 p-4 text-sm text-[var(--foreground)]"><AlertCircle size={20} className="mb-2 text-amber-500"/>{detailError}</div>:detail?<div>
            <div className="border-b border-[var(--border)] pb-5">
              <h2 className="text-xl font-bold text-[var(--foreground)]">{detail.subject}</h2>
              <p className="mt-4 text-sm font-semibold text-[var(--foreground)]">{detail.from}</p>
              <p className="mt-1 break-all text-xs text-[var(--muted)]">{detail.email} · {dateLabel(detail.date)}</p>
              <p className="mt-1 text-xs text-[var(--muted)]">Para: pedrog@nedviconstructora.com</p>
            </div>
            {detail.previewLimited?<div className="mt-4 rounded-xl border border-blue-400/40 bg-blue-500/10 p-3 text-xs leading-5 text-[var(--foreground)]"><strong>Mensaje grande:</strong> mostramos el texto disponible sin descargar videos, imágenes o documentos completos. Algunos adjuntos pueden no aparecer en esta vista. Para descargar o reproducir un video, utiliza Spacemail mientras habilitamos esa función.</div>:null}
            <div className="max-h-[410px] overflow-y-auto whitespace-pre-wrap break-words py-6 text-sm leading-7 text-[var(--foreground)]">{detail.text}</div>
            {detail.attachments.length?<div className="border-t border-[var(--border)] pt-4"><p className="mb-2 flex items-center gap-2 text-sm font-semibold text-[var(--foreground)]"><Paperclip size={16}/> Adjuntos recibidos</p><div className="flex flex-wrap gap-2">{detail.attachments.map((file,i)=><span key={i} className="rounded-lg border border-[var(--border)] px-3 py-2 text-xs text-[var(--foreground)]">{file}</span>)}</div><p className="mt-2 text-xs text-[var(--muted)]">La descarga de adjuntos estará disponible en una próxima fase.</p></div>:null}
            <div className="mt-7 rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] p-4 text-sm text-[var(--muted)]">
              <div className="flex items-center gap-2 font-semibold text-[var(--foreground)]"><LockKeyhole size={16}/> Solo lectura</div>
              <p className="mt-2">Las respuestas, el envío de mensajes y la carga de adjuntos se habilitarán después de validar esta conexión.</p>
            </div>
          </div>:<div className="flex min-h-[470px] flex-col items-center justify-center gap-3 text-center text-[var(--muted)]">
            <Inbox size={38}/>
            <h2 className="text-lg font-semibold text-[var(--foreground)]">{error?'Buzón no disponible':'Selecciona un mensaje'}</h2>
            <p className="max-w-sm text-sm">{error?'Comprueba la conexión para ver tus correos reales.':'Aquí aparecerá el contenido del correo seleccionado.'}</p>
          </div>}
        </section>
      </div>
      <p className="flex items-center gap-2 text-xs text-[var(--muted)]"><Clock3 size={14}/> Los mensajes se consultan cuando abres o actualizas esta pantalla. No se guardan copias en Supabase en esta fase.</p>
    </div>
  </AppShell>
}
