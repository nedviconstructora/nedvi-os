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

function applyTheme(theme: Theme) {
  const root = document.documentElement
  const isDark = theme === 'dark'

  root.classList.toggle('dark', isDark)
  root.classList.toggle('theme-dark', isDark)
  root.classList.toggle('theme-light', !isDark)
  root.style.colorScheme = theme
}

export function AppShell({ children }: AppShellProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [theme, setTheme] = useState<Theme>('light')

  useEffect(() => {
    const savedTheme = window.localStorage.getItem(THEME_STORAGE_KEY)
    const initialTheme: Theme = savedTheme === 'dark' ? 'dark' : 'light'

    setTheme(initialTheme)
    applyTheme(initialTheme)
  }, [])

  function toggleTheme() {
    setTheme((currentTheme) => {
      const nextTheme: Theme = currentTheme === 'dark' ? 'light' : 'dark'
      window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme)
      applyTheme(nextTheme)
      return nextTheme
    })
  }

  const isDark = theme === 'dark'

  return (
    <div className={`${isDark ? 'theme-dark' : 'theme-light'} min-h-screen bg-[var(--background)] text-[var(--foreground)] transition-colors duration-300 print:min-h-0 print:bg-white print:text-black`}>
      <div className="flex min-h-screen print:min-h-0 print:block">
        <div className="print:hidden">
          <Sidebar
            collapsed={sidebarCollapsed}
            mobileOpen={mobileMenuOpen}
            onToggleCollapse={() => setSidebarCollapsed((value) => !value)}
            onCloseMobile={() => setMobileMenuOpen(false)}
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
            />
          </div>

          <main className="min-w-0 flex-1 bg-[var(--background)] p-5 transition-colors duration-300 sm:p-8 print:bg-white print:p-0">
            {children}
          </main>
        </div>
      </div>
    </div>
  )
}
