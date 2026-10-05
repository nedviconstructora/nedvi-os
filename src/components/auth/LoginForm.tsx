'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

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
}

type SupabaseRecoveryError = {
  msg?: string
  message?: string
  error?: string
  error_description?: string
  code?: string
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
      if (response.status !== 401) {
        return { response, key }
      }
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
          authData.error_description ||
            authData.msg ||
            authData.error ||
            'Correo o contraseña incorrectos.',
        )
        return
      }

      const profileResponse = await fetch(
        `${supabaseUrl}/rest/v1/profiles?id=eq.${encodeURIComponent(authData.user.id)}&select=role,active&limit=1`,
        {
          method: 'GET',
          headers: {
            apikey: workingKey,
            Authorization: `Bearer ${authData.access_token}`,
            Accept: 'application/json',
          },
        },
      )

      if (!profileResponse.ok) {
        const detail = await profileResponse.text().catch(() => '')
        setError(
          `No fue posible consultar el perfil del usuario. [HTTP ${profileResponse.status}]${detail ? ` ${detail}` : ''}`,
        )
        return
      }

      const profiles = (await profileResponse.json()) as Profile[]
      const profile = profiles[0]

      if (!profile) {
        setError('Tu usuario no tiene un perfil asignado. Contacta a administración.')
        return
      }

      if (!profile.active) {
        setError('Tu acceso está desactivado. Contacta a administración.')
        return
      }

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

      const destination = profile.role === 'cliente' ? '/cliente-demo' : '/dashboard'
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
        const detail =
          data.message ||
          data.error_description ||
          data.msg ||
          data.error ||
          'No fue posible enviar el correo de recuperación.'

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
        label="Work email"
        placeholder="you@company.com"
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />

      <Input
        id="password"
        name="password"
        type={showPassword ? 'text' : 'password'}
        label="Password"
        placeholder="Enter your password"
        autoComplete="current-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        rightElement={
          <button
            type="button"
            onClick={() => setShowPassword((value) => !value)}
            className="rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[#9CA3AF] transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#163DFF]"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? 'Hide' : 'Show'}
          </button>
        }
      />

      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={handlePasswordRecovery}
          disabled={recovering}
          className="text-sm font-medium text-[#9CA3AF] transition hover:text-white disabled:opacity-50"
        >
          {recovering ? 'Sending...' : 'Forgot password?'}
        </button>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}
      {recoveryMessage && <p className="text-sm text-emerald-400">{recoveryMessage}</p>}

      <Button
        type="button"
        onClick={() => void handleLogin()}
        className="group w-full"
        disabled={loading}
      >
        <span>{loading ? 'Signing in...' : 'Sign in to NEDVI OS'}</span>
        {!loading && (
          <span aria-hidden="true" className="ml-3 transition-transform duration-200 group-hover:translate-x-1">
            -&gt;
          </span>
        )}
      </Button>
    </div>
  )
}
