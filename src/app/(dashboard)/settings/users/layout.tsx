'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { ShieldCheck, UserRoundCog, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

type DbRole = 'administracion' | 'obra' | 'cliente'

type Profile = {
  id: string
  full_name: string | null
  first_name: string | null
  role: DbRole
  active: boolean
}

const ROLE_OPTIONS: Array<{ value: DbRole; label: string; description: string }> = [
  { value: 'administracion', label: 'ADMIN', description: 'Acceso total a NEDVI OS.' },
  { value: 'obra', label: 'SUPERVISOR / OBRA', description: 'Operación, clientes, levantamientos, cotizaciones, proyectos y obra; sin RH, nómina ni administración sensible.' },
  { value: 'cliente', label: 'CLIENTE', description: 'Solo consulta sus proyectos y avances autorizados.' },
]

export default function UsersSettingsLayout({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(false)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [message, setMessage] = useState('')

  async function loadProfiles() {
    setLoading(true)
    setMessage('')
    const supabase = createClient()
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, first_name, role, active')
      .order('full_name', { ascending: true })

    if (error) {
      setMessage(`No se pudieron cargar los perfiles: ${error.message}`)
      setProfiles([])
    } else {
      setProfiles((data ?? []) as Profile[])
    }
    setLoading(false)
  }

  useEffect(() => {
    if (open) void loadProfiles()
  }, [open])

  async function changeRole(profile: Profile, role: DbRole) {
    if (profile.role === role) return
    setSavingId(profile.id)
    setMessage('')

    const supabase = createClient()
    const { error } = await supabase
      .from('profiles')
      .update({ role })
      .eq('id', profile.id)

    if (error) {
      setMessage(`No se pudo cambiar el rol: ${error.message}`)
    } else {
      setProfiles((current) => current.map((item) => item.id === profile.id ? { ...item, role } : item))
      setMessage(`Rol de ${profile.full_name || profile.first_name || 'usuario'} actualizado correctamente.`)
    }
    setSavingId(null)
  }

  return (
    <>
      <div className="relative">
        <div className="mx-auto flex w-full max-w-7xl justify-end px-0 pt-4 sm:pt-6 lg:pt-8">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#7DC6FF] px-4 text-sm font-bold text-black shadow-sm transition hover:brightness-95"
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
                <p className="mt-1 text-sm text-[var(--muted)]">Cambia el nivel de acceso de cada usuario desde NEDVI OS.</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="rounded-lg p-2 text-[var(--muted)] hover:bg-[var(--surface-soft)]">
                <X size={20} />
              </button>
            </div>

            <div className="max-h-[62vh] overflow-y-auto p-5">
              {loading ? <p className="py-8 text-center text-sm text-[var(--muted)]">Cargando usuarios...</p> : null}

              {!loading ? (
                <div className="space-y-3">
                  {profiles.map((profile) => (
                    <div key={profile.id} className="grid gap-4 rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] p-4 md:grid-cols-[1fr_260px] md:items-center">
                      <div>
                        <p className="font-semibold text-[var(--foreground)]">{profile.full_name || profile.first_name || 'Usuario NEDVI'}</p>
                        <p className="mt-1 text-xs text-[var(--muted)]">{profile.active ? 'Activo' : 'Inactivo'} · ID {profile.id.slice(0, 8)}</p>
                      </div>
                      <select
                        value={profile.role}
                        disabled={savingId === profile.id}
                        onChange={(event) => void changeRole(profile, event.target.value as DbRole)}
                        className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm font-bold text-[var(--foreground)] outline-none focus:border-[#5496CC] disabled:opacity-60"
                      >
                        {ROLE_OPTIONS.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}
                      </select>
                    </div>
                  ))}
                </div>
              ) : null}

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
          </div>
        </div>
      ) : null}
    </>
  )
}
