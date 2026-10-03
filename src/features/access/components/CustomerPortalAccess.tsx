'use client'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Copy, Eye, KeyRound, Link2, Power, ShieldCheck } from 'lucide-react'
import type { Customer } from '@/features/crm/types/customer'
import { readProjects } from '@/features/projects/services/projectStorage'
import type { Project } from '@/features/projects/types/project'
import { defaultPermissionsForRole, readAccessSession, readAccessUsers, writeAccessSession, writeAccessUsers, type AccessUser } from '@/features/access/services/accessStorage'

const ADMIN_SESSION_BACKUP_KEY = 'nedvi-admin-session-backup'
async function sha256(value: string) { const b=new TextEncoder().encode(value); const h=await crypto.subtle.digest('SHA-256',b); return Array.from(new Uint8Array(h)).map(x=>x.toString(16).padStart(2,'0')).join('') }
function tempPassword(){ const a='ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'; const b=new Uint32Array(10); crypto.getRandomValues(b); return `Nedvi-${Array.from(b,v=>a[v%a.length]).join('')}!` }

export function CustomerPortalAccess({customer}:{customer:Customer}){
 const router=useRouter(); const [users,setUsers]=useState<AccessUser[]>([]); const [projects,setProjects]=useState<Project[]>([]); const [selected,setSelected]=useState<string[]>([]); const [email,setEmail]=useState(customer.email); const [password,setPassword]=useState(''); const [message,setMessage]=useState(''); const [saving,setSaving]=useState(false)
 useEffect(()=>{ const u=readAccessUsers(); const p=readProjects().filter(x=>x.clientId===customer.id||x.client===customer.company); const linked=u.find(x=>x.customerId===customer.id); setUsers(u); setProjects(p); setEmail(linked?.email??customer.email); setSelected(linked ? (linked.projectIds ?? []) : []) },[customer])
 const accessUser=useMemo(()=>users.find(x=>x.customerId===customer.id),[users,customer.id])
 function toggle(id:string){setSelected(c=>c.includes(id)?c.filter(x=>x!==id):[...c,id])}
 async function save(){
  if(saving)return
  const mail=email.trim().toLowerCase(); if(!mail.includes('@')){setMessage('Escribe un correo válido.');return} if(users.some(x=>x.email.toLowerCase()===mail&&x.customerId!==customer.id)){setMessage('Ese correo ya pertenece a otro usuario.');return}
  setSaving(true); setMessage('')
  try{
   const generated=accessUser?'':tempPassword(); const now=new Date().toISOString(); let authUserId=accessUser?.id
   if(!accessUser){
    const response=await fetch('/api/access/client',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:mail,password:generated,fullName:customer.contact||customer.company,customerFolio:customer.folio})})
    const result=await response.json() as {userId?:string;error?:string;warning?:string}
    if(!response.ok||!result.userId){setMessage(result.error??'No pudimos crear el usuario en Supabase Auth.');return}
    authUserId=result.userId
    if(result.warning)setMessage(result.warning)
   }
   const next:AccessUser={id:authUserId??`client-${crypto.randomUUID()}`,name:customer.contact||customer.company,email:mail,phone:customer.phone,position:`Cliente · ${customer.company}`,role:'Cliente',permissions:defaultPermissionsForRole('Cliente'),status:accessUser?.status??'Activo',createdAt:accessUser?.createdAt??now,passwordHash:accessUser?.passwordHash??await sha256(generated),passwordUpdatedAt:accessUser?.passwordUpdatedAt??now,customerId:customer.id,customerFolio:customer.folio,projectIds:selected}; const all=[next,...users.filter(x=>x.id!==next.id)]; writeAccessUsers(all);setUsers(all);setPassword(generated);if(!message)setMessage(accessUser?'Acceso actualizado correctamente.':'Acceso creado en Supabase Auth. Guarda la contraseña temporal.')
  }catch(error){console.error(error);setMessage('No pudimos conectar con el servicio de creación de usuarios.')}
  finally{setSaving(false)}
 }
 function status(){if(!accessUser)return;const all=users.map(x=>x.id===accessUser.id?{...x,status:x.status==='Activo'?('Inactivo' as const):('Activo' as const)}:x);writeAccessUsers(all);setUsers(all)}
 function preview(){if(!accessUser||accessUser.status!=='Activo')return;const admin=readAccessSession();if(admin)localStorage.setItem(ADMIN_SESSION_BACKUP_KEY,JSON.stringify(admin));writeAccessSession({userId:accessUser.id,name:accessUser.name,firstName:accessUser.name.split(' ')[0]||accessUser.name,initials:accessUser.name.split(' ').filter(Boolean).slice(0,2).map(x=>x[0]?.toUpperCase()).join(''),email:accessUser.email,role:'Cliente',permissions:defaultPermissionsForRole('Cliente'),createdAt:new Date().toISOString(),customerId:customer.id,customerFolio:customer.folio,projectIds:accessUser.projectIds});router.push('/client')}
 async function copy(){if(!password)return;await navigator.clipboard.writeText(`Portal NEDVI OS\nUsuario: ${email.trim().toLowerCase()}\nContraseña temporal: ${password}\nFolio: ${customer.folio??'Sin folio'}`);setMessage('Credenciales copiadas.')}
 return <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm sm:p-6">
  <div className="flex flex-col justify-between gap-4 sm:flex-row"><div><div className="flex items-center gap-2 text-[#5496CC]"><ShieldCheck size={18}/><span className="text-xs font-semibold uppercase tracking-[0.14em]">Portal del cliente</span></div><h2 className="mt-2 text-lg font-bold text-[var(--foreground)]">Acceso a NEDVI OS</h2><p className="mt-1 text-sm text-[var(--muted)]">Vincula este folio con una cuenta y asigna únicamente los proyectos que este cliente podrá consultar.</p></div><span className="h-fit rounded-full bg-[#7BAEE3]/15 px-3 py-1 text-xs font-semibold text-[#5496CC]">{accessUser?accessUser.status:'Sin acceso'}</span></div>
  <div className="mt-6 grid gap-5 lg:grid-cols-2"><label><span className="text-xs font-semibold text-[var(--foreground)]">Correo de acceso</span><input value={email} onChange={e=>setEmail(e.target.value)} className="mt-2 h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)] outline-none focus:border-[#7BAEE3]"/></label><div><span className="text-xs font-semibold text-[var(--foreground)]">Folio vinculado</span><div className="mt-2 flex h-11 items-center rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-sm font-semibold text-[#5496CC]">{customer.folio??'Sin folio'}</div></div></div>
  <div className="mt-6"><div className="flex flex-wrap items-end justify-between gap-2"><div><p className="text-xs font-semibold text-[var(--foreground)]">Proyectos asignados al portal</p><p className="mt-1 text-[11px] text-[var(--muted)]">Solo los proyectos seleccionados aparecerán en la cuenta del cliente.</p></div><span className="rounded-full bg-[#7BAEE3]/15 px-3 py-1 text-[10px] font-semibold text-[#5496CC]">{selected.length} seleccionados</span></div><div className="mt-3 space-y-2">{projects.length?projects.map(p=><label key={p.id} className="flex cursor-pointer items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--background)] p-3"><input type="checkbox" checked={selected.includes(p.id)} onChange={()=>toggle(p.id)} className="h-4 w-4 accent-[#7BAEE3]"/><span><span className="block text-sm font-semibold text-[var(--foreground)]">{p.name}</span><span className="text-xs text-[var(--muted)]">{p.folio??'Sin folio'} · {p.progress}% avance</span></span></label>):<div className="rounded-xl border border-dashed border-[var(--border)] p-4 text-sm text-[var(--muted)]">Aún no hay proyectos vinculados a este cliente.</div>}</div></div>
  {password?<div className="mt-5 rounded-xl border border-amber-400/30 bg-amber-400/10 p-4"><p className="text-xs font-semibold text-amber-600 dark:text-amber-300">Contraseña temporal — guárdala ahora</p><div className="mt-2 flex flex-wrap items-center gap-3"><code className="rounded-lg bg-black/10 px-3 py-2 text-sm font-bold text-[var(--foreground)]">{password}</code><button onClick={copy} className="inline-flex items-center gap-2 text-xs font-semibold text-[#5496CC]"><Copy size={14}/>Copiar credenciales</button></div></div>:null}
  {message?<p className="mt-4 text-xs font-medium text-[#5496CC]">{message}</p>:null}
  <div className="mt-6 flex flex-wrap gap-2 border-t border-[var(--border)] pt-5"><button onClick={save} disabled={saving} className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#7BAEE3] px-4 text-xs font-bold text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"><KeyRound size={14}/>{saving?'Creando usuario...':accessUser?'Guardar acceso':'Crear acceso al portal'}</button>{accessUser?<><button onClick={preview} disabled={accessUser.status!=='Activo'} className="inline-flex h-10 items-center gap-2 rounded-xl border border-[var(--border)] px-4 text-xs font-semibold text-[var(--foreground)] disabled:opacity-40"><Eye size={14}/>Vista como cliente</button><button onClick={status} className="inline-flex h-10 items-center gap-2 rounded-xl border border-[var(--border)] px-4 text-xs font-semibold text-[var(--foreground)]"><Power size={14}/>{accessUser.status==='Activo'?'Desactivar':'Activar'}</button><span className="inline-flex h-10 items-center gap-2 px-2 text-xs text-[var(--muted)]"><Link2 size={14}/>{accessUser.email}</span></>:null}</div>
 </div>
}
