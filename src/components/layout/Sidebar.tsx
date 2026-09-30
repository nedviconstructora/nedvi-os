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
  Ruler,
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
      { label: 'Oportunidades', href: '/opportunities', icon: ClipboardList },
      { label: 'Levantamiento', href: '/site-surveys', icon: Ruler },
      { label: 'Cotizaciones', href: '/quotes', icon: FileText },
    ],
  },
  {
    label: 'Gestión de Proyectos',
    icon: FolderKanban,
    items: [
      { label: 'Proyectos', href: '/projects', icon: HardHat },
      { label: 'Documentos', href: '/documents', icon: FileText },
    ],
  },
  {
    label: 'Compras y Suministros',
    icon: ShoppingCart,
    items: [
      { label: 'Requisiciones', href: '/requisitions', icon: ClipboardList },
      { label: 'Órdenes de compra', href: '/purchase-orders', icon: ShoppingCart },
      { label: 'Proveedores', href: '/suppliers', icon: Truck },
    ],
  },
  {
    label: 'Operaciones / Obra',
    icon: HardHat,
    items: [
      { label: 'Avance de obra', href: '/site-progress', icon: BarChart3 },
      { label: 'Reportes diarios', href: '/daily-reports', icon: FileText },
      { label: 'Asistencias', href: '/attendance', icon: UsersRound },
      { label: 'Cuadrillas', href: '/crews', icon: UserRound },
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
    <span className="flex h-16 w-16 shrink-0 items-center justify-center">
      <img
        src="/icon.png"
        alt="NEDVI Constructora"
        className="h-14 w-14 rounded-xl object-contain"
      />
    </span>
  )
}

export function Sidebar({ collapsed, mobileOpen, onToggleCollapse, onCloseMobile }: SidebarProps) {
  const pathname = usePathname()

  const isPathActive = (href?: string) =>
    Boolean(href && (pathname === href || (href !== '/dashboard' && pathname.startsWith(`${href}/`))))

  const activeGroupLabel = navigationGroups.find((group) =>
    group.items.some((item) => isPathActive(item.href)),
  )?.label

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(navigationGroups.map((group) => [group.label, group.label === activeGroupLabel])),
  )

  useEffect(() => {
    if (!activeGroupLabel) return
    setOpenGroups((current) => ({ ...current, [activeGroupLabel]: true }))
  }, [activeGroupLabel])

  const primaryItemClasses = (active: boolean) =>
    `group relative flex h-11 w-full items-center gap-3 rounded-xl bg-[#7DC6FF] px-3 text-left text-[13px] font-medium text-black transition duration-200 hover:brightness-95 ${
      active ? 'ring-1 ring-black/25 shadow-sm' : ''
    } ${collapsed ? 'lg:justify-center lg:px-0' : ''}`

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-40 flex w-[280px] flex-col border-r border-black/10 bg-[#4BC3D6] transition-[width,transform] duration-300 ease-out lg:relative lg:z-0 lg:translate-x-0 ${
        collapsed ? 'lg:w-20' : 'lg:w-[280px]'
      } ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}
      aria-label="Navegación principal"
    >
      <div className={`flex h-[112px] shrink-0 items-center border-b border-black/10 px-4 ${collapsed ? 'lg:justify-center lg:px-0' : 'justify-between'}`}>
        <div className={`flex items-center gap-3 overflow-hidden ${collapsed ? 'lg:w-16' : ''}`}>
          <BrandMark />
          <span className={`whitespace-nowrap text-[27px] font-bold tracking-[-0.045em] text-black transition-opacity duration-200 ${collapsed ? 'lg:pointer-events-none lg:w-0 lg:opacity-0' : 'opacity-100'}`}>
            NEDVI <span className="font-medium text-black/80">OS</span>
          </span>
        </div>
        <button type="button" onClick={onCloseMobile} className="rounded-lg p-2 text-black/70 transition hover:bg-black/10 hover:text-black lg:hidden" aria-label="Cerrar navegación">
          <X size={18} strokeWidth={1.8} />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-5" aria-label="Módulos de NEDVI OS">
        <p className={`mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-black/70 transition-opacity ${collapsed ? 'lg:text-center lg:opacity-0' : ''}`}>Sistema</p>

        <Link href="/dashboard" title={collapsed ? 'Dashboard' : undefined} onClick={onCloseMobile} className={primaryItemClasses(isPathActive('/dashboard'))}>
          {isPathActive('/dashboard') ? <span className="absolute left-0 h-5 w-0.5 rounded-r-full bg-black" /> : null}
          <LayoutDashboard size={18} strokeWidth={isPathActive('/dashboard') ? 2 : 1.8} className="text-black" />
          <span className={`whitespace-nowrap transition-opacity duration-200 ${collapsed ? 'lg:pointer-events-none lg:w-0 lg:opacity-0' : 'opacity-100'}`}>Dashboard</span>
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
                  onClick={() => setOpenGroups((current) => ({ ...current, [group.label]: !current[group.label] }))}
                  title={collapsed ? group.label : undefined}
                  className={`group flex h-11 w-full items-center gap-3 rounded-xl bg-[#7DC6FF] px-3 text-left text-[13px] font-medium text-black transition duration-200 hover:brightness-95 ${
                    groupActive ? 'ring-1 ring-black/25 shadow-sm' : isOpen ? 'ring-1 ring-black/10' : ''
                  } ${collapsed ? 'lg:justify-center lg:px-0' : ''}`}
                  aria-expanded={isOpen}
                >
                  <GroupIcon size={18} strokeWidth={groupActive ? 2 : 1.8} className="text-black" />
                  <span className={`min-w-0 flex-1 truncate whitespace-nowrap transition-opacity duration-200 ${collapsed ? 'lg:pointer-events-none lg:w-0 lg:opacity-0' : 'opacity-100'}`}>{group.label}</span>
                  <ChevronDown size={14} className={`shrink-0 text-black/70 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''} ${collapsed ? 'lg:hidden' : ''}`} />
                </button>

                <div className={`grid transition-[grid-template-rows,opacity] duration-200 ${isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'} ${collapsed ? 'lg:hidden' : ''}`}>
                  <div className="overflow-hidden">
                    <div className="ml-5 mt-1 space-y-1 border-l border-black/15 pl-3">
                      {group.items.map((item) => {
                        const ItemIcon = item.icon
                        const active = isPathActive(item.href)

                        if (item.href) {
                          return (
                            <Link key={item.label} href={item.href} onClick={onCloseMobile} className={`group/sub relative flex min-h-9 items-center gap-2.5 rounded-lg bg-[#E9F8FA] px-3 py-2 text-[12px] font-medium text-black transition hover:brightness-95 ${active ? 'ring-1 ring-black/25 shadow-sm' : ''}`}>
                              {active ? <span className="absolute -left-[13px] h-4 w-0.5 rounded-r-full bg-black" /> : null}
                              {ItemIcon ? <ItemIcon size={14} strokeWidth={1.8} className="text-black" /> : null}
                              <span className="truncate">{item.label}</span>
                            </Link>
                          )
                        }

                        return (
                          <button key={item.label} type="button" disabled title={`${item.label} - Próximamente`} className="flex min-h-9 w-full cursor-not-allowed items-center gap-2.5 rounded-lg bg-[#E9F8FA] px-3 py-2 text-left text-[12px] font-medium text-black opacity-50">
                            {ItemIcon ? <ItemIcon size={14} strokeWidth={1.7} /> : null}
                            <span className="min-w-0 flex-1 truncate">{item.label}</span>
                            {item.comingSoon ? <span className="rounded-md border border-black/10 bg-black/5 px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-[0.08em] text-black/60">Pronto</span> : null}
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

        <div className="my-4 border-t border-black/15" />

        <Link href="/agenda" title={collapsed ? 'Agenda' : undefined} onClick={onCloseMobile} className={primaryItemClasses(isPathActive('/agenda'))}>
          <CalendarDays size={18} strokeWidth={isPathActive('/agenda') ? 2 : 1.8} className="text-black" />
          <span className={`whitespace-nowrap transition-opacity duration-200 ${collapsed ? 'lg:pointer-events-none lg:w-0 lg:opacity-0' : 'opacity-100'}`}>Agenda</span>
        </Link>

        <button type="button" disabled title="Configuración - Próximamente" className={`${primaryItemClasses(false)} cursor-not-allowed opacity-50`}>
          <Settings2 size={18} strokeWidth={1.8} />
          <span className={`whitespace-nowrap transition-opacity duration-200 ${collapsed ? 'lg:pointer-events-none lg:w-0 lg:opacity-0' : 'opacity-100'}`}>Configuración</span>
        </button>

        <div className="my-5 border-t border-black/15" />
        <button type="button" title={collapsed ? 'Coral' : undefined} className={`group relative flex h-11 w-full items-center gap-3 rounded-xl border border-black/15 bg-[#7DC6FF] px-3 text-left text-[13px] font-medium text-black transition hover:brightness-95 ${collapsed ? 'lg:justify-center lg:px-0' : ''}`}>
          <Bot size={18} strokeWidth={1.8} className="text-black" />
          <span className={`whitespace-nowrap transition-opacity duration-200 ${collapsed ? 'lg:pointer-events-none lg:w-0 lg:opacity-0' : 'opacity-100'}`}>Coral</span>
          <span className={`ml-auto rounded-md bg-black/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-black/70 ${collapsed ? 'lg:hidden' : ''}`}>AI</span>
        </button>
      </nav>

      <div className="border-t border-black/15 p-3">
        <div className={`flex items-center gap-3 rounded-xl px-2 py-2 ${collapsed ? 'lg:justify-center lg:px-0' : ''}`}>
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#E9F8FA] text-[10px] font-bold text-black">PG</span>
          <div className={`min-w-0 transition-opacity duration-200 ${collapsed ? 'lg:pointer-events-none lg:w-0 lg:opacity-0' : 'opacity-100'}`}>
            <p className="truncate text-xs font-medium text-black">Pedro Garcia</p>
            <p className="truncate text-[11px] text-black/70">Administrador</p>
          </div>
        </div>
      </div>

      <button type="button" onClick={onToggleCollapse} className="absolute -right-3 top-[86px] hidden h-6 w-6 items-center justify-center rounded-full border border-black/15 bg-[#E9F8FA] text-black shadow-lg transition hover:brightness-95 lg:flex" aria-label={collapsed ? 'Expandir menú lateral' : 'Contraer menú lateral'}>
        {collapsed ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
      </button>
    </aside>
  )
}
