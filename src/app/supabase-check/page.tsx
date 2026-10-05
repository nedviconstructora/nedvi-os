'use client'

import { useState } from 'react'

export default function SupabaseCheckPage() {
  const [status, setStatus] = useState<string>('Sin probar')
  const [detail, setDetail] = useState<string>('')
  const [loading, setLoading] = useState(false)

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || ''
  const legacyAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

  const keys = [
    { name: 'Publishable', value: publishableKey },
    { name: 'Legacy anon', value: legacyAnonKey },
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

  return (
    <main className="min-h-screen bg-[#0B0B0D] px-6 py-12 text-white">
      <section className="mx-auto max-w-2xl rounded-2xl border border-white/10 bg-[#20232A] p-8 shadow-2xl">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#7BAEE3]">NEDVI OS</p>
        <h1 className="mt-3 text-3xl font-semibold">Diagnóstico de Supabase</h1>
        <p className="mt-3 text-sm text-[#9CA3AF]">Prueba automáticamente las claves públicas configuradas sin mostrarlas completas.</p>

        <div className="mt-8 space-y-4 rounded-xl border border-white/10 bg-black/20 p-5 text-sm">
          <div>
            <span className="text-[#9CA3AF]">Project URL:</span>
            <p className="mt-1 break-all font-mono">{supabaseUrl || 'No configurada'}</p>
          </div>
          <div>
            <span className="text-[#9CA3AF]">Publishable Key:</span>
            <p className="mt-1 break-all font-mono">{mask(publishableKey)}</p>
          </div>
          <div>
            <span className="text-[#9CA3AF]">Legacy anon Key:</span>
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
      </section>
    </main>
  )
}
