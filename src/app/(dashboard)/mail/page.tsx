'use client'

import { useEffect, useMemo, useState } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { MailAttachmentViewer, type MailAttachment } from '@/components/mail/MailAttachmentViewer'
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
  html?:string
  attachments:MailAttachment[]
  previewLimited?:boolean
  size?:number
}
function isolatedEmail(html:string,allowExternal:boolean) {
  // Mail content runs in a script-disabled, same-origin sandbox.
  // External tracking images remain blocked unless the user explicitly opts in.
  const images=allowExternal?"'self' data: blob: https:":"'self' data: blob:"
  const policy="default-src 'none'; script-src 'none'; img-src "+images+"; style-src 'unsafe-inline'; font-src 'none'; object-src 'none'; frame-src 'none'; connect-src 'none'; form-action 'none'; base-uri 'none'; media-src 'self' data:"
  return '<!doctype html><html><head><meta charset="utf-8"><meta name="referrer" content="no-referrer"><meta http-equiv="Content-Security-Policy" content="'+policy+'"><style>html,body{margin:0;padding:12px;background:white;color:#16283c;font-family:Arial,sans-serif;overflow-wrap:anywhere;max-width:100%}img{max-width:100%;height:auto}table{max-width:100%}</style></head><body>'+html+'</body></html>'
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
  const [activeAttachment,setActiveAttachment]=useState<MailAttachment|null>(null)
  const [showHtml,setShowHtml]=useState(true)
  const [externalImages,setExternalImages]=useState(false)

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
      setSelected(previous=>previous && items.some(item=>item.uid===previous)?previous:null)
    }).catch(e=>{
      if(controller.signal.aborted)return
      setError(e instanceof Error?e.message:'No se pudo cargar el correo.')
      setMessages([])
      setSelected(null)
    }).finally(()=>{if(!controller.signal.aborted)setLoading(false)})
    return()=>controller.abort()
  },[reload])

  useEffect(()=>{
    setActiveAttachment(null)
    setShowHtml(true)
    setExternalImages(false)
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
      <div className={"grid min-h-[620px] overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm "+(selected===null?"lg:grid-cols-[205px_minmax(0,1fr)]":"grid-cols-1")}>
        <aside className={"border-b border-[var(--border)] p-4 lg:border-b-0 lg:border-r "+(selected!==null?"hidden":"")}>
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
        <section className={"min-w-0 border-b border-[var(--border)] lg:border-b-0 lg:border-r "+(selected!==null?"hidden":"")}>
          <div className="border-b border-[var(--border)] p-4">
            <label className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] px-3">
              <Search size={17} className="text-[var(--muted)]"/>
              <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Buscar entre mensajes cargados..." className="h-11 min-w-0 flex-1 bg-transparent text-sm text-[var(--foreground)] outline-none"/>
            </label>
            <p className="mt-2 text-xs text-[var(--muted)]">{loading?'Consultando buzón…':messages.length+' mensajes cargados · '+unread+' sin leer'}</p>
          </div>
          <div className="max-h-[610px] overflow-y-auto">
            {loading?<div className="p-6 text-sm text-[var(--muted)]">Cargando correos de Spacemail…</div>:error?<div className="p-5 text-sm text-[var(--muted)]"><AlertCircle size={24} className="mb-3 text-amber-500"/>{error}<p className="mt-2 text-xs">Verifica la configuración IMAP y vuelve a intentar.</p></div>:filtered.length?filtered.map(item=>
              <button key={item.uid} type="button" onClick={()=>setSelected(item.uid)} className="group w-full border-b border-[var(--border)] px-4 py-5 text-left transition-colors hover:bg-[var(--surface-soft)] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#1f6feb] sm:px-7">
                <div className="flex items-start justify-between gap-3"><span className={'min-w-0 truncate text-sm text-[var(--foreground)] '+(item.unread?'font-bold':'font-medium')}>{item.from}</span><span className="shrink-0 text-[10px] text-[var(--muted)]">{dateLabel(item.date)}</span></div>
                <div className="mt-2 flex items-center justify-between gap-3"><p className="min-w-0 truncate text-base font-semibold text-[var(--foreground)]">{item.subject}</p><ArrowRight size={17} className="shrink-0 text-[var(--muted)] opacity-50 transition group-hover:translate-x-1 group-hover:opacity-100" /></div>
                <p className="mt-1 truncate text-xs text-[var(--muted)]">{item.email}</p>
                {item.unread?<span className="mt-2 inline-flex items-center gap-1 text-[10px] font-semibold text-[#1f6feb]"><span className="h-1.5 w-1.5 rounded-full bg-[#1f6feb]"/>Sin leer</span>:null}
              </button>):<div className="p-6 text-center text-sm text-[var(--muted)]">No hay mensajes para mostrar.</div>}
          </div>
        </section>
        <section className={"min-w-0 p-5 sm:p-7 "+(selected===null?"hidden":"")}>\n          <button type="button" onClick={()=>setSelected(null)} className="mb-6 inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] px-4 py-2.5 text-sm font-semibold text-[var(--foreground)] transition hover:bg-[#1f6feb]/10"><ArrowRight size={17} className="rotate-180" /> Volver a recibidos</button>
          {detailLoading?<p className="text-sm text-[var(--muted)]">Abriendo mensaje…</p>:detailError?<div className="rounded-xl border border-amber-400/40 p-4 text-sm text-[var(--foreground)]"><AlertCircle size={20} className="mb-2 text-amber-500"/>{detailError}</div>:detail?<div>
            <div className="border-b border-[var(--border)] pb-5">
              <h2 className="text-xl font-bold text-[var(--foreground)]">{detail.subject}</h2>
              <p className="mt-4 text-sm font-semibold text-[var(--foreground)]">{detail.from}</p>
              <p className="mt-1 break-all text-xs text-[var(--muted)]">{detail.email} · {dateLabel(detail.date)}</p>
              <p className="mt-1 text-xs text-[var(--muted)]">Para: pedrog@nedviconstructora.com</p>
            </div>
            {detail.previewLimited?<div className="mt-4 rounded-xl border border-blue-400/40 bg-blue-500/10 p-3 text-xs leading-5 text-[var(--foreground)]"><strong>Mensaje grande:</strong> los archivos se consultan por separado sin descargar todo el correo. Algunos adjuntos muy grandes pueden superar el límite permitido.</div>:null}
            {detail.html?<div className="mt-4 flex flex-wrap items-center justify-between gap-2">
              <div className="inline-flex gap-1 rounded-lg border border-[var(--border)] bg-[var(--surface-soft)] p-1">
                <button type="button" onClick={()=>setShowHtml(true)} className={'rounded-md px-3 py-2 text-xs font-semibold '+(showHtml?'bg-[#1f6feb] text-white':'text-[var(--foreground)]')}>Ver diseño original</button>
                <button type="button" onClick={()=>setShowHtml(false)} className={'rounded-md px-3 py-2 text-xs font-semibold '+(!showHtml?'bg-[#1f6feb] text-white':'text-[var(--foreground)]')}>Solo texto</button>
              </div>
              {showHtml?<button type="button" onClick={()=>setExternalImages(v=>!v)} className="rounded-lg border border-[var(--border)] px-3 py-2 text-xs font-semibold text-[var(--foreground)]">{externalImages?'Bloquear imágenes externas':'Cargar imágenes externas'}</button>:null}
            </div>:null}
            {detail.html && showHtml?<div className="mt-4 overflow-hidden rounded-xl border border-[var(--border)] bg-white">
              <iframe title={'Contenido de correo: '+detail.subject} sandbox="allow-same-origin" referrerPolicy="no-referrer" srcDoc={isolatedEmail(detail.html,externalImages)} className="h-[min(72vh,850px)] min-h-[480px] w-full border-0 bg-white" />
            </div>:<div className="max-h-[75vh] overflow-y-auto whitespace-pre-wrap break-words py-6 text-sm leading-7 text-[var(--foreground)]">{detail.text}</div>}
            {detail.html && showHtml?<p className="mt-2 text-xs text-[var(--muted)]">Por seguridad, el contenido del correo se muestra sin ejecutar scripts. Las imágenes externas se mantienen bloqueadas hasta que tú decidas cargarlas.</p>:null}
            {detail.attachments.length?<div className="border-t border-[var(--border)] pt-4">
              <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-[var(--foreground)]"><Paperclip size={16}/> Adjuntos recibidos ({detail.attachments.length})</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {detail.attachments.map(file=><div key={file.part} className="flex min-w-0 items-center justify-between gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] p-3">
                  <div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold text-[var(--foreground)]" title={file.name}>{file.name}</p><p className="mt-1 text-[10px] text-[var(--muted)]">{file.category==='image'?'Imagen':file.category==='video'?'Video':file.category==='pdf'?'PDF':'Documento'} · {Math.max(1,Math.round(file.size/1024))} KB aprox.</p></div>
                  {file.available?<button type="button" onClick={()=>setActiveAttachment(file)} className="shrink-0 rounded-lg bg-[#1f6feb] px-3 py-2 text-xs font-semibold text-white">{file.category==='document'||file.category==='other'?'Abrir':'Ver'}</button>:<span className="text-[10px] text-amber-500">Demasiado grande</span>}
                </div>)}
              </div>
              <p className="mt-3 text-xs text-[var(--muted)]">Imágenes, PDF y videos compatibles se abren dentro de NEDVI OS. Word, Excel y otros formatos pueden descargarse. Los archivos grandes deben abrirse desde Spacemail.</p>
            </div>:null}
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
      <p className="flex items-center gap-2 text-xs text-[var(--muted)]"><Clock3 size={14}/> Archivos y mensajes se consultan desde Spacemail al abrirlos. No se guardan copias en Supabase.</p>
    </div>
    {detail && activeAttachment?<MailAttachmentViewer uid={detail.uid} file={activeAttachment} onClose={()=>setActiveAttachment(null)}/>:null}
  </AppShell>
}
