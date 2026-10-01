'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Check,
  Clock3,
  Eye,
  EyeOff,
  KeyRound,
  Search,
  ShieldCheck,
  Trash2,
  UserCheck,
  UserRoundCog,
  UsersRound,
  X,
} from 'lucide-react'
import {
  ROLE_DESCRIPTIONS,
  type AppRole,
  type ModulePermission,
} from '@/config/roles'
import { currentUser } from '@/data/currentUser'
import {
  defaultPermissionsForRole,
  readAccessUsers,
  readRegistrationRequests,
  writeAccessUsers,
  writeRegistrationRequests,
  type AccessUser,
  type RegistrationRequest,
} from '@/features/access/services/accessStorage'

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
}

const ALL_PERMISSIONS = Object.keys(PERMISSION_LABELS) as ModulePermission[]
const ROLES: AppRole[] = ['Administración', 'Supervisor']

type Tab = 'users' | 'requests'

function formatDate(value?: string) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
}

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value)
  const hashBuffer = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(hashBuffer))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

export default function UsersAndPermissionsPage() {
  const isAdmin = currentUser.role === 'Administración'
  const [tab, setTab] = useState<Tab>('users')
  const [requests, setRequests] = useState<RegistrationRequest[]>([])
  const [users, setUsers] = useState<AccessUser[]>([])
  const [search, setSearch] = useState('')
  const [reviewingId, setReviewingId] = useState<string | null>(null)
  const [draftRole, setDraftRole] = useState<AppRole>('Supervisor')
  const [draftPermissions, setDraftPermissions] = useState<ModulePermission[]>(
    defaultPermissionsForRole('Supervisor'),
  )

  const [passwordUser, setPasswordUser] = useState<AccessUser | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [passwordError, setPasswordError] = useState('')
  const [passwordSaved, setPasswordSaved] = useState(false)
  const [deleteUser, setDeleteUser] = useState<AccessUser | null>(null)

  function refresh() {
    setRequests(readRegistrationRequests())
    setUsers(readAccessUsers())
  }

  useEffect(() => {
    refresh()

    const handleStorage = () => refresh()
    window.addEventListener('storage', handleStorage)
    window.addEventListener('focus', handleStorage)
    return () => {
      window.removeEventListener('storage', handleStorage)
      window.removeEventListener('focus', handleStorage)
    }
  }, [])

  const pendingRequests = useMemo(
    () => requests.filter((request) => request.status === 'Pendiente'),
    [requests],
  )

  const activeUsersCount = users.filter((user) => user.status === 'Activo').length + 1

  const visibleUsers = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()
    if (!normalizedSearch) return users

    return users.filter((user) =>
      [user.name, user.email, user.position, user.role]
        .join(' ')
        .toLowerCase()
        .includes(normalizedSearch),
    )
  }, [search, users])

  function startReview(request: RegistrationRequest) {
    const role = request.role ?? 'Supervisor'
    setReviewingId(request.id)
    setDraftRole(role)
    setDraftPermissions(
      request.permissions?.length ? request.permissions : defaultPermissionsForRole(role),
    )
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

  function approveRequest(request: RegistrationRequest) {
    if (!isAdmin) return

    const permissions =
      draftRole === 'Administración'
        ? defaultPermissionsForRole('Administración')
        : draftPermissions
    const reviewedAt = new Date().toISOString()

    const nextRequests = requests.map((item) =>
      item.id === request.id
        ? {
            ...item,
            status: 'Aprobada' as const,
            role: draftRole,
            permissions,
            reviewedAt,
          }
        : item,
    )

    const nextUser: AccessUser = {
      id: request.id,
      name: request.name,
      email: request.email,
      phone: request.phone,
      position: request.position,
      role: draftRole,
      permissions,
      status: 'Activo',
      createdAt: reviewedAt,
    }

    const nextUsers = [
      nextUser,
      ...users.filter((user) => user.email.toLowerCase() !== request.email.toLowerCase()),
    ]

    writeRegistrationRequests(nextRequests)
    writeAccessUsers(nextUsers)
    setRequests(nextRequests)
    setUsers(nextUsers)
    setReviewingId(null)
  }

  function rejectRequest(request: RegistrationRequest) {
    if (!isAdmin) return

    const nextRequests = requests.map((item) =>
      item.id === request.id
        ? { ...item, status: 'Rechazada' as const, reviewedAt: new Date().toISOString() }
        : item,
    )
    writeRegistrationRequests(nextRequests)
    setRequests(nextRequests)
    setReviewingId(null)
  }

  function toggleUserStatus(userId: string) {
    if (!isAdmin) return

    const nextUsers = users.map((user) =>
      user.id === userId
        ? { ...user, status: user.status === 'Activo' ? ('Inactivo' as const) : ('Activo' as const) }
        : user,
    )
    writeAccessUsers(nextUsers)
    setUsers(nextUsers)
  }

  function openPasswordDialog(user: AccessUser) {
    if (!isAdmin) return
    setPasswordUser(user)
    setNewPassword('')
    setConfirmPassword('')
    setPasswordError('')
    setPasswordSaved(false)
    setShowPassword(false)
  }

  async function savePassword() {
    if (!isAdmin || !passwordUser) return

    setPasswordError('')
    setPasswordSaved(false)

    if (newPassword.length < 8) {
      setPasswordError('La contraseña debe tener al menos 8 caracteres.')
      return
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Las contraseñas no coinciden.')
      return
    }

    const passwordHash = await sha256(newPassword)
    const updatedAt = new Date().toISOString()
    const nextUsers = users.map((user) =>
      user.id === passwordUser.id
        ? { ...user, passwordHash, passwordUpdatedAt: updatedAt }
        : user,
    )

    writeAccessUsers(nextUsers)
    setUsers(nextUsers)
    setPasswordSaved(true)
    setNewPassword('')
    setConfirmPassword('')
  }

  function confirmDeleteUser() {
    if (!isAdmin || !deleteUser) return

    const nextUsers = users.filter((user) => user.id !== deleteUser.id)
    const nextRequests = requests.filter(
      (request) =>
        request.id !== deleteUser.id &&
        request.email.toLowerCase() !== deleteUser.email.toLowerCase(),
    )

    writeAccessUsers(nextUsers)
    writeRegistrationRequests(nextRequests)
    setUsers(nextUsers)
    setRequests(nextRequests)
    setDeleteUser(null)
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#5496CC]">Configuración</p>
          <h1 className="mt-2 text-3xl font-bold tracking-[-0.04em] text-[var(--foreground)]">
            Usuarios y permisos
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">
            Revisa solicitudes de acceso, asigna roles y administra las cuentas autorizadas.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:w-auto">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-5 py-4 shadow-sm">
            <div className="flex items-center gap-2 text-xs text-[var(--muted)]">
              <UserCheck size={15} /> Usuarios activos
            </div>
            <p className="mt-1 text-2xl font-bold text-[var(--foreground)]">{activeUsersCount}</p>
          </div>
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-5 py-4 shadow-sm">
            <div className="flex items-center gap-2 text-xs text-[var(--muted)]">
              <Clock3 size={15} /> Pendientes
            </div>
            <p className="mt-1 text-2xl font-bold text-[var(--foreground)]">{pendingRequests.length}</p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-2 shadow-sm">
        <button
          type="button"
          onClick={() => setTab('users')}
          className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
            tab === 'users'
              ? 'bg-[#7DC6FF] text-black shadow-sm'
              : 'text-[var(--muted)] hover:bg-[var(--surface-soft)] hover:text-[var(--foreground)]'
          }`}
        >
          Usuarios
        </button>
        <button
          type="button"
          onClick={() => setTab('requests')}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
            tab === 'requests'
              ? 'bg-[#7DC6FF] text-black shadow-sm'
              : 'text-[var(--muted)] hover:bg-[var(--surface-soft)] hover:text-[var(--foreground)]'
          }`}
        >
          Solicitudes pendientes
          {pendingRequests.length ? (
            <span className="rounded-full bg-black/10 px-2 py-0.5 text-[11px] font-bold">
              {pendingRequests.length}
            </span>
          ) : null}
        </button>
      </div>

      {tab === 'users' ? (
        <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
          <div className="flex flex-col gap-3 border-b border-[var(--border)] p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-[var(--foreground)]">Usuarios autorizados</h2>
              <p className="mt-1 text-xs text-[var(--muted)]">
                Solo Administración puede cambiar contraseñas, activar, desactivar o eliminar usuarios.
              </p>
            </div>
            <div className="relative w-full sm:w-72">
              <Search
                size={15}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]"
              />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar usuario..."
                className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] pl-9 pr-3 text-sm text-[var(--foreground)] outline-none focus:border-[#5496CC] focus:ring-4 focus:ring-[#5496CC]/10"
              />
            </div>
          </div>

          <div className="divide-y divide-[var(--border)]">
            <div className="grid gap-4 p-5 md:grid-cols-[minmax(220px,1.2fr)_minmax(150px,0.7fr)_minmax(180px,1fr)_minmax(230px,auto)] md:items-center">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#7DC6FF] text-xs font-bold text-black">
                  {currentUser.initials}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[var(--foreground)]">{currentUser.name}</p>
                  <p className="truncate text-xs text-[var(--muted)]">{currentUser.email}</p>
                </div>
              </div>
              <div>
                <span className="inline-flex rounded-full bg-[#5496CC]/10 px-2.5 py-1 text-xs font-semibold text-[#5496CC]">
                  {currentUser.role}
                </span>
              </div>
              <p className="text-xs text-[var(--muted)]">Acceso total · Usuario principal</p>
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-600">
                  Activo
                </span>
                <span className="text-[11px] text-[var(--muted)]">Cuenta principal protegida</span>
              </div>
            </div>

            {visibleUsers.map((user) => (
              <div
                key={user.id}
                className="grid gap-4 p-5 md:grid-cols-[minmax(220px,1.2fr)_minmax(150px,0.7fr)_minmax(180px,1fr)_minmax(230px,auto)] md:items-center"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--surface-soft)] text-xs font-bold text-[var(--foreground)]">
                    {initials(user.name)}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[var(--foreground)]">{user.name}</p>
                    <p className="truncate text-xs text-[var(--muted)]">{user.email}</p>
                  </div>
                </div>
                <div>
                  <span className="inline-flex rounded-full bg-[#5496CC]/10 px-2.5 py-1 text-xs font-semibold text-[#5496CC]">
                    {user.role}
                  </span>
                </div>
                <div>
                  <p className="text-xs text-[var(--muted)]">
                    {user.permissions.length} permisos · {user.position || 'Sin puesto indicado'}
                  </p>
                  <p className="mt-1 text-[11px] text-[var(--muted)]">
                    Contraseña: {user.passwordUpdatedAt ? `actualizada ${formatDate(user.passwordUpdatedAt)}` : 'sin configurar'}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => toggleUserStatus(user.id)}
                    disabled={!isAdmin}
                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold transition ${
                      user.status === 'Activo'
                        ? 'bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20'
                        : 'bg-slate-500/10 text-slate-500 hover:bg-slate-500/20'
                    } disabled:cursor-not-allowed disabled:opacity-50`}
                  >
                    {user.status}
                  </button>
                  <button
                    type="button"
                    onClick={() => openPasswordDialog(user)}
                    disabled={!isAdmin}
                    className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#5496CC]/20 bg-[#5496CC]/5 px-2.5 text-xs font-semibold text-[#5496CC] transition hover:bg-[#5496CC]/10 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <KeyRound size={13} /> Contraseña
                  </button>
                  <button
                    type="button"
                    onClick={() => isAdmin && setDeleteUser(user)}
                    disabled={!isAdmin}
                    className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-red-500/20 bg-red-500/5 px-2.5 text-xs font-semibold text-red-500 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Trash2 size={13} /> Eliminar
                  </button>
                </div>
              </div>
            ))}

            {!visibleUsers.length && search ? (
              <div className="p-8 text-center text-sm text-[var(--muted)]">No se encontraron usuarios.</div>
            ) : null}
          </div>
        </section>
      ) : (
        <section className="space-y-4">
          {!pendingRequests.length ? (
            <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)] p-10 text-center shadow-sm">
              <ShieldCheck className="mx-auto text-[#5496CC]" size={32} strokeWidth={1.6} />
              <h2 className="mt-4 text-lg font-bold text-[var(--foreground)]">No hay solicitudes pendientes</h2>
              <p className="mt-2 text-sm text-[var(--muted)]">
                Las nuevas solicitudes de registro aparecerán aquí para que Administración las revise.
              </p>
            </div>
          ) : null}

          {pendingRequests.map((request) => {
            const isReviewing = reviewingId === request.id
            return (
              <article
                key={request.id}
                className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm"
              >
                <div className="flex flex-col gap-5 p-5 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex min-w-0 items-start gap-4">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#7DC6FF] text-sm font-bold text-black">
                      {initials(request.name)}
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-base font-bold text-[var(--foreground)]">{request.name}</h2>
                        <span className="rounded-full bg-amber-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-600">
                          Pendiente
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-[var(--muted)]">{request.email}</p>
                      <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-[var(--muted)]">
                        <span>{request.position || 'Puesto no indicado'}</span>
                        <span>{request.phone || 'Sin teléfono'}</span>
                        <span>Solicitado: {formatDate(request.createdAt)}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => (isReviewing ? setReviewingId(null) : startReview(request))}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#7DC6FF] px-4 text-sm font-semibold text-black transition hover:brightness-95"
                  >
                    <UserRoundCog size={16} />
                    {isReviewing ? 'Cerrar revisión' : 'Revisar solicitud'}
                  </button>
                </div>

                {isReviewing ? (
                  <div className="border-t border-[var(--border)] bg-[var(--surface-soft)]/40 p-5">
                    <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
                      <div>
                        <label className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
                          Rol base
                        </label>
                        <select
                          value={draftRole}
                          onChange={(event) => changeRole(event.target.value as AppRole)}
                          className="mt-2 h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm font-semibold text-[var(--foreground)] outline-none focus:border-[#5496CC] focus:ring-4 focus:ring-[#5496CC]/10"
                        >
                          {ROLES.map((role) => (
                            <option key={role} value={role}>
                              {role}
                            </option>
                          ))}
                        </select>
                        <p className="mt-3 text-xs leading-5 text-[var(--muted)]">{ROLE_DESCRIPTIONS[draftRole]}</p>

                        <div className="mt-5 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
                          <p className="text-xs font-semibold text-[var(--foreground)]">Permisos personalizados</p>
                          <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
                            Administración siempre conserva acceso total. En Supervisor puedes ajustar módulos manualmente.
                          </p>
                        </div>
                      </div>

                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
                          Acceso a módulos
                        </p>
                        <div className="mt-2 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                          {ALL_PERMISSIONS.map((permission) => {
                            const checked =
                              draftRole === 'Administración' || draftPermissions.includes(permission)
                            return (
                              <button
                                key={permission}
                                type="button"
                                onClick={() => togglePermission(permission)}
                                disabled={draftRole === 'Administración'}
                                className={`flex min-h-11 items-center gap-3 rounded-xl border px-3 py-2.5 text-left text-xs font-semibold transition ${
                                  checked
                                    ? 'border-[#5496CC]/30 bg-[#5496CC]/10 text-[var(--foreground)]'
                                    : 'border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:border-[#5496CC]/30'
                                } ${draftRole === 'Administración' ? 'cursor-default' : ''}`}
                              >
                                <span
                                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${
                                    checked
                                      ? 'border-[#5496CC] bg-[#5496CC] text-white'
                                      : 'border-[var(--border)]'
                                  }`}
                                >
                                  {checked ? <Check size={13} strokeWidth={2.4} /> : null}
                                </span>
                                {PERMISSION_LABELS[permission]}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 flex flex-col-reverse gap-3 border-t border-[var(--border)] pt-5 sm:flex-row sm:justify-end">
                      <button
                        type="button"
                        onClick={() => rejectRequest(request)}
                        disabled={!isAdmin}
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-red-500/20 bg-red-500/5 px-4 text-sm font-semibold text-red-500 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <X size={16} /> Rechazar
                      </button>
                      <button
                        type="button"
                        onClick={() => approveRequest(request)}
                        disabled={!isAdmin}
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#7DC6FF] px-5 text-sm font-semibold text-black transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Check size={16} /> Aprobar usuario
                      </button>
                    </div>
                  </div>
                ) : null}
              </article>
            )
          })}
        </section>
      )}

      <div className="rounded-2xl border border-[#5496CC]/15 bg-[#5496CC]/5 p-4 text-xs leading-5 text-[var(--muted)]">
        <strong className="text-[var(--foreground)]">Etapa actual:</strong> usuarios, contraseñas temporales y solicitudes se guardan localmente en este navegador. Al conectar Supabase Auth, estos controles administrarán cuentas reales desde el servidor.
      </div>

      {passwordUser ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#5496CC]">Administración</p>
                <h2 className="mt-2 text-xl font-bold text-[var(--foreground)]">Cambiar contraseña</h2>
                <p className="mt-1 text-sm text-[var(--muted)]">{passwordUser.name} · {passwordUser.email}</p>
              </div>
              <button
                type="button"
                onClick={() => setPasswordUser(null)}
                className="rounded-lg p-2 text-[var(--muted)] transition hover:bg-[var(--surface-soft)] hover:text-[var(--foreground)]"
                aria-label="Cerrar"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-6 space-y-4">
              <label className="block">
                <span className="text-xs font-semibold text-[var(--muted)]">Nueva contraseña</span>
                <div className="relative mt-2">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    placeholder="Mínimo 8 caracteres"
                    className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] px-3 pr-11 text-sm text-[var(--foreground)] outline-none focus:border-[#5496CC] focus:ring-4 focus:ring-[#5496CC]/10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    className="absolute inset-y-0 right-2 flex items-center px-2 text-[var(--muted)] hover:text-[var(--foreground)]"
                    aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </label>

              <label className="block">
                <span className="text-xs font-semibold text-[var(--muted)]">Confirmar contraseña</span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="Repite la contraseña"
                  className="mt-2 h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] px-3 text-sm text-[var(--foreground)] outline-none focus:border-[#5496CC] focus:ring-4 focus:ring-[#5496CC]/10"
                />
              </label>

              {passwordError ? <p className="text-sm text-red-500">{passwordError}</p> : null}
              {passwordSaved ? (
                <p className="rounded-xl bg-emerald-500/10 px-3 py-2 text-sm font-medium text-emerald-600">
                  Contraseña actualizada correctamente.
                </p>
              ) : null}
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setPasswordUser(null)}
                className="h-10 rounded-xl border border-[var(--border)] px-4 text-sm font-semibold text-[var(--foreground)] transition hover:bg-[var(--surface-soft)]"
              >
                Cerrar
              </button>
              <button
                type="button"
                onClick={savePassword}
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#7DC6FF] px-4 text-sm font-semibold text-black transition hover:brightness-95"
              >
                <KeyRound size={15} /> Guardar contraseña
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {deleteUser ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-red-500/20 bg-[var(--surface)] p-6 shadow-2xl">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10 text-red-500">
              <Trash2 size={21} />
            </div>
            <h2 className="mt-4 text-xl font-bold text-[var(--foreground)]">Eliminar usuario</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
              Se eliminará a <strong className="text-[var(--foreground)]">{deleteUser.name}</strong> y su solicitud asociada. Esta acción no se puede deshacer.
            </p>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteUser(null)}
                className="h-10 rounded-xl border border-[var(--border)] px-4 text-sm font-semibold text-[var(--foreground)] transition hover:bg-[var(--surface-soft)]"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmDeleteUser}
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-red-500 px-4 text-sm font-semibold text-white transition hover:bg-red-600"
              >
                <Trash2 size={15} /> Eliminar usuario
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
