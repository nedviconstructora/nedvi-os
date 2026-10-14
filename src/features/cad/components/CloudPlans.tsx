'use client'
import { useEffect, useState } from 'react'

type Plan={id:string;project_id:string;original_name:string;file_size:number;visible_to_client:boolean;created_at:string}
export function CloudPlans({projectId,clientView=false,file}:{projectId:string;clientView?:boolean;file?:File|null}){
 const [plans,setPlans]=useState<Plan[]>([])
 const [manage,setManage]=useState(false)
 const [message,setMessage]=useState('')
 const [busy,setBusy]=useState(false)
 async function load(){
  if(!projectId){setPlans([]);return}
  try{
   const response=await fetch('/api/cad/plans?projectId='+encodeURIComponent(projectId),{cache:'no-store'})
   const result=await response.json()
   if(!response.ok)throw new Error(result.error||'No se pudieron cargar los planos.')
   setPlans(result.plans||[]);setManage(Boolean(result.canManage));setMessage('')
  }catch(e){setPlans([]);setMessage(e instanceof Error?e.message:'Error al consultar planos.')}
 }
 useEffect(()=>{void load()},[projectId])
 async function openPlan(id:string){
  // Open blank tab synchronously to avoid popup blockers after async authorization.
  const tab=window.open('about:blank','_blank')
  try{
   const response=await fetch('/api/cad/plans?projectId='+encodeURIComponent(projectId)+'&id='+encodeURIComponent(id),{cache:'no-store'})
   const data=await response.json()
   if(!response.ok||!data.url)throw new Error(data.error||'No se pudo abrir el plano.')
   if(tab)tab.location.href=data.url
   else setMessage('Habilita las ventanas emergentes para visualizar el plano.')
  }catch(e){tab?.close();setMessage(e instanceof Error?e.message:'Error al abrir plano.')}
 }
 async function save(){
  if(!file||!projectId)return
  setBusy(true)
  try{
   const body=new FormData();body.set('projectId',projectId);body.set('file',file)
   const response=await fetch('/api/cad/plans',{method:'POST',body})
   const data=await response.json()
   if(!response.ok)throw new Error(data.error||'No se pudo guardar.')
   await load();setMessage('Plano guardado en la nube y asociado al proyecto. Visible solo para NEDVI hasta que autorices compartirlo.')
  }catch(e){setMessage(e instanceof Error?e.message:'Error al guardar.')}finally{setBusy(false)}
 }
 async function toggle(plan:Plan){
  setBusy(true)
  try{
   const response=await fetch('/api/cad/plans',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:plan.id,projectId,visibleToClient:!plan.visible_to_client})})
   const data=await response.json()
   if(!response.ok)throw new Error(data.error||'No se pudo actualizar la visibilidad.')
   await load()
  }catch(e){setMessage(e instanceof Error?e.message:'Error al actualizar permiso.')}finally{setBusy(false)}
 }
 return <section className="mt-5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
  <div className="flex flex-wrap items-center justify-between gap-3">
   <div><h3 className="text-base font-bold text-[var(--foreground)]">{clientView?'Mis planos':'Planos guardados en NEDVI OS'}</h3><p className="mt-1 text-xs text-[var(--muted)]">Archivos privados en la nube, vinculados al proyecto. Los archivos compartidos aparecen en el portal del cliente.</p></div>
   {!clientView&&manage&&file?<button type="button" disabled={busy} onClick={()=>void save()} className="rounded-xl bg-[#5496CC] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{busy?'Guardando...':'Guardar plano en la nube'}</button>:null}
  </div>
  {message?<p role="status" className="mt-3 text-xs text-[var(--muted)]">{message}</p>:null}
  <div className="mt-4 space-y-2">{plans.length?plans.map(plan=><div key={plan.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--border)] p-3">
   <div className="min-w-0"><p className="break-all text-sm font-semibold text-[var(--foreground)]">{plan.original_name}</p><p className="text-xs text-[var(--muted)]">{(plan.file_size/1024/1024).toFixed(2)} MB · {new Date(plan.created_at).toLocaleString('es-MX')} · {plan.visible_to_client?'Compartido con cliente':'Privado NEDVI'}</p></div>
   <div className="flex flex-wrap gap-2"><button type="button" onClick={()=>void openPlan(plan.id)} className="rounded-lg border border-[var(--border)] px-3 py-2 text-xs font-semibold text-[var(--foreground)]">Abrir / descargar</button>
   {!clientView&&manage?<button type="button" disabled={busy} onClick={()=>void toggle(plan)} className="rounded-lg border border-[var(--border)] px-3 py-2 text-xs font-semibold text-[var(--foreground)]">{plan.visible_to_client?'Ocultar al cliente':'Compartir con cliente'}</button>:null}</div>
  </div>):<p className="text-sm text-[var(--muted)]">Todavía no hay planos guardados para este proyecto.</p>}</div>
 </section>
}
