'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [accessToken, setAccessToken] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  const legacyAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const supabaseKey = publishableKey || legacyAnonKey

  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''))
    const query = new URLSearchParams(window.location.search)
    const token = hash.get('access_token') || query.get('access_token') || ''
    const type = hash.get('type') || query.get('type')

    if (token) {
      setAccessToken(token)
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

      const data = (await response.json().catch(() => ({}))) as {
        msg?: string
        error_description?: string
      }

      if (!response.ok) {
        setError(data.error_description || data.msg || 'No fue posible actualizar la contraseña.')
        return
      }

      setMessage('Contraseña actualizada correctamente. Ya puedes iniciar sesión.')
      window.history.replaceState({}, '', '/reset-password')
      setTimeout(() => router.push('/login'), 1500)
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
          <Input id="new-password" name="new-password" type="password" label="Nueva contraseña" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          <Input id="confirm-password" name="confirm-password" type="password" label="Confirmar contraseña" autoComplete="new-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
          {error && <p className="text-sm text-red-500">{error}</p>}
          {message && <p className="text-sm text-emerald-400">{message}</p>}
          <Button type="submit" className="w-full" disabled={!canSubmit}>{loading ? 'Actualizando...' : 'Guardar nueva contraseña'}</Button>
        </form>
      </section>
    </main>
  )
}
