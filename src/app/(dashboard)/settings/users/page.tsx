'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import {
  ArrowLeft,
  Check,
  Clock3,
  Eye,
  EyeOff,
  KeyRound,
  Search,
  ShieldCheck,
  Trash2,
  UserCheck,
  UserPlus,
  UserRoundCog,
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
  readPasswordResetRequests,
  readRegistrationRequests,
  writeAccessUsers,
  writePasswordResetRequests,
  writeRegistrationRequests,
  type AccessUser,
  type PasswordResetRequest,
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
  'client-portal': 'Portal del cliente',
}

const ALL_PERMISSIONS = Object.keys(PERMISSION_LABELS) as ModulePermission[]
const ROLES: AppRole[] = ['Administración', 'Supervisor', 'Cliente']

type Tab = 'users' | 'requests' | 'passwords'

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

function generateSecurePassword() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%*'
  const bytes = new Uint32Array(18)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, value => alphabet[value % alphabet.length]).join('')
}

export default function UsersAndPermissionsPage() {
  const [tab, setTab] = useState<Tab>('users')
  const [requests, setRequests] = useState<RegistrationRequest[]>([])
  const [passwordRequests, setPasswordRequests] = useState<PasswordResetRequest[]>([])
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
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [passwordError, setPasswordError] = useState('')
  const [passwordSaved, setPasswordSaved] = useState(false)
  const [deleteUser, setDeleteUser] = useState<AccessUser | null>(null)
  const [approvingId, setApprovingId] = useState<string | null>(null)
  const [approvalError, setApprovalError] = useState('')
  const [createUserOpen, setCreateUserOpen] = useState(false)
  const [createName, setCreateName] = useState('')
  const [createEmail, setCreateEmail] = useState('')
  const [createPhone, setCreatePhone] = useState('')
  const [createPosition, setCreatePosition] = useState('')
  const [createPassword, setCreatePassword] = useState('')
  const [createConfirmPassword, setCreateConfirmPassword] = useState('')
  const [createShowPassword, setCreateShowPassword] = useState(false)
  const [createError, setCreateError] = useState('')
  const [creatingUser, setCreatingUser] = useState(false)

  const isAdmin = currentUser.role === 'Administración'

  async function refresh() {
    setRequests(readRegistrationRequests())
    setPasswordRequests(readPasswordResetRequests())

    try {
      const response = await fetch('/api/access/users', { cache: 'no-store' })
      const data = (await response.json()) as { users?: AccessUser[]; error?: string }

      if (!response.ok || !Array.isArray(data.users)) {
        throw new Error(data.error || 'No se pudieron cargar los usuarios de Supabase.')
      }

      const syncedUsers = data.users.filter(
        (user) => user.email.toLowerCase() !== currentUser.email.toLowerCase(),
      )

      setUsers(syncedUsers)
      writeAccessUsers(syncedUsers)
    } catch (loadError) {
      console.error('Error al sincronizar usuarios desde Supabase:', loadError)
      setUsers(readAccessUsers())
    }
  }

  useEffect(() => {
    void refresh()
    const handleStorage = () => void refresh()
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

  const pendingPasswordRequests = useMemo(
    () => passwordRequests.filter((request) => request.status === 'Pendiente'),
    [passwordRequests],
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

  function resetCreateUserForm() {
    setCreateName('')
    setCreateEmail('')
    setCreatePhone('')
    setCreatePosition('')
    setCreatePassword('')
    setCreateConfirmPassword('')
    setCreateError('')
    setCreateShowPassword(false)
  }

  function closeCreateUserModal() {
    if (creatingUser) return
    setCreateUserOpen(false)
    resetCreateUserForm()
  }

  async function createInternalUser() {
    if (!isAdmin || creatingUser) return

    setCreateError('')

    const name = createName.trim()
    const email = createEmail.trim().toLowerCase()
    const password = createPassword.trim()

    if (!name || !email || !email.includes('@')) {
      setCreateError('Escribe el nombre y un correo válido.')
      return
    }

    if (password.length < 8) {
      setCreateError('La contraseña debe tener al menos 8 caracteres.')
      return
    }

    if (password !== createConfirmPassword) {
      setCreateError('Las contraseñas no coinciden.')
      return
    }

    setCreatingUser(true)

    try {
      const permissions = defaultPermissionsForRole('Supervisor')
      const response = await fetch('/api/access/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify({
          name,
          email,
          phone: createPhone.trim(),
          position: createPosition.trim() || 'Equipo NEDVI',
          role: 'Supervisor',
          permissions,
          password,
        }),
      })

      const data = (await response.json()) as { user?: AccessUser; error?: string }

      if (!response.ok || !data.user) {
        throw new Error(data.error || 'No se pudo crear el usuario interno.')
      }

      setCreateUserOpen(false)
      resetCreateUserForm()
      await refresh()
    } catch (error) {
      console.error('Error creando usuario interno:', error)
      setCreateError(
        error instanceof Error ? error.message : 'No se pudo crear el usuario interno.',
      )
    } finally {
      setCreatingUser(false)
    }
  }

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

  async function approveRequest(request: RegistrationRequest) {
    if (!isAdmin || approvingId) return

    const permissions =
      draftRole === 'Administración'
        ? defaultPermissionsForRole('Administración')
        : draftPermissions

    setApprovingId(request.id)
    setApprovalError('')

    try {
      const response = await fetch('/api/access/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify({
          name: request.name,
          email: request.email,
          phone: request.phone,
          position: request.position,
          role: draftRole,
          permissions,
        }),
      })

      const data = (await response.json()) as {
        user?: AccessUser
        error?: string
        needsPasswordSetup?: boolean
      }

      if (!response.ok || !data.user) {
        throw new Error(data.error || 'No se pudo aprobar el usuario en Supabase.')
      }

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

      writeRegistrationRequests(nextRequests)
      setRequests(nextRequests)
      setReviewingId(null)
      setTab('users')

      await refresh()
    } catch (error) {
      console.error('Error aprobando usuario en Supabase:', error)
      setApprovalError(
        error instanceof Error
          ? error.message
          : 'No se pudo aprobar el usuario en Supabase.',
      )
    } finally {
      setApprovingId(null)
    }
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

  async function toggleUserStatus(userId: string) {
    if (!isAdmin) return

    const user = users.find((item) => item.id === userId)
    if (!user) return

    const nextActive = user.status !== 'Activo'

    try {
      const response = await fetch('/api/access/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify({ userId, active: nextActive }),
      })
      const data = (await response.json()) as { error?: string }

      if (!response.ok) {
        throw new Error(data.error || 'No se pudo actualizar el estado del usuario.')
      }

      await refresh()
    } catch (error) {
      console.error('Error actualizando estado del usuario:', error)
      window.alert(
        error instanceof Error
          ? error.message
          : 'No se pudo actualizar el estado del usuario.',
      )
    }
  }

  function openPasswordModal(user: AccessUser) {
    if (!isAdmin) return
    setSearch('')
    setPasswordUser(user)
    setNewPassword('')
    setConfirmPassword('')
    setPasswordError('')
    setPasswordSaved(false)
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

    try {
      const response = await fetch('/api/access/password-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify({
          userId: passwordUser.id,
          email: passwordUser.email,
          password: newPassword,
        }),
      })
      const data = (await response.json()) as { error?: string }

      if (!response.ok) {
        throw new Error(data.error || 'No se pudo actualizar la contraseña.')
      }

      const updatedAt = new Date().toISOString()
      const nextPasswordRequests = passwordRequests.map((request) =>
        request.userId === passwordUser.id && request.status === 'Pendiente'
          ? { ...request, status: 'Atendida' as const, reviewedAt: updatedAt }
          : request,
      )

      writePasswordResetRequests(nextPasswordRequests)
      setPasswordRequests(nextPasswordRequests)
      setPasswordSaved(true)
      setNewPassword('')
      setConfirmPassword('')
      await refresh()
    } catch (error) {
      console.error('Error actualizando contraseña en Supabase:', error)
      setPasswordError(
        error instanceof Error
          ? error.message
          : 'No se pudo actualizar la contraseña.',
      )
    }
  }

  async function confirmDeleteUser() {
    if (!isAdmin || !deleteUser) return

    try {
      const response = await fetch('/api/access/users', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify({ userId: deleteUser.id }),
      })
      const data = (await response.json()) as { error?: string }

      if (!response.ok) {
        throw new Error(data.error || 'No se pudo eliminar el usuario.')
      }

      const nextRequests = requests.filter(
        (request) =>
          request.id !== deleteUser.id &&
          request.email.toLowerCase() !== deleteUser.email.toLowerCase(),
      )
      const nextPasswordRequests = passwordRequests.filter(
        (request) => request.userId !== deleteUser.id,
      )

      writeRegistrationRequests(nextRequests)
      writePasswordResetRequests(nextPasswordRequests)
      setRequests(nextRequests)
      setPasswordRequests(nextPasswordRequests)
      setDeleteUser(null)
      await refresh()
    } catch (error) {
      console.error('Error eliminando usuario en Supabase:', error)
      window.alert(
        error instanceof Error ? error.message : 'No se pudo eliminar el usuario.',
      )
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
          <h1 className="mt-2 text-3xl font-bold tracking-[-0.04em] text-[var(--foreground)]">
            Usuarios y permisos
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">
            Revisa solicitudes de acceso, asigna roles y administra las cuentas autorizadas.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-5 py-4 shadow-sm">
            <div className="flex items-center gap-2 text-xs text-[var(--muted)]"><UserCheck size={15} /> Activos</div>
            <p className="mt-1 text-2xl font-bold text-[var(--foreground)]">{activeUsersCount}</p>
          </div>
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-5 py-4 shadow-sm">
            <div className="flex items-center gap-2 text-xs text-[var(--muted)]"><Clock3 size={15} /> Pendientes</div>
            <p className="mt-1 text-2xl font-bold text-[var(--foreground)]">{pendingRequests.length}</p>
          </div>
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-5 py-4 shadow-sm">
            <div className="flex items-center gap-2 text-xs text-[var(--muted)]"><KeyRound size={15} /> Contraseñas</div>
            <p className="mt-1 text-2xl font-bold text-[var(--foreground)]">{pendingPasswordRequests.length}</p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-2 shadow-sm">
        {([
          ['users', 'Usuarios'],
          ['requests', `Solicitudes pendientes${pendingRequests.length ? ` (${pendingRequests.length})` : ''}`],
          ['passwords', `Recuperar contraseñas${pendingPasswordRequests.length ? ` (${pendingPasswordRequests.length})` : ''}`],
        ] as const).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setTab(value)}
            className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
              tab === value
                ? 'bg-[#7DC6FF] text-black shadow-sm'
                : 'text-[var(--muted)] hover:bg-[var(--surface-soft)] hover:text-[var(--foreground)]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'users' ? (
        <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
          <div className="flex flex-col gap-3 border-b border-[var(--border)] p-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-bold text-[var(--foreground)]">Usuarios autorizados</h2>
              <p className="mt-1 text-xs text-[var(--muted)]">
                Crea cuentas internas del equipo NEDVI y administra sus accesos.
              </p>
            </div>
            <div className="flex w-full flex-col gap-2 sm:flex-row lg:w-auto">
              {isAdmin ? (
                <button
                  type="button"
                  onClick={() => setCreateUserOpen(true)}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#1F6FEB] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1759C7]"
                >
                  <UserPlus size={16} />
                  Nuevo usuario NEDVI
                </button>
              ) : null}
              <div className="relative w-full sm:w-72">
                <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Buscar usuario..."
                  type="search"
                  name="nedvi-user-list-search"
                  autoComplete="off"
                  aria-label="Filtrar lista de usuarios"
                  className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] pl-9 pr-3 text-sm text-[var(--foreground)] outline-none focus:border-[#5496CC] focus:ring-4 focus:ring-[#5496CC]/10"
                />
              </div>
            </div>
          </div>

          <div className="divide-y divide-[var(--border)]">
            <div className="grid gap-4 p-5 md:grid-cols-[minmax(220px,1.2fr)_minmax(150px,0.7fr)_minmax(180px,1fr)_minmax(230px,auto)] md:items-center">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#7DC6FF] text-xs font-bold text-black">{currentUser.initials}</span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[var(--foreground)]">{currentUser.name}</p>
                  <p className="truncate text-xs text-[var(--muted)]">{currentUser.email}</p>
                </div>
              </div>
              <span className="inline-flex w-fit rounded-full bg-[#5496CC]/10 px-2.5 py-1 text-xs font-semibold text-[#5496CC]">{currentUser.role}</span>
              <p className="text-xs text-[var(--muted)]">Acceso total · Usuario principal</p>
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-600">Activo</span>
                <span className="text-[11px] text-[var(--muted)]">Cuenta principal protegida</span>
              </div>
            </div>

            {visibleUsers.map((user) => (
              <div key={user.id} className="grid gap-4 p-5 md:grid-cols-[minmax(220px,1.2fr)_minmax(150px,0.7fr)_minmax(180px,1fr)_minmax(230px,auto)] md:items-center">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--surface-soft)] text-xs font-bold text-[var(--foreground)]">{initials(user.name)}</span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[var(--foreground)]">{user.name}</p>
                    <p className="truncate text-xs text-[var(--muted)]">{user.email}</p>
                  </div>
                </div>
                <span className="inline-flex w-fit rounded-full bg-[#5496CC]/10 px-2.5 py-1 text-xs font-semibold text-[#5496CC]">{user.role}</span>
                <div>
                  <p className="text-xs text-[var(--muted)]">{user.permissions.length} permisos · {user.position || 'Sin puesto indicado'}</p>
                  <p className="mt-1 text-[11px] text-[var(--muted)]">Contraseña: {user.passwordUpdatedAt ? `actualizada ${formatDate(user.passwordUpdatedAt)}` : 'sin configurar'}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => toggleUserStatus(user.id)}
                    disabled={!isAdmin}
                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold transition ${user.status === 'Activo' ? 'bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20' : 'bg-slate-500/10 text-slate-500 hover:bg-slate-500/20'}`}
                  >
                    {user.status}
                  </button>
                  <button
                    type="button"
                    onClick={() => openPasswordModal(user)}
                    disabled={!isAdmin}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[#5496CC]/25 bg-[#5496CC]/5 px-2.5 py-1.5 text-xs font-semibold text-[#5496CC] transition hover:bg-[#5496CC]/10"
                  >
                    <KeyRound size={13} /> Contraseña
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteUser(user)}
                    disabled={!isAdmin}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/25 bg-red-500/5 px-2.5 py-1.5 text-xs font-semibold text-red-500 transition hover:bg-red-500/10"
                  >
                    <Trash2 size={13} /> Eliminar
                  </button>
                </div>
              </div>
            ))}

            {!visibleUsers.length && search ? <div className="p-8 text-center text-sm text-[var(--muted)]">No se encontraron usuarios.</div> : null}
          </div>
        </section>
      ) : null}

      {tab === 'requests' ? (
        <section className="space-y-4">
          {!pendingRequests.length ? (
            <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)] p-10 text-center shadow-sm">
              <ShieldCheck className="mx-auto text-[#5496CC]" size={32} strokeWidth={1.6} />
              <h2 className="mt-4 text-lg font-bold text-[var(--foreground)]">No hay solicitudes pendientes</h2>
            </div>
          ) : null}

          {pendingRequests.map((request) => {
            const isReviewing = reviewingId === request.id
            return (
              <article key={request.id} className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
                <div className="flex flex-col gap-5 p-5 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex min-w-0 items-start gap-4">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#7DC6FF] text-sm font-bold text-black">{initials(request.name)}</span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-base font-bold text-[var(--foreground)]">{request.name}</h2>
                        <span className="rounded-full bg-amber-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-600">Pendiente</span>
                      </div>
                      <p className="mt-1 text-sm text-[var(--muted)]">{request.email}</p>
                      <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-[var(--muted)]">
                        <span>{request.position || 'Puesto no indicado'}</span>
                        <span>{request.phone || 'Sin teléfono'}</span>
                        <span>Solicitado: {formatDate(request.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                  <button type="button" onClick={() => (isReviewing ? setReviewingId(null) : startReview(request))} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#7DC6FF] px-4 text-sm font-semibold text-black transition hover:brightness-95">
                    <UserRoundCog size={16} /> {isReviewing ? 'Cerrar revisión' : 'Revisar solicitud'}
                  </button>
                </div>

                {isReviewing ? (
                  <div className="border-t border-[var(--border)] bg-[var(--surface-soft)]/40 p-5">
                    <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
                      <div>
                        <label className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">Rol base</label>
                        <select value={draftRole} onChange={(event) => changeRole(event.target.value as AppRole)} className="mt-2 h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm font-semibold text-[var(--foreground)] outline-none focus:border-[#5496CC]">
                          {ROLES.map((role) => <option key={role} value={role}>{role}</option>)}
                        </select>
                        <p className="mt-3 text-xs leading-5 text-[var(--muted)]">{ROLE_DESCRIPTIONS[draftRole]}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">Acceso a módulos</p>
                        <div className="mt-2 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                          {ALL_PERMISSIONS.map((permission) => {
                            const checked = draftRole === 'Administración' || draftPermissions.includes(permission)
                            return (
                              <button key={permission} type="button" onClick={() => togglePermission(permission)} disabled={draftRole === 'Administración'} className={`flex min-h-11 items-center gap-3 rounded-xl border px-3 py-2.5 text-left text-xs font-semibold transition ${checked ? 'border-[#5496CC]/30 bg-[#5496CC]/10 text-[var(--foreground)]' : 'border-[var(--border)] bg-[var(--surface)] text-[var(--muted)]'}`}>
                                <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${checked ? 'border-[#5496CC] bg-[#5496CC] text-white' : 'border-[var(--border)]'}`}>{checked ? <Check size={13} strokeWidth={2.4} /> : null}</span>
                                {PERMISSION_LABELS[permission]}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                    {approvalError && isReviewing ? <p className="mt-4 text-sm text-red-500">{approvalError}</p> : null}
                    <div className="mt-6 flex flex-col-reverse gap-3 border-t border-[var(--border)] pt-5 sm:flex-row sm:justify-end">
                      <button type="button" onClick={() => rejectRequest(request)} disabled={approvingId === request.id} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-red-500/20 bg-red-500/5 px-4 text-sm font-semibold text-red-500 disabled:opacity-50"><X size={16} /> Rechazar</button>
                      <button type="button" onClick={() => void approveRequest(request)} disabled={approvingId === request.id} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#7DC6FF] px-5 text-sm font-semibold text-black disabled:cursor-wait disabled:opacity-60"><Check size={16} /> {approvingId === request.id ? 'Guardando en Supabase...' : 'Aprobar usuario'}</button>
                    </div>
                  </div>
                ) : null}
              </article>
            )
          })}
        </section>
      ) : null}

      {tab === 'passwords' ? (
        <section className="space-y-4">
          {!pendingPasswordRequests.length ? (
            <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)] p-10 text-center shadow-sm">
              <KeyRound className="mx-auto text-[#5496CC]" size={32} strokeWidth={1.6} />
              <h2 className="mt-4 text-lg font-bold text-[var(--foreground)]">No hay solicitudes de contraseña</h2>
              <p className="mt-2 text-sm text-[var(--muted)]">Las solicitudes hechas desde “¿Olvidaste tu contraseña?” aparecerán aquí.</p>
            </div>
          ) : null}

          {pendingPasswordRequests.map((request) => {
            const user = users.find((item) => item.id === request.userId)
            return (
              <article key={request.id} className="flex flex-col gap-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-bold text-[var(--foreground)]">{request.name}</h2>
                    <span className="rounded-full bg-amber-500/10 px-2 py-1 text-[10px] font-bold uppercase text-amber-600">Pendiente</span>
                  </div>
                  <p className="mt-1 text-sm text-[var(--muted)]">{request.email}</p>
                  <p className="mt-1 text-xs text-[var(--muted)]">Solicitado: {formatDate(request.createdAt)}</p>
                </div>
                {user ? (
                  <button type="button" onClick={() => openPasswordModal(user)} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#7DC6FF] px-4 text-sm font-semibold text-black">
                    <KeyRound size={16} /> Restablecer contraseña
                  </button>
                ) : (
                  <span className="text-xs text-red-500">Usuario no disponible</span>
                )}
              </article>
            )
          })}
        </section>
      ) : null}

      <div className="rounded-2xl border border-[#5496CC]/15 bg-[#5496CC]/5 p-4 text-xs leading-5 text-[var(--muted)]">
        <strong className="text-[var(--foreground)]">Etapa actual:</strong> la lista de usuarios se sincroniza con Supabase. Las solicitudes y algunos controles administrativos temporales todavía conservan respaldo local mientras terminamos la migración completa.
      </div>

      {createUserOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-[var(--border)] px-6 py-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#5496CC]">Equipo NEDVI</p>
                <h2 className="mt-2 text-xl font-bold text-[var(--foreground)]">Crear usuario interno</h2>
                <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
                  Esta cuenta será parte del equipo NEDVI con permisos de Supervisor y no aparecerá como Cliente.
                </p>
              </div>
              <button
                type="button"
                onClick={closeCreateUserModal}
                className="rounded-lg p-2 text-[var(--muted)] transition hover:bg-[var(--surface-soft)]"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid gap-4 p-6 sm:grid-cols-2">
              <label className="block sm:col-span-2">
                <span className="text-xs font-semibold text-[var(--muted)]">Nombre completo *</span>
                <input
                  value={createName}
                  onChange={(event) => setCreateName(event.target.value)}
                  placeholder="Ej. Juan Pérez"
                  className="mt-2 h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] px-3 text-sm text-[var(--foreground)] outline-none focus:border-[#5496CC]"
                />
              </label>

              <label className="block sm:col-span-2">
                <span className="text-xs font-semibold text-[var(--muted)]">Correo de acceso *</span>
                <input
                  type="email"
                  value={createEmail}
                  onChange={(event) => setCreateEmail(event.target.value)}
                  placeholder="usuario@nedviconstructora.com"
                  className="mt-2 h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] px-3 text-sm text-[var(--foreground)] outline-none focus:border-[#5496CC]"
                />
              </label>

              <label className="block">
                <span className="text-xs font-semibold text-[var(--muted)]">Puesto</span>
                <input
                  value={createPosition}
                  onChange={(event) => setCreatePosition(event.target.value)}
                  placeholder="Supervisor de obra"
                  className="mt-2 h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] px-3 text-sm text-[var(--foreground)] outline-none focus:border-[#5496CC]"
                />
              </label>

              <label className="block">
                <span className="text-xs font-semibold text-[var(--muted)]">Teléfono</span>
                <input
                  value={createPhone}
                  onChange={(event) => setCreatePhone(event.target.value)}
                  placeholder="Opcional"
                  className="mt-2 h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] px-3 text-sm text-[var(--foreground)] outline-none focus:border-[#5496CC]"
                />
              </label>

              <label className="block">
                <span className="text-xs font-semibold text-[var(--muted)]">Contraseña *</span>
                <div className="relative mt-2">
                  <input
                    type={createShowPassword ? 'text' : 'password'}
                    value={createPassword}
                    onChange={(event) => setCreatePassword(event.target.value)}
                    placeholder="Mínimo 8 caracteres"
                    className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] px-3 pr-11 text-sm text-[var(--foreground)] outline-none focus:border-[#5496CC]"
                  />
                  <button
                    type="button"
                    onClick={() => setCreateShowPassword((value) => !value)}
                    className="absolute inset-y-0 right-2 flex items-center px-2 text-[var(--muted)]"
                  >
                    {createShowPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </label>

              <div className="sm:col-span-2 flex flex-wrap items-center gap-3">
                <button type="button" onClick={() => { const password = generateSecurePassword(); setCreatePassword(password); setCreateConfirmPassword(password); setCreateShowPassword(true) }} className="rounded-xl border border-[#5496CC]/40 px-4 py-2 text-xs font-semibold text-[#5496CC] hover:bg-[#5496CC]/10"><KeyRound size={14} className="mr-2 inline" />Generar contraseña aleatoria</button>
                <span className="text-xs text-[var(--muted)]">Se completarán contraseña y confirmación automáticamente.</span>
              </div>

              <label className="block">
                <span className="text-xs font-semibold text-[var(--muted)]">Confirmar contraseña *</span>
                <input
                  type={createShowPassword ? 'text' : 'password'}
                  value={createConfirmPassword}
                  onChange={(event) => setCreateConfirmPassword(event.target.value)}
                  placeholder="Repite la contraseña"
                  className="mt-2 h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] px-3 text-sm text-[var(--foreground)] outline-none focus:border-[#5496CC]"
                />
              </label>

              <div className="sm:col-span-2 rounded-xl border border-[#5496CC]/20 bg-[#5496CC]/5 p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-[var(--foreground)]">
                  <ShieldCheck size={16} className="text-[#5496CC]" />
                  Rol: Supervisor
                </div>
                <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
                  Tendrá acceso operativo a Dashboard, Comercial, Proyectos, Compras, Obra, Agenda, Indicadores y Coral AI. No tendrá Portal del Cliente, Finanzas, Recursos Humanos ni administración de usuarios.
                </p>
              </div>

              {createError ? (
                <p className="sm:col-span-2 text-sm text-red-500">{createError}</p>
              ) : null}
            </div>

            <div className="flex justify-end gap-2 border-t border-[var(--border)] px-6 py-4">
              <button
                type="button"
                onClick={closeCreateUserModal}
                disabled={creatingUser}
                className="h-10 rounded-xl border border-[var(--border)] px-4 text-sm font-semibold text-[var(--foreground)] disabled:opacity-60"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void createInternalUser()}
                disabled={creatingUser}
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#1F6FEB] px-4 text-sm font-semibold text-white transition hover:bg-[#1759C7] disabled:cursor-wait disabled:opacity-60"
              >
                <UserPlus size={15} />
                {creatingUser ? 'Creando...' : 'Crear usuario NEDVI'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {passwordUser ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#5496CC]">Administración</p>
                <h2 className="mt-2 text-xl font-bold text-[var(--foreground)]">Cambiar contraseña</h2>
                <p className="mt-1 text-sm text-[var(--muted)]">{passwordUser.name} · {passwordUser.email}</p>
              </div>
              <button type="button" onClick={() => { setPasswordUser(null); setSearch('') }} className="rounded-lg p-2 text-[var(--muted)] hover:bg-[var(--surface-soft)]"><X size={18} /></button>
            </div>

            <div className="mt-6 space-y-4">
              <label className="block">
                <span className="text-xs font-semibold text-[var(--muted)]">Nueva contraseña</span>
                <div className="relative mt-2">
                  <input type={showNewPassword ? 'text' : 'password'} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] px-3 pr-11 text-sm text-[var(--foreground)] outline-none focus:border-[#5496CC]" />
                  <button type="button" onClick={() => setShowNewPassword((value) => !value)} className="absolute inset-y-0 right-2 flex items-center px-2 text-[var(--muted)]">{showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button>
                </div>
              </label>
              <button type="button" onClick={() => { const password = generateSecurePassword(); setNewPassword(password); setConfirmPassword(password); setShowNewPassword(true); setPasswordError(''); setPasswordSaved(false) }} className="rounded-xl border border-[#5496CC]/40 px-4 py-2 text-xs font-semibold text-[#5496CC] hover:bg-[#5496CC]/10"><KeyRound size={14} className="mr-2 inline" />Generar contraseña aleatoria</button>
              <label className="block">
                <span className="text-xs font-semibold text-[var(--muted)]">Confirmar contraseña</span>
                <input type={showNewPassword ? 'text' : 'password'} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className="mt-2 h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] px-3 text-sm text-[var(--foreground)] outline-none focus:border-[#5496CC]" />
              </label>
              {passwordError ? <p className="text-sm text-red-500">{passwordError}</p> : null}
              {passwordSaved ? <p className="text-sm text-emerald-600">Contraseña actualizada correctamente.</p> : null}
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" onClick={() => { setPasswordUser(null); setSearch('') }} className="h-10 rounded-xl border border-[var(--border)] px-4 text-sm font-semibold text-[var(--foreground)]">Cerrar</button>
              <button type="button" onClick={savePassword} className="h-10 rounded-xl bg-[#7DC6FF] px-4 text-sm font-semibold text-black">Guardar contraseña</button>
            </div>
          </div>
        </div>
      ) : null}

      {deleteUser ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-red-500/20 bg-[var(--surface)] p-6 shadow-2xl">
            <Trash2 className="text-red-500" size={28} />
            <h2 className="mt-4 text-xl font-bold text-[var(--foreground)]">Eliminar usuario</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Se eliminará el acceso de <strong className="text-[var(--foreground)]">{deleteUser.name}</strong>. Esta acción también quitará sus solicitudes locales.</p>
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" onClick={() => setDeleteUser(null)} className="h-10 rounded-xl border border-[var(--border)] px-4 text-sm font-semibold text-[var(--foreground)]">Cancelar</button>
              <button type="button" onClick={confirmDeleteUser} className="h-10 rounded-xl bg-red-500 px-4 text-sm font-semibold text-white">Eliminar usuario</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
