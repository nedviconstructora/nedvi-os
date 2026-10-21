'use client'

import { Download, ExternalLink, FileText, Image as ImageIcon, PlayCircle, X } from 'lucide-react'

export type MailAttachment = {
  part:string
  name:string
  type:string
  category:'image'|'video'|'pdf'|'document'|'other'
  size:number
  available:boolean
}

export function attachmentUrl(uid:number,part:string) {
  return '/api/mail/attachment?uid='+encodeURIComponent(String(uid))+'&part='+encodeURIComponent(part)
}

export function MailAttachmentViewer({uid,file,onClose}:{uid:number;file:MailAttachment;onClose:()=>void}) {
  const src=attachmentUrl(uid,file.part)
  const displayable=file.category==='image'||file.category==='video'||file.category==='pdf'
  return <div role="dialog" aria-modal="true" aria-label={'Vista previa: '+file.name} className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-2 backdrop-blur-md sm:p-6" onClick={onClose}>
    <section className="flex h-[min(92vh,950px)] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-white/20 bg-[var(--surface)] shadow-2xl" onClick={event=>event.stopPropagation()}>
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-[var(--border)] px-4 py-3 sm:px-5">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-[var(--foreground)]">{file.name}</p>
          <p className="text-xs text-[var(--muted)]">{file.category==='image'?'Imagen':file.category==='video'?'Video':file.category==='pdf'?'Documento PDF':'Documento'} · Adjunto de Spacemail</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <a href={src} target="_blank" rel="noopener noreferrer" className="hidden items-center gap-1 rounded-lg border border-[var(--border)] px-3 py-2 text-xs font-semibold text-[var(--foreground)] hover:bg-[var(--surface-soft)] sm:inline-flex" title="Abrir archivo"><ExternalLink size={14}/> Abrir</a>
          <a href={src+'&download=1'} download={file.name} className="inline-flex items-center gap-1 rounded-lg bg-[#1f6feb] px-3 py-2 text-xs font-semibold text-white"><Download size={14}/> Descargar</a>
          <button type="button" onClick={onClose} aria-label="Cerrar vista previa" className="rounded-lg border border-[var(--border)] p-2 text-[var(--foreground)]"><X size={18}/></button>
        </div>
      </header>
      <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto bg-[#10151b] p-2 sm:p-4">
        {file.category==='image'?<img src={src} alt={file.name} className="max-h-full max-w-full object-contain"/>:
          file.category==='video'?<video key={src} src={src} controls preload="metadata" playsInline className="max-h-full max-w-full" controlsList="nodownload"><track kind="captions" srcLang="es" label="Sin subtítulos"/></video>:
          file.category==='pdf'?<iframe src={src} title={'Documento: '+file.name} className="h-full w-full rounded-lg bg-white" />:
          <div className="space-y-4 p-6 text-center text-white"><FileText size={50} className="mx-auto text-blue-300"/><p>Este formato se descarga para abrirlo con su aplicación correspondiente.</p><a href={src+'&download=1'} download={file.name} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-white"><Download size={16}/> Descargar documento</a></div>}
      </div>
      <footer className="shrink-0 border-t border-[var(--border)] px-4 py-2 text-xs text-[var(--muted)]">
        {displayable?'Si no aparece la vista previa, utiliza Descargar. Algunos formatos de video no son compatibles con todos los navegadores.':'Las hojas de cálculo y los archivos de Word se abren con su aplicación habitual.'}
      </footer>
    </section>
  </div>
}
