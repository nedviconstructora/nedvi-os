'use client'

import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { Header } from '@/components/layout/Header'
import { Sidebar } from '@/components/layout/Sidebar'

type AppShellProps = {
  children: ReactNode
}

type Theme = 'light' | 'dark'

const THEME_STORAGE_KEY = 'nedvi-theme'

export function AppShell({ children }: AppShellProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [theme, setTheme] = useState<Theme>('light')

  useEffect(() => {
    const savedTheme = window.localStorage.getItem(THEME_STORAGE_KEY)

    if (savedTheme === 'dark' || savedTheme === 'light') {
      setTheme(savedTheme)
    }
  }, [])

  useEffect(() => {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme)
    document.documentElement.style.colorScheme = theme
  }, [theme])

  const isDark = theme === 'dark'

  const toggleTheme = () => {
    setTheme((currentTheme) => (currentTheme === 'dark' ? 'light' : 'dark'))
  }

  return (
    <div
      className={`${isDark ? 'theme-dark' : 'theme-light'} min-h-screen bg-[var(--background)] text-[var(--foreground)] transition-colors duration-300`}
    >
      <div className="flex min-h-screen">
        <Sidebar
          collapsed={sidebarCollapsed}
          mobileOpen={mobileMenuOpen}
          onToggleCollapse={() => setSidebarCollapsed((value) => !value)}
          onCloseMobile={() => setMobileMenuOpen(false)}
        />

        {mobileMenuOpen ? (
          <button
            type="button"
            onClick={() => setMobileMenuOpen(false)}
            className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm lg:hidden"
            aria-label="Cerrar navegación"
          />
        ) : null}

        <div className="flex min-w-0 flex-1 flex-col">
          <Header
            onOpenMenu={() => setMobileMenuOpen(true)}
            isDark={isDark}
            onToggleTheme={toggleTheme}
          />

          <main className="min-w-0 flex-1 bg-[var(--background)] p-5 transition-colors duration-300 sm:p-8">
            {children}
          </main>
        </div>
      </div>
    </div>
  )
}
