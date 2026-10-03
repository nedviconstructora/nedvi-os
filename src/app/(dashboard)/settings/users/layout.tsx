'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { ShieldCheck, UserRoundCog, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { currentUser } from '@/data/currentUser'
import { defaultPermissionsForRole, readAccessUsers, writeAccessUsers } from '@/features/access/services/accessStorage'
import { PasswordRecoveryCenter } from '@/features/access/components/PasswordRecoveryCenter'
import { PermissionsCenter } from '@/features/access/components/PermissionsCenter'

type DbRole = 'administracion' | 'obra' | 'cliente'
type UiRole = 'Administración' | 'Supervisor' | 'Cliente'

type RoleUser = {
  id: string
  name: string
  email?: string
  role: DbRole
  active: boolean
  source: 'principal' | 'authorized'
}

const ROLE_OPTIONS: Array<{ value: DbRole; label: string; description: string }> = [
  { value: 'administracion', label: 'ADMIN', description: 'Acceso total a NEDVI OS.' },
  { value: 'obra', label: 'SUPERVISOR / OBRA', description: 'Operación, clientes, levantamientos, cotizaciones, proyectos y obra; sin RH, nómina ni administración sensible.' },
  { value: 'cliente', label: 'CLIENTE', description: 'Solo consulta sus proyectos y avances autorizados.' },
]

function toDbRole(role: string): DbRole {
  if (role === 'Administración' || role === 'administracion') return 'administracion'
  if (role === 'Supervisor' || role === 'obra') return 'obra'
  return 'cliente'
}

function toUiRole(role: DbRole): UiRole {
  if (role === 'administracion') return 'Administración'
  if (role === 'obra') return 'Supervisor'
  return 'Cliente'
}

export default function UsersSettingsLayout({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const [users, setUsers] = useState<RoleUser[]>([])
  const [savingId, setSavingId] = useState<string | null>(null)
  const [message, setMessage] = useState('')

  function loadUsers() {
    const authorized = readAccessUsers()
    const principal: RoleUser = {
      id: 'principal-admin',
      name: currentUser.name,
      email: currentUser.email,
      role: toDbRole(currentUser.role),
      active: true,
      source: 'principal',
    }

    const rest: RoleUser[] = authorized
      .filter((user) => user.email.toLowerCase() !== currentUser.email.toLowerCase())
      .map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        role: toDbRole(user.role),
        active: user.status === 'Activo',
        source: 'authorized' as const,
      }))

    setUsers([principal, ...rest])
  }

  useEffect(() => {
    if (open) {
      setMessage('')
      loadUsers()
    }
  }, [open])

  async function changeRole(user: RoleUser, role: DbRole) {
    if (user.role === role) return
    if (user.source === 'principal') {
      setMessage('La cuenta principal de Administración está protegida y no puede cambiarse desde aquí.')
      return
    }

    setSavingId(user.id)
    setMessage('')

    const authorized = readAccessUsers()
    const nextAuthorized = authorized.map((item) =>
      item.id === user.id
        ? {
            ...item,
            role: toUiRole(role),
            permissions: defaultPermissionsForRole(toUiRole(role)),
          }
        : item,
    )
    writeAccessUsers(nextAuthorized)

    if (user.email) {
      const supabase = createClient()
      const { data: authMatch } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .maybeSingle()

      if (authMatch?.id) {
        const { error } = await supabase.from('profiles').update({ role }).eq('id', authMatch.id)
        if (error) {
          setMessage(`El rol se actualizó en NEDVI OS, pero Supabase no pudo sincronizarlo: ${error.message}`)
          setUsers((current) => current.map((item) => item.id === user.id ? { ...item, role } : item))
          setSavingId(null)
          return
        }
      }
    }

    setUsers((current) => current.map((item) => item.id === user.id ? { ...item, role } : item))
    setMessage(`Rol de ${user.name} actualizado a ${ROLE_OPTIONS.find((item) => item.value === role)?.label ?? role}.`)
    setSavingId(null)
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
                      value={user.role}
                      disabled={savingId === user.id || user.source === 'principal'}
                      onChange={(event) => void changeRole(user, event.target.value as DbRole)}
                      className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm font-bold text-[var(--foreground)] outline-none focus:border-[#5496CC] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {ROLE_OPTIONS.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}
                    </select>
                  </div>
                ))}
              </div>

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
