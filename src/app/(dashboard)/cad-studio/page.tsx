'use client'

import { useEffect, useRef, useState } from 'react'
import { AppShell } from '@/components/layout/AppShell'

function AutodeskCadViewer({urn}:{urn:string}) {
  const containerRef=useRef<HTMLDivElement>(null)
  const [viewerError,setViewerError]=useState('')
  useEffect(()=>{
    let mounted=true
    let viewer: any = null
    const load=async()=>{
      try{
        const w=window as unknown as {Autodesk?:any}
        if(!w.Autodesk?.Viewing){
          if(!document.querySelector('link[data-aps-viewer]')){
            const css=document.createElement('link');css.rel='stylesheet';css.dataset.apsViewer='true';css.href='https://developer.api.autodesk.com/modelderivative/v2/viewers/7.*/style.min.css';document.head.appendChild(css)
          }
          await new Promise<void>((resolve,reject)=>{
            const existing=document.querySelector<HTMLScriptElement>('script[data-aps-viewer]')
            if(existing){if(w.Autodesk?.Viewing){resolve();return}existing.addEventListener('load',()=>resolve(),{once:true});existing.addEventListener('error',()=>reject(Error('No se cargó el visor Autodesk.')),{once:true});return}
            const script=document.createElement('script');script.dataset.apsViewer='true';script.src='https://developer.api.autodesk.com/modelderivative/v2/viewers/7.*/viewer3D.min.js';script.onload=()=>resolve();script.onerror=()=>reject(Error('No se cargó el visor Autodesk.'));document.body.appendChild(script)
          })
        }
        const Autodesk=w.Autodesk
        Autodesk.Viewing.Initializer({env:'AutodeskProduction2',api:'streamingV2',getAccessToken:async(callback:(token:string,expires:number)=>void)=>{
          const resp=await fetch('/api/cad/aps-model?mode=token',{cache:'no-store'})
          const value=await resp.json() as {access_token?:string,expires_in?:number}
          if(value.access_token) callback(value.access_token,value.expires_in||3000)
        }},()=>{
          if(!mounted || !containerRef.current)return
          const instance=new Autodesk.Viewing.GuiViewer3D(containerRef.current)
          instance.start();viewer=instance
          Autodesk.Viewing.Document.load('urn:'+urn,(doc:any)=>{
            if(!mounted)return
            const view=doc.getRoot().getDefaultGeometry()
            if(view)instance.loadDocumentNode(doc,view)
            else setViewerError('Autodesk no encontró geometría visible en este archivo.')
          },()=>setViewerError('No se pudo cargar el plano convertido.'))
        })
      }catch(error){if(mounted)setViewerError(error instanceof Error?error.message:'Error abriendo el visor.')}
    }
    void load()
    return()=>{mounted=false;viewer?.finish()}
  },[urn])
  return <div className="mt-4"><div ref={containerRef} style={{height:560,width:'100%',position:'relative'}}/>{viewerError?<p className="text-red-500 text-sm">{viewerError}</p>:null}</div>
}


export default function CadStudioPage() {
  const [file,setFile]=useState<File|null>(null)
  const [urn,setUrn]=useState<string|null>(null)
  const [status,setStatus]=useState('')
  const [message,setMessage]=useState('')
  const [busy,setBusy]=useState(false)

  useEffect(()=>{
    if(!urn || status==='success' || status==='failed')return
    let active=true
    const check=async()=>{
      try{
        const response=await fetch('/api/cad/aps-model?urn='+encodeURIComponent(urn),{cache:'no-store'})
        const result=await response.json() as {status?:string,error?:string,progress?:string}
        if(!active)return
        if(!response.ok || result.error){setStatus('failed');setMessage(result.error || 'No se pudo consultar el plano.');return}
        if(result.status==='success')setStatus('success')
        else if(result.status==='failed'){setStatus('failed');setMessage('Autodesk no pudo preparar este plano.')}
        else setStatus('Procesando plano'+(result.progress?': '+result.progress:'...'))
      }catch{if(active)setMessage('Esperando respuesta de Autodesk...')}
    }
    void check()
    const timer=setInterval(()=>void check(),6000)
    return()=>{active=false;clearInterval(timer)}
  },[urn,status==='success',status==='failed'])

  async function openPlan(){
    if(!file || busy)return
    setBusy(true);setMessage('Preparando el plano para visualizar...');setUrn(null);setStatus('')
    try{
      const start=await fetch('/api/cad/aps-upload',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({filename:file.name,size:file.size})})
      const uploadInfo=await start.json() as {error?:string,uploadUrl?:string,uploadKey?:string,objectKey?:string}
      if(!start.ok || !uploadInfo.uploadUrl || !uploadInfo.uploadKey || !uploadInfo.objectKey)throw Error(uploadInfo.error || 'No se pudo preparar el plano.')
      const upload=await fetch(uploadInfo.uploadUrl,{method:'PUT',headers:{'Content-Type':'application/octet-stream'},body:file})
      if(!upload.ok)throw Error('No se pudo transferir el archivo a Autodesk (HTTP '+upload.status+').')
      setMessage('Preparando vista previa...')
      const complete=await fetch('/api/cad/aps-complete',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({objectKey:uploadInfo.objectKey,uploadKey:uploadInfo.uploadKey})})
      const result=await complete.json() as {urn?:string,error?:string}
      if(!complete.ok || !result.urn)throw Error(result.error || 'No se pudo iniciar el visor.')
      setUrn(result.urn);setStatus('Procesando plano...')
      setMessage('El plano original no se modificará.')
    }catch(error){setMessage(error instanceof Error?error.message:'No se pudo abrir el plano.')}
    finally{setBusy(false)}
  }

  return <AppShell>
    <main className="mx-auto max-w-[1500px] space-y-5 p-3 sm:p-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-widest text-[#5496CC]">Gestión de Proyectos</p>
        <h1 className="mt-2 text-3xl font-bold text-[var(--foreground)]">Visor de planos NEDVI</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">Consulta planos DWG con Autodesk. Solo visualización: sin herramientas de edición ni exportación.</p>
      </header>
      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
        <div className="flex flex-wrap items-center gap-3">
          <label className="inline-flex cursor-pointer items-center rounded-lg border border-[var(--border)] bg-[var(--surface-soft)] px-4 py-2 text-sm font-semibold text-[var(--foreground)]">
            Elegir plano DWG
            <input className="sr-only" type="file" accept=".dwg" onChange={async e=>{
              const selected=e.target.files?.[0];e.target.value='';if(!selected)return
              setUrn(null);setStatus('');setFile(null)
              if(selected.size>20*1024*1024 || !selected.size){setMessage('El archivo DWG debe tener entre 1 byte y 20 MB.');return}
              const header=String.fromCharCode(...new Uint8Array(await selected.slice(0,6).arrayBuffer()))
              if(!/^AC10[0-9]{2}$/.test(header)){setMessage('Este archivo no tiene una cabecera DWG válida.');return}
              setFile(selected);setMessage('Plano seleccionado. Pulsa Visualizar plano.')
            }}/>
          </label>
          {file?<span className="text-sm text-[var(--foreground)]">{file.name}</span>:<span className="text-sm text-[var(--muted)]">Selecciona un DWG para abrirlo.</span>}
          <button type="button" disabled={!file || busy} onClick={()=>void openPlan()} className="rounded-lg bg-[#7BAEE3] px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-[#6c9ed2] disabled:cursor-not-allowed disabled:opacity-50">{busy?'Preparando...':'Visualizar plano'}</button>
        </div>
        {message?<p role="status" className="mt-3 text-sm text-[var(--muted)]">{message}</p>:null}
      </section>
      {urn?<section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
        <p className="text-sm font-semibold text-[var(--foreground)]">{status==='success'?'Plano listo para visualizar':status==='failed'?'No se pudo procesar el plano':status}</p>
        {status==='success'?<AutodeskCadViewer urn={urn}/>:null}
      </section>:null}
    </main>
  </AppShell>
}
