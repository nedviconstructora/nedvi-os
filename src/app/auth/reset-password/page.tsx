'use client'

import Link from 'next/link'
import { FormEvent, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [ready, setReady] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    const supabase = createClient()
    let mounted = true

    async function initializeRecovery() {
      const code = new URLSearchParams(window.location.search).get('code')

      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

        if (!mounted) return

        if (exchangeError) {
          console.error('Error validando código de recuperación:', exchangeError)
          setError('El enlace de recuperación no es válido o ya venció. Solicita uno nuevo.')
          return
        }

        window.history.replaceState({}, '', '/auth/reset-password')
      }

      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!mounted) return

      if (session) {
        setReady(true)
        setError('')
      } else if (!code) {
        setError('El enlace de recuperación no es válido o ya venció. Solicita uno nuevo desde el inicio de sesión.')
      }
    }

    void initializeRecovery()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return

      if ((event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') && session) {
        setReady(true)
        setError('')
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage('')
    setError('')

    if (!ready) {
      setError('El enlace de recuperación aún no está validado.')
      return
    }

    if (password.length < 8) {
      setError('La nueva contraseña debe tener al menos 8 caracteres.')
      return
    }

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.')
      return
    }

    setSubmitting(true)

    try {
      const supabase = createClient()
      const { error: updateError } = await supabase.auth.updateUser({ password })

      if (updateError) {
        console.error('Error actualizando contraseña:', updateError)
        setError('No pudimos actualizar la contraseña. Solicita un enlace nuevo e inténtalo otra vez.')
        return
      }

      setMessage('Contraseña actualizada correctamente. Te llevaremos al inicio de sesión.')
      await supabase.auth.signOut()

      window.setTimeout(() => {
        router.replace('/login')
        router.refresh()
      }, 1200)
    } catch (updateError) {
      console.error(updateError)
      setError('No pudimos conectar con el servicio de recuperación.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#090B0F] px-4 py-10 text-white">
      <section className="w-full max-w-md rounded-2xl border border-white/[0.09] bg-[#181D24] p-6 shadow-2xl sm:p-8">
        <div className="text-center">
          <img src="/icon.png" alt="NEDVI Constructora" className="mx-auto h-14 w-14 object-contain" />
          <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#5DAAF2]">
            NEDVI OS
          </p>
          <h1 className="mt-2 text-2xl font-semibold">Crear nueva contraseña</h1>
          <p className="mt-2 text-sm leading-6 text-[#A8B0BC]">
            Escribe una contraseña nueva para tu cuenta.
          </p>
        </div>

        <form className="mt-7 space-y-4" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="new-password" className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-[#A8B0BC]">
              Nueva contraseña
            </label>
            <input
              id="new-password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="h-11 w-full rounded-xl border border-white/[0.1] bg-white/[0.04] px-3 text-sm text-white outline-none transition focus:border-[#7DC6FF]/60"
              required
            />
          </div>

          <div>
            <label htmlFor="confirm-password" className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-[#A8B0BC]">
              Confirmar contraseña
            </label>
            <input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              className="h-11 w-full rounded-xl border border-white/[0.1] bg-white/[0.04] px-3 text-sm text-white outline-none transition focus:border-[#7DC6FF]/60"
              required
            />
          </div>

          {!ready && !error ? (
            <p className="text-xs text-[#A8B0BC]">Validando enlace de recuperación...</p>
          ) : null}

          {error ? <p className="text-xs leading-5 text-red-400">{error}</p> : null}
          {message ? <p className="text-xs leading-5 text-emerald-300">{message}</p> : null}

          <button
            type="submit"
            disabled={!ready || submitting}
            className="h-11 w-full rounded-xl bg-[#7DC6FF] px-4 text-sm font-semibold text-black transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? 'Guardando...' : 'Actualizar contraseña'}
          </button>
        </form>

        <div className="mt-5 text-center">
          <Link href="/login" className="text-xs font-medium text-[#7DC6FF] transition hover:text-white">
            Volver al inicio de sesión
          </Link>
        </div>
      </section>
    </main>
  )
}
