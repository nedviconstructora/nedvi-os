'use client'

import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Bell,
  BellRing,
  Building2,
  Camera,
  LoaderCircle,
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
  sortAgendaActivities,
  type AgendaItem,
} from '@/features/agenda/services/agendaStorage'
import type { AccessSession } from '@/features/access/services/accessStorage'

type HeaderProps = {
  onOpenMenu: () => void
  isDark: boolean
  onToggleTheme: () => void
  showCompanyLogo?: boolean
  user: AccessSession
}

function BrandMark() {
  return (
    <span className="relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-[9px] bg-[#5496CC]">
      <span className="absolute h-3.5 w-1.5 -rotate-45 rounded-full bg-white" />
      <span className="absolute h-3.5 w-1.5 rotate-45 rounded-full bg-white" />
    </span>
  )
}

export function Header({ onOpenMenu, isDark, onToggleTheme, showCompanyLogo = false, user }: HeaderProps) {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | 'unsupported'>('default')
  const [notificationsOpen, setNotificationsOpen] = useState(false)
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
  }, [])

  useEffect(() => {
    const loadAgenda = () => setAgendaItems(readAgendaActivities())

    loadAgenda()

    const handleStorage = (event: StorageEvent) => {
      if (event.key === AGENDA_STORAGE_KEY) loadAgenda()
    }

    const handleFocus = () => loadAgenda()
    window.addEventListener('storage', handleStorage)
    window.addEventListener('focus', handleFocus)
    window.addEventListener(AGENDA_UPDATED_EVENT, loadAgenda)

    return () => {
      window.removeEventListener('storage', handleStorage)
      window.removeEventListener('focus', handleFocus)
      window.removeEventListener(AGENDA_UPDATED_EVENT, loadAgenda)
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

  const pendingAgenda = useMemo(
    () =>
      sortAgendaActivities(agendaItems)
        .filter((item) => item.status !== 'Completada')
        .slice(0, 5),
    [agendaItems],
  )

  const notificationCount = pendingAgenda.length + alerts.length

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
    if (typeof Notification === 'undefined') {
      window.alert('Este navegador no admite notificaciones.')
      return
    }

    if (Notification.permission === 'denied') {
      window.alert('Las notificaciones están bloqueadas. Actívalas desde la configuración del navegador.')
      setNotificationPermission('denied')
      return
    }

    const permission =
      Notification.permission === 'granted'
        ? 'granted'
        : await Notification.requestPermission()

    setNotificationPermission(permission)

    if (permission !== 'granted') return

    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready
      await registration.showNotification('NEDVI OS', {
        body: 'Notificaciones activadas correctamente.',
        icon: '/icon.png',
        badge: '/icon.png',
        tag: 'nedvi-notifications-enabled',
      })
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
    <header className="nedvi-app-header flex h-[88px] shrink-0 items-center justify-between border-b px-5 text-white backdrop-blur-xl transition-colors duration-300 sm:px-8">
      <div className="flex min-w-0 items-center gap-4">
        <button
          type="button"
          onClick={onOpenMenu}
          className="rounded-lg p-2 text-white/75 transition hover:bg-white/10 hover:text-white lg:hidden"
          aria-label="Abrir navegación"
        >
          <Menu size={20} strokeWidth={1.8} />
        </button>

        <div className="flex items-center gap-2.5 lg:hidden">
          <BrandMark />
          <span className="text-[15px] font-semibold tracking-[-0.04em] text-white">
            NEDVI <span className="font-normal text-[#9ED2F8]">OS</span>
          </span>
        </div>

        <div className="relative hidden w-[min(360px,32vw)] md:block">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-white/55" size={16} strokeWidth={1.8} />
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

      <div className="flex items-center gap-1 sm:gap-2">
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
          className="rounded-xl p-2.5 text-[#9ED2F8] transition hover:bg-white/10 hover:text-white"
          aria-label={isDark ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
          aria-pressed={isDark}
          title={isDark ? 'Tema claro' : 'Tema oscuro'}
        >
          {isDark ? <Sun size={18} strokeWidth={1.8} /> : <Moon size={18} strokeWidth={1.8} />}
        </button>

        <button
          type="button"
          onClick={() => void refreshApp()}
          disabled={refreshing}
          className="rounded-xl p-2.5 text-white/70 transition hover:bg-white/10 hover:text-white disabled:cursor-wait disabled:opacity-60"
          aria-label="Actualizar NEDVI OS"
          title={refreshing ? 'Actualizando...' : 'Actualizar información'}
        >
          <RefreshCw
            size={18}
            strokeWidth={1.8}
            className={refreshing ? 'animate-spin' : undefined}
          />
        </button>



        <div ref={notificationsRef} className="relative">
          <button
            type="button"
            onClick={() => setNotificationsOpen((current) => !current)}
            className={`relative rounded-xl p-2.5 transition ${
              notificationsOpen
                ? 'bg-white/10 text-[#9ED2F8]'
                : 'text-white/70 hover:bg-white/10 hover:text-white'
            }`}
            aria-label="Abrir notificaciones"
            aria-expanded={notificationsOpen}
            title="Notificaciones"
          >
            <Bell size={18} strokeWidth={1.8} />
            {notificationCount > 0 ? (
              <span className="absolute -right-0.5 -top-0.5 flex min-h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold leading-none text-white ring-2 ring-[var(--surface)]">
                {notificationCount > 9 ? '9+' : notificationCount}
              </span>
            ) : (
              <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-emerald-500 ring-2 ring-[var(--surface)]" />
            )}
          </button>

          {notificationsOpen ? (
            <div className="fixed inset-x-3 top-[82px] z-[100] max-h-[calc(100dvh-100px)] overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl sm:absolute sm:inset-x-auto sm:right-0 sm:top-[calc(100%+12px)] sm:w-[390px]">
              <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-[var(--foreground)]">Notificaciones</p>
                  <p className="mt-0.5 text-[10px] text-[var(--muted)]">
                    {notificationCount > 0
                      ? `${notificationCount} pendiente${notificationCount === 1 ? '' : 's'}`
                      : 'Todo al día'}
                  </p>
                </div>
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#5496CC]/10 text-[#5496CC]">
                  <BellRing size={16} />
                </span>
              </div>

              <div className="max-h-[58dvh] overflow-y-auto">
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

                {notificationPermission !== 'granted' ? (
                  <button
                    type="button"
                    onClick={() => void enableNotifications()}
                    className="flex min-h-10 flex-1 items-center justify-center rounded-xl bg-[#5496CC] px-3 text-xs font-semibold text-white transition hover:brightness-105"
                  >
                    {notificationPermission === 'denied' ? 'Revisar permiso' : 'Activar avisos'}
                  </button>
                ) : (
                  <span className="flex min-h-10 flex-1 items-center justify-center rounded-xl bg-emerald-500/10 px-3 text-xs font-semibold text-emerald-500">
                    Avisos activados
                  </span>
                )}
              </div>
            </div>
          ) : null}
        </div>

        <div className="mx-2 hidden h-6 w-px bg-[var(--border)] sm:block" />

        <div className="ml-1 flex items-center gap-3 rounded-2xl border border-white/[0.12] bg-white/[0.07] px-3 py-2 shadow-sm backdrop-blur-md sm:px-4">
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
            className="group relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-[#5496CC]/35 bg-[#343A40] text-xs font-bold text-white shadow-sm transition hover:scale-[1.03] disabled:cursor-wait sm:h-14 sm:w-14"
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
            <p className="max-w-44 truncate text-sm font-semibold text-white">
              {user.name}
            </p>
            <p className="mt-0.5 max-w-44 truncate text-xs font-medium text-[#9ED2F8]">
              {user.role}
            </p>
            <button
              type="button"
              onClick={() => avatarInputRef.current?.click()}
              disabled={uploadingAvatar}
              className="mt-1 text-[10px] font-semibold text-white/60 transition hover:text-white disabled:opacity-60"
            >
              {uploadingAvatar ? 'Subiendo...' : avatarUrl ? 'Cambiar foto' : 'Agregar foto'}
            </button>
          </div>
        </div>

        <Building2 className="ml-2 hidden text-white/60 xl:block" size={17} strokeWidth={1.7} aria-label="Espacio de trabajo de la empresa" />
      </div>
    </header>
  )
}
