'use client'

import {
  Bell,
  Building2,
  Menu,
  Moon,
  Search,
  Sun,
} from 'lucide-react'

type HeaderProps = {
  onOpenMenu: () => void
  isDark: boolean
  onToggleTheme: () => void
}

function BrandMark() {
  return (
    <span className="relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-[9px] bg-[#7BAEE3] shadow-[0_6px_20px_rgba(123,174,227,0.28)]">
      <span className="absolute h-3.5 w-1.5 -rotate-45 rounded-full bg-[#102033]" />
      <span className="absolute h-3.5 w-1.5 rotate-45 rounded-full bg-[#102033]" />
    </span>
  )
}

export function Header({ onOpenMenu, isDark, onToggleTheme }: HeaderProps) {
  return (
    <header className="flex h-[88px] shrink-0 items-center justify-between border-b border-[var(--border)] bg-[color:var(--surface)]/95 px-5 backdrop-blur-xl transition-colors duration-300 sm:px-8">
      <div className="flex min-w-0 items-center gap-4">
        <button
          type="button"
          onClick={onOpenMenu}
          className="rounded-lg p-2 text-[var(--muted)] transition hover:bg-[#7BAEE3]/15 hover:text-[var(--foreground)] lg:hidden"
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
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--subtle)]"
            size={16}
            strokeWidth={1.8}
          />
          <input
            type="search"
            placeholder="Buscar en NEDVI OS..."
            className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] pl-10 pr-16 text-xs text-[var(--foreground)] outline-none transition placeholder:text-[var(--subtle)] hover:border-[#7BAEE3] focus:border-[#7BAEE3] focus:ring-4 focus:ring-[#7BAEE3]/15"
            aria-label="Buscar en NEDVI OS"
          />
          <kbd className="absolute right-3 top-1/2 -translate-y-1/2 rounded border border-[var(--border)] px-1.5 py-0.5 text-[10px] text-[var(--subtle)]">
            ⌘ K
          </kbd>
        </div>
      </div>

      <div className="flex items-center gap-1 sm:gap-2">
        <button
          type="button"
          onClick={onToggleTheme}
          className="rounded-xl border border-transparent p-2.5 text-[var(--muted)] transition hover:border-[#7BAEE3]/30 hover:bg-[#7BAEE3]/15 hover:text-[var(--foreground)]"
          aria-label={isDark ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
          title={isDark ? 'Tema claro' : 'Tema oscuro'}
        >
          {isDark ? <Sun size={18} strokeWidth={1.8} /> : <Moon size={18} strokeWidth={1.8} />}
        </button>

        <button
          type="button"
          className="relative rounded-xl p-2.5 text-[var(--muted)] transition hover:bg-[#7BAEE3]/15 hover:text-[var(--foreground)]"
          aria-label="Notificaciones"
        >
          <Bell size={18} strokeWidth={1.8} />
          <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-[#7BAEE3] ring-2 ring-[var(--surface)]" />
        </button>

        <div className="mx-2 hidden h-6 w-px bg-[var(--border)] sm:block" />

        <div className="flex items-center gap-2.5 pl-1">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#7BAEE3]/25 text-[10px] font-bold text-[var(--foreground)] ring-2 ring-[var(--surface)]">
            PG
          </span>
          <div className="hidden min-w-0 lg:block">
            <p className="max-w-28 truncate text-xs font-medium text-[var(--foreground)]">Pedro Garcia</p>
            <p className="text-[10px] text-[var(--subtle)]">Admin</p>
          </div>
        </div>

        <Building2
          className="ml-2 hidden text-[var(--subtle)] xl:block"
          size={17}
          strokeWidth={1.7}
          aria-label="Espacio de trabajo de la empresa"
        />
      </div>
    </header>
  )
}
