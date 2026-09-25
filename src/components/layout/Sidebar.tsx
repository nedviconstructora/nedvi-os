'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import type { LucideIcon } from 'lucide-react'
import {
  BarChart3,
  Bot,
  BriefcaseBusiness,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  ClipboardList,
  FileText,
  FolderKanban,
  HardHat,
  LayoutDashboard,
  Package,
  Settings2,
  ShoppingCart,
  Truck,
  UserRound,
  UsersRound,
  Wallet,
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
  href?: string
  icon?: LucideIcon
  comingSoon?: boolean
}

type NavigationGroup = {
  label: string
  icon: LucideIcon
  items: NavigationItem[]
}

const navigationGroups: NavigationGroup[] = [
  {
    label: 'Comercial y Ventas',
    icon: BriefcaseBusiness,
    items: [
      { label: 'Clientes', href: '/crm', icon: UsersRound },
      { label: 'Oportunidades', icon: ClipboardList, comingSoon: true },
      { label: 'Cotizaciones', icon: FileText, comingSoon: true },
    ],
  },
  {
    label: 'Proyectos',
    icon: FolderKanban,
    items: [
      { label: 'Proyectos', href: '/projects', icon: HardHat },
      { label: 'Presupuesto', icon: CircleDollarSign, comingSoon: true },
      { label: 'Documentos', icon: FileText, comingSoon: true },
    ],
  },
  {
    label: 'Compras y Suministros',
    icon: ShoppingCart,
    items: [
      { label: 'Requisiciones', icon: ClipboardList, comingSoon: true },
      { label: 'Órdenes de compra', icon: ShoppingCart, comingSoon: true },
      { label: 'Proveedores', icon: Truck, comingSoon: true },
    ],
  },
  {
    label: 'Operaciones / Obra',
    icon: HardHat,
    items: [
      { label: 'Avance de obra', icon: BarChart3, comingSoon: true },
      { label: 'Reportes diarios', icon: FileText, comingSoon: true },
      { label: 'Asistencias', icon: UsersRound, comingSoon: true },
      { label: 'Cuadrillas', icon: UserRound, comingSoon: true },
    ],
  },
  {
    label: 'Recursos Humanos',
    icon: UsersRound,
    items: [
      { label: 'Personal', icon: UserRound, comingSoon: true },
      { label: 'Asistencias', icon: CalendarDays, comingSoon: true },
      { label: 'Nómina', icon: Wallet, comingSoon: true },
    ],
  },
  {
    label: 'Finanzas',
    icon: CircleDollarSign,
    items: [
      { label: 'Cuentas por cobrar', icon: CircleDollarSign, comingSoon: true },
      { label: 'Cuentas por pagar', icon: Wallet, comingSoon: true },
      { label: 'Facturación', icon: FileText, comingSoon: true },
      { label: 'Flujo de caja', icon: BarChart3, comingSoon: true },
    ],
  },
  {
    label: 'Indicadores',
    icon: BarChart3,
    items: [
      { label: 'Comercial', icon: BriefcaseBusiness, comingSoon: true },
      { label: 'Compras', icon: ShoppingCart, comingSoon: true },
      { label: 'Obra', icon: HardHat, comingSoon: true },
      { label: 'Recursos Humanos', icon: UsersRound, comingSoon: true },
      { label: 'Alta Gerencia', icon: BarChart3, comingSoon: true },
    ],
  },
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

  const isPathActive = (href?: string) =>
    Boolean(
      href &&
        (pathname === href ||
          (href !== '/dashboard' && pathname.startsWith(`${href}/`)))
    )

  const activeGroupLabel = navigationGroups.find((group) =>
    group.items.some((item) => isPathActive(item.href))
  )?.label

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(
      navigationGroups.map((group) => [group.label, group.label === activeGroupLabel])
    )
  )

  useEffect(() => {
    if (!activeGroupLabel) return

    setOpenGroups((current) => ({
      ...current,
      [activeGroupLabel]: true,
    }))
  }, [activeGroupLabel])

  const toggleGroup = (label: string) => {
    setOpenGroups((current) => ({
      ...current,
      [label]: !current[label],
    }))
  }

  const primaryItemClasses = (active: boolean) =>
    `group relative flex h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-[13px] font-medium transition duration-200 ${
      active
        ? 'bg-[#343A40] text-white'
        : 'text-[#9CA3AF] hover:bg-white/5 hover:text-white'
    } ${collapsed ? 'lg:justify-center lg:px-0' : ''}`

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-40 flex w-[280px] flex-col border-r border-white/[0.06] bg-[#17181C] transition-[width,transform] duration-300 ease-out lg:relative lg:z-0 lg:translate-x-0 ${
        collapsed ? 'lg:w-20' : 'lg:w-[280px]'
      } ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}
      aria-label="Navegación principal"
    >
      <div
        className={`flex h-[88px] shrink-0 items-center border-b border-white/[0.06] px-5 ${
          collapsed ? 'lg:justify-center lg:px-0' : 'justify-between'
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
            NEDVI <span className="font-normal text-[#9CA3AF]">OS</span>
          </span>
        </div>

        <button
          type="button"
          onClick={onCloseMobile}
          className="rounded-lg p-2 text-[#9CA3AF] transition hover:bg-white/[0.06] hover:text-white lg:hidden"
          aria-label="Cerrar navegación"
        >
          <X size={18} strokeWidth={1.8} />
        </button>
      </div>

      <nav
        className="flex-1 overflow-y-auto px-3 py-5"
        aria-label="Módulos de NEDVI OS"
      >
        <p
          className={`mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#646873] transition-opacity ${
            collapsed ? 'lg:text-center lg:opacity-0' : ''
          }`}
        >
          Sistema
        </p>

        <Link
          href="/dashboard"
          title={collapsed ? 'Dashboard' : undefined}
          onClick={onCloseMobile}
          className={primaryItemClasses(isPathActive('/dashboard'))}
          aria-current={isPathActive('/dashboard') ? 'page' : undefined}
        >
          {isPathActive('/dashboard') ? (
            <span className="absolute left-0 h-5 w-0.5 rounded-r-full bg-[#163DFF]" />
          ) : null}
          <LayoutDashboard
            size={18}
            strokeWidth={isPathActive('/dashboard') ? 2 : 1.8}
            className={
              isPathActive('/dashboard')
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
            Dashboard
          </span>
        </Link>

        <div className="mt-2 space-y-1">
          {navigationGroups.map((group) => {
            const GroupIcon = group.icon
            const groupActive = group.items.some((item) => isPathActive(item.href))
            const isOpen = Boolean(openGroups[group.label])

            return (
              <div key={group.label}>
                <button
                  type="button"
                  onClick={() => toggleGroup(group.label)}
                  title={collapsed ? group.label : undefined}
                  className={`group flex h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-[13px] font-medium transition duration-200 ${
                    groupActive
                      ? 'bg-[#343A40] text-white'
                      : isOpen
                        ? 'bg-white/[0.025] text-[#d5d7df]'
                        : 'text-[#9CA3AF] hover:bg-white/5 hover:text-white'
                  } ${collapsed ? 'lg:justify-center lg:px-0' : ''}`}
                  aria-expanded={isOpen}
                >
                  <GroupIcon
                    size={18}
                    strokeWidth={groupActive ? 2 : 1.8}
                    className={
                      groupActive
                        ? 'text-[#6F88FF]'
                        : 'text-[#7D81D8] group-hover:text-white'
                    }
                  />

                  <span
                    className={`min-w-0 flex-1 truncate whitespace-nowrap transition-opacity duration-200 ${
                      collapsed
                        ? 'lg:pointer-events-none lg:w-0 lg:opacity-0'
                        : 'opacity-100'
                    }`}
                  >
                    {group.label}
                  </span>

                  <ChevronDown
                    size={14}
                    className={`shrink-0 text-[#646873] transition-transform duration-200 ${
                      isOpen ? 'rotate-180' : ''
                    } ${collapsed ? 'lg:hidden' : ''}`}
                  />
                </button>

                <div
                  className={`grid transition-[grid-template-rows,opacity] duration-200 ${
                    isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                  } ${collapsed ? 'lg:hidden' : ''}`}
                >
                  <div className="overflow-hidden">
                    <div className="ml-5 mt-1 space-y-1 border-l border-white/[0.06] pl-3">
                      {group.items.map((item) => {
                        const ItemIcon = item.icon
                        const active = isPathActive(item.href)

                        if (item.href) {
                          return (
                            <Link
                              key={item.label}
                              href={item.href}
                              onClick={onCloseMobile}
                              aria-current={active ? 'page' : undefined}
                              className={`group/sub relative flex min-h-9 items-center gap-2.5 rounded-lg px-3 py-2 text-[12px] font-medium transition ${
                                active
                                  ? 'bg-[#343A40] text-white'
                                  : 'text-[#858A96] hover:bg-white/[0.04] hover:text-white'
                              }`}
                            >
                              {active ? (
                                <span className="absolute -left-[13px] h-4 w-0.5 rounded-r-full bg-[#163DFF]" />
                              ) : null}
                              {ItemIcon ? (
                                <ItemIcon
                                  size={14}
                                  strokeWidth={1.8}
                                  className={active ? 'text-[#7187ff]' : 'text-[#646873]'}
                                />
                              ) : null}
                              <span className="truncate">{item.label}</span>
                            </Link>
                          )
                        }

                        return (
                          <button
                            key={item.label}
                            type="button"
                            disabled
                            title={`${item.label} - Próximamente`}
                            className="flex min-h-9 w-full cursor-not-allowed items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[12px] font-medium text-[#646873] opacity-65"
                          >
                            {ItemIcon ? <ItemIcon size={14} strokeWidth={1.7} /> : null}
                            <span className="min-w-0 flex-1 truncate">{item.label}</span>
                            {item.comingSoon ? (
                              <span className="rounded-md border border-white/[0.06] bg-white/[0.03] px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-[0.08em] text-[#565B66]">
                                Pronto
                              </span>
                            ) : null}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <div className="my-4 border-t border-white/[0.06]" />

        <Link
          href="/agenda"
          title={collapsed ? 'Agenda' : undefined}
          onClick={onCloseMobile}
          className={primaryItemClasses(isPathActive('/agenda'))}
          aria-current={isPathActive('/agenda') ? 'page' : undefined}
        >
          {isPathActive('/agenda') ? (
            <span className="absolute left-0 h-5 w-0.5 rounded-r-full bg-[#163DFF]" />
          ) : null}
          <CalendarDays
            size={18}
            strokeWidth={isPathActive('/agenda') ? 2 : 1.8}
            className={
              isPathActive('/agenda')
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
            Agenda
          </span>
        </Link>

        <button
          type="button"
          disabled
          title="Configuración - Próximamente"
          className={`${primaryItemClasses(false)} cursor-not-allowed opacity-50`}
        >
          <Settings2 size={18} strokeWidth={1.8} />
          <span
            className={`whitespace-nowrap transition-opacity duration-200 ${
              collapsed
                ? 'lg:pointer-events-none lg:w-0 lg:opacity-0'
                : 'opacity-100'
            }`}
          >
            Configuración
          </span>
        </button>

        <div className="my-5 border-t border-white/[0.06]" />

        <button
          type="button"
          title={collapsed ? 'Coral' : undefined}
          className={`group relative flex h-11 w-full items-center gap-3 rounded-xl border border-[#163DFF]/20 bg-[#163DFF]/[0.07] px-3 text-left text-[13px] font-medium text-[#d9deff] transition hover:border-[#163DFF]/40 hover:bg-[#163DFF]/[0.13] ${
            collapsed ? 'lg:justify-center lg:px-0' : ''
          }`}
        >
          <Bot size={18} strokeWidth={1.8} className="text-[#6f88ff]" />
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
            collapsed ? 'lg:justify-center lg:px-0' : ''
          }`}
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#2c3346] text-[10px] font-bold text-[#b7c2ff]">
            PG
          </span>
          <div
            className={`min-w-0 transition-opacity duration-200 ${
              collapsed
                ? 'lg:pointer-events-none lg:w-0 lg:opacity-0'
                : 'opacity-100'
            }`}
          >
            <p className="truncate text-xs font-medium text-white">Pedro Garcia</p>
            <p className="truncate text-[11px] text-[#646873]">Administrador</p>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={onToggleCollapse}
        className="absolute -right-3 top-[68px] hidden h-6 w-6 items-center justify-center rounded-full border border-white/[0.1] bg-[#20232A] text-[#9CA3AF] shadow-lg transition hover:bg-[#2a2e38] hover:text-white lg:flex"
        aria-label={collapsed ? 'Expandir menú lateral' : 'Contraer menú lateral'}
      >
        {collapsed ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
      </button>
    </aside>
  )
}
