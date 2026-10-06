'use client'

import { FormEvent, Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

function ResetPasswordForm() {
  const searchParams = useSearchParams()
  const [ready, setReady] = useState(false)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    let active = true
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (active && event === 'PASSWORD_RECOVERY' && session) setReady(true)
    })

    async function checkSession() {
      // Supabase exchanges the recovery URL's session tokens automatically.
      const { data, error: sessionError } = await supabase.auth.getSession()
      if (active && !sessionError && data.session) setReady(true)
    }

    void checkSession()
    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  async function updatePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    if (!ready) { setError('El enlace ha vencido o no es válido. Solicita uno nuevo.'); return }
    if (password.length < 8) { setError('La contraseña debe tener al menos 8 caracteres.'); return }
    if (password !== confirm) { setError('Las contraseñas no coinciden.'); return }
    setSaving(true)
    try {
      const supabase = createClient()
      const { error: updateError } = await supabase.auth.updateUser({ password })
      if (updateError) throw updateError
      await supabase.auth.signOut()
      setDone(true)
    } catch (err) {
      console.error('Error al actualizar contraseña:', err)
      setError('No se pudo actualizar la contraseña. El enlace puede haber caducado.')
    } finally {
      setSaving(false)
    }
  }

  if (done) return <main className="flex min-h-screen items-center justify-center bg-[#14191F] p-6 text-white"><section className="w-full max-w-md space-y-4 rounded-2xl border border-white/10 bg-[#1D2530] p-8"><h1 className="text-2xl font-bold">Contraseña actualizada</h1><p className="text-sm text-slate-300">Ya puedes iniciar sesión con tu nueva contraseña.</p><Link className="inline-block rounded-lg bg-[#7DC6FF] px-5 py-3 font-semibold text-slate-950" href="/login">Ir a iniciar sesión</Link></section></main>

  return <main className="flex min-h-screen items-center justify-center bg-[#14191F] p-6 text-white"><section className="w-full max-w-md rounded-2xl border border-white/10 bg-[#1D2530] p-8"><h1 className="text-2xl font-bold">Nueva contraseña</h1><p className="mt-3 text-sm text-slate-300">Crea una contraseña segura para tu cuenta de NEDVI OS.</p>
    {searchParams.get('error') ? <p className="mt-4 text-sm text-red-300">El enlace de recuperación no es válido o ha caducado.</p> : null}
    {!ready ? <p className="mt-4 text-sm text-amber-300">Verificando enlace de recuperación… Si no se activa, solicita otro desde el inicio de sesión.</p> : null}
    <form onSubmit={(event) => void updatePassword(event)} className="mt-6 space-y-4">
      <label className="block text-sm">Nueva contraseña<input type="password" autoComplete="new-password" required minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} className="mt-2 w-full rounded-lg bg-white px-4 py-3 text-slate-900" /></label>
      <label className="block text-sm">Confirmar contraseña<input type="password" autoComplete="new-password" required minLength={8} value={confirm} onChange={(event) => setConfirm(event.target.value)} className="mt-2 w-full rounded-lg bg-white px-4 py-3 text-slate-900" /></label>
      {error ? <p role="alert" className="text-sm text-red-300">{error}</p> : null}
      <button type="submit" disabled={!ready || saving} className="w-full rounded-lg bg-[#7DC6FF] px-4 py-3 font-bold text-slate-950 disabled:opacity-50">{saving ? 'Guardando…' : 'Guardar nueva contraseña'}</button>
    </form>
    <Link href="/login" className="mt-5 inline-block text-sm text-[#7DC6FF]">Volver al inicio de sesión</Link>
  </section></main>
}

export default function ResetPasswordPage() {
  return <Suspense fallback={<main className="min-h-screen bg-[#14191F]" />}><ResetPasswordForm /></Suspense>
}
