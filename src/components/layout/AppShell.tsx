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
import { syncQuoteProjectsIntoProjectStorage } from '@/features/projects/services/quoteProjectSync'

type AppShellProps = {
  children: ReactNode
}

type Theme = 'light' | 'dark'

const THEME_STORAGE_KEY = 'nedvi-theme'
const QUOTE_PROJECTS_STORAGE_KEY = 'nedvi_projects_from_quotes'

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
    const syncProjects = () => {
      syncQuoteProjectsIntoProjectStorage()
    }

    const handleStorage = (event: StorageEvent) => {
      if (event.key === QUOTE_PROJECTS_STORAGE_KEY) syncProjects()
    }

    syncProjects()
    window.addEventListener('focus', syncProjects)
    window.addEventListener('storage', handleStorage)

    return () => {
      window.removeEventListener('focus', syncProjects)
      window.removeEventListener('storage', handleStorage)
    }
  }, [pathname])

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
