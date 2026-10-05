'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import {
  ArrowLeft,
  Check,
  KeyRound,
  Search,
  ShieldCheck,
  Trash2,
  UserCheck,
  UserRoundCog,
  X,
} from 'lucide-react'
import {
  ROLE_DESCRIPTIONS,
  type AppRole,
  type ModulePermission,
} from '@/config/roles'
import {
  defaultPermissionsForRole,
  readAccessSession,
  type AccessSession,
} from '@/features/access/services/accessStorage'
import {
  listDatabaseProfiles,
  mapDatabaseRole,
  profilePermissions,
  updateDatabaseProfile,
  type DatabaseProfile,
} from '@/features/access/services/supabaseAccess'

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
  'client-portal': 'Portal del Cliente',
}

const ALL_PERMISSIONS = Object.keys(PERMISSION_LABELS) as ModulePermission[]
const ROLES: AppRole[] = ['Administración', 'Supervisor', 'Cliente']

function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
}

function roleToDatabase(role: AppRole) {
  if (role === 'Administración') return 'administracion'
  if (role === 'Supervisor') return 'obra'
  return 'cliente'
}

export default function UsersAndPermissionsPage() {
  const [session, setSession] = useState<AccessSession | null>(null)
  const [profiles, setProfiles] = useState<DatabaseProfile[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [savingId, setSavingId] = useState<string | null>(null)
  const [editingProfile, setEditingProfile] = useState<DatabaseProfile | null>(null)
  const [deletingProfile, setDeletingProfile] = useState<DatabaseProfile | null>(null)
  const [draftRole, setDraftRole] = useState<AppRole>('Supervisor')
  const [draftPermissions, setDraftPermissions] = useState<ModulePermission[]>([])
  const [savedMessage, setSavedMessage] = useState('')

  const isAdmin = session?.role === 'Administración'

  async function loadProfiles() {
    setLoading(true)
    setError('')
    try {
      const data = await listDatabaseProfiles()
      setProfiles(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible cargar usuarios desde Supabase.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setSession(readAccessSession())
    void loadProfiles()
  }, [])

  const visibleProfiles = useMemo(() => {
    const value = search.trim().toLowerCase()
    if (!value) return profiles
    return profiles.filter((profile) =>
      [profile.full_name, profile.email, profile.position, profile.role]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(value),
    )
  }, [profiles, search])

  const activeUsersCount = profiles.filter((profile) => profile.active).length

  function openPermissions(profile: DatabaseProfile) {
    const role = mapDatabaseRole(profile.role)
    setEditingProfile(profile)
    setDraftRole(role)
    setDraftPermissions(profilePermissions(profile))
    setSavedMessage('')
  }

  function changeRole(role: AppRole) {
    setDraftRole(role)
    setDraftPermissions(defaultPermissionsForRole(role))
  }

  function togglePermission(permission: ModulePermission) {
    if (draftRole === 'Administración') return
    setDraftPermissions((current) =>
      current.includes(permission)
        ? current.filter((item) => item !== permission)
        : [...current, permission],
    )
  }

  async function savePermissions() {
    if (!editingProfile || !isAdmin) return
    setSavingId(editingProfile.id)
    setError('')
    setSavedMessage('')

    try {
      const permissions =
        draftRole === 'Administración'
          ? defaultPermissionsForRole('Administración')
          : draftPermissions

      await updateDatabaseProfile(editingProfile.id, {
        role: roleToDatabase(draftRole),
        permissions,
      })

      await loadProfiles()
      setSavedMessage('Permisos guardados en Supabase correctamente.')
      setEditingProfile(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible guardar los permisos.')
    } finally {
      setSavingId(null)
    }
  }

  async function toggleUserStatus(profile: DatabaseProfile) {
    if (!isAdmin) return
    if (profile.id === session?.userId) {
      setError('La cuenta de Administración que está en uso no puede desactivarse desde esta pantalla.')
      return
    }

    setSavingId(profile.id)
    setError('')
    setSavedMessage('')
    try {
      await updateDatabaseProfile(profile.id, { active: !profile.active })
      await loadProfiles()
      setSavedMessage(profile.active ? 'Usuario desactivado correctamente.' : 'Usuario activado correctamente.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible actualizar el estado del usuario.')
    } finally {
      setSavingId(null)
    }
  }

  function requestDeleteProfile(profile: DatabaseProfile) {
    if (!isAdmin) return
    if (profile.id === session?.userId) {
      setError('La cuenta de Administración que está en uso no puede eliminarse desde esta pantalla.')
      return
    }
    setError('')
    setSavedMessage('')
    setDeletingProfile(profile)
  }

  async function confirmDeleteProfile() {
    if (!deletingProfile || !isAdmin) return

    setSavingId(deletingProfile.id)
    setError('')
    setSavedMessage('')
    try {
      await updateDatabaseProfile(deletingProfile.id, {
        active: false,
        deleted_at: new Date().toISOString(),
      })
      await loadProfiles()
      setSavedMessage('Usuario eliminado de NEDVI OS correctamente.')
      setDeletingProfile(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible eliminar el usuario.')
    } finally {
      setSavingId(null)
    }
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 pt-4 sm:pt-6 lg:pt-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Link
            href="/dashboard"
            className="mb-5 inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm font-semibold text-[var(--foreground)] shadow-sm transition hover:bg-[var(--surface-soft)]"
          >
            <ArrowLeft size={16} /> Volver a NEDVI OS
          </Link>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#5496CC]">Configuración</p>
          <h1 className="mt-2 text-3xl font-bold tracking-[-0.04em] text-[var(--foreground)]">Usuarios y permisos</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">
            Administra roles, permisos y estado de acceso directamente desde Supabase.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-5 py-4 shadow-sm">
            <div className="flex items-center gap-2 text-xs text-[var(--muted)]"><UserCheck size={15} /> Activos</div>
            <p className="mt-1 text-2xl font-bold text-[var(--foreground)]">{activeUsersCount}</p>
          </div>
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-5 py-4 shadow-sm">
            <div className="flex items-center gap-2 text-xs text-[var(--muted)]"><ShieldCheck size={15} /> Base de datos</div>
            <p className="mt-1 text-sm font-bold text-emerald-600">Supabase</p>
          </div>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-500">{error}</div>
      ) : null}
      {savedMessage ? (
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 text-sm text-emerald-600">{savedMessage}</div>
      ) : null}

      <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
        <div className="flex flex-col gap-3 border-b border-[var(--border)] p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-[var(--foreground)]">Usuarios autorizados</h2>
            <p className="mt-1 text-xs text-[var(--muted)]">
              Los cambios realizados aquí se guardan en la base de datos real de Supabase.
            </p>
          </div>
          <div className="relative w-full sm:w-72">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar usuario..."
              className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] pl-9 pr-3 text-sm text-[var(--foreground)] outline-none focus:border-[#5496CC] focus:ring-4 focus:ring-[#5496CC]/10"
            />
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-sm text-[var(--muted)]">Cargando usuarios desde Supabase...</div>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {visibleProfiles.map((profile) => {
              const name = profile.full_name || profile.email || 'Usuario'
              const role = mapDatabaseRole(profile.role)
              const permissions = profilePermissions(profile)
              const isCurrentUser = profile.id === session?.userId

              return (
                <div key={profile.id} className="grid gap-4 p-5 md:grid-cols-[minmax(220px,1.2fr)_minmax(150px,0.7fr)_minmax(190px,1fr)_minmax(340px,auto)] md:items-center">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#7DC6FF] text-xs font-bold text-black">{initials(name)}</span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-[var(--foreground)]">{name}</p>
                      <p className="truncate text-xs text-[var(--muted)]">{profile.email || 'Sin correo'}</p>
                    </div>
                  </div>

                  <span className="inline-flex w-fit rounded-full bg-[#5496CC]/10 px-2.5 py-1 text-xs font-semibold text-[#5496CC]">{role}</span>

                  <div>
                    <p className="text-xs text-[var(--muted)]">{permissions.length} permisos · {profile.position || 'Sin puesto indicado'}</p>
                    {isCurrentUser ? <p className="mt-1 text-[11px] text-[var(--muted)]">Cuenta actual</p> : null}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => void toggleUserStatus(profile)}
                      disabled={!isAdmin || savingId === profile.id || isCurrentUser}
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
                        profile.active
                          ? 'bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20'
                          : 'bg-slate-500/10 text-slate-500 hover:bg-slate-500/20'
                      }`}
                    >
                      {profile.active ? 'Activo' : 'Inactivo'}
                    </button>

                    <button
                      type="button"
                      onClick={() => openPermissions(profile)}
                      disabled={!isAdmin || savingId === profile.id}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-[#5496CC]/25 bg-[#5496CC]/5 px-3 py-1.5 text-xs font-semibold text-[#5496CC] transition hover:bg-[#5496CC]/10 disabled:opacity-50"
                    >
                      <UserRoundCog size={14} /> Permisos
                    </button>

                    <button
                      type="button"
                      onClick={() => requestDeleteProfile(profile)}
                      disabled={!isAdmin || savingId === profile.id || isCurrentUser}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/25 bg-red-500/5 px-3 py-1.5 text-xs font-semibold text-red-500 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <Trash2 size={14} /> Eliminar
                    </button>
                  </div>
                </div>
              )
            })}

            {!visibleProfiles.length ? (
              <div className="p-8 text-center text-sm text-[var(--muted)]">No se encontraron usuarios.</div>
            ) : null}
          </div>
        )}
      </section>

      <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-xs leading-5 text-[var(--muted)]">
        <strong className="text-[var(--foreground)]">Persistencia real activada:</strong> roles, permisos, estado activo/inactivo y eliminación de acceso se guardan ahora en Supabase.
      </div>

      {editingProfile ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#5496CC]">Administración</p>
                <h2 className="mt-2 text-xl font-bold text-[var(--foreground)]">Editar permisos</h2>
                <p className="mt-1 text-sm text-[var(--muted)]">{editingProfile.full_name || editingProfile.email}</p>
              </div>
              <button type="button" onClick={() => setEditingProfile(null)} className="rounded-lg p-2 text-[var(--muted)] hover:bg-[var(--surface-soft)]"><X size={18} /></button>
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">Rol</label>
                <select
                  value={draftRole}
                  onChange={(event) => changeRole(event.target.value as AppRole)}
                  className="mt-2 h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] px-3 text-sm font-semibold text-[var(--foreground)] outline-none focus:border-[#5496CC]"
                >
                  {ROLES.map((role) => <option key={role} value={role}>{role}</option>)}
                </select>
                <p className="mt-3 text-xs leading-5 text-[var(--muted)]">{ROLE_DESCRIPTIONS[draftRole]}</p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">Acceso a módulos</p>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  {ALL_PERMISSIONS.map((permission) => {
                    const checked = draftRole === 'Administración' || draftPermissions.includes(permission)
                    return (
                      <button
                        key={permission}
                        type="button"
                        onClick={() => togglePermission(permission)}
                        disabled={draftRole === 'Administración'}
                        className={`flex min-h-11 items-center gap-3 rounded-xl border px-3 py-2.5 text-left text-xs font-semibold transition ${
                          checked
                            ? 'border-[#5496CC]/30 bg-[#5496CC]/10 text-[var(--foreground)]'
                            : 'border-[var(--border)] bg-[var(--surface-soft)] text-[var(--muted)]'
                        }`}
                      >
                        <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${checked ? 'border-[#5496CC] bg-[#5496CC] text-white' : 'border-[var(--border)]'}`}>
                          {checked ? <Check size={13} strokeWidth={2.4} /> : null}
                        </span>
                        {PERMISSION_LABELS[permission]}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2 border-t border-[var(--border)] pt-5">
              <button type="button" onClick={() => setEditingProfile(null)} className="h-10 rounded-xl border border-[var(--border)] px-4 text-sm font-semibold text-[var(--foreground)]">Cancelar</button>
              <button
                type="button"
                onClick={() => void savePermissions()}
                disabled={savingId === editingProfile.id}
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#7DC6FF] px-5 text-sm font-semibold text-black disabled:opacity-60"
              >
                <KeyRound size={15} /> {savingId === editingProfile.id ? 'Guardando...' : 'Guardar permisos'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {deletingProfile ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-red-500">Eliminar acceso</p>
                <h2 className="mt-2 text-xl font-bold text-[var(--foreground)]">¿Eliminar este usuario?</h2>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                  {deletingProfile.full_name || deletingProfile.email} dejará de aparecer en NEDVI OS y no podrá iniciar sesión porque su perfil quedará desactivado.
                </p>
              </div>
              <button type="button" onClick={() => setDeletingProfile(null)} className="rounded-lg p-2 text-[var(--muted)] hover:bg-[var(--surface-soft)]"><X size={18} /></button>
            </div>

            <div className="mt-6 flex justify-end gap-2 border-t border-[var(--border)] pt-5">
              <button type="button" onClick={() => setDeletingProfile(null)} className="h-10 rounded-xl border border-[var(--border)] px-4 text-sm font-semibold text-[var(--foreground)]">Cancelar</button>
              <button
                type="button"
                onClick={() => void confirmDeleteProfile()}
                disabled={savingId === deletingProfile.id}
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-red-500 px-5 text-sm font-semibold text-white disabled:opacity-60"
              >
                <Trash2 size={15} /> {savingId === deletingProfile.id ? 'Eliminando...' : 'Sí, eliminar'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
