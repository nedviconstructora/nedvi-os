'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Bell,
  Camera,
  LoaderCircle,
  LogOut,
  Menu,
  TriangleAlert,
  Moon,
  RefreshCw,
  Search,
  Sun,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { alerts } from '@/data/dashboardData'
import {
  AGENDA_STORAGE_KEY,
  AGENDA_UPDATED_EVENT,
  readAgendaActivities,
  loadAgendaActivities,
  sortAgendaActivities,
  type AgendaItem,
} from '@/features/agenda/services/agendaStorage'
import { clearAccessSession, type AccessSession } from '@/features/access/services/accessStorage'

type HeaderProps = {
  onOpenMenu: () => void
  isDark: boolean
  onToggleTheme: () => void
  showCompanyLogo?: boolean
  user: AccessSession
}

function BrandMark() {
  return (
    <span className="nedvi-header-brand-mark flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-[9px] bg-white/10 p-1">
      <img src="/logo-blanco.svg" alt="" aria-hidden="true" className="h-full w-full object-contain" />
    </span>
  )
}

export function Header({ onOpenMenu, isDark, onToggleTheme, showCompanyLogo = false, user }: HeaderProps) {
  const router = useRouter()
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | 'unsupported'>('default')
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [pushEnabled, setPushEnabled] = useState(false)
  const [pushWorking, setPushWorking] = useState(false)
  const [internalNotifications, setInternalNotifications] = useState<Array<{ id: string; title: string; body: string; target_path: string; created_at: string; read_at: string | null }>>([])
  const [internalUserId, setInternalUserId] = useState<string | null>(null)
  const [notificationError, setNotificationError] = useState<string | null>(null)
  const [loadingNotifications, setLoadingNotifications] = useState(false)
  const [agendaItems, setAgendaItems] = useState<AgendaItem[]>([])
  const [refreshing, setRefreshing] = useState(false)
  const avatarInputRef = useRef<HTMLInputElement | null>(null)
  const notificationsRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    let active = true

    async function loadAvatar() {
      const supabase = createClient()
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser()

      if (!authUser) return

      const { data } = await supabase
        .from('profiles')
        .select('avatar_url')
        .eq('id', authUser.id)
        .maybeSingle()

      if (active) setAvatarUrl(data?.avatar_url ?? null)
    }

    void loadAvatar()

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (typeof Notification === 'undefined') {
      setNotificationPermission('unsupported')
      return
    }

    setNotificationPermission(Notification.permission)
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      void navigator.serviceWorker.ready.then(async registration => {
        const subscription = await registration.pushManager.getSubscription()
        setPushEnabled(Boolean(subscription && Notification.permission === 'granted'))
      }).catch(error => console.warn('Push registration status unavailable:', error))
    }
  }, [])

  useEffect(() => {
    let active = true
    let fetching = false
    const loadLocal = () => { if (active) setAgendaItems(readAgendaActivities()) }
    const refreshSharedAgenda = async () => {
      if (!active || fetching || document.hidden) return
      fetching = true
      try {
        const shared = await loadAgendaActivities()
        if (active) setAgendaItems(shared)
      } catch (error) {
        console.warn('Agenda temporalmente sin conexión:', error)
        loadLocal()
      } finally { fetching = false }
    }
    const onStorage = (event: StorageEvent) => {
      if (event.key === AGENDA_STORAGE_KEY) loadLocal()
    }
    const onFocus = () => { loadLocal(); void refreshSharedAgenda() }
    const onVisibility = () => { if (!document.hidden) void refreshSharedAgenda() }

    loadLocal()
    void refreshSharedAgenda()
    const interval = window.setInterval(() => void refreshSharedAgenda(), 60000)
    window.addEventListener('storage', onStorage)
    window.addEventListener('focus', onFocus)
    window.addEventListener(AGENDA_UPDATED_EVENT, loadLocal)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      active = false
      window.clearInterval(interval)
      window.removeEventListener('storage', onStorage)
      window.removeEventListener('focus', onFocus)
      window.removeEventListener(AGENDA_UPDATED_EVENT, loadLocal)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])

  useEffect(() => {
    function handlePointerDown(event: MouseEvent | TouchEvent) {
      if (!notificationsRef.current) return
      if (!notificationsRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('touchstart', handlePointerDown)

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('touchstart', handlePointerDown)
    }
  }, [])

  useEffect(() => {
    if (user.role === 'Cliente') return
    let active = true
    let fetching = false
    let uid: string | null = null
    let ready = false
    let seen = new Set<string>()
    const supabase = createClient()
    const refresh = async () => {
      if (!active || !uid || fetching || document.hidden) return
      fetching = true
      setLoadingNotifications(true)
      try {
        const { data, error } = await supabase.from('internal_notifications')
          .select('id,title,body,target_path,created_at,read_at')
          .eq('recipient_id', uid)
          .order('created_at', { ascending: false }).limit(50)
        if (error) throw error
        if (!active) return
        const rows = data ?? []
        setInternalNotifications(rows)
        setNotificationError(null)
        // New messages only: do not show desktop banners for the old backlog.
        if (ready && typeof Notification !== 'undefined' && Notification.permission === 'granted') {
          const fresh = rows.filter(item => !item.read_at && !seen.has(item.id)).slice(0, 2)
          for (const notice of fresh) {
            try {
              if ('serviceWorker' in navigator) {
                const sw = await navigator.serviceWorker.getRegistration()
                if (sw) {
                  await sw.showNotification(notice.title, {
                    body: notice.body, icon: '/icon.png',
                    tag: 'nedvi-internal-' + notice.id,
                  })
                  continue
                }
              }
              new Notification(notice.title, { body: notice.body, icon: '/icon.png' })
            } catch (e) { console.warn('No se pudo presentar un aviso del sistema:', e) }
          }
        }
        ready = true
        seen = new Set(rows.map(item => item.id))
      } catch (error) {
        console.error('Error al leer notificaciones:', error)
        if (active) setNotificationError('No se pudieron consultar los avisos. Comprueba tu conexión.')
      } finally {
        fetching = false
        if (active) setLoadingNotifications(false)
      }
    }
    const onRefresh = () => void refresh()
    const onVisible = () => { if (!document.hidden) void refresh() }
    const timer = window.setInterval(onRefresh, 15000)
    window.addEventListener('nedvi-notifications-refresh', onRefresh)
    window.addEventListener('focus', onRefresh)
    document.addEventListener('visibilitychange', onVisible)
    void supabase.auth.getUser().then(({ data, error }) => {
      if (!active) return
      if (error || !data.user) {
        setNotificationError('Inicia sesión nuevamente para ver los avisos.')
        return
      }
      uid = data.user.id
      setInternalUserId(uid)
      void refresh()
    }).catch(error => {
      console.error('Error de sesión:', error)
      if (active) setNotificationError('No se pudo comprobar tu sesión de notificaciones.')
    })
    return () => {
      active = false
      window.clearInterval(timer)
      window.removeEventListener('nedvi-notifications-refresh', onRefresh)
      window.removeEventListener('focus', onRefresh)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [user.role])

  async function markInternalRead(id: string) {
    if (!internalUserId) return
    const supabase = createClient()
    const { error } = await supabase.from('internal_notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('id', id).eq('recipient_id', internalUserId)
    if (!error) setInternalNotifications((items) => items.map((item) => item.id === id ? { ...item, read_at: new Date().toISOString() } : item))
  }

  async function markAllInternalRead() {
    if (!internalUserId) return
    const supabase = createClient()
    const { error } = await supabase.from('internal_notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('recipient_id', internalUserId).is('read_at', null)
    if (!error) setInternalNotifications((items) => items.map((item) => ({ ...item, read_at: item.read_at ?? new Date().toISOString() })))
  }

  const pendingAgenda = useMemo(
    () =>
      sortAgendaActivities(agendaItems)
        .filter((item) => item.status !== 'Completada')
        .slice(0, 5),
    [agendaItems],
  )

  const unreadInternal = internalNotifications.filter((item) => !item.read_at).length
  // Badge: only unread personal notifications, not unacknowledgeable agenda tasks.
  const notificationCount = unreadInternal

  function formatAgendaDate(item: AgendaItem) {
    const value = new Date(`${item.date}T${item.time}:00`)
    if (Number.isNaN(value.getTime())) return `${item.date} ${item.time}`

    return new Intl.DateTimeFormat('es-MX', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }).format(value)
  }

  async function refreshApp() {
    if (refreshing) return

    setRefreshing(true)

    try {
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations()

        await Promise.all(
          registrations.map(async (registration) => {
            try {
              await registration.update()
            } catch (error) {
              console.warn('No se pudo comprobar una actualización del Service Worker:', error)
            }
          }),
        )

        const waitingWorker = registrations
          .map((registration) => registration.waiting)
          .find(Boolean)

        if (waitingWorker) {
          waitingWorker.postMessage({ type: 'SKIP_WAITING' })
          await new Promise((resolve) => setTimeout(resolve, 350))
        }
      }

      window.location.reload()
    } catch (error) {
      console.error('Error actualizando NEDVI OS:', error)
      window.location.reload()
    }
  }

  async function enableNotifications() {
    if (pushWorking || user.role === 'Cliente') return
    if (typeof Notification === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      window.alert('Este dispositivo o navegador no admite notificaciones Push.')
      return
    }
    if (Notification.permission === 'denied') {
      window.alert('Los avisos están bloqueados. Habilítalos desde los permisos del navegador o del teléfono.')
      setNotificationPermission('denied')
      return
    }
    setPushWorking(true)
    try {
      // Permission must be requested directly from the user's click (iOS).
      const permission = Notification.permission === 'granted'
        ? 'granted' : await Notification.requestPermission()
      setNotificationPermission(permission)
      if (permission !== 'granted') return

      const response = await fetch('/api/notifications/push-subscription', { cache: 'no-store' })
      const config = await response.json() as { configured?: boolean; publicKey?: string; error?: string }
      if (!response.ok || !config.configured || !config.publicKey)
        throw new Error(config.error || 'El servicio Push aún no está configurado.')

      const key = config.publicKey.replace(/-/g, '+').replace(/_/g, '/')
      const padded = key.padEnd(Math.ceil(key.length / 4) * 4, '=')
      const bytes = Uint8Array.from(atob(padded), char => char.charCodeAt(0))
      const registration = await navigator.serviceWorker.ready
      const existing = await registration.pushManager.getSubscription()
      const subscription = existing || await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: bytes,
      })
      const saved = await fetch('/api/notifications/push-subscription', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        cache: 'no-store', body: JSON.stringify(subscription.toJSON()),
      })
      if (!saved.ok) {
        const data = await saved.json().catch(() => null) as { error?: string } | null
        throw new Error(data?.error || 'No fue posible guardar este teléfono.')
      }
      setPushEnabled(true)
      await registration.showNotification('NEDVI OS · Push activado', {
        body: 'Este dispositivo ya puede recibir avisos con la aplicación cerrada.',
        icon: '/icon.png', badge: '/icon.png', tag: 'nedvi-push-enabled',
      })
    } catch (error) {
      console.error('No se pudieron activar las notificaciones Push:', error)
      window.alert(error instanceof Error ? error.message : 'No fue posible activar Push.')
    } finally { setPushWorking(false) }
  }

  async function sendTestPush() {
    if (pushWorking) return
    setPushWorking(true)
    try {
      const response = await fetch('/api/notifications/push-test', { method: 'POST' })
      const body = await response.json().catch(() => null) as { error?: string; message?: string } | null
      if (!response.ok) throw new Error(body?.error || 'No se pudo enviar la prueba.')
      window.alert(body?.message || 'Prueba solicitada. Revisa tus notificaciones.')
      window.dispatchEvent(new Event('nedvi-notifications-refresh'))
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'No se pudo enviar la prueba.')
    } finally { setPushWorking(false) }
  }

  async function disablePush() {
    if (pushWorking || !('serviceWorker' in navigator)) return
    setPushWorking(true)
    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()
      if (subscription) {
        const response = await fetch('/api/notifications/push-subscription', {
          method: 'DELETE', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        })
        if (!response.ok) throw new Error('No se pudo eliminar el registro del dispositivo.')
        await subscription.unsubscribe()
      }
      setPushEnabled(false)
    } catch (error) {
      console.error('Error desactivando notificaciones Push:', error)
      window.alert(error instanceof Error ? error.message : 'No fue posible desactivar Push.')
    } finally { setPushWorking(false) }
  }

  async function logoutAndUnsubscribePush() {
    // Leaving a shared phone must not leave behind an active subscription
    // receiving internal messages for the previous account.
    try {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.getRegistration()
        const subscription = await registration?.pushManager.getSubscription()
        if (subscription) {
          try {
            await fetch('/api/notifications/push-subscription', {
              method: 'DELETE',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ endpoint: subscription.endpoint }),
              signal: AbortSignal.timeout(3000),
            })
          } catch (error) {
            console.warn('Remote push unregister failed; unsubscribing device locally:', error)
          }
          await subscription.unsubscribe()
        }
      }
    } catch (error) {
      console.warn('Could not fully revoke this device push subscription:', error)
    } finally {
      setPushEnabled(false)
      clearAccessSession()
      router.replace('/login')
    }
  }

  async function handleAvatarUpload(file?: File) {
    if (!file) return

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      window.alert('Usa una imagen JPG, PNG o WEBP.')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      window.alert('La imagen debe pesar menos de 5 MB.')
      return
    }

    setUploadingAvatar(true)

    try {
      const supabase = createClient()
      const {
        data: { user: authUser },
        error: authError,
      } = await supabase.auth.getUser()

      if (authError || !authUser) throw new Error('No encontramos tu sesión.')

      const extension =
        file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg'
      const path = `${authUser.id}/avatar.${extension}`

      const { error: uploadError } = await supabase.storage
        .from('profile-avatars')
        .upload(path, file, {
          cacheControl: '3600',
          upsert: true,
          contentType: file.type,
        })

      if (uploadError) throw uploadError

      const { data: publicData } = supabase.storage
        .from('profile-avatars')
        .getPublicUrl(path)

      const avatarUrlWithVersion = `${publicData.publicUrl}?v=${Date.now()}`

      const response = await fetch('/api/access/avatar', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify({ avatarUrl: avatarUrlWithVersion }),
      })

      const result = (await response.json()) as { avatarUrl?: string; error?: string }
      if (!response.ok || !result.avatarUrl) {
        throw new Error(result.error || 'No pudimos guardar tu foto.')
      }

      setAvatarUrl(result.avatarUrl)
    } catch (error) {
      console.error('Error subiendo foto de perfil:', error)
      window.alert(error instanceof Error ? error.message : 'No pudimos subir la foto de perfil.')
    } finally {
      setUploadingAvatar(false)
      if (avatarInputRef.current) avatarInputRef.current.value = ''
    }
  }

  return (
    <header className="nedvi-app-header flex h-[60px] shrink-0 items-center justify-between gap-1 border-b px-2.5 text-white backdrop-blur-xl transition-colors duration-300 sm:h-[88px] sm:gap-2 sm:px-8">
      <div className="flex min-w-0 items-center gap-2 sm:gap-4">
        <button
          type="button"
          onClick={onOpenMenu}
          className="nedvi-header-action flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-white transition hover:bg-white/20 lg:hidden"
          aria-label="Abrir navegación"
        >
          <Menu size={23} strokeWidth={1.8} />
        </button>

        <div className="flex min-w-0 items-center gap-1.5 lg:hidden sm:gap-2.5">
          <BrandMark />
          <span className="nedvi-header-title truncate text-[14px] font-semibold tracking-[-0.04em] text-white sm:text-[15px]">
            NEDVI <span className="font-normal text-[#9ED2F8]">OS</span>
          </span>
        </div>

        <div className="nedvi-header-search relative hidden w-[min(360px,32vw)] md:block">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-white/55" size={19} strokeWidth={1.8} />
          <input
            type="search"
            placeholder="Buscar en NEDVI OS..."
            className="h-10 w-full rounded-xl border border-white/[0.14] bg-white/[0.08] pl-10 pr-16 text-xs text-white outline-none transition placeholder:text-white/45 hover:border-white/25 hover:bg-white/[0.11] focus:border-[#7DB7E8] focus:ring-4 focus:ring-[#7DB7E8]/10"
            aria-label="Buscar en NEDVI OS"
          />
          <kbd className="absolute right-3 top-1/2 -translate-y-1/2 rounded border border-white/[0.14] px-1.5 py-0.5 text-[10px] text-white/55">
            ⌘ K
          </kbd>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-0 sm:gap-2">
        {showCompanyLogo ? (
          <div className="mr-2 hidden items-center gap-2 sm:flex" aria-label="NEDVI Constructora">
            <span className="flex h-10 w-12 items-center justify-center rounded-xl bg-[#5496CC] p-1.5 shadow-sm">
              <img src="/logo-blanco.svg" alt="NEDVI Constructora" className="h-full w-full object-contain" />
            </span>
            <span className="hidden text-xs font-semibold tracking-[0.08em] text-white xl:block">NEDVI</span>
          </div>
        ) : null}

        <button
          type="button"
          onClick={onToggleTheme}
          className="nedvi-header-action hidden rounded-xl p-2.5 text-[#9ED2F8] transition hover:bg-white/10 hover:text-white sm:inline-flex"
          aria-label={isDark ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
          aria-pressed={isDark}
          title={isDark ? 'Tema claro' : 'Tema oscuro'}
        >
          {isDark ? <Sun size={23} strokeWidth={1.8} /> : <Moon size={23} strokeWidth={1.8} />}
        </button>

        <button
          type="button"
          onClick={() => void refreshApp()}
          disabled={refreshing}
          className="nedvi-header-action hidden rounded-xl p-2.5 text-white/70 transition hover:bg-white/10 hover:text-white disabled:cursor-wait disabled:opacity-60 sm:inline-flex"
          aria-label="Actualizar NEDVI OS"
          title={refreshing ? 'Actualizando...' : 'Actualizar información'}
        >
          <RefreshCw
            size={23}
            strokeWidth={1.8}
            className={refreshing ? 'animate-spin' : undefined}
          />
        </button>



        <div ref={notificationsRef} className="relative">
          <button
            type="button"
            onClick={() => {
              if (!notificationsOpen) window.dispatchEvent(new Event('nedvi-notifications-refresh'))
              setNotificationsOpen(current => !current)
            }}
            className={`nedvi-header-action relative flex h-10 w-10 items-center justify-center rounded-xl transition sm:h-auto sm:w-auto sm:p-2.5 ${
              notificationsOpen
                ? 'bg-white/10 text-[#9ED2F8]'
                : 'text-white/70 hover:bg-white/10 hover:text-white'
            }`}
            aria-label="Abrir notificaciones"
            aria-expanded={notificationsOpen}
            title="Notificaciones"
          >
            <Bell size={23} strokeWidth={1.8} />
            {notificationCount > 0 ? (
              <span className="absolute -right-0.5 -top-0.5 flex min-h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold leading-none text-white ring-2 ring-[var(--surface)]">
                {notificationCount > 9 ? '9+' : notificationCount}
              </span>
            ) : (
              <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-emerald-500 ring-2 ring-[var(--surface)]" />
            )}
          </button>

          {notificationsOpen ? (
            <div className="fixed inset-x-3 top-[65px] z-[100] max-h-[calc(100dvh-155px)] overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl sm:absolute sm:inset-x-auto sm:right-0 sm:top-[calc(100%+12px)] sm:w-[390px]">
              <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-[var(--foreground)]">Notificaciones</p>
                  <p className="mt-0.5 text-[10px] text-[var(--muted)]">
                    {notificationCount > 0
                      ? `${notificationCount} sin leer`
                      : 'Todo al día'}
                  </p>
                </div>
                <button type="button"
                  onClick={() => window.dispatchEvent(new Event('nedvi-notifications-refresh'))}
                  disabled={loadingNotifications}
                  title="Actualizar notificaciones"
                  aria-label="Actualizar notificaciones"
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#5496CC]/10 text-[#5496CC] disabled:opacity-50">
                  <RefreshCw size={17} className={loadingNotifications ? 'animate-spin' : ''} />
                </button>
              </div>

              {notificationError ? <p role="alert" className="border-b border-[var(--border)] px-4 py-3 text-xs text-amber-600">{notificationError}</p> : null}
              {internalNotifications.some((item) => !item.read_at) ? (
                <button type="button" onClick={() => void markAllInternalRead()} className="w-full border-b border-[var(--border)] px-4 py-2 text-right text-xs font-medium text-[#5496CC] hover:bg-[var(--surface-soft)]">
                  Marcar todas como leídas
                </button>
              ) : null}
              <div className="max-h-[58dvh] overflow-y-auto">
                {user.role !== 'Cliente' ? (
                  <div className="border-b border-[var(--border)] p-3">
                    <p className="px-1 pb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">Movimientos de NEDVI</p>
                    {internalNotifications.length === 0 ? (
                      <p className="px-2 py-3 text-xs text-[var(--muted)]">Sin movimientos recientes.</p>
                    ) : (
                      <div className="space-y-1">
                        {internalNotifications.map((item) => (
                          <Link key={item.id} href={item.target_path === '/clients' ? '/crm' : item.target_path} onClick={() => { void markInternalRead(item.id); setNotificationsOpen(false) }} className={`block rounded-xl px-3 py-2.5 hover:bg-[var(--surface-soft)] ${!item.read_at ? 'bg-[#5496CC]/10' : ''}`}>
                            <span className="flex items-center gap-2 text-xs font-semibold text-[var(--foreground)]">
                              {!item.read_at ? <span className="h-2 w-2 rounded-full bg-[#5496CC]" /> : null}
                              {item.title}
                            </span>
                            <span className="mt-1 block text-xs text-[var(--muted)]">{item.body}</span>
                            <span className="mt-1 block text-[10px] text-[var(--muted)]">{new Date(item.created_at).toLocaleString('es-MX')}</span>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                ) : null}
                {alerts.length > 0 ? (
                  <div className="border-b border-[var(--border)] p-3">
                    <p className="px-1 pb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
                      Alertas del sistema
                    </p>
                    <div className="space-y-2">
                      {alerts.map((alert) => (
                        <div
                          key={alert.title}
                          className="flex gap-3 rounded-xl bg-[var(--surface-soft)] p-3"
                        >
                          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500">
                            <TriangleAlert size={15} />
                          </span>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-[var(--foreground)]">{alert.title}</p>
                            <p className="mt-1 text-[10px] leading-4 text-[var(--muted)]">{alert.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div className="p-3">
                  <p className="px-1 pb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
                    Agenda
                  </p>

                  {pendingAgenda.length > 0 ? (
                    <div className="space-y-1">
                      {pendingAgenda.map((item) => (
                        <Link
                          key={item.id}
                          href="/agenda"
                          onClick={() => setNotificationsOpen(false)}
                          className="flex items-start gap-3 rounded-xl px-3 py-2.5 transition hover:bg-[var(--surface-soft)]"
                        >
                          <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#5496CC]" />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-xs font-medium text-[var(--foreground)]">
                              {item.title}
                            </span>
                            <span className="mt-1 block text-[10px] text-[var(--muted)]">
                              {item.type} · {formatAgendaDate(item)}
                            </span>
                          </span>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-xl bg-[var(--surface-soft)] px-4 py-5 text-center">
                      <p className="text-xs font-medium text-[var(--foreground)]">No hay pendientes</p>
                      <p className="mt-1 text-[10px] text-[var(--muted)]">Tu agenda está al día.</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 border-t border-[var(--border)] p-3">
                <Link
                  href="/agenda"
                  onClick={() => setNotificationsOpen(false)}
                  className="flex min-h-10 flex-1 items-center justify-center rounded-xl border border-[var(--border)] px-3 text-xs font-semibold text-[var(--foreground)] transition hover:bg-[var(--surface-soft)]"
                >
                  Ver agenda
                </Link>

                {user.role === 'Cliente' ? null : pushEnabled ? (
                  <div className="flex flex-1 flex-wrap gap-1">
                    <button type="button" onClick={() => void sendTestPush()} disabled={pushWorking}
                      className="flex min-h-10 flex-1 items-center justify-center rounded-xl bg-emerald-500/10 px-2 text-xs font-semibold text-emerald-500 disabled:opacity-50"
                      title="Probar una notificación Push en este dispositivo">
                      <Bell size={15} className="mr-1" /> Push activo · Probar
                    </button>
                    <button type="button" onClick={() => void disablePush()} disabled={pushWorking}
                      className="min-h-10 rounded-xl border border-[var(--border)] px-2 text-xs font-medium text-[var(--muted)] disabled:opacity-50"
                      title="Desactivar notificaciones Push">Desactivar</button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => void enableNotifications()}
                    disabled={pushWorking}
                    className="flex min-h-10 flex-1 items-center justify-center rounded-xl bg-[#5496CC] px-3 text-xs font-semibold text-white transition hover:brightness-105 disabled:opacity-50"
                  >
                    {pushWorking ? 'Configurando…' : notificationPermission === 'denied' ? 'Revisar permiso' : 'Activar Push'}
                  </button>
                )}
              </div>
            </div>
          ) : null}
        </div>

        <div className="mx-2 hidden h-6 w-px bg-[var(--border)] sm:block" />

        <div className="nedvi-header-profile ml-0 flex items-center gap-1 rounded-xl border border-white/[0.10] bg-white/[0.05] p-1 sm:ml-1 sm:gap-2.5 sm:px-3 sm:py-1.5">
          <input
            ref={avatarInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(event) => void handleAvatarUpload(event.target.files?.[0])}
          />

          <button
            type="button"
            onClick={() => avatarInputRef.current?.click()}
            disabled={uploadingAvatar}
            className="group relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-[#5496CC]/35 bg-[#343A40] text-xs font-bold text-white shadow-sm transition hover:scale-[1.03] disabled:cursor-wait sm:h-10 sm:w-10"
            aria-label="Cambiar foto de perfil"
            title="Cambiar foto de perfil"
          >
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={`Foto de perfil de ${user.name}`}
                className="h-full w-full object-cover"
              />
            ) : (
              <span>{user.initials}</span>
            )}

            <span className="absolute inset-0 flex items-center justify-center bg-black/0 text-white opacity-0 transition group-hover:bg-black/35 group-hover:opacity-100">
              {uploadingAvatar ? (
                <LoaderCircle size={18} className="animate-spin" />
              ) : (
                <Camera size={18} />
              )}
            </span>

            <span className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-[var(--surface)] bg-[#5496CC] text-white shadow-sm">
              {uploadingAvatar ? (
                <LoaderCircle size={10} className="animate-spin" />
              ) : (
                <Camera size={10} />
              )}
            </span>
          </button>

          <div className="hidden min-w-0 sm:block">
            <p className="nedvi-header-user-name max-w-44 truncate text-sm font-semibold text-white">
              {user.name}
            </p>
            <p className="nedvi-header-user-role mt-0.5 max-w-44 truncate text-xs font-medium text-[#9ED2F8]">
              {user.role}
            </p>
            <button
              type="button"
              onClick={() => avatarInputRef.current?.click()}
              disabled={uploadingAvatar}
              className="nedvi-header-avatar-link mt-1 text-[10px] font-semibold text-white/60 transition hover:text-white disabled:opacity-60"
            >
              {uploadingAvatar ? 'Subiendo...' : avatarUrl ? 'Cambiar foto' : 'Agregar foto'}
            </button>
          </div>
        </div>

        <button type="button" onClick={() => void logoutAndUnsubscribePush()}
          className="nedvi-header-action ml-0 inline-flex h-10 w-9 items-center justify-center gap-2 rounded-lg border border-white/15 px-1 text-xs font-semibold text-white/85 transition hover:border-white/25 hover:bg-white/10 hover:text-white sm:ml-1 sm:w-auto sm:px-3"
          aria-label="Cerrar sesión" title="Cerrar sesión">
          <LogOut size={20} strokeWidth={1.8} />
          <span className="hidden lg:inline">Cerrar sesión</span>
        </button>
      </div>
    </header>
  )
}
