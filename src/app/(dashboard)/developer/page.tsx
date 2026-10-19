import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/utils/supabase/server'
import { AppShell } from '@/components/layout/AppShell'
import { ShieldCheck, Users, HardHat, BriefcaseBusiness, Wallet, ArrowUpRight, LockKeyhole, Database, Activity } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function DeveloperPanel() {
  const supabase=await createServerClient()
  const {data:{user}}=await supabase.auth.getUser()
  if(!user) redirect('/login')
  const {data:profile,error:profileError}=await supabase.from('profiles').select('role,active').eq('id',user.id).maybeSingle()
  if(profileError || !profile?.active || profile.role!=='developer') redirect('/dashboard')

  const url=process.env.NEXT_PUBLIC_SUPABASE_URL
  const key=process.env.SUPABASE_SERVICE_ROLE_KEY
  let totalUsers:number|null=null, activeUsers:number|null=null, disabledUsers:number|null=null
  let diagnostics='Información de usuarios no disponible temporalmente.'
  if(url && key) {
    const admin=createAdminClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}})
    const {data,error}=await admin.from('profiles').select('id,active,deleted_at')
    if(!error && data){
      const valid=data.filter(item=>!item.deleted_at)
      totalUsers=valid.length
      activeUsers=valid.filter(item=>item.active).length
      disabledUsers=valid.length-activeUsers
      diagnostics='Datos consultados de Supabase en tiempo real.'
    }
  }

  return <AppShell>
    <div className="mx-auto max-w-6xl space-y-7">
      <div className="rounded-2xl border border-[#5496CC]/30 bg-[var(--surface)] p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div><div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#5496CC]"><ShieldCheck size={18}/>Acceso exclusivo · DEVELOPER</div><h1 className="text-3xl font-bold">Panel DEVELOPER</h1><p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">Centro de control técnico de NEDVI OS. El servidor verifica tu sesión y el rol DEVELOPER antes de mostrar esta información.</p></div>
          <span className="rounded-full border border-[#5496CC]/30 px-3 py-2 text-xs font-bold text-[#5496CC]">NEDVI · Cuenta principal</span>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {[{label:'Usuarios registrados',value:totalUsers},{label:'Cuentas activas',value:activeUsers},{label:'Cuentas inactivas',value:disabledUsers}].map(item=><div key={item.label} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5"><p className="text-sm text-[var(--muted)]">{item.label}</p><p className="mt-3 text-3xl font-bold">{item.value===null?'—':item.value}</p></div>)}
      </div>
      <p className="text-xs text-[var(--muted)]">{diagnostics}</p>
      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-bold"><Activity size={19} className="text-[#5496CC]"/>Accesos de administración</h2>
        <div className="grid gap-3 md:grid-cols-3">
          <Link href="/settings/users" className="flex items-center justify-between rounded-xl border border-[var(--border)] p-4 hover:border-[#5496CC]"><span className="flex items-center gap-2 text-sm font-semibold"><Users size={19}/>Usuarios y permisos</span><ArrowUpRight size={16}/></Link>
          <Link href="/time-clock" className="flex items-center justify-between rounded-xl border border-[var(--border)] p-4 hover:border-[#5496CC]"><span className="flex items-center gap-2 text-sm font-semibold"><Activity size={19}/>Historial de checadas</span><ArrowUpRight size={16}/></Link>
          <Link href="/dashboard" className="flex items-center justify-between rounded-xl border border-[var(--border)] p-4 hover:border-[#5496CC]"><span className="flex items-center gap-2 text-sm font-semibold"><Database size={19}/>Dashboard operativo</span><ArrowUpRight size={16}/></Link>
        </div>
      </section>
      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
        <h2 className="mb-2 flex items-center gap-2 text-lg font-bold"><LockKeyhole size={19} className="text-[#5496CC]"/>Jerarquía oficial de NEDVI OS</h2>
        <p className="mb-5 text-sm text-[var(--muted)]">Los gerentes comparten nivel jerárquico. Cada supervisor depende del área indicada.</p>
        <div className="mx-auto max-w-4xl space-y-3 text-center">
          <div className="mx-auto max-w-xs rounded-xl border border-[#5496CC]/40 bg-[#5496CC]/10 p-4 font-bold"><ShieldCheck className="mx-auto mb-2 text-[#5496CC]" size={21}/>DEVELOPER</div>
          <div className="text-[#5496CC]">↓</div>
          <div className="grid gap-3 md:grid-cols-3">
            <div className="space-y-3"><div className="rounded-xl border border-[var(--border)] p-4 font-semibold"><HardHat className="mx-auto mb-2" size={20}/>Gerente Operativo</div><div className="text-[#5496CC]">↓</div><div className="rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] p-4 text-sm font-medium">Supervisor de Obra</div></div>
            <div><div className="rounded-xl border border-[var(--border)] p-4 font-semibold"><BriefcaseBusiness className="mx-auto mb-2" size={20}/>Gerente Comercial</div></div>
            <div className="space-y-3"><div className="rounded-xl border border-[var(--border)] p-4 font-semibold"><Wallet className="mx-auto mb-2" size={20}/>Gerente Administrativo</div><div className="text-[#5496CC]">↓</div><div className="rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] p-4 text-sm font-medium">Supervisor Administrativo</div></div>
          </div>
        </div>
      </section>
      <p className="text-xs text-[var(--muted)]">Las herramientas técnicas avanzadas, auditoría ampliada y configuraciones de infraestructura se incorporarán de forma gradual con validaciones de servidor. Este panel no expone claves, tokens ni secretos.</p>
    </div>
  </AppShell>
}
