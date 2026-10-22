'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { Download, RefreshCw, WifiOff, X } from 'lucide-react'

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

async function navigateToFreshApp(version: string) {
  // Clear legacy Cache Storage entries before switching to a new deployment.
  // This does not touch localStorage, sessionStorage, login credentials or data.
  if ('caches' in window) {
    try {
      const keys = await window.caches.keys()
      await Promise.all(keys.map((key) => window.caches.delete(key)))
    } catch (error) {
      console.warn('No se pudo limpiar la caché antigua de NEDVI OS:', error)
    }
  }
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.getRegistration()
      await registration?.update()
    } catch (error) {
      console.warn('No se pudo actualizar el Service Worker de NEDVI OS:', error)
    }
  }
  const url = new URL(window.location.href)
  url.searchParams.set('nedvi_version', version.slice(0, 12))
  window.location.replace(url.toString())
}

export function PwaManager({ initialVersion }: { initialVersion: string }) {
  const pathname = usePathname()
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null)
  const [online, setOnline] = useState(true)
  const [dismissed, setDismissed] = useState(false)
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [latestVersion, setLatestVersion] = useState('')
  const [manualStatus, setManualStatus] = useState('')
  const [manualChecking, setManualChecking] = useState(false)
  const [standalone, setStandalone] = useState(false)
  const editingRef = useRef(false)

  useEffect(() => {
    setOnline(navigator.onLine)
    setStandalone(window.matchMedia('(display-mode: standalone)').matches)

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
    // Form edits postpone automatic updates to avoid discarding unsaved work.
    // A completed client-side navigation means the previous form is gone;
    // allow the latest deployed version to load on the new screen.
    editingRef.current = false
    sessionStorage.removeItem('nedvi-auto-update-' + initialVersion)

    let cancelled = false
    let pendingVersion = ''
    let reloadScheduled = false
    let checking = false
    const checkVersion = async () => {
      if (checking || !navigator.onLine || document.visibilityState === 'hidden') return
      checking = true
      try {
        // Ask the browser to fetch the latest Service Worker, not a cached copy.
        const registration = await navigator.serviceWorker?.getRegistration()
        await registration?.update().catch(() => undefined)
        const response = await fetch(`/api/app-version?check=${Date.now()}`, {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache' },
        })
        if (!response.ok) return
        const data = (await response.json()) as { version?: string }
        if (cancelled || !data.version || data.version === 'development' || data.version === initialVersion) return
        pendingVersion = data.version
        setLatestVersion(data.version)
        setUpdateAvailable(true)
        attemptUpdate()
      } catch {
        // Keep the current app usable when connectivity is interrupted.
      } finally {
        checking = false
      }
    }

    const editingNow = () => {
      const element = document.activeElement
      if (!(element instanceof HTMLElement)) return false
      return element.matches('input, textarea, select, [contenteditable="true"]')
    }

    const attemptUpdate = () => {
      if (!pendingVersion || cancelled || reloadScheduled || !navigator.onLine || document.visibilityState !== 'visible') return
      // Never interrupt a form after the user has started editing it.
      if (editingRef.current || editingNow()) return
      const guard = 'nedvi-auto-update-' + pendingVersion
      const lastAttempt = Number(sessionStorage.getItem(guard) || 0)
      // Prevent a redirect loop, while allowing another attempt after a failed update.
      if (lastAttempt && Date.now() - lastAttempt < 5 * 60_000) return
      sessionStorage.setItem(guard, String(Date.now()))
      reloadScheduled = true
      void navigateToFreshApp(pendingVersion)
    }

    const onEdit = (event: Event) => {
      const target = event.target
      if (target instanceof HTMLElement && target.closest('form, [contenteditable="true"]')) editingRef.current = true
    }
    const onReset = () => { editingRef.current = false; attemptUpdate() }
    const onBlur = () => attemptUpdate()
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        void checkVersion()
        attemptUpdate()
      }
    }
    const onFocus = () => void checkVersion()
    document.addEventListener('input', onEdit, true)
    document.addEventListener('change', onEdit, true)
    document.addEventListener('reset', onReset, true)
    document.addEventListener('focusout', onBlur, true)
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('focus', onFocus)
    window.addEventListener('online', onFocus)
    const interval = window.setInterval(() => void checkVersion(), 30_000)
    void checkVersion()
    return () => {
      cancelled = true
      window.clearInterval(interval)
      document.removeEventListener('input', onEdit, true)
      document.removeEventListener('change', onEdit, true)
      document.removeEventListener('reset', onReset, true)
      document.removeEventListener('focusout', onBlur, true)
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('focus', onFocus)
      window.removeEventListener('online', onFocus)
    }
  }, [initialVersion, pathname])

  async function manualCheck() {
    if (manualChecking) return
    if (!navigator.onLine) {
      setManualStatus('No hay conexión para comprobar actualizaciones.')
      return
    }
    setManualChecking(true)
    setManualStatus('Buscando versión publicada...')
    try {
      const registration = await navigator.serviceWorker?.getRegistration()
      await registration?.update()
      const response = await fetch('/api/app-version?manual=' + Date.now(), {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' },
      })
      if (!response.ok) throw new Error('La comprobación no está disponible')
      const data = (await response.json()) as { version?: string }
      if (!data.version || data.version === 'development') {
        setManualStatus('El servidor no informó una versión publicada.')
      } else if (data.version !== initialVersion) {
        setLatestVersion(data.version)
        setUpdateAvailable(true)
        setManualStatus('Nueva versión disponible. Pulsa Actualizar app.')
      } else {
        setManualStatus('NEDVI OS ya está en la última versión publicada.')
      }
    } catch {
      setManualStatus('No fue posible comprobar la versión. Inténtalo de nuevo.')
    } finally {
      setManualChecking(false)
    }
  }

  async function installApp() {
    if (!installPrompt) return
    await installPrompt.prompt()
    const choice = await installPrompt.userChoice
    if (choice.outcome === 'accepted') setInstallPrompt(null)
  }

  return (
    <>
      {standalone ? (
        <div className="fixed bottom-4 left-4 z-[80] flex max-w-[calc(100vw-2rem)] items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-2 py-2 text-[var(--foreground)] shadow-lg">
          <button type="button" onClick={() => void manualCheck()} disabled={manualChecking} className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold hover:bg-[var(--surface-soft)] disabled:opacity-60">
            <RefreshCw size={15} className={manualChecking ? 'animate-spin' : ''} />
            {manualChecking ? 'Comprobando...' : 'Buscar actualización'}
          </button>
          {manualStatus ? <span role="status" className="max-w-56 text-xs text-[var(--muted)]">{manualStatus}</span> : null}
        </div>
      ) : null}
      {updateAvailable ? (
        <div role="status" className="fixed inset-x-3 top-3 z-[100] mx-auto flex max-w-md items-center gap-3 rounded-2xl border border-[#5496CC]/40 bg-[var(--surface)] p-3 text-sm text-[var(--foreground)] shadow-2xl">
          <RefreshCw size={20} className="shrink-0 text-[#5496CC]" />
          <span className="min-w-0 flex-1">Hay una nueva versión de NEDVI OS disponible.</span>
          <button type="button" onClick={() => void navigateToFreshApp(latestVersion || String(Date.now()))} className="rounded-xl bg-[#5496CC] px-3 py-2 text-xs font-semibold text-white">
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
