'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

type Profile = {
  role: string
  active: boolean
}

type UpdatedUser = {
  id?: string
  email?: string
  msg?: string
  error_description?: string
}

export default function ResetPasswordPage() {
  const router = useRouter()
  const [accessToken, setAccessToken] = useState('')
  const [refreshToken, setRefreshToken] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  const legacyAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const supabaseKey = legacyAnonKey || publishableKey

  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''))
    const query = new URLSearchParams(window.location.search)
    const token = hash.get('access_token') || query.get('access_token') || ''
    const refresh = hash.get('refresh_token') || query.get('refresh_token') || ''
    const type = hash.get('type') || query.get('type')

    if (token) {
      setAccessToken(token)
      setRefreshToken(refresh)
      if (type && type !== 'recovery') {
        setError('Este enlace no corresponde a una recuperación de contraseña.')
      }
      return
    }

    setError('El enlace de recuperación no contiene una sesión válida. Solicita uno nuevo desde el inicio de sesión.')
  }, [])

  const canSubmit = useMemo(
    () => Boolean(accessToken && password && confirmPassword && !loading),
    [accessToken, password, confirmPassword, loading],
  )

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setMessage('')

    if (!supabaseUrl || !supabaseKey) {
      setError('Falta configurar Supabase en .env.local.')
      return
    }

    if (!accessToken) {
      setError('El enlace de recuperación no es válido o ya expiró.')
      return
    }

    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.')
      return
    }

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.')
      return
    }

    setLoading(true)

    try {
      const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
        method: 'PUT',
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      })

      const data = (await response.json().catch(() => ({}))) as UpdatedUser

      if (!response.ok) {
        setError(data.error_description || data.msg || 'No fue posible actualizar la contraseña.')
        return
      }

      if (!data.id) {
        setMessage('Contraseña actualizada. Redirigiendo al inicio de sesión...')
        window.history.replaceState({}, '', '/reset-password')
        setTimeout(() => router.replace('/login'), 900)
        return
      }

      const profileResponse = await fetch(
        `${supabaseUrl}/rest/v1/profiles?id=eq.${encodeURIComponent(data.id)}&select=role,active&limit=1`,
        {
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${accessToken}`,
            Accept: 'application/json',
          },
        },
      )

      if (!profileResponse.ok) {
        setMessage('Contraseña actualizada. Redirigiendo al inicio de sesión...')
        window.history.replaceState({}, '', '/reset-password')
        setTimeout(() => router.replace('/login'), 900)
        return
      }

      const profiles = (await profileResponse.json()) as Profile[]
      const profile = profiles[0]

      if (!profile || !profile.active) {
        setMessage('Contraseña actualizada. Redirigiendo al inicio de sesión...')
        window.history.replaceState({}, '', '/reset-password')
        setTimeout(() => router.replace('/login'), 900)
        return
      }

      localStorage.setItem(
        'nedvi_session',
        JSON.stringify({
          access_token: accessToken,
          refresh_token: refreshToken,
          token_type: 'bearer',
          user: { id: data.id, email: data.email },
          role: profile.role,
        }),
      )

      setMessage('Contraseña actualizada correctamente. Entrando a NEDVI OS...')
      window.history.replaceState({}, '', '/reset-password')

      const destination = profile.role === 'cliente' ? '/cliente-demo' : '/dashboard'
      setTimeout(() => router.replace(destination), 700)
    } catch {
      setError('No fue posible actualizar la contraseña. Intenta nuevamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0B0B0D] px-6 py-12 text-white">
      <section className="w-full max-w-md rounded-2xl border border-white/[0.08] bg-[#20232A] p-8 shadow-2xl">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7BAEE3]">NEDVI OS</p>
        <h1 className="mt-4 text-3xl font-semibold tracking-[-0.04em]">Crea una nueva contraseña</h1>
        <p className="mt-3 text-sm leading-6 text-[#9CA3AF]">Escribe tu nueva contraseña para recuperar el acceso a tu cuenta.</p>

        <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
          <Input
            id="new-password"
            name="new-password"
            type={showPassword ? 'text' : 'password'}
            label="Nueva contraseña"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            rightElement={
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                className="rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[#9CA3AF] transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#163DFF]"
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                {showPassword ? 'Ocultar' : 'Ver'}
              </button>
            }
          />

          <Input
            id="confirm-password"
            name="confirm-password"
            type={showConfirmPassword ? 'text' : 'password'}
            label="Confirmar contraseña"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            rightElement={
              <button
                type="button"
                onClick={() => setShowConfirmPassword((value) => !value)}
                className="rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[#9CA3AF] transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#163DFF]"
                aria-label={showConfirmPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                {showConfirmPassword ? 'Ocultar' : 'Ver'}
              </button>
            }
          />

          {error && <p className="text-sm text-red-500">{error}</p>}
          {message && <p className="text-sm text-emerald-400">{message}</p>}

          <Button type="submit" className="w-full" disabled={!canSubmit}>
            {loading ? 'Actualizando...' : 'Guardar nueva contraseña'}
          </Button>
        </form>
      </section>
    </main>
  )
}
