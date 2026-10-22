'use client'

import { useEffect, useState } from 'react'
import { ArrowLeft, ArrowUpRight, Download, RefreshCw, ShieldCheck } from 'lucide-react'

const OFFICIAL_URL = 'https://nedvi-os.vercel.app'
const SURVEYS_KEY = 'nedvi_site_surveys'

type ReleaseInfo = { version?: string; productionUrl?: string | null }

async function readServerVersion(): Promise<string> {
  const response = await fetch('/api/app-version?repair=' + Date.now(), {
    cache: 'no-store',
    headers: { 'Cache-Control': 'no-cache', Accept: 'application/json' },
  })
  if (!response.ok || !response.headers.get('content-type')?.includes('application/json')) {
    throw new Error('No se pudo consultar la versión del servidor. Comprueba tu conexión y el dominio.')
  }
  const info = (await response.json()) as ReleaseInfo
  if (!info.version || info.version === 'development') {
    throw new Error('El servidor no informó una versión válida. Inténtalo desde el dominio oficial.')
  }
  return info.version
}

export default function ActualizarNedviPage() {
  const [origin, setOrigin] = useState('')
  const [version, setVersion] = useState('')
  const [surveyCount, setSurveyCount] = useState<number | null>(null)
  const [installed, setInstalled] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const official = origin === OFFICIAL_URL

  useEffect(() => {
    setOrigin(window.location.origin)
    setInstalled(window.matchMedia('(display-mode: standalone)').matches)
    try {
      const raw = window.localStorage.getItem(SURVEYS_KEY)
      if (!raw) setSurveyCount(0)
      else {
        const parsed = JSON.parse(raw) as unknown
        setSurveyCount(Array.isArray(parsed) ? parsed.length : null)
      }
    } catch {
      setSurveyCount(null)
    }
    void readServerVersion().then(setVersion).catch((error: unknown) => {
      setMessage(error instanceof Error ? error.message : 'No se pudo comprobar la versión.')
    })
  }, [])

  function exportSurveys() {
    try {
      const raw = window.localStorage.getItem(SURVEYS_KEY)
      if (!raw) {
        setMessage('Esta instalación no tiene levantamientos locales para respaldar.')
        return
      }
      const blob = new Blob([raw], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = 'nedvi-levantamientos-respaldo.json'
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
      setMessage('Se descargó un respaldo de los levantamientos de esta instalación.')
    } catch {
      setMessage('No se pudo exportar el respaldo. Conserva esta instalación sin borrar sus datos.')
    }
  }

  async function repairApp() {
    if (busy) return
    if (window.location.origin !== OFFICIAL_URL) {
      setMessage('Esta instalación no está en el dominio oficial. Abre la dirección oficial antes de actualizar. No desinstales todavía la aplicación anterior.')
      return
    }

    setBusy(true)
    setMessage('Consultando versión y renovando los recursos de la aplicación...')
    try {
      const nextVersion = await readServerVersion()
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations()
        await Promise.allSettled(registrations.map(async (registration) => {
          await registration.update().catch(() => undefined)
          await registration.unregister()
        }))
      }
      if ('caches' in window) {
        const cacheNames = await window.caches.keys()
        await Promise.all(cacheNames.map((name) => window.caches.delete(name)))
      }
      // Do not touch localStorage or sessionStorage: customer drafts, survey
      // attachments, preferences and login state must remain intact.
      const destination = new URL('/dashboard', window.location.origin)
      destination.searchParams.set('nedvi_version', nextVersion.slice(0, 12))
      destination.searchParams.set('actualizado', String(Date.now()))
      window.location.replace(destination.toString())
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No se pudo completar la actualización. Conserva tus datos e inténtalo nuevamente.')
      setBusy(false)
    }
  }

  return (
    <main className="min-h-screen bg-[var(--background)] px-4 py-10 text-[var(--foreground)] sm:py-16">
      <div className="mx-auto max-w-2xl space-y-6">
        <a href="/dashboard" className="inline-flex items-center gap-2 text-sm font-semibold text-[#5496CC] hover:underline">
          <ArrowLeft size={16} /> Volver a NEDVI OS
        </a>
        <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-lg sm:p-9">
          <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-[#5496CC]">
            <ShieldCheck size={17} /> Centro de actualización
          </div>
          <h1 className="mt-3 text-3xl font-bold tracking-tight">Recuperar la última versión</h1>
          <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
            Soluciona una pantalla desactualizada en Chrome o en la aplicación instalada de Windows.
            Este procedimiento renueva el Service Worker y la caché; no elimina los datos de localStorage.
          </p>
          <div className="mt-6 space-y-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] p-4 text-sm">
            <p><strong>Dominio actual:</strong> <span className="break-all">{origin || 'Comprobando...'}</span></p>
            <p><strong>Dominio oficial:</strong> {OFFICIAL_URL}</p>
            <p><strong>Versión publicada:</strong> {version ? version.slice(0, 12) : 'Consultando...'}</p>
            <p><strong>Modo:</strong> {installed ? 'Aplicación instalada' : 'Navegador'}</p>
            <p><strong>Levantamientos locales:</strong> {surveyCount === null ? 'No determinado' : surveyCount}</p>
          </div>
          {origin && !official ? (
            <div role="alert" className="mt-5 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm leading-6">
              <strong>Esta instalación usa otra dirección.</strong> Una app instalada desde un despliegue antiguo no recibe las publicaciones del dominio oficial.
              Abre el sitio oficial, pero conserva tu instalación anterior si allí tienes registros locales.
              <a href={OFFICIAL_URL} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 font-bold text-[#5496CC] underline">
                Abrir dominio oficial <ArrowUpRight size={15} />
              </a>
            </div>
          ) : null}
          <button type="button" onClick={() => void repairApp()} disabled={!origin || !official || busy} className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#267ec5] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#166cad] disabled:cursor-not-allowed disabled:opacity-50">
            <RefreshCw size={17} className={busy ? 'animate-spin' : ''} />
            {busy ? 'Actualizando recursos...' : 'Actualizar esta instalación sin borrar datos'}
          </button>
          <p className="mt-3 text-xs leading-5 text-[var(--muted)]">
            Cierra cualquier formulario sin guardar antes de actualizar. Si la app está instalada desde otro dominio,
            no la borres hasta respaldar los registros.
          </p>
          <button type="button" onClick={exportSurveys} className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-lg border border-[var(--border)] px-4 py-2 text-xs font-semibold hover:bg-[var(--surface-soft)]">
            <Download size={15} /> Respaldar levantamientos de este dispositivo
          </button>
          {message ? <p role="status" className="mt-4 rounded-xl bg-[var(--surface-soft)] p-3 text-sm">{message}</p> : null}
        </div>
      </div>
    </main>
  )
}
