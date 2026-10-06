'use client'

import { useEffect, useMemo, useState } from 'react'
import { Copy, KeyRound, RefreshCw, X } from 'lucide-react'
import {
  readAccessUsers,
  readPasswordResetRequests,
  writeAccessUsers,
  writePasswordResetRequests,
  type AccessUser,
  type PasswordResetRequest,
} from '@/features/access/services/accessStorage'

function temporaryPassword() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'
  const values = new Uint32Array(10)
  crypto.getRandomValues(values)
  return `Nedvi-${Array.from(values, (value) => alphabet[value % alphabet.length]).join('')}!`
}

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value)
  const hashBuffer = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(hashBuffer))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

export function PasswordRecoveryCenter() {
  const [open, setOpen] = useState(false)
  const [requests, setRequests] = useState<PasswordResetRequest[]>([])
  const [users, setUsers] = useState<AccessUser[]>([])
  const [workingId, setWorkingId] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [temporary, setTemporary] = useState<{ email: string; password: string } | null>(null)

  function refresh() {
    setRequests(readPasswordResetRequests())
    setUsers(readAccessUsers())
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

  const pending = useMemo(
    () => requests.filter((request) => request.status === 'Pendiente'),
    [requests],
  )

  async function resetPassword(request: PasswordResetRequest) {
    if (workingId) return
    setWorkingId(request.id)
    setMessage('')
    setTemporary(null)

    try {
      const user = users.find(
        (item) =>
          item.id === request.userId || item.email.toLowerCase() === request.email.toLowerCase(),
      )
      const password = temporaryPassword()
      const response = await fetch('/api/access/password-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.id,
          email: request.email,
          password,
        }),
      })
      const result = (await response.json()) as { userId?: string; error?: string }

      if (!response.ok || !result.userId) {
        setMessage(result.error ?? 'No pudimos restablecer la contraseña.')
        return
      }

      const now = new Date().toISOString()
      const passwordHash = await sha256(password)
      const nextRequests = requests.map((item) =>
        item.id === request.id
          ? { ...item, status: 'Atendida' as const, reviewedAt: now }
          : item,
      )
      const resolvedUserId = result.userId
      const nextUsers: AccessUser[] = users.map((item) =>
        item.id === resolvedUserId || item.email.toLowerCase() === request.email.toLowerCase()
          ? { ...item, id: resolvedUserId, passwordHash, passwordUpdatedAt: now }
          : item,
      )

      writePasswordResetRequests(nextRequests)
      writeAccessUsers(nextUsers)
      setRequests(nextRequests)
      setUsers(nextUsers)
      setTemporary({ email: request.email, password })
      setMessage('Contraseña temporal creada en Supabase Auth. Compártela con el usuario.')
    } catch (error) {
      console.error(error)
      setMessage('No pudimos conectar con el servicio de recuperación.')
    } finally {
      setWorkingId(null)
    }
  }

  async function copyTemporary() {
    if (!temporary) return
    await navigator.clipboard.writeText(
      `NEDVI OS\nUsuario: ${temporary.email}\nContraseña temporal: ${temporary.password}`,
    )
    setMessage('Credenciales temporales copiadas.')
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          refresh()
          setMessage('')
          setTemporary(null)
          setOpen(true)
        }}
        className="relative inline-flex h-11 items-center gap-2 rounded-xl border border-[#5496CC]/25 bg-[var(--surface)] px-4 text-sm font-bold text-[#5496CC] shadow-sm transition hover:bg-[#5496CC]/5"
      >
        <KeyRound size={17} /> Recuperar contraseñas
        {pending.length ? (
          <span className="ml-1 inline-flex min-w-5 items-center justify-center rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
            {pending.length}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="max-h-[88vh] w-full max-w-3xl overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-[var(--border)] p-5">
              <div>
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-[#5496CC]">
                  <KeyRound size={15} /> Administración
                </div>
                <h2 className="mt-2 text-2xl font-bold text-[var(--foreground)]">Recuperar contraseñas</h2>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  Genera una contraseña temporal real en Supabase para las solicitudes pendientes.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg p-2 text-[var(--muted)] hover:bg-[var(--surface-soft)]"
              >
                <X size={20} />
              </button>
            </div>

            <div className="max-h-[62vh] overflow-y-auto p-5">
              {!pending.length ? (
                <div className="rounded-xl border border-dashed border-[var(--border)] p-8 text-center">
                  <KeyRound className="mx-auto text-[#5496CC]" size={28} />
                  <p className="mt-3 font-semibold text-[var(--foreground)]">No hay solicitudes pendientes</p>
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    Las solicitudes desde “¿Olvidaste tu contraseña?” aparecerán aquí.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pending.map((request) => (
                    <div
                      key={request.id}
                      className="flex flex-col gap-4 rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] p-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <p className="font-semibold text-[var(--foreground)]">{request.name}</p>
                        <p className="mt-1 text-xs text-[var(--muted)]">{request.email}</p>
                        <p className="mt-1 text-[11px] text-[var(--muted)]">
                          Solicitado: {new Date(request.createdAt).toLocaleString('es-MX')}
                        </p>
                      </div>
                      <button
                        type="button"
                        disabled={workingId === request.id}
                        onClick={() => void resetPassword(request)}
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#7DC6FF] px-4 text-sm font-semibold text-black disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <RefreshCw size={15} className={workingId === request.id ? 'animate-spin' : ''} />
                        {workingId === request.id ? 'Generando...' : 'Generar contraseña temporal'}
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {temporary ? (
                <div className="mt-5 rounded-xl border border-amber-400/30 bg-amber-400/10 p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-amber-600 dark:text-amber-300">
                    Contraseña temporal — cópiala ahora
                  </p>
                  <p className="mt-2 text-xs text-[var(--muted)]">{temporary.email}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <code className="rounded-lg bg-black/10 px-3 py-2 text-sm font-bold text-[var(--foreground)]">
                      {temporary.password}
                    </code>
                    <button
                      type="button"
                      onClick={() => void copyTemporary()}
                      className="inline-flex items-center gap-2 text-xs font-semibold text-[#5496CC]"
                    >
                      <Copy size={14} /> Copiar credenciales
                    </button>
                  </div>
                </div>
              ) : null}

              {message ? (
                <p className="mt-4 rounded-xl border border-[#5496CC]/20 bg-[#5496CC]/10 p-3 text-sm text-[var(--foreground)]">
                  {message}
                </p>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
