'use client'

import { useEffect, useState } from 'react'
import { Download, RefreshCw, WifiOff, X } from 'lucide-react'

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

export function PwaManager({ initialVersion }: { initialVersion: string }) {
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null)
  const [online, setOnline] = useState(true)
  const [dismissed, setDismissed] = useState(false)
  const [updateAvailable, setUpdateAvailable] = useState(false)

  useEffect(() => {
    setOnline(navigator.onLine)

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch((error) => {
        console.error('No se pudo registrar el Service Worker de NEDVI OS:', error)
      })
    }

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault()
      setInstallPrompt(event as InstallPromptEvent)
    }

    const handleOnline = () => setOnline(true)
    const handleOffline = () => setOnline(false)
    const handleInstalled = () => setInstallPrompt(null)

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleInstalled)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleInstalled)
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  useEffect(() => {
    if (initialVersion === 'development') return

    let cancelled = false
    const checkVersion = async () => {
      if (!navigator.onLine || document.visibilityState === 'hidden') return
      try {
        const response = await fetch('/api/app-version', { cache: 'no-store' })
        if (!response.ok) return
        const data = (await response.json()) as { version?: string }
        if (!cancelled && data.version && data.version !== 'development' && data.version !== initialVersion) {
          setUpdateAvailable(true)
        }
      } catch {
        // Keep the current app usable when connectivity is interrupted.
      }
    }

    void checkVersion()
    const interval = window.setInterval(() => void checkVersion(), 60_000)
    const onVisibility = () => { if (document.visibilityState === 'visible') void checkVersion() }
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      cancelled = true
      window.clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [initialVersion])

  async function installApp() {
    if (!installPrompt) return
    await installPrompt.prompt()
    const choice = await installPrompt.userChoice
    if (choice.outcome === 'accepted') setInstallPrompt(null)
  }

  return (
    <>
      {updateAvailable ? (
        <div role="status" className="fixed inset-x-3 top-3 z-[100] mx-auto flex max-w-md items-center gap-3 rounded-2xl border border-[#5496CC]/40 bg-[var(--surface)] p-3 text-sm text-[var(--foreground)] shadow-2xl">
          <RefreshCw size={20} className="shrink-0 text-[#5496CC]" />
          <span className="min-w-0 flex-1">Hay una nueva versión de NEDVI OS disponible.</span>
          <button type="button" onClick={() => window.location.reload()} className="rounded-xl bg-[#5496CC] px-3 py-2 text-xs font-semibold text-white">
            Actualizar app
          </button>
        </div>
      ) : null}
      {!online ? (
        <div className="fixed inset-x-3 bottom-[max(12px,env(safe-area-inset-bottom))] z-[90] mx-auto flex max-w-md items-center gap-3 rounded-2xl border border-amber-500/25 bg-[var(--surface)] p-3 text-sm text-[var(--foreground)] shadow-2xl">
          <WifiOff size={18} className="shrink-0 text-amber-500" />
          <span className="min-w-0 flex-1">Sin conexión. Algunos datos pueden no estar disponibles.</span>
        </div>
      ) : null}

      {installPrompt && !dismissed ? (
        <div className="fixed inset-x-3 bottom-[max(12px,env(safe-area-inset-bottom))] z-[89] mx-auto flex max-w-md items-center gap-3 rounded-2xl border border-[#5496CC]/30 bg-[var(--surface)] p-3 shadow-2xl sm:inset-x-auto sm:right-5 sm:w-[390px]">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#5496CC]/10 text-[#5496CC]">
            <Download size={18} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-[var(--foreground)]">Instalar NEDVI OS</p>
            <p className="mt-0.5 text-xs text-[var(--muted)]">Agrégala a tu pantalla de inicio y úsala como app.</p>
          </div>
          <button
            type="button"
            onClick={() => void installApp()}
            className="rounded-xl bg-[#5496CC] px-3 py-2 text-xs font-semibold text-white"
          >
            Instalar
          </button>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="rounded-lg p-1.5 text-[var(--muted)] hover:bg-[var(--surface-soft)]"
            aria-label="Cerrar sugerencia de instalación"
          >
            <X size={15} />
          </button>
        </div>
      ) : null}
    </>
  )
}
