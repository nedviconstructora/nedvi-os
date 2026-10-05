'use client'

import { useEffect, useMemo, useState } from 'react'
import { Check, Copy, KeyRound, Power, RefreshCw, ShieldCheck, UserPlus } from 'lucide-react'
import { Card, CardHeader } from '@/components/ui/Card'

type CustomerPortalAccessProps = {
  customerId: string
  customerName: string
  customerEmail: string
  contactName: string
  folio?: string
}

type AccessStatus = {
  linked: boolean
  userId?: string
  email?: string | null
  fullName?: string
  active?: boolean
  error?: string
}

type PasswordResult = {
  temporaryPassword?: string
  error?: string
}

function getAccessToken() {
  if (typeof window === 'undefined') return null
  const raw = window.localStorage.getItem('nedvi_session')
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as { access_token?: string }
    return parsed.access_token ?? null
  } catch {
    return null
  }
}

export function CustomerPortalAccess({
  customerId,
  customerName,
  customerEmail,
  contactName,
  folio,
}: CustomerPortalAccessProps) {
  const [status, setStatus] = useState<AccessStatus | null>(null)
  const [email, setEmail] = useState(customerEmail)
  const [loading, setLoading] = useState(true)
  const [working, setWorking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [temporaryPassword, setTemporaryPassword] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)

  const credentialsText = useMemo(() => {
    if (!temporaryPassword) return ''
    return `NEDVI OS\nCliente: ${customerName}\nFolio: ${folio || 'Sin folio'}\nCorreo: ${status?.email || email}\nContraseña temporal: ${temporaryPassword}`
  }, [customerName, email, folio, status?.email, temporaryPassword])

  async function apiRequest(method: 'GET' | 'POST' | 'PATCH', body?: object) {
    const token = getAccessToken()
    if (!token) throw new Error('Tu sesión expiró. Inicia sesión nuevamente.')

    const suffix = method === 'GET' ? `?customerId=${encodeURIComponent(customerId)}` : ''
    const response = await fetch(`/api/access/client${suffix}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(method !== 'GET' ? { 'Content-Type': 'application/json' } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
      cache: 'no-store',
    })

    const data = (await response.json().catch(() => ({}))) as AccessStatus & PasswordResult
    if (!response.ok) throw new Error(data.error || 'No fue posible completar la operación.')
    return data
  }

  async function loadStatus() {
    setError(null)
    try {
      const data = await apiRequest('GET')
      setStatus(data)
      if (data.email) setEmail(data.email)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'No se pudo consultar el acceso.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadStatus()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId])

  async function createAccess() {
    setWorking(true)
    setError(null)
    setTemporaryPassword(null)
    try {
      const data = await apiRequest('POST', {
        customerId,
        email,
        fullName: contactName || customerName,
      })
      setStatus(data)
      setTemporaryPassword(data.temporaryPassword ?? null)
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'No se pudo crear el acceso.')
    } finally {
      setWorking(false)
    }
  }

  async function resetPassword() {
    setWorking(true)
    setError(null)
    setTemporaryPassword(null)
    try {
      const data = await apiRequest('PATCH', { customerId, action: 'reset-password' })
      setTemporaryPassword(data.temporaryPassword ?? null)
    } catch (resetError) {
      setError(resetError instanceof Error ? resetError.message : 'No se pudo restablecer la contraseña.')
    } finally {
      setWorking(false)
    }
  }

  async function setActive(active: boolean) {
    setWorking(true)
    setError(null)
    try {
      await apiRequest('PATCH', { customerId, action: 'set-active', active })
      setStatus((current) => current ? { ...current, active } : current)
    } catch (stateError) {
      setError(stateError instanceof Error ? stateError.message : 'No se pudo cambiar el estado del acceso.')
    } finally {
      setWorking(false)
    }
  }

  async function copyValue(label: string, value: string) {
    await navigator.clipboard.writeText(value)
    setCopied(label)
    window.setTimeout(() => setCopied(null), 1600)
  }

  return (
    <Card>
      <CardHeader title="Acceso al portal" description="Controla el acceso del cliente a su espacio privado en NEDVI OS" />
      <div className="space-y-5 p-5 sm:p-6">
        {loading ? (
          <p className="text-xs text-[#9CA3AF]">Consultando acceso en Supabase...</p>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
              <div className="flex items-center gap-3">
                <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${status?.linked && status.active ? 'bg-emerald-400/[0.1] text-emerald-300' : 'bg-white/[0.05] text-[#7187ff]'}`}>
                  <ShieldCheck size={17} />
                </span>
                <div>
                  <p className="text-xs font-semibold text-white">{status?.linked ? (status.active ? 'Portal activo' : 'Portal desactivado') : 'Sin acceso creado'}</p>
                  <p className="mt-1 text-[11px] text-[#646873]">{status?.linked ? status.email || 'Correo no disponible' : folio || 'Cliente sin folio'}</p>
                </div>
              </div>
              <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] ${status?.linked && status.active ? 'bg-emerald-400/[0.1] text-emerald-300' : 'bg-white/[0.05] text-[#9CA3AF]'}`}>
                {status?.linked ? (status.active ? 'Activo' : 'Inactivo') : 'Pendiente'}
              </span>
            </div>

            {!status?.linked ? (
              <div className="space-y-4">
                <label className="block text-[10px] font-semibold uppercase tracking-[0.12em] text-[#646873]">
                  Correo de acceso
                  <input
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    type="email"
                    placeholder="cliente@empresa.com"
                    className="mt-2 h-11 w-full rounded-xl border border-white/[0.08] bg-[#17181C] px-3.5 text-sm text-white outline-none transition placeholder:text-[#646873] focus:border-[#163DFF] focus:ring-4 focus:ring-[#163DFF]/10"
                  />
                </label>
                <button type="button" disabled={working || !email.trim()} onClick={() => void createAccess()} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#163DFF] px-4 text-xs font-semibold text-white transition hover:bg-[#3155ff] disabled:cursor-not-allowed disabled:opacity-50">
                  <UserPlus size={14} /> {working ? 'Creando acceso...' : 'Crear acceso para cliente'}
                </button>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                <button type="button" disabled={working} onClick={() => void resetPassword()} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-white/[0.09] px-4 text-xs font-semibold text-[#d5d7df] transition hover:bg-white/[0.05] hover:text-white disabled:opacity-50">
                  <KeyRound size={14} /> Restablecer contraseña
                </button>
                <button type="button" disabled={working} onClick={() => void setActive(!status.active)} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-white/[0.09] px-4 text-xs font-semibold text-[#d5d7df] transition hover:bg-white/[0.05] hover:text-white disabled:opacity-50">
                  <Power size={14} /> {status.active ? 'Desactivar acceso' : 'Activar acceso'}
                </button>
                <button type="button" disabled={working} onClick={() => void loadStatus()} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-white/[0.09] px-4 text-xs font-semibold text-[#9CA3AF] transition hover:bg-white/[0.05] hover:text-white disabled:opacity-50">
                  <RefreshCw size={14} /> Actualizar
                </button>
              </div>
            )}

            {temporaryPassword ? (
              <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/[0.06] p-4">
                <p className="text-xs font-semibold text-emerald-200">Credenciales temporales listas</p>
                <p className="mt-2 text-[11px] leading-5 text-[#9CA3AF]">Compártelas una sola vez con el cliente. Después puede cambiar su contraseña desde el flujo de recuperación.</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <Credential label="Correo" value={status?.email || email} onCopy={() => void copyValue('email', status?.email || email)} copied={copied === 'email'} />
                  <Credential label="Contraseña temporal" value={temporaryPassword} onCopy={() => void copyValue('password', temporaryPassword)} copied={copied === 'password'} />
                </div>
                <button type="button" onClick={() => void copyValue('all', credentialsText)} className="mt-3 inline-flex h-9 items-center gap-2 rounded-lg border border-emerald-300/20 px-3 text-[11px] font-semibold text-emerald-100 transition hover:bg-emerald-300/10">
                  {copied === 'all' ? <Check size={13} /> : <Copy size={13} />} {copied === 'all' ? 'Copiado' : 'Copiar acceso completo'}
                </button>
              </div>
            ) : null}
          </>
        )}

        {error ? <p className="rounded-xl border border-red-400/20 bg-red-400/[0.07] px-4 py-3 text-xs text-red-200">{error}</p> : null}
      </div>
    </Card>
  )
}

type CredentialProps = {
  label: string
  value: string
  onCopy: () => void
  copied: boolean
}

function Credential({ label, value, onCopy, copied }: CredentialProps) {
  return (
    <div className="rounded-lg border border-white/[0.06] bg-[#17181C] p-3">
      <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[#646873]">{label}</p>
      <div className="mt-2 flex items-center justify-between gap-3">
        <code className="truncate text-xs text-white">{value}</code>
        <button type="button" onClick={onCopy} className="shrink-0 rounded-md p-1.5 text-[#9CA3AF] transition hover:bg-white/[0.06] hover:text-white" aria-label={`Copiar ${label}`}>
          {copied ? <Check size={13} /> : <Copy size={13} />}
        </button>
      </div>
    </div>
  )
}
