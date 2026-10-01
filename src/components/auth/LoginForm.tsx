'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import {
  defaultPermissionsForRole,
  readAccessUsers,
  readPasswordResetRequests,
  writeAccessSession,
  writePasswordResetRequests,
  type PasswordResetRequest,
} from '@/features/access/services/accessStorage'

const DEV_USER_EMAIL = 'pedrog@nedviconstructora.com'
const DEV_PASSWORD_SHA256 = process.env.NEXT_PUBLIC_DEV_ADMIN_PASSWORD_SHA256 ?? ''

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value)
  const hashBuffer = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(hashBuffer))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
}

export function LoginForm() {
  const router = useRouter()

  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [showRecovery, setShowRecovery] = useState(false)
  const [recoveryEmail, setRecoveryEmail] = useState('')
  const [recoveryMessage, setRecoveryMessage] = useState('')
  const [recoveryError, setRecoveryError] = useState('')

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSubmitting(true)

    const normalizedEmail = email.trim().toLowerCase()
    const passwordHash = await sha256(password)

    if (normalizedEmail === DEV_USER_EMAIL && DEV_PASSWORD_SHA256 && passwordHash === DEV_PASSWORD_SHA256) {
      writeAccessSession({
        userId: 'user-001',
        name: 'Pedro García',
        firstName: 'Pedro',
        initials: 'PG',
        email: DEV_USER_EMAIL,
        role: 'Administración',
        permissions: defaultPermissionsForRole('Administración'),
        createdAt: new Date().toISOString(),
      })
      router.push('/dashboard')
      return
    }

    const user = readAccessUsers().find(
      (item) => item.email.trim().toLowerCase() === normalizedEmail,
    )

    if (!user) {
      setSubmitting(false)
      setError('Correo o contraseña incorrectos.')
      return
    }

    if (user.status !== 'Activo') {
      setSubmitting(false)
      setError('Esta cuenta está inactiva. Contacta a Administración.')
      return
    }

    if (!user.passwordHash) {
      setSubmitting(false)
      setError('La cuenta aún no tiene contraseña configurada. Contacta a Administración.')
      return
    }

    if (user.passwordHash !== passwordHash) {
      setSubmitting(false)
      setError('Correo o contraseña incorrectos.')
      return
    }

    if (user.role === 'Cliente' && (!user.clientId || !user.clientFolio)) {
      setSubmitting(false)
      setError('Esta cuenta de cliente no está vinculada correctamente. Contacta a Administración.')
      return
    }

    writeAccessSession({
      userId: user.id,
      name: user.name,
      firstName: user.name.split(' ')[0] || user.name,
      initials: initials(user.name),
      email: user.email,
      role: user.role,
      permissions: user.permissions,
      createdAt: new Date().toISOString(),
      clientId: user.clientId,
      clientFolio: user.clientFolio,
      clientName: user.clientName,
    })

    router.push(user.role === 'Cliente' ? '/client-portal' : '/dashboard')
  }

  function openRecovery() {
    setRecoveryEmail(email.trim().toLowerCase())
    setRecoveryMessage('')
    setRecoveryError('')
    setShowRecovery(true)
  }

  function requestPasswordReset() {
    setRecoveryMessage('')
    setRecoveryError('')

    const normalizedEmail = recoveryEmail.trim().toLowerCase()
    if (!normalizedEmail) {
      setRecoveryError('Escribe el correo de tu cuenta.')
      return
    }

    const user = readAccessUsers().find(
      (item) => item.email.trim().toLowerCase() === normalizedEmail,
    )

    if (!user) {
      if (normalizedEmail === DEV_USER_EMAIL) {
        setRecoveryMessage(
          'La cuenta principal se administra temporalmente desde desarrollo. Al conectar Supabase, la recuperación llegará por correo.',
        )
        return
      }
      setRecoveryError('No encontramos una cuenta aprobada con ese correo.')
      return
    }

    const requests = readPasswordResetRequests()
    const existingPending = requests.some(
      (request) =>
        request.email.toLowerCase() === normalizedEmail && request.status === 'Pendiente',
    )

    if (!existingPending) {
      const request: PasswordResetRequest = {
        id: crypto.randomUUID(),
        userId: user.id,
        name: user.name,
        email: user.email,
        status: 'Pendiente',
        createdAt: new Date().toISOString(),
      }
      writePasswordResetRequests([request, ...requests])
    }

    setRecoveryMessage(
      'Solicitud enviada. Administración podrá restablecer tu contraseña desde Usuarios y permisos.',
    )
  }

  return (
    <form className="mt-9 space-y-6" onSubmit={handleLogin}>
      <Input
        id="email"
        name="email"
        type="email"
        label="Correo de trabajo"
        placeholder="tu@empresa.com"
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <Input
        id="password"
        name="password"
        type={showPassword ? 'text' : 'password'}
        label="Contraseña"
        placeholder="Ingresa tu contraseña"
        autoComplete="current-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        rightElement={
          <button
            type="button"
            onClick={() => setShowPassword((value) => !value)}
            className="rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[#9CA3AF] transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5DAAF2]"
            aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          >
            {showPassword ? 'Ocultar' : 'Mostrar'}
          </button>
        }
      />

      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={openRecovery}
          className="text-sm font-medium text-[#A8B0BC] transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5DAAF2] focus-visible:ring-offset-2 focus-visible:ring-offset-[#181D24]"
        >
          ¿Olvidaste tu contraseña?
        </button>
      </div>

      {showRecovery ? (
        <div className="rounded-xl border border-white/[0.09] bg-black/20 p-4">
          <p className="text-sm font-semibold text-white">Recuperar contraseña</p>
          <p className="mt-1 text-xs leading-5 text-[#9CA3AF]">
            Envía una solicitud a Administración para que restablezca tu acceso.
          </p>
          <div className="mt-4">
            <Input
              id="recovery-email"
              name="recovery-email"
              type="email"
              label="Correo de la cuenta"
              placeholder="tu@empresa.com"
              value={recoveryEmail}
              onChange={(event) => setRecoveryEmail(event.target.value)}
            />
          </div>
          {recoveryError ? <p className="mt-3 text-xs text-red-400">{recoveryError}</p> : null}
          {recoveryMessage ? (
            <p className="mt-3 text-xs leading-5 text-emerald-300">{recoveryMessage}</p>
          ) : null}
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={() => setShowRecovery(false)}
              className="h-9 flex-1 rounded-lg border border-white/[0.09] px-3 text-xs font-semibold text-[#A8B0BC] transition hover:bg-white/[0.04] hover:text-white"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={requestPasswordReset}
              className="h-9 flex-1 rounded-lg bg-[#7DC6FF] px-3 text-xs font-semibold text-black transition hover:brightness-95"
            >
              Enviar solicitud
            </button>
          </div>
        </div>
      ) : null}

      {error ? <p className="text-sm text-red-400">{error}</p> : null}

      <Button type="submit" className="group w-full" disabled={submitting}>
        <span>{submitting ? 'Iniciando sesión...' : 'Iniciar sesión en NEDVI OS'}</span>
        <span
          aria-hidden="true"
          className="ml-3 transition-transform duration-200 group-hover:translate-x-1"
        >
          -&gt;
        </span>
      </Button>
    </form>
  )
}
