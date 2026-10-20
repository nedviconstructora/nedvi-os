'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { Save, ShieldCheck, UserRoundCog, X } from 'lucide-react'

import { defaultPermissionsForRole } from '@/features/access/services/accessStorage'
import { PasswordRecoveryCenter } from '@/features/access/components/PasswordRecoveryCenter'
import { PermissionsCenter } from '@/features/access/components/PermissionsCenter'

type DbRole = 'developer' | 'gerente_comercial' | 'gerente_administrativo' | 'gerente_operativo' | 'supervisor_obra' | 'supervisor_administrativo' | 'administracion' | 'obra' | 'contabilidad' | 'cliente'
type UiRole = 'DEVELOPER' | 'Gerente Comercial' | 'Gerente Administrativo' | 'Gerente Operativo' | 'Supervisor de Obra' | 'Supervisor Administrativo' | 'RH' | 'Administración' | 'Supervisor' | 'Contabilidad' | 'Cliente'
type RoleUser = { id:string; name:string; email:string; role:DbRole; active:boolean; source:'principal'|'authorized' }
const ROLE_OPTIONS: Array<{value:DbRole;label:string;description:string}> = [
 {value:'developer',label:'DEVELOPER',description:'Cuenta técnica principal protegida.'},
 {value:'gerente_comercial',label:'GERENTE COMERCIAL',description:'Acceso empresarial, sin herramientas exclusivas DEVELOPER.'},
 {value:'gerente_administrativo',label:'GERENTE ADMINISTRATIVO',description:'Acceso empresarial, sin herramientas exclusivas DEVELOPER.'},
 {value:'gerente_operativo',label:'GERENTE OPERATIVO',description:'Acceso empresarial, sin herramientas exclusivas DEVELOPER.'},
 {value:'supervisor_obra',label:'SUPERVISOR',description:'Clientes, cotizaciones, proyectos y operaciones.'},
 {value:'supervisor_administrativo',label:'RH',description:'Acceso preventivamente restringido hasta completar la lectura por proyecto.'},
 {value:'administracion',label:'ADMIN (ANTERIOR)',description:'Rol anterior de administración.'},
 {value:'contabilidad',label:'CONTABILIDAD',description:'Consulta de checadas.'},
 {value:'cliente',label:'CLIENTE',description:'Portal del cliente.'},
]
const uiRoles: Record<DbRole,UiRole> = {
 developer:'DEVELOPER',gerente_comercial:'Gerente Comercial',gerente_administrativo:'Gerente Administrativo',
 gerente_operativo:'Gerente Operativo',supervisor_obra:'Supervisor',
 supervisor_administrativo:'RH',administracion:'Administración',
 obra:'Supervisor',contabilidad:'Contabilidad',cliente:'Cliente'
}
const dbRoles: Record<UiRole,DbRole> = {...Object.fromEntries(Object.entries(uiRoles).map(([k,v])=>[v,k])) as Record<UiRole,DbRole>,Supervisor:'supervisor_obra'}
function toDbRole(role:string):DbRole {return role==='Supervisor de Obra'?'supervisor_obra':role==='Supervisor Administrativo'?'supervisor_administrativo':dbRoles[role as UiRole] ?? (role in uiRoles ? role as DbRole : 'cliente')}
function toUiRole(role:DbRole):UiRole {return uiRoles[role]}
export default function UsersSettingsLayout({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const [users, setUsers] = useState<RoleUser[]>([])
  const [savingId, setSavingId] = useState<string | null>(null)
  const [message, setMessage] = useState('')

  const [pending,setPending]=useState<Record<string,DbRole>>({})
  const [loadingUsers,setLoadingUsers]=useState(false)
  async function loadUsers() {
    setLoadingUsers(true)
    try {
      const response=await fetch('/api/access/users',{cache:'no-store'})
      const body=await response.json() as {users?: Array<{id:string;name:string;email:string;role:string;status:string}>;error?:string}
      if(!response.ok || !body.users) throw new Error(body.error||'No se pudieron cargar los usuarios.')
      setUsers(body.users.map(u=>({id:u.id,name:u.name,email:u.email,role:toDbRole(u.role),active:u.status==='Activo',source:u.role==='DEVELOPER'?'principal':'authorized'})))
      setPending({})
    } catch(e) {setMessage(e instanceof Error?e.message:'No fue posible cargar los roles.')}
    finally {setLoadingUsers(false)}
  }
  useEffect(()=>{if(open){setMessage('');void loadUsers()}},[open])
  const pendingCount=Object.keys(pending).length
  async function saveChanges(){
    if(!pendingCount || savingId)return
    setMessage('')
    let saved=0
    try {
      for(const [id,role] of Object.entries(pending)){
        const user=users.find(u=>u.id===id)
        if(!user || user.source==='principal' || role==='developer')throw new Error('Intento de modificar una cuenta protegida.')
        setSavingId(id)
        const response=await fetch('/api/access/users',{
          method:'PATCH',headers:{'Content-Type':'application/json'},cache:'no-store',
          body:JSON.stringify({userId:id,role:toUiRole(role),permissions:defaultPermissionsForRole(toUiRole(role))})
        })
        const body=await response.json() as {role?:string;error?:string}
        if(!response.ok || body.role!==toUiRole(role))throw new Error(body.error||'No se confirmó el cambio en Supabase.')
        saved++
      }
      await loadUsers()
      setMessage(`Se guardaron ${saved} cambios de rol en Supabase. Los usuarios deben volver a iniciar sesión.`)
    } catch(e){
      await loadUsers()
      setMessage(`Se guardaron ${saved} cambios. ${e instanceof Error?e.message:'Error al guardar.'} Revisa los roles antes de volver a intentar.`)
    }finally{setSavingId(null)}
  }

  return (
    <>
      <div className="relative">
        <div className="mx-auto flex w-full max-w-7xl flex-wrap justify-end gap-2 px-0 pt-4 sm:pt-6 lg:pt-8">
          <PermissionsCenter />
          <PasswordRecoveryCenter />
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="nedvi-settings-top-action inline-flex h-11 items-center gap-2 rounded-xl bg-[#7DC6FF] px-4 text-sm font-bold text-black shadow-sm transition hover:brightness-95"
          >
            <UserRoundCog size={17} /> Gestionar roles
          </button>
        </div>
        {children}
      </div>

      {open ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="max-h-[88vh] w-full max-w-3xl overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-[var(--border)] p-5">
              <div>
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-[#5496CC]">
                  <ShieldCheck size={15} /> Administración
                </div>
                <h2 className="mt-2 text-2xl font-bold text-[var(--foreground)]">Gestionar roles</h2>
                <p className="mt-1 text-sm text-[var(--muted)]">Administra el nivel de acceso de todos los usuarios autorizados.</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="rounded-lg p-2 text-[var(--muted)] hover:bg-[var(--surface-soft)]">
                <X size={20} />
              </button>
            </div>

            <div className="max-h-[62vh] overflow-y-auto p-5">
              <div className="space-y-3">
                {users.map((user) => (
                  <div key={user.id} className="grid gap-4 rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] p-4 md:grid-cols-[1fr_260px] md:items-center">
                    <div>
                      <p className="font-semibold text-[var(--foreground)]">{user.name}</p>
                      <p className="mt-1 text-xs text-[var(--muted)]">
                        {user.email ? `${user.email} · ` : ''}{user.active ? 'Activo' : 'Inactivo'}{user.source === 'principal' ? ' · Cuenta principal protegida' : ''}
                      </p>
                    </div>
                    <select
                      value={pending[user.id] ?? (user.role === 'obra' ? 'supervisor_obra' : user.role)}
                      disabled={!!savingId || user.source === 'principal'}
                      onChange={(event) => {const next=event.target.value as DbRole;setPending(current=>{const draft={...current};if(next===user.role)delete draft[user.id];else draft[user.id]=next;return draft});setMessage('')}}
                      className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm font-bold text-[var(--foreground)] outline-none focus:border-[#5496CC] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {ROLE_OPTIONS.filter(role=>role.value!=='developer' || user.source==='principal').map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}
                    </select>
                  </div>
                ))}
              </div>

              {loadingUsers ? <p className="mt-3 text-sm text-[var(--muted)]">Cargando roles desde Supabase...</p> : null}
              {message ? <p className="mt-4 rounded-xl border border-[#5496CC]/20 bg-[#5496CC]/10 p-3 text-sm text-[var(--foreground)]">{message}</p> : null}

              <div className="mt-5 grid gap-2 md:grid-cols-3">
                {ROLE_OPTIONS.map((role) => (
                  <div key={role.value} className="rounded-xl border border-[var(--border)] p-3">
                    <p className="text-xs font-bold text-[#5496CC]">{role.label}</p>
                    <p className="mt-1 text-xs leading-5 text-[var(--muted)]">{role.description}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border)] bg-[var(--surface)] p-4">
              <p className="text-xs text-[var(--muted)]">{pendingCount ? `${pendingCount} cambio(s) pendientes de guardar` : 'Los cambios se guardan en Supabase al confirmar.'}</p>
              <button type="button" onClick={()=>void saveChanges()} disabled={!pendingCount || !!savingId || loadingUsers} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#7DC6FF] px-5 text-sm font-bold text-black disabled:cursor-not-allowed disabled:opacity-50"><Save size={17}/>{savingId?'Guardando...':'Guardar cambios'}</button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
