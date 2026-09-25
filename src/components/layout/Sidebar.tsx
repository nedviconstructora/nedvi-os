'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { LucideIcon } from 'lucide-react'
import {
  BarChart3,
  Bot,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  FileText,
  HardHat,
  LayoutDashboard,
  Mail,
  Package,
  Settings2,
  UsersRound,
  UserRound,
  X,
} from 'lucide-react'

type SidebarProps = {
  collapsed: boolean
  mobileOpen: boolean
  onToggleCollapse: () => void
  onCloseMobile: () => void
}

type NavigationItem = {
  label: string
  icon: LucideIcon
  href?: string
}

const navigationItems: NavigationItem[] = [
  { label: 'Dashboard', icon: LayoutDashboard, href: '/dashboard' },
  { label: 'Clientes', icon: UsersRound, href: '/crm' },
  { label: 'Proyectos', icon: HardHat, href: '/projects' },
  { label: 'Correos', icon: Mail },
  { label: 'Cotizaciones', icon: FileText },
  { label: 'Obras', icon: HardHat },
  { label: 'Personal', icon: UserRound },
  { label: 'Inventario', icon: Package },
  { label: 'Reportes', icon: BarChart3 },
  { label: 'Agenda', icon: CalendarDays, href: '/agenda' },
  { label: 'Configuración', icon: Settings2 },
]

function BrandMark() {
  return (
    <span className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-[10px] bg-[#163DFF] shadow-[0_8px_24px_rgba(22,61,255,0.28)]">
      <span className="absolute h-4 w-1.5 -rotate-45 rounded-full bg-white" />
      <span className="absolute h-4 w-1.5 rotate-45 rounded-full bg-white" />
    </span>
  )
}

export function Sidebar({
  collapsed,
  mobileOpen,
  onToggleCollapse,
  onCloseMobile,
}: SidebarProps) {
  const pathname = usePathname()

  return (
    <>
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-[280px] flex-col border-r border-white/[0.06] bg-[#17181C] transition-[width,transform] duration-300 ease-out lg:relative lg:z-0 lg:translate-x-0 ${
          collapsed ? 'lg:w-20' : 'lg:w-[280px]'
        } ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-label="Main navigation"
      >
        <div
          className={`flex h-[88px] shrink-0 items-center border-b border-white/[0.06] px-5 ${
            collapsed
              ? 'lg:justify-center lg:px-0'
              : 'justify-between'
          }`}
        >
          <div
            className={`flex items-center gap-3 overflow-hidden ${
              collapsed ? 'lg:w-9' : ''
            }`}
          >
            <BrandMark />

            <span
              className={`whitespace-nowrap text-[17px] font-semibold tracking-[-0.04em] text-white transition-opacity duration-200 ${
                collapsed
                  ? 'lg:pointer-events-none lg:w-0 lg:opacity-0'
                  : 'opacity-100'
              }`}
            >
              NEDVI{' '}
              <span className="font-normal text-[#9CA3AF]">OS</span>
            </span>
          </div>

          <button
            type="button"
            onClick={onCloseMobile}
            className="rounded-lg p-2 text-[#9CA3AF] transition hover:bg-white/[0.06] hover:text-white lg:hidden"
            aria-label="Close navigation"
          >
            <X size={18} strokeWidth={1.8} />
          </button>
        </div>

        <nav
          className="flex-1 space-y-1 overflow-y-auto px-3 py-6"
          aria-label="Application sections"
        >
          <p
            className={`mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#646873] transition-opacity ${
              collapsed
                ? 'lg:text-center lg:opacity-0'
                : ''
            }`}
          >
            Workspace
          </p>

          {navigationItems.map(
            ({ label, icon: Icon, href }) => {
              const active = Boolean(
                href &&
                  (pathname === href ||
                    (href !== '/dashboard' && pathname.startsWith(`${href}/`)))
              )

              const classes = `group relative flex h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-[13px] font-medium transition duration-200 ${
                active
                  ? 'bg-[#343A40] text-white'
                  : 'text-[#9CA3AF] hover:bg-white/5 hover:text-white'
              } ${collapsed ? 'lg:justify-center' : ''}`

              if (href) {
                return (
                  <Link
                    key={label}
                    href={href}
                    title={collapsed ? label : undefined}
                    onClick={onCloseMobile}
                    className={classes}
                    aria-current={active ? 'page' : undefined}
                  >
                    {active ? (
                      <span className="absolute left-0 h-5 w-0.5 rounded-r-full bg-[#163DFF]" />
                    ) : null}

                    <Icon
                      size={18}
                      strokeWidth={active ? 2 : 1.8}
                      className={
                        active
                          ? 'text-[#6F88FF]'
                          : 'text-[#7D81D8] group-hover:text-white'
                      }
                    />

                    <span
                      className={`whitespace-nowrap transition-opacity duration-200 ${
                        collapsed
                          ? 'lg:pointer-events-none lg:w-0 lg:opacity-0'
                          : 'opacity-100'
                      }`}
                    >
                      {label}
                    </span>
                  </Link>
                )
              }

              return (
                <button
                  type="button"
                  key={label}
                  title={`${label} - Próximamente`}
                  onClick={onCloseMobile}
                  className={`${classes} cursor-not-allowed opacity-50`}
                >
                  <Icon size={18} strokeWidth={1.8} />

                  <span
                    className={`whitespace-nowrap transition-opacity duration-200 ${
                      collapsed
                        ? 'lg:pointer-events-none lg:w-0 lg:opacity-0'
                        : 'opacity-100'
                    }`}
                  >
                    {label}
                  </span>
                </button>
              )
            },
          )}

          <div className="my-5 border-t border-white/[0.06]" />

          <button
            type="button"
            title={collapsed ? 'Coral' : undefined}
            onClick={onCloseMobile}
            className={`group relative flex h-11 w-full items-center gap-3 rounded-xl border border-[#163DFF]/20 bg-[#163DFF]/[0.07] px-3 text-left text-[13px] font-medium text-[#d9deff] transition hover:border-[#163DFF]/40 hover:bg-[#163DFF]/[0.13] ${
              collapsed
                ? 'lg:justify-center lg:px-0'
                : ''
            }`}
          >
            <Bot
              size={18}
              strokeWidth={1.8}
              className="text-[#6f88ff]"
            />

            <span
              className={`whitespace-nowrap transition-opacity duration-200 ${
                collapsed
                  ? 'lg:pointer-events-none lg:w-0 lg:opacity-0'
                  : 'opacity-100'
              }`}
            >
              Coral
            </span>

            <span
              className={`ml-auto rounded-md bg-[#163DFF]/20 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[#91a2ff] ${
                collapsed ? 'lg:hidden' : ''
              }`}
            >
              AI
            </span>
          </button>
        </nav>

        <div className="border-t border-white/[0.06] p-3">
          <div
            className={`flex items-center gap-3 rounded-xl px-2 py-2 ${
              collapsed
                ? 'lg:justify-center lg:px-0'
                : ''
            }`}
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#2c3346] text-[10px] font-bold text-[#b7c2ff]">
              MG
            </span>

            <div
              className={`min-w-0 transition-opacity duration-200 ${
                collapsed
                  ? 'lg:pointer-events-none lg:w-0 lg:opacity-0'
                  : 'opacity-100'
              }`}
            >
              <p className="truncate text-xs font-medium text-white">
                Pedro Garcia
              </p>

              <p className="truncate text-[11px] text-[#646873]">
                Administrator
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onToggleCollapse}
          className="absolute -right-3 top-[68px] hidden h-6 w-6 items-center justify-center rounded-full border border-white/[0.1] bg-[#20232A] text-[#9CA3AF] shadow-lg transition hover:bg-[#2a2e38] hover:text-white lg:flex"
          aria-label={
            collapsed ? 'Expand sidebar' : 'Collapse sidebar'
          }
        >
          {collapsed ? (
            <ChevronRight size={13} />
          ) : (
            <ChevronLeft size={13} />
          )}
        </button>
      </aside>
    </>
  )
}
