'use client'

import { useEffect, useRef, useState } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { CloudPlans } from '@/features/cad/components/CloudPlans'
import { readProjectsFromSupabase } from '@/features/projects/services/projectSupabaseService'
import { DraftingCompass, Upload, ExternalLink, Download, MonitorDown, Maximize2, FileType2, Layers3 } from 'lucide-react'

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
          // Rueda hacia adelante = acercar; hacia atrás = alejar.
          instance.prefs?.set('reverseMouseZoomDir', true)
          instance.navigation?.setReverseZoomDirection(true)
          Autodesk.Viewing.Document.load('urn:'+urn,(doc:any)=>{
            if(!mounted)return
            const root=doc.getRoot()
            // Some 2D DWG derivatives have no default geometry node.
            const defaultView=root.getDefaultGeometry?.()
            const views2d=root.search?.({type:'geometry',role:'2d'}) || []
            const views3d=root.search?.({type:'geometry',role:'3d'}) || []
            const geometries=root.search?.({type:'geometry'}) || []
            const view=defaultView || views2d[0] || views3d[0] || geometries[0]
            if(view){
              Promise.resolve(instance.loadDocumentNode(doc,view)).catch(()=>{
                if(mounted)setViewerError('Autodesk no pudo cargar la vista de este plano. Revisa si contiene referencias externas o vistas compatibles.')
              })
            }else{
              setViewerError('Autodesk procesó el DWG pero no generó vistas 2D/3D visibles. Revisa que el archivo contenga geometría en Model o Layout y que no dependa de referencias externas.')
            }
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
  const viewerSectionRef=useRef<HTMLElement>(null)
  const [projects,setProjects]=useState<Array<{id:string;name:string;folio?:string;client:string}>>([])
  const [selectedProject,setSelectedProject]=useState('')
  useEffect(()=>{void readProjectsFromSupabase().then(rows=>setProjects(rows.map(p=>({id:p.id,name:p.name,folio:p.folio,client:p.client})))).catch(()=>setMessage('No se pudo cargar el catálogo de proyectos.'))},[])

  function downloadOriginal(){
    if(!file)return
    const url=URL.createObjectURL(file)
    const link=document.createElement('a')
    link.href=url
    link.download=file.name
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.setTimeout(()=>URL.revokeObjectURL(url),1000)
  }

  function openDesktopAutocad(){
    if (!file) {
      setMessage('Para abrir un plano en AutoCAD instalado, primero selecciona un archivo DWG o DXF en NEDVI CAD Studio. Después descárgalo y ábrelo desde Windows.')
      return
    }
    downloadOriginal()
    setMessage('Plano descargado. Abre el archivo desde Descargas de Windows: si tienes AutoCAD configurado como aplicación predeterminada para DWG/DXF, se abrirá en AutoCAD de escritorio. NEDVI OS no puede iniciar directamente el programa instalado desde el navegador.')
  }

  async function expandViewer(){
    if(!viewerSectionRef.current)return
    try{await viewerSectionRef.current.requestFullscreen()}
    catch{setMessage('No se pudo activar la pantalla completa en este navegador.')}
  }

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
      <header className="flex flex-col gap-4 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm sm:p-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#7BAEE3]"><DraftingCompass size={18}/> NEDVI CAD Studio</p>
          <h1 className="mt-2 text-2xl font-bold text-[var(--foreground)] sm:text-3xl">Visualización y gestión de planos</h1>
          <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">Consulta archivos DWG con Autodesk sin alterar su original. Cuando necesites editar, continúa en AutoCAD Web.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <a href="https://web.autocad.com/" target="_blank" rel="noopener noreferrer" className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] px-4 py-3 text-sm font-semibold text-[var(--foreground)] hover:opacity-80">
            <ExternalLink size={17}/> AutoCAD Web
          </a>
          <button type="button" onClick={openDesktopAutocad} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#5496CC] px-4 py-3 text-sm font-semibold text-white hover:brightness-95">
            <MonitorDown size={17}/> AutoCAD de escritorio
          </button>
        </div>
      </header>

      <div className="grid min-w-0 gap-5 lg:grid-cols-[290px_minmax(0,1fr)]">
        <aside className="self-start rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-[var(--foreground)]"><Layers3 size={19} className="text-[#7BAEE3]"/> Archivos del proyecto</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">Selecciona un plano DWG para visualizarlo.</p>
          <label className="mt-5 flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#7BAEE3] px-4 py-3 text-sm font-semibold text-slate-950 hover:bg-[#6c9ed2] focus-within:ring-2 focus-within:ring-blue-500">
            <Upload size={17}/> Subir plano DWG
            <input className="sr-only" type="file" accept=".dwg" disabled={busy} onChange={async e=>{
              const selected=e.target.files?.[0];e.target.value='';if(!selected)return
              setUrn(null);setStatus('');setFile(null)
              if(selected.size>20*1024*1024 || !selected.size){setMessage('El archivo DWG debe tener entre 1 byte y 20 MB.');return}
              const header=String.fromCharCode(...new Uint8Array(await selected.slice(0,6).arrayBuffer()))
              if(!/^AC10[0-9]{2}$/.test(header)){setMessage('Este archivo no tiene una cabecera DWG válida.');return}
              setFile(selected);setMessage('Plano seleccionado. Pulsa Visualizar plano.')
            }}/>
          </label>
          {file ? <div className="mt-4 rounded-2xl border border-[#7BAEE3]/50 bg-[#7BAEE3]/10 p-4">
            <div className="flex items-start gap-3"><FileType2 className="mt-0.5 shrink-0 text-[#7BAEE3]" size={20}/><div className="min-w-0">
              <p className="break-all text-sm font-semibold text-[var(--foreground)]">{file.name}</p>
              <p className="mt-1 text-xs text-[var(--muted)]">DWG · {(file.size/1024/1024).toFixed(2)} MB</p>
            </div></div>
          </div> : <div className="mt-4 rounded-2xl border border-dashed border-[var(--border)] p-5 text-center text-sm text-[var(--muted)]">Aún no has seleccionado un plano.</div>}
          <p className="mt-4 text-xs leading-relaxed text-[var(--muted)]">Formatos del visor: DWG, hasta 20 MB. Para DXF utiliza la importación específica disponible en NEDVI OS. Los archivos seleccionados solo permanecen en esta sesión del navegador.</p>
          <label className="mt-5 block text-sm font-semibold text-[var(--foreground)]">Proyecto asociado al plano
            <select value={selectedProject} onChange={e=>setSelectedProject(e.target.value)} className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] p-3 text-sm">
              <option value="">Seleccionar proyecto</option>
              {projects.map(project=><option key={project.id} value={project.id}>{project.folio || 'Sin folio'} · {project.client} · {project.name}</option>)}
            </select>
          </label>
          {selectedProject?<CloudPlans projectId={selectedProject} file={file}/>:<p className="mt-3 text-xs text-[var(--muted)]">Selecciona un proyecto para guardar planos o consultar su biblioteca.</p>}
        </aside>

        <section ref={viewerSectionRef} className="min-w-0 overflow-auto rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm sm:p-5 fullscreen:h-screen fullscreen:rounded-none fullscreen:bg-[#101C29]">
          <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="min-w-0"><h2 className="break-all text-lg font-semibold text-[var(--foreground)] fullscreen:text-white">{file?.name || 'Plano arquitectónico'}</h2><p className="text-sm text-[var(--muted)]">Visor Autodesk · DWG</p></div>
            <div className="flex flex-wrap gap-2">
              <button type="button" disabled={!file || busy} onClick={()=>void openPlan()} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#7BAEE3] px-3 py-2 text-sm font-semibold text-slate-950 hover:bg-[#6c9ed2] disabled:cursor-not-allowed disabled:opacity-50">{busy?'Preparando...':'Visualizar plano'}</button>
              <a href="https://web.autocad.com/" target="_blank" rel="noopener noreferrer" className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-2 text-sm font-semibold text-[var(--foreground)]"><ExternalLink size={15}/> AutoCAD Web</a>
              <button type="button" onClick={openDesktopAutocad} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-2 text-sm font-semibold text-[var(--foreground)]"><MonitorDown size={15}/> AutoCAD de escritorio</button>
              <button type="button" disabled={!file} onClick={downloadOriginal} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-2 text-sm font-semibold text-[var(--foreground)] disabled:opacity-50"><Download size={15}/> Descargar DWG</button>
              <button type="button" onClick={()=>void expandViewer()} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-2 text-sm font-semibold text-[var(--foreground)]"><Maximize2 size={15}/> Pantalla completa</button>
            </div>
          </div>
          <div className="min-h-[320px] overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] p-3 sm:p-4">
            <div className="mb-2 flex items-center justify-between gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]"><span>Vista superior · Autodesk Viewer</span><span>{urn && status==='success'?'Plano cargado':'NEDVI CAD'}</span></div>
            {urn && status==='success' ? <AutodeskCadViewer urn={urn}/> :
              <div className="flex min-h-[370px] flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-[var(--border)] text-center text-[var(--foreground)]" style={{backgroundImage:'linear-gradient(var(--border) 1px,transparent 1px),linear-gradient(90deg,var(--border) 1px,transparent 1px)',backgroundSize:'24px 24px'}}>
                <DraftingCompass size={42} strokeWidth={1.2} className="text-[#80CFF5]"/>
                <p className="max-w-sm px-5 font-semibold">{status==='failed'?'No se pudo preparar el plano':urn?status:'Selecciona un DWG para ver el plano real'}</p>
                <p className="max-w-md px-5 text-sm text-[var(--muted)]">{urn?'El visor aparecerá cuando Autodesk termine de procesar el archivo.':'No se muestra una maqueta ficticia: aquí aparecerá la geometría del archivo que selecciones.'}</p>
              </div>}
          </div>
          {message?<p role="status" className="mt-4 text-sm text-[var(--muted)]">{message}</p>:null}
          <p className="mt-3 text-xs text-[var(--muted)]">AutoCAD Web abre el editor en el navegador. AutoCAD de escritorio descarga el plano seleccionado para abrirlo desde Windows con AutoCAD instalado y asociado a los archivos DWG/DXF. La vista en NEDVI es de solo lectura.</p>
        </section>
      </div>
    </main>
  </AppShell>
}
