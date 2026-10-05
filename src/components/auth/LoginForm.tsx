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
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setRecoveryMessage('')
    setLoading(true)

    if (!supabaseUrl || !supabaseKey) {
      setError('Falta configurar Supabase en .env.local.')
      setLoading(false)
      return
    }

    try {
      const authResponse = await fetch(
        `${supabaseUrl}/auth/v1/token?grant_type=password`,
        {
          method: 'POST',
          headers: {
            apikey: supabaseKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: email.trim().toLowerCase(),
            password,
          }),
        },
      )

      const authData = (await authResponse.json()) as SupabaseAuthResponse

      if (!authResponse.ok || !authData.access_token || !authData.user?.id) {
        setError(
          authData.error_description ||
            authData.msg ||
            'Correo o contraseña incorrectos.',
        )
        return
      }

      const profileResponse = await fetch(
        `${supabaseUrl}/rest/v1/profiles?id=eq.${encodeURIComponent(authData.user.id)}&select=role,active&limit=1`,
        {
          method: 'GET',
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${authData.access_token}`,
            Accept: 'application/json',
          },
        },
      )

      if (!profileResponse.ok) {
        setError('No fue posible consultar el perfil del usuario.')
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

      if (profile.role === 'cliente') {
        router.push('/cliente-demo')
        return
      }

      router.push('/dashboard')
    } catch (loginError) {
      console.error('NEDVI OS login error:', loginError)
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

    if (!supabaseUrl || !supabaseKey) {
      setError('Falta configurar Supabase en .env.local.')
      return
    }

    setRecovering(true)

    try {
      const redirectTo = `${window.location.origin}/reset-password`
      const response = await fetch(
        `${supabaseUrl}/auth/v1/recover?redirect_to=${encodeURIComponent(redirectTo)}`,
        {
          method: 'POST',
          headers: {
            apikey: supabaseKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email: email.trim().toLowerCase() }),
        },
      )

      const data = (await response.json().catch(() => ({}))) as SupabaseRecoveryError

      if (!response.ok) {
        const detail =
          data.message ||
          data.error_description ||
          data.msg ||
          data.error ||
          'No fue posible enviar el correo de recuperación.'

        console.error('Supabase recovery error:', {
          status: response.status,
          code: data.code,
          detail,
        })

        setError(data.code ? `${detail} (${data.code})` : detail)
        return
      }

      setRecoveryMessage(
        'Te enviamos un enlace para crear una nueva contraseña. Revisa tu correo.',
      )
    } catch (recoveryError) {
      console.error('NEDVI OS recovery error:', recoveryError)
      setError('No fue posible solicitar la recuperación. Intenta nuevamente.')
    } finally {
      setRecovering(false)
    }
  }

  return (
    <form className="mt-9 space-y-6" onSubmit={handleLogin}>
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
      {recoveryMessage && (
        <p className="text-sm text-emerald-400">{recoveryMessage}</p>
      )}

      <Button type="submit" className="group w-full" disabled={loading}>
        <span>{loading ? 'Signing in...' : 'Sign in to NEDVI OS'}</span>
        {!loading && (
          <span aria-hidden="true" className="ml-3 transition-transform duration-200 group-hover:translate-x-1">
            -&gt;
          </span>
        )}
      </Button>
    </form>
  )
}
