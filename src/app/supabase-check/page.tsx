'use client'

import { useState } from 'react'

export default function SupabaseCheckPage() {
  const [status, setStatus] = useState<string>('Sin probar')
  const [detail, setDetail] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [recoveryStatus, setRecoveryStatus] = useState('Sin probar')
  const [recoveryDetail, setRecoveryDetail] = useState('')
  const [recoveryLoading, setRecoveryLoading] = useState(false)

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || ''
  const legacyAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

  const keys = [
    { name: 'Publicable', value: publishableKey },
    { name: 'Anónima heredada', value: legacyAnonKey },
  ].filter((item) => item.value)

  function mask(value: string) {
    return value ? `${value.slice(0, 15)}...${value.slice(-6)}` : 'No configurada'
  }

  async function runCheck() {
    setLoading(true)
    setStatus('Probando...')
    setDetail('')

    if (!supabaseUrl || keys.length === 0) {
      setStatus('Configuración incompleta')
      setDetail('Falta NEXT_PUBLIC_SUPABASE_URL y al menos una clave pública en .env.local.')
      setLoading(false)
      return
    }

    try {
      const results: string[] = []

      for (const item of keys) {
        const response = await fetch(`${supabaseUrl}/auth/v1/settings`, {
          headers: { apikey: item.value },
        })
        const text = await response.text()

        if (response.ok) {
          setStatus(`Conexión correcta - HTTP ${response.status}`)
          setDetail(`${item.name} Key válida. NEDVI OS puede conectarse con este proyecto.`)
          setLoading(false)
          return
        }

        results.push(`${item.name}: HTTP ${response.status} - ${text || 'Sin detalle'}`)
      }

      setStatus('Error de API key')
      setDetail(results.join('\n\n'))
    } catch (error) {
      setStatus('Error de conexión')
      setDetail(error instanceof Error ? error.message : 'No fue posible conectar con Supabase.')
    } finally {
      setLoading(false)
    }
  }

  async function runRecoveryCheck() {
    setRecoveryLoading(true)
    setRecoveryStatus('Probando...')
    setRecoveryDetail('')

    if (!email.trim()) {
      setRecoveryStatus('Falta correo')
      setRecoveryDetail('Escribe un correo real de un usuario de NEDVI OS para probar la recuperación.')
      setRecoveryLoading(false)
      return
    }

    if (!supabaseUrl || keys.length === 0) {
      setRecoveryStatus('Configuración incompleta')
      setRecoveryDetail('Falta NEXT_PUBLIC_SUPABASE_URL y al menos una clave pública en .env.local.')
      setRecoveryLoading(false)
      return
    }

    const redirectTo = `${window.location.origin}/reset-password`
    const results: string[] = []

    try {
      for (const item of keys) {
        const response = await fetch(
          `${supabaseUrl}/auth/v1/recover?redirect_to=${encodeURIComponent(redirectTo)}`,
          {
            method: 'POST',
            headers: {
              apikey: item.value,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email: email.trim().toLowerCase() }),
          },
        )

        const text = await response.text()

        if (response.ok) {
          setRecoveryStatus(`Recuperación aceptada - HTTP ${response.status}`)
          setRecoveryDetail(
            `${item.name} Key aceptada por Supabase. El flujo de recuperación ya no está bloqueado por 401. Revisa el correo para continuar con el cambio de contraseña.`,
          )
          setRecoveryLoading(false)
          return
        }

        results.push(`${item.name}: HTTP ${response.status} - ${text || 'Sin detalle'}`)
      }

      setRecoveryStatus('Recuperación rechazada')
      setRecoveryDetail(results.join('\n\n'))
    } catch (error) {
      setRecoveryStatus('Error de conexión')
      setRecoveryDetail(error instanceof Error ? error.message : 'No fue posible probar la recuperación.')
    } finally {
      setRecoveryLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#0B0B0D] px-6 py-12 text-white">
      <section className="mx-auto max-w-2xl rounded-2xl border border-white/10 bg-[#20232A] p-8 shadow-2xl">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#7BAEE3]">NEDVI OS</p>
        <h1 className="mt-3 text-3xl font-semibold">Diagnóstico de Supabase</h1>
        <p className="mt-3 text-sm text-[#9CA3AF]">Prueba automáticamente las claves públicas configuradas y el flujo real de recuperación de contraseña.</p>

        <div className="mt-8 space-y-4 rounded-xl border border-white/10 bg-black/20 p-5 text-sm">
          <div>
            <span className="text-[#9CA3AF]">URL del proyecto:</span>
            <p className="mt-1 break-all font-mono">{supabaseUrl || 'No configurada'}</p>
          </div>
          <div>
            <span className="text-[#9CA3AF]">Clave publicable:</span>
            <p className="mt-1 break-all font-mono">{mask(publishableKey)}</p>
          </div>
          <div>
            <span className="text-[#9CA3AF]">Clave anónima heredada:</span>
            <p className="mt-1 break-all font-mono">{mask(legacyAnonKey)}</p>
          </div>
          <div>
            <span className="text-[#9CA3AF]">Estado:</span>
            <p className="mt-1 font-semibold">{status}</p>
          </div>
          {detail && (
            <div>
              <span className="text-[#9CA3AF]">Detalle:</span>
              <pre className="mt-1 whitespace-pre-wrap break-words font-mono text-xs">{detail}</pre>
            </div>
          )}
        </div>

        <button type="button" onClick={runCheck} disabled={loading} className="mt-6 w-full rounded-xl bg-[#7BAEE3] px-4 py-3 font-semibold text-[#0B0B0D] transition hover:opacity-90 disabled:opacity-50">
          {loading ? 'Probando conexión...' : 'Probar conexión con Supabase'}
        </button>

        <div className="mt-8 rounded-xl border border-white/10 bg-black/20 p-5">
          <h2 className="text-lg font-semibold">Prueba real de cambio de contraseña</h2>
          <p className="mt-2 text-sm text-[#9CA3AF]">
            Esta prueba solicita a Supabase un correo real de recuperación. No cambia tu contraseña automáticamente.
          </p>

          <label className="mt-5 block text-sm text-[#9CA3AF]" htmlFor="recovery-email">
            Correo del usuario
          </label>
          <input
            id="recovery-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="usuario@nedviconstructora.com"
            className="mt-2 w-full rounded-xl border border-white/10 bg-[#111318] px-4 py-3 text-white outline-none ring-0 placeholder:text-[#6B7280] focus:border-[#7BAEE3]"
          />

          <button
            type="button"
            onClick={runRecoveryCheck}
            disabled={recoveryLoading}
            className="mt-4 w-full rounded-xl bg-white px-4 py-3 font-semibold text-[#0B0B0D] transition hover:opacity-90 disabled:opacity-50"
          >
            {recoveryLoading ? 'Probando recuperación...' : 'Probar recuperación de contraseña'}
          </button>

          <div className="mt-5 text-sm">
            <span className="text-[#9CA3AF]">Resultado:</span>
            <p className="mt-1 font-semibold">{recoveryStatus}</p>
            {recoveryDetail && (
              <pre className="mt-2 whitespace-pre-wrap break-words font-mono text-xs">{recoveryDetail}</pre>
            )}
          </div>
        </div>
      </section>
    </main>
  )
}
