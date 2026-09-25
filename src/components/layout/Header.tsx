'use client'

import {
  Bell,
  Building2,
  Menu,
  Search,
  SunMoon,
} from 'lucide-react'

type HeaderProps = {
  onOpenMenu: () => void
  isDark: boolean
  onToggleTheme: () => void
}

function BrandMark() {
  return (
    <span className="relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-[9px] bg-[#163DFF]">
      <span className="absolute h-3.5 w-1.5 -rotate-45 rounded-full bg-white" />
      <span className="absolute h-3.5 w-1.5 rotate-45 rounded-full bg-white" />
    </span>
  )
}

export function Header({ onOpenMenu, isDark, onToggleTheme }: HeaderProps) {
  return (
    <header className="flex h-[88px] shrink-0 items-center justify-between border-b border-white/[0.06] bg-[#0B0B0D]/90 px-5 backdrop-blur-xl sm:px-8">
      <div className="flex min-w-0 items-center gap-4">
        <button
          type="button"
          onClick={onOpenMenu}
          className="rounded-lg p-2 text-[#9CA3AF] transition hover:bg-white/[0.06] hover:text-white lg:hidden"
          aria-label="Open navigation"
        >
          <Menu size={20} strokeWidth={1.8} />
        </button>
        <div className="flex items-center gap-2.5 lg:hidden">
          <BrandMark />
          <span className="text-[15px] font-semibold tracking-[-0.04em] text-white">
            NEDVI <span className="font-normal text-[#9CA3AF]">OS</span>
          </span>
        </div>
        <div className="relative hidden w-[min(360px,32vw)] md:block">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#646873]" size={16} strokeWidth={1.8} />
          <input
            type="search"
            placeholder="Search anything..."
            className="h-10 w-full rounded-xl border border-white/[0.07] bg-[#17181C] pl-10 pr-16 text-xs text-white outline-none transition placeholder:text-[#646873] hover:border-white/[0.13] focus:border-[#163DFF] focus:ring-4 focus:ring-[#163DFF]/10"
            aria-label="Search workspace"
          />
          <kbd className="absolute right-3 top-1/2 -translate-y-1/2 rounded border border-white/[0.08] px-1.5 py-0.5 text-[10px] text-[#646873]">
            ⌘ K
          </kbd>
        </div>
      </div>

      <div className="flex items-center gap-1 sm:gap-2">
        <button
          type="button"
          onClick={onToggleTheme}
          className={`rounded-xl p-2.5 transition hover:bg-white/[0.06] hover:text-white ${isDark ? 'text-[#9CA3AF]' : 'text-[#6f88ff]'}`}
          aria-label={isDark ? 'Dark theme enabled' : 'Light theme enabled'}
          aria-pressed={isDark}
          title="Toggle theme"
        >
          <SunMoon size={18} strokeWidth={1.8} />
        </button>
        <button
          type="button"
          className="relative rounded-xl p-2.5 text-[#9CA3AF] transition hover:bg-white/[0.06] hover:text-white"
          aria-label="Notifications"
        >
          <Bell size={18} strokeWidth={1.8} />
          <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-[#163DFF] ring-2 ring-[#0B0B0D]" />
        </button>
        <div className="mx-2 hidden h-6 w-px bg-white/[0.08] sm:block" />
        <div className="flex items-center gap-2.5 pl-1">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#2c3346] text-[10px] font-bold text-[#b7c2ff] ring-2 ring-[#0B0B0D]">
            MG
          </span>
          <div className="hidden min-w-0 lg:block">
            <p className="max-w-28 truncate text-xs font-medium text-white">Pedro Garcia</p>
            <p className="text-[10px] text-[#646873]">Admin</p>
          </div>
        </div>
        <Building2 className="ml-2 hidden text-[#646873] xl:block" size={17} strokeWidth={1.7} aria-label="Company workspace" />
      </div>
    </header>
  )
}
