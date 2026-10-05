'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { defaultPermissionsForRole, writeAccessSession } from '@/features/access/services/accessStorage'
import type { AppRole, ModulePermission } from '@/config/roles'

type SupabaseAuthResponse = {
  access_token?: string
  refresh_token?: string
  expires_in?: number
  token_type?: string
  user?: { id: string; email?: string }
  error?: string
  error_description?: string
  msg?: string
}

type Profile = {
  role: string
  active: boolean
  permissions?: string[] | null
  full_name?: string | null
}

type SupabaseRecoveryError = {
  msg?: string
  message?: string
  error?: string
  error_description?: string
  code?: string
}

function mapRole(role: string): AppRole {
  const normalized = role.trim().toLowerCase()
  if (normalized === 'cliente') return 'Cliente'
  if (normalized === 'obra' || normalized === 'supervisor') return 'Supervisor'
  return 'Administración'
}

function displayNameFromEmail(email: string) {
  const local = email.split('@')[0] || 'Usuario'
  if (local.toLowerCase() === 'pedrog') return 'Pedro García'
  return local
    .replace(/[._-]+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
}

function sanitizePermissions(values: string[] | null | undefined): ModulePermission[] {
  const allowed = new Set<ModulePermission>([
    'dashboard',
    'commercial',
    'projects',
    'purchasing',
    'operations',
    'agenda',
    'human-resources',
    'finance',
    'indicators',
    'settings',
    'coral',
    'client-portal',
  ])
  return (values || []).filter(
    (value): value is ModulePermission => allowed.has(value as ModulePermission),
  )
}

export function LoginForm() {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [recoveryMessage, setRecoveryMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [recovering, setRecovering] = useState(false)

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  const legacyAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const supabaseKeys = [publishableKey, legacyAnonKey].filter(
    (value): value is string => Boolean(value?.trim()),
  )

  async function requestWithAvailableKey(
    path: string,
    init: Omit<RequestInit, 'headers'> & { headers?: Record<string, string> },
  ) {
    let lastResponse: Response | null = null

    for (const key of supabaseKeys) {
      const response = await fetch(`${supabaseUrl}${path}`, {
        ...init,
        headers: {
          ...init.headers,
          apikey: key,
        },
      })
      lastResponse = response
      if (response.status !== 401) return { response, key }
    }

    return { response: lastResponse, key: supabaseKeys[0] }
  }

  async function handleLogin() {
    setError('')
    setRecoveryMessage('')

    if (!email.trim() || !password) {
      setError('Escribe tu correo y contraseña.')
      return
    }

    if (!supabaseUrl || supabaseKeys.length === 0) {
      setError('Falta configurar Supabase en .env.local.')
      return
    }

    setLoading(true)

    try {
      const { response: authResponse, key: workingKey } = await requestWithAvailableKey(
        '/auth/v1/token?grant_type=password',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: email.trim().toLowerCase(),
            password,
          }),
        },
      )

      if (!authResponse || !workingKey) {
        setError('No hay una API key pública configurada para Supabase.')
        return
      }

      const authData = (await authResponse.json()) as SupabaseAuthResponse

      if (!authResponse.ok || !authData.access_token || !authData.user?.id) {
        setError(
          authData.error_description || authData.msg || authData.error || 'Correo o contraseña incorrectos.',
        )
        return
      }

      const profileResponse = await fetch(
        `${supabaseUrl}/rest/v1/profiles?id=eq.${encodeURIComponent(authData.user.id)}&select=role,active,permissions,full_name&limit=1`,
        {
          headers: {
            apikey: workingKey,
            Authorization: `Bearer ${authData.access_token}`,
            Accept: 'application/json',
          },
        },
      )

      if (!profileResponse.ok) {
        const detail = await profileResponse.text().catch(() => '')
        setError(`No fue posible consultar el perfil. [HTTP ${profileResponse.status}]${detail ? ` ${detail}` : ''}`)
        return
      }

      const profiles = (await profileResponse.json()) as Profile[]
      const profile = profiles[0]

      if (!profile) {
        setError('Tu usuario no tiene un perfil asignado. Contacta a Administración.')
        return
      }

      if (!profile.active) {
        setError('Tu acceso está desactivado. Contacta a Administración.')
        return
      }

      const normalizedEmail = authData.user.email || email.trim().toLowerCase()
      const appRole = mapRole(profile.role)
      const storedPermissions = sanitizePermissions(profile.permissions)
      const permissions = storedPermissions.length
        ? storedPermissions
        : defaultPermissionsForRole(appRole)
      const name = profile.full_name?.trim() || displayNameFromEmail(normalizedEmail)

      localStorage.setItem(
        'nedvi_session',
        JSON.stringify({
          access_token: authData.access_token,
          refresh_token: authData.refresh_token,
          expires_in: authData.expires_in,
          token_type: authData.token_type,
          user: authData.user,
          role: profile.role,
        }),
      )

      writeAccessSession({
        userId: authData.user.id,
        name,
        firstName: name.split(' ')[0] || name,
        initials: initials(name),
        email: normalizedEmail,
        role: appRole,
        permissions,
        createdAt: new Date().toISOString(),
      })

      const destination = appRole === 'Cliente' ? '/client-portal' : '/dashboard'
      window.location.assign(destination)
      return
    } catch {
      setError('No fue posible conectar con Supabase. Intenta nuevamente.')
    } finally {
      setLoading(false)
    }
  }

  async function handlePasswordRecovery() {
    setError('')
    setRecoveryMessage('')

    if (!email.trim()) {
      setError('Escribe tu correo antes de solicitar el cambio de contraseña.')
      return
    }

    if (!supabaseUrl || supabaseKeys.length === 0) {
      setError('Falta configurar Supabase en .env.local.')
      return
    }

    setRecovering(true)

    try {
      const redirectTo = `${window.location.origin}/reset-password`
      const { response } = await requestWithAvailableKey(
        `/auth/v1/recover?redirect_to=${encodeURIComponent(redirectTo)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email.trim().toLowerCase() }),
        },
      )

      if (!response) {
        setError('No hay una API key pública configurada para Supabase.')
        return
      }

      const data = (await response.json().catch(() => ({}))) as SupabaseRecoveryError
      if (!response.ok) {
        const detail = data.message || data.error_description || data.msg || data.error || 'No fue posible enviar el correo.'
        setError(`${detail}${data.code ? ` (${data.code})` : ''} [HTTP ${response.status}]`)
        return
      }

      setRecoveryMessage('Te enviamos un enlace para crear una nueva contraseña. Revisa tu correo.')
    } catch {
      setError('No fue posible solicitar la recuperación. Intenta nuevamente.')
    } finally {
      setRecovering(false)
    }
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Enter' && !loading) {
      event.preventDefault()
      void handleLogin()
    }
  }

  return (
    <div className="mt-9 space-y-6" onKeyDown={handleKeyDown}>
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
          onClick={handlePasswordRecovery}
          disabled={recovering}
          className="text-sm font-medium text-[#A8B0BC] transition hover:text-white disabled:opacity-50"
        >
          {recovering ? 'Enviando...' : '¿Olvidaste tu contraseña?'}
        </button>
      </div>

      {error ? <p className="text-sm text-red-400">{error}</p> : null}
      {recoveryMessage ? <p className="text-sm text-emerald-300">{recoveryMessage}</p> : null}

      <Button type="button" onClick={() => void handleLogin()} className="group w-full" disabled={loading}>
        <span>{loading ? 'Iniciando sesión...' : 'Iniciar sesión en NEDVI OS'}</span>
        {!loading ? <span aria-hidden="true" className="ml-3">-&gt;</span> : null}
      </Button>
    </div>
  )
}
