'use client'

import { useEffect, useState } from 'react'
import { Check, Eye, ShieldCheck, X, XCircle } from 'lucide-react'
import { currentUser } from '@/data/currentUser'
import { defaultPermissionsForRole, readAccessUsers, type AccessUser } from '@/features/access/services/accessStorage'
import type { ModulePermission } from '@/config/roles'

const PERMISSION_LABELS: Record<ModulePermission, string> = {
  dashboard: 'Dashboard',
  commercial: 'Comercial y Ventas',
  projects: 'Gestión de Proyectos',
  purchasing: 'Compras y Suministros',
  operations: 'Operaciones / Obra',
  agenda: 'Agenda',
  'human-resources': 'Recursos Humanos',
  finance: 'Finanzas',
  indicators: 'Indicadores',
  settings: 'Configuración',
  coral: 'Coral AI',
  'client-portal': 'Portal del cliente',
}

const ALL_PERMISSIONS = Object.keys(PERMISSION_LABELS) as ModulePermission[]

type ViewerUser = Pick<AccessUser, 'id' | 'name' | 'email' | 'role' | 'permissions'> & {
  principal?: boolean
}

export function PermissionsCenter() {
  const [open, setOpen] = useState(false)
  const [users, setUsers] = useState<ViewerUser[]>([])
  const [selectedId, setSelectedId] = useState('principal-admin')

  function refresh() {
    const authorized = readAccessUsers()
    const principal: ViewerUser = {
      id: 'principal-admin',
      name: currentUser.name,
      email: currentUser.email,
      role: currentUser.role,
      permissions: defaultPermissionsForRole(currentUser.role),
      principal: true,
    }
    setUsers([principal, ...authorized.filter((user) => user.email.toLowerCase() !== currentUser.email.toLowerCase())])
  }

  useEffect(() => {
    refresh()
    const sync = () => refresh()
    window.addEventListener('storage', sync)
    window.addEventListener('focus', sync)
    return () => {
      window.removeEventListener('storage', sync)
      window.removeEventListener('focus', sync)
    }
  }, [])

  const selected = users.find((user) => user.id === selectedId) ?? users[0]

  return (
    <>
      <button
        type="button"
        onClick={() => {
          refresh()
          setOpen(true)
        }}
        className="inline-flex h-11 items-center gap-2 rounded-xl border border-[#5496CC]/25 bg-[var(--surface)] px-4 text-sm font-bold text-[#5496CC] shadow-sm transition hover:bg-[#5496CC]/5"
      >
        <Eye size={17} /> Ver permisos
      </button>

      {open ? (
        <div className="fixed inset-0 z-[115] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-5xl overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-[var(--border)] p-5">
              <div>
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-[#5496CC]">
                  <ShieldCheck size={15} /> Administración
                </div>
                <h2 className="mt-2 text-2xl font-bold text-[var(--foreground)]">Permisos de usuarios</h2>
                <p className="mt-1 text-sm text-[var(--muted)]">Consulta qué módulos puede ver cada usuario y cuáles tiene bloqueados.</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="rounded-lg p-2 text-[var(--muted)] hover:bg-[var(--surface-soft)]">
                <X size={20} />
              </button>
            </div>

            <div className="grid max-h-[70vh] overflow-hidden lg:grid-cols-[300px_1fr]">
              <div className="overflow-y-auto border-b border-[var(--border)] p-4 lg:border-b-0 lg:border-r">
                <div className="space-y-2">
                  {users.map((user) => (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => setSelectedId(user.id)}
                      className={`w-full rounded-xl border p-3 text-left transition ${selected?.id === user.id ? 'border-[#5496CC]/40 bg-[#5496CC]/10' : 'border-[var(--border)] bg-[var(--surface-soft)] hover:bg-[#5496CC]/5'}`}
                    >
                      <p className="font-semibold text-[var(--foreground)]">{user.name}</p>
                      <p className="mt-1 truncate text-xs text-[var(--muted)]">{user.email}</p>
                      <p className="mt-1 text-[11px] font-semibold text-[#5496CC]">{user.role}{user.principal ? ' · Principal' : ''}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="overflow-y-auto p-5">
                {selected ? (
                  <>
                    <div className="mb-5">
                      <h3 className="text-xl font-bold text-[var(--foreground)]">{selected.name}</h3>
                      <p className="mt-1 text-sm text-[var(--muted)]">{selected.email} · {selected.role}</p>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                      {ALL_PERMISSIONS.map((permission) => {
                        const allowed = selected.permissions.includes(permission)
                        return (
                          <div key={permission} className={`rounded-xl border p-4 ${allowed ? 'border-emerald-500/25 bg-emerald-500/5' : 'border-red-500/20 bg-red-500/5'}`}>
                            <div className="flex items-start gap-3">
                              <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${allowed ? 'bg-emerald-500/15 text-emerald-600' : 'bg-red-500/10 text-red-500'}`}>
                                {allowed ? <Check size={16} /> : <XCircle size={16} />}
                              </span>
                              <div>
                                <p className="text-sm font-semibold text-[var(--foreground)]">{PERMISSION_LABELS[permission]}</p>
                                <p className={`mt-1 text-xs font-semibold ${allowed ? 'text-emerald-600' : 'text-red-500'}`}>{allowed ? 'Permitido' : 'Sin acceso'}</p>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-[var(--muted)]">No hay usuarios disponibles.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
