'use client'

import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Header } from '@/components/layout/Header'
import { Sidebar } from '@/components/layout/Sidebar'
import { permissionForPath } from '@/config/roles'
import {
  readAccessSession,
  type AccessSession,
} from '@/features/access/services/accessStorage'

type AppShellProps = {
  children: ReactNode
}

type Theme = 'light' | 'dark'

const THEME_STORAGE_KEY = 'nedvi-theme'

const ACTION_DATE_RULES: Array<{ prefix: string; labels: string[] }> = [
  { prefix: '/site-surveys', labels: ['Fecha'] },
  { prefix: '/site-progress', labels: ['Fecha'] },
  { prefix: '/daily-reports', labels: ['Fecha'] },
  { prefix: '/attendance', labels: ['Fecha'] },
  { prefix: '/purchase-orders', labels: ['Fecha de orden'] },
  { prefix: '/requisitions', labels: ['Fecha de solicitud'] },
]

function localToday() {
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function actionDateLabels(pathname: string) {
  return ACTION_DATE_RULES.find(
    ({ prefix }) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  )?.labels ?? []
}

function applyTheme(theme: Theme) {
  const root = document.documentElement
  const isDark = theme === 'dark'

  root.classList.toggle('dark', isDark)
  root.classList.toggle('theme-dark', isDark)
  root.classList.toggle('theme-light', !isDark)
  root.style.colorScheme = theme
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [theme, setTheme] = useState<Theme>('light')
  const [accessUser, setAccessUser] = useState<AccessSession | null>(null)
  const [sessionReady, setSessionReady] = useState(false)

  useEffect(() => {
    const session = readAccessSession()
    if (!session) {
      setSessionReady(true)
      router.replace('/login')
      return
    }

    setAccessUser(session)
    setSessionReady(true)
  }, [router])

  useEffect(() => {
    const savedTheme = window.localStorage.getItem(THEME_STORAGE_KEY)
    const initialTheme: Theme = savedTheme === 'dark' ? 'dark' : 'light'

    setTheme(initialTheme)
    applyTheme(initialTheme)
  }, [])

  useEffect(() => {
    if (!accessUser) return

    const labels = actionDateLabels(pathname)
    const selector = 'input[type="date"]'

    const clearRestrictions = () => {
      document
        .querySelectorAll<HTMLInputElement>('input[data-nedvi-action-date="true"]')
        .forEach((input) => {
          input.removeAttribute('min')
          input.removeAttribute('max')
          input.removeAttribute('data-nedvi-action-date')
          input.removeAttribute('data-nedvi-action-date-original')
          input.removeAttribute('title')
        })
    }

    // Administración conserva la capacidad de capturar o corregir fechas históricas.
    // Todos los demás roles, incluidos los que se agreguen en el futuro, quedan restringidos.
    if (accessUser.role === 'Administración' || labels.length === 0) {
      clearRestrictions()
      return
    }

    const today = localToday()

    const matchesActionDate = (input: HTMLInputElement) => {
      const label = input.closest('label')
      if (!label) return false
      const labelText = label.querySelector('span')?.textContent?.trim() ?? ''
      return labels.includes(labelText)
    }

    const allowedDateForInput = (input: HTMLInputElement) => {
      const formText = input.closest('form')?.textContent ?? ''
      const isEditingExistingRecord = formText.includes('Guardar cambios')

      if (isEditingExistingRecord) {
        const original = input.dataset.nedviActionDateOriginal || input.value
        if (original) {
          input.dataset.nedviActionDateOriginal = original
          return original
        }
      }

      return today
    }

    const setNativeValue = (input: HTMLInputElement, value: string) => {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
      if (setter) setter.call(input, value)
      else input.value = value
      input.dispatchEvent(new Event('input', { bubbles: true }))
      input.dispatchEvent(new Event('change', { bubbles: true }))
    }

    const enforceInput = (input: HTMLInputElement) => {
      if (!matchesActionDate(input)) return

      if (!input.dataset.nedviActionDateOriginal && input.value) {
        input.dataset.nedviActionDateOriginal = input.value
      }

      const allowedDate = allowedDateForInput(input)
      input.dataset.nedviActionDate = 'true'
      input.min = allowedDate
      input.max = allowedDate
      input.title =
        allowedDate === today
          ? 'Tu rol solo puede registrar esta acción con la fecha de hoy.'
          : 'La fecha original de este registro no puede modificarse con tu rol.'

      if (input.value !== allowedDate) setNativeValue(input, allowedDate)
    }

    const applyRestrictions = () => {
      document.querySelectorAll<HTMLInputElement>(selector).forEach(enforceInput)
    }

    const handleDateChange = (event: Event) => {
      const input = event.target
      if (!(input instanceof HTMLInputElement) || input.type !== 'date') return
      if (!matchesActionDate(input)) return

      const allowedDate = allowedDateForInput(input)
      if (input.value !== allowedDate) setNativeValue(input, allowedDate)
    }

    applyRestrictions()

    const observer = new MutationObserver(applyRestrictions)
    observer.observe(document.body, { childList: true, subtree: true })
    document.addEventListener('input', handleDateChange, true)
    document.addEventListener('change', handleDateChange, true)

    return () => {
      observer.disconnect()
      document.removeEventListener('input', handleDateChange, true)
      document.removeEventListener('change', handleDateChange, true)
      clearRestrictions()
    }
  }, [pathname, accessUser])

  function toggleTheme() {
    setTheme((currentTheme) => {
      const nextTheme: Theme = currentTheme === 'dark' ? 'light' : 'dark'
      window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme)
      applyTheme(nextTheme)
      return nextTheme
    })
  }

  if (!sessionReady || !accessUser) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#090B0F] text-sm text-white/60">
        Cargando NEDVI OS...
      </div>
    )
  }

  const isDark = theme === 'dark'
  const routePermission = permissionForPath(pathname)
  const hasRouteAccess = routePermission ? accessUser.permissions.includes(routePermission) : true
  const isHumanResourcesRoute =
    pathname === '/personnel' || pathname === '/hr-attendance' || pathname === '/payroll'

  return (
    <div className={`${isDark ? 'theme-dark' : 'theme-light'} min-h-screen bg-[var(--background)] text-[var(--foreground)] transition-colors duration-300 print:min-h-0 print:bg-white print:text-black`}>
      <div className="flex min-h-screen print:min-h-0 print:block">
        <div className="print:hidden">
          <Sidebar
            collapsed={sidebarCollapsed}
            mobileOpen={mobileMenuOpen}
            onToggleCollapse={() => setSidebarCollapsed((value) => !value)}
            onCloseMobile={() => setMobileMenuOpen(false)}
            user={accessUser}
          />
        </div>

        {mobileMenuOpen ? (
          <button
            type="button"
            onClick={() => setMobileMenuOpen(false)}
            className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm lg:hidden print:hidden"
            aria-label="Cerrar navegación"
          />
        ) : null}

        <div className="flex min-w-0 flex-1 flex-col print:block">
          <div className="print:hidden">
            <Header
              onOpenMenu={() => setMobileMenuOpen(true)}
              isDark={isDark}
              onToggleTheme={toggleTheme}
              showCompanyLogo={isHumanResourcesRoute}
              user={accessUser}
            />
          </div>

          <main className="min-w-0 flex-1 bg-[var(--background)] p-5 transition-colors duration-300 sm:p-8 print:bg-white print:p-0">
            {hasRouteAccess ? (
              children
            ) : (
              <div className="mx-auto flex min-h-[55vh] max-w-2xl items-center justify-center">
                <div className="w-full rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-8 text-center shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#5496CC]">Acceso restringido</p>
                  <h1 className="mt-3 text-2xl font-bold text-[var(--foreground)]">No tienes permiso para abrir este módulo</h1>
                  <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
                    Tu rol actual es {accessUser.role}. Solicita acceso a Administración si necesitas entrar a este apartado.
                  </p>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  )
}
