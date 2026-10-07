'use client'

import { useEffect, useRef, useState } from 'react'
import {
  Bell,
  Building2,
  Camera,
  LoaderCircle,
  Menu,
  Moon,
  Search,
  Sun,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
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
  const avatarInputRef = useRef<HTMLInputElement | null>(null)

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
    <header className="flex h-[88px] shrink-0 items-center justify-between border-b border-[var(--border)] bg-[var(--surface)]/95 px-5 text-[var(--foreground)] backdrop-blur-xl transition-colors duration-300 sm:px-8">
      <div className="flex min-w-0 items-center gap-4">
        <button
          type="button"
          onClick={onOpenMenu}
          className="rounded-lg p-2 text-[var(--muted)] transition hover:bg-[#5496CC]/10 hover:text-[var(--foreground)] lg:hidden"
          aria-label="Abrir navegación"
        >
          <Menu size={20} strokeWidth={1.8} />
        </button>

        <div className="flex items-center gap-2.5 lg:hidden">
          <BrandMark />
          <span className="text-[15px] font-semibold tracking-[-0.04em] text-[var(--foreground)]">
            NEDVI <span className="font-normal text-[var(--muted)]">OS</span>
          </span>
        </div>

        <div className="relative hidden w-[min(360px,32vw)] md:block">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--muted)]" size={16} strokeWidth={1.8} />
          <input
            type="search"
            placeholder="Buscar en NEDVI OS..."
            className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] pl-10 pr-16 text-xs text-[var(--foreground)] outline-none transition placeholder:text-[var(--muted)] hover:border-[#5496CC]/60 focus:border-[#5496CC] focus:ring-4 focus:ring-[#5496CC]/10"
            aria-label="Buscar en NEDVI OS"
          />
          <kbd className="absolute right-3 top-1/2 -translate-y-1/2 rounded border border-[var(--border)] px-1.5 py-0.5 text-[10px] text-[var(--muted)]">
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
            <span className="hidden text-xs font-semibold tracking-[0.08em] text-[var(--foreground)] xl:block">NEDVI</span>
          </div>
        ) : null}

        <button
          type="button"
          onClick={onToggleTheme}
          className="rounded-xl p-2.5 text-[#5496CC] transition hover:bg-[#5496CC]/10"
          aria-label={isDark ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
          aria-pressed={isDark}
          title={isDark ? 'Tema claro' : 'Tema oscuro'}
        >
          {isDark ? <Sun size={18} strokeWidth={1.8} /> : <Moon size={18} strokeWidth={1.8} />}
        </button>

        <button
          type="button"
          onClick={() => void enableNotifications()}
          className="relative rounded-xl p-2.5 text-[var(--muted)] transition hover:bg-[#5496CC]/10 hover:text-[var(--foreground)]"
          aria-label="Configurar notificaciones"
          title={
            notificationPermission === 'granted'
              ? 'Notificaciones activadas'
              : notificationPermission === 'denied'
                ? 'Notificaciones bloqueadas'
                : 'Activar notificaciones'
          }
        >
          <Bell size={18} strokeWidth={1.8} />
          <span
            className={`absolute right-2 top-2 h-1.5 w-1.5 rounded-full ring-2 ring-[var(--surface)] ${
              notificationPermission === 'granted'
                ? 'bg-emerald-500'
                : notificationPermission === 'denied'
                  ? 'bg-red-500'
                  : 'bg-[#5496CC]'
            }`}
          />
        </button>

        <div className="mx-2 hidden h-6 w-px bg-[var(--border)] sm:block" />

        <div className="ml-1 flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-2 shadow-sm sm:px-4">
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
            <p className="max-w-44 truncate text-sm font-semibold text-[var(--foreground)]">
              {user.name}
            </p>
            <p className="mt-0.5 max-w-44 truncate text-xs font-medium text-[#5496CC]">
              {user.role}
            </p>
            <button
              type="button"
              onClick={() => avatarInputRef.current?.click()}
              disabled={uploadingAvatar}
              className="mt-1 text-[10px] font-semibold text-[var(--muted)] transition hover:text-[#5496CC] disabled:opacity-60"
            >
              {uploadingAvatar ? 'Subiendo...' : avatarUrl ? 'Cambiar foto' : 'Agregar foto'}
            </button>
          </div>
        </div>

        <Building2 className="ml-2 hidden text-[var(--muted)] xl:block" size={17} strokeWidth={1.7} aria-label="Espacio de trabajo de la empresa" />
      </div>
    </header>
  )
}
