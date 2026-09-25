'use client'

import type { ReactNode } from 'react'
import { useState } from 'react'
import { Header } from '@/components/layout/Header'
import { Sidebar } from '@/components/layout/Sidebar'

type AppShellProps = {
  children: ReactNode
}

export function AppShell({ children }: AppShellProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isDark, setIsDark] = useState(true)

  return (
    <div className="min-h-screen bg-[#0B0B0D] text-white">
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
            className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm lg:hidden"
            aria-label="Close navigation overlay"
          />
        ) : null}
        <div className="flex min-w-0 flex-1 flex-col">
          <Header
            onOpenMenu={() => setMobileMenuOpen(true)}
            isDark={isDark}
            onToggleTheme={() => setIsDark((value) => !value)}
          />
          <main className="min-w-0 flex-1 bg-[#0B0B0D] p-5 sm:p-8">
            {children}
          </main>
        </div>
      </div>
    </div>
  )
}
