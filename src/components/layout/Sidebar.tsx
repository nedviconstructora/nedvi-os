'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
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
  Facebook,
  FileText,
  FolderKanban,
  Globe2,
  HardHat,
  Instagram,
  LayoutDashboard,
  LogOut,
  Ruler,
  Settings2,
  ShoppingCart,
  Truck,
  UserRound,
  UsersRound,
  Wallet,
  X,
} from 'lucide-react'
import type { ModulePermission } from '@/config/roles'
import {
  clearAccessSession,
  type AccessSession,
} from '@/features/access/services/accessStorage'

type SidebarProps = {
  collapsed: boolean
  mobileOpen: boolean
  onToggleCollapse: () => void
  onCloseMobile: () => void
  user: AccessSession
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
  permission: ModulePermission
  items: NavigationItem[]
}

const navigationGroups: NavigationGroup[] = [
  {
    label: 'Comercial y Ventas',
    icon: BriefcaseBusiness,
    permission: 'commercial',
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
    permission: 'projects',
    items: [
      { label: 'Proyectos', href: '/projects', icon: HardHat },
      { label: 'Documentos', href: '/documents', icon: FileText },
    ],
  },
  {
    label: 'Compras y Suministros',
    icon: ShoppingCart,
    permission: 'purchasing',
    items: [
      { label: 'Requisiciones', href: '/requisitions', icon: ClipboardList },
      { label: 'Órdenes de compra', href: '/purchase-orders', icon: ShoppingCart },
      { label: 'Proveedores', href: '/suppliers', icon: Truck },
    ],
  },
  {
    label: 'Operaciones / Obra',
    icon: HardHat,
    permission: 'operations',
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
    permission: 'human-resources',
    items: [
      { label: 'Personal', icon: UserRound, comingSoon: true },
      { label: 'Asistencias', icon: CalendarDays, comingSoon: true },
      { label: 'Nómina', icon: Wallet, comingSoon: true },
    ],
  },
  {
    label: 'Finanzas',
    icon: CircleDollarSign,
    permission: 'finance',
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
    permission: 'indicators',
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

export function Sidebar({
  collapsed,
  mobileOpen,
  onToggleCollapse,
  onCloseMobile,
  user,
}: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const canUse = (permission: ModulePermission) => user.permissions.includes(permission)
  const visibleNavigationGroups = navigationGroups.filter((group) => canUse(group.permission))

  const isPathActive = (href?: string) =>
    Boolean(href && (pathname === href || (href !== '/dashboard' && pathname.startsWith(`${href}/`))))

  const activeGroupLabel = visibleNavigationGroups.find((group) =>
    group.items.some((item) => isPathActive(item.href)),
  )?.label

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(
      visibleNavigationGroups.map((group) => [group.label, group.label === activeGroupLabel]),
    ),
  )

  function handleLogout() {
    clearAccessSession()
    onCloseMobile()
    router.replace('/login')
  }

  const primaryItemClasses = (active: boolean) =>
    `group relative flex h-11 w-full items-center gap-3 rounded-xl border border-white/10 bg-white/[0.10] px-3 text-left text-[13px] font-medium text-white shadow-sm backdrop-blur-md transition duration-200 hover:bg-white/20/[0.16] ${
      active ? 'ring-1 ring-white/25 shadow-sm' : ''
    } ${collapsed ? 'lg:justify-center lg:gap-0 lg:px-0' : ''}`

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-40 flex w-[280px] flex-col overflow-hidden border-r border-white/10 bg-[linear-gradient(180deg,rgba(13,40,66,0.94)_0%,rgba(30,88,122,0.92)_48%,rgba(16,53,84,0.95)_100%)] text-white shadow-[18px_0_50px_rgba(2,12,27,0.18)] backdrop-blur-2xl transition-[width,transform] duration-300 ease-out lg:relative lg:z-0 lg:translate-x-0 ${
        collapsed ? 'lg:w-20' : 'lg:w-[280px]'
      } ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}
      aria-label="Navegación principal"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_8%,rgba(125,198,255,0.28),transparent_30%),radial-gradient(circle_at_85%_65%,rgba(84,150,204,0.20),transparent_34%)]" />
      <div className="pointer-events-none absolute -bottom-24 -left-20 h-72 w-72 rounded-full bg-white/[0.05] blur-3xl" />
      <div className="pointer-events-none absolute -right-24 top-52 h-64 w-64 rounded-full bg-[#7DC6FF]/10 blur-3xl" />

      <div className={`relative z-10 flex h-[112px] shrink-0 items-center border-b border-white/10 px-4 ${collapsed ? 'lg:justify-center lg:px-0' : 'justify-between'}`}>
        <div className={`flex items-center gap-3 overflow-hidden ${collapsed ? 'lg:w-16 lg:gap-0' : ''}`}>
          <BrandMark />
          <span className={`whitespace-nowrap text-[27px] font-bold tracking-[-0.045em] text-white transition-opacity duration-200 ${collapsed ? 'lg:hidden' : 'opacity-100'}`}>
            NEDVI <span className="font-medium text-[#9ED2F8]">OS</span>
          </span>
        </div>
        <button type="button" onClick={onCloseMobile} className="rounded-lg p-2 text-white/70 transition hover:bg-white/20/10 hover:text-white lg:hidden" aria-label="Cerrar navegación">
          <X size={18} strokeWidth={1.8} />
        </button>
      </div>

      <nav className="relative z-10 flex-1 overflow-y-auto px-3 py-5" aria-label="Módulos de NEDVI OS">
        <p className={`mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/70 transition-opacity ${collapsed ? 'lg:text-center lg:opacity-0' : ''}`}>Sistema</p>

        {canUse('dashboard') ? (
          <Link href="/dashboard" title={collapsed ? 'Inicio' : undefined} onClick={onCloseMobile} className={primaryItemClasses(isPathActive('/dashboard'))}>
            {isPathActive('/dashboard') ? <span className="absolute left-0 h-5 w-0.5 rounded-r-full bg-white" /> : null}
            <LayoutDashboard size={18} strokeWidth={isPathActive('/dashboard') ? 2 : 1.8} className="shrink-0 text-white" />
            <span className={`whitespace-nowrap transition-opacity duration-200 ${collapsed ? 'lg:hidden' : 'opacity-100'}`}>Inicio</span>
          </Link>
        ) : null}

        <div className="mt-2 space-y-1">
          {visibleNavigationGroups.map((group) => {
            const GroupIcon = group.icon
            const groupActive = group.items.some((item) => isPathActive(item.href))
            const isOpen = Boolean(openGroups[group.label])

            return (
              <div key={group.label}>
                <button
                  type="button"
                  onClick={() => setOpenGroups((current) => ({ ...current, [group.label]: !current[group.label] }))}
                  title={collapsed ? group.label : undefined}
                  className={`group flex h-11 w-full items-center gap-3 rounded-xl border border-white/10 bg-white/[0.10] px-3 text-left text-[13px] font-medium text-white shadow-sm backdrop-blur-md transition duration-200 hover:bg-white/20/[0.16] ${
                    groupActive ? 'ring-1 ring-white/25 shadow-sm' : isOpen ? 'ring-1 ring-white/10' : ''
                  } ${collapsed ? 'lg:justify-center lg:gap-0 lg:px-0' : ''}`}
                  aria-expanded={isOpen}
                >
                  <GroupIcon size={18} strokeWidth={groupActive ? 2 : 1.8} className="shrink-0 text-white" />
                  <span className={`min-w-0 flex-1 truncate whitespace-nowrap transition-opacity duration-200 ${collapsed ? 'lg:hidden' : 'opacity-100'}`}>{group.label}</span>
                  <ChevronDown size={14} className={`shrink-0 text-white/70 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''} ${collapsed ? 'lg:hidden' : ''}`} />
                </button>

                <div className={`grid transition-[grid-template-rows,opacity] duration-200 ${isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'} ${collapsed ? 'lg:hidden' : ''}`}>
                  <div className="overflow-hidden">
                    <div className="ml-5 mt-1 space-y-1 border-l border-white/10 pl-3">
                      {group.items.map((item) => {
                        const ItemIcon = item.icon
                        const active = isPathActive(item.href)

                        if (item.href) {
                          return (
                            <Link key={item.label} href={item.href} onClick={onCloseMobile} className={`group/sub relative flex min-h-9 items-center gap-2.5 rounded-lg bg-white/[0.12] px-3 py-2 text-[12px] font-medium text-white backdrop-blur-md transition hover:bg-white/20/[0.18] ${active ? 'ring-1 ring-white/25 shadow-sm' : ''}`}>
                              {active ? <span className="absolute -left-[13px] h-4 w-0.5 rounded-r-full bg-white" /> : null}
                              {ItemIcon ? <ItemIcon size={14} strokeWidth={1.8} className="text-white" /> : null}
                              <span className="truncate">{item.label}</span>
                            </Link>
                          )
                        }

                        return (
                          <button key={item.label} type="button" disabled title={`${item.label} - Próximamente`} className="flex min-h-9 w-full cursor-not-allowed items-center gap-2.5 rounded-lg bg-white/[0.08] px-3 py-2 text-left text-[12px] font-medium text-white opacity-50">
                            {ItemIcon ? <ItemIcon size={14} strokeWidth={1.7} /> : null}
                            <span className="min-w-0 flex-1 truncate">{item.label}</span>
                            {item.comingSoon ? <span className="rounded-md border border-white/10 bg-white/10 px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-[0.08em] text-white/60">Pronto</span> : null}
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

        {canUse('agenda') || canUse('settings') || canUse('coral') ? (
          <div className="my-4 border-t border-white/10" />
        ) : null}

        {canUse('agenda') ? (
          <Link href="/agenda" title={collapsed ? 'Agenda' : undefined} onClick={onCloseMobile} className={primaryItemClasses(isPathActive('/agenda'))}>
            <CalendarDays size={18} strokeWidth={isPathActive('/agenda') ? 2 : 1.8} className="shrink-0 text-white" />
            <span className={`whitespace-nowrap transition-opacity duration-200 ${collapsed ? 'lg:hidden' : 'opacity-100'}`}>Agenda</span>
          </Link>
        ) : null}

        {canUse('settings') ? (
          <Link
            href="/settings/users"
            title={collapsed ? 'Configuración' : undefined}
            onClick={onCloseMobile}
            className={`${primaryItemClasses(isPathActive('/settings'))} mt-2`}
          >
            {isPathActive('/settings') ? <span className="absolute left-0 h-5 w-0.5 rounded-r-full bg-white" /> : null}
            <Settings2 size={18} strokeWidth={isPathActive('/settings') ? 2 : 1.8} className="shrink-0" />
            <span className={`whitespace-nowrap transition-opacity duration-200 ${collapsed ? 'lg:hidden' : 'opacity-100'}`}>Configuración</span>
          </Link>
        ) : null}

        {canUse('coral') ? (
          <>
            <div className="my-5 border-t border-white/10" />
            <button type="button" title={collapsed ? 'Coral' : undefined} className={`group relative flex h-11 w-full items-center gap-3 rounded-xl border border-white/10 bg-[#7DC6FF] px-3 text-left text-[13px] font-medium text-black transition hover:brightness-95 ${collapsed ? 'lg:justify-center lg:gap-0 lg:px-0' : ''}`}>
              <Bot size={18} strokeWidth={1.8} className="shrink-0 text-white" />
              <span className={`whitespace-nowrap transition-opacity duration-200 ${collapsed ? 'lg:hidden' : 'opacity-100'}`}>Coral</span>
              <span className={`ml-auto rounded-md bg-white/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white/70 ${collapsed ? 'lg:hidden' : ''}`}>AI</span>
            </button>
          </>
        ) : null}

        <div className={`mt-4 rounded-xl border border-white/10 bg-white/[0.08] p-3 backdrop-blur-lg ${collapsed ? 'lg:hidden' : ''}`}>
          <p className="px-1 text-[9px] font-bold uppercase tracking-[0.14em] text-white/60">
            Síguenos
          </p>
          <div className="mt-2 grid grid-cols-3 gap-2">
            <a
              href="https://www.instagram.com/nedviconstructora?stkn=cjY1NWcya3Z0ZTVq"
              target="_blank"
              rel="noreferrer"
              title="Instagram · @nedviconstructora"
              aria-label="Abrir Instagram de NEDVI Constructora"
              className="flex h-10 items-center justify-center rounded-lg bg-white/[0.12] text-white shadow-sm backdrop-blur-md transition hover:-translate-y-0.5 hover:bg-white/20"
            >
              <Instagram size={17} strokeWidth={1.9} />
            </a>
            <a
              href="https://www.facebook.com/share/18CMd2VqoK/"
              target="_blank"
              rel="noreferrer"
              title="Facebook · NEDVI Constructora"
              aria-label="Abrir Facebook de NEDVI Constructora"
              className="flex h-10 items-center justify-center rounded-lg bg-white/[0.12] text-white shadow-sm backdrop-blur-md transition hover:-translate-y-0.5 hover:bg-white/20"
            >
              <Facebook size={17} strokeWidth={1.9} />
            </a>
            <a
              href="https://www.nedviconstructora.com"
              target="_blank"
              rel="noreferrer"
              title="Sitio web · nedviconstructora.com"
              aria-label="Abrir sitio web de NEDVI Constructora"
              className="flex h-10 items-center justify-center rounded-lg bg-white/[0.12] text-white shadow-sm backdrop-blur-md transition hover:-translate-y-0.5 hover:bg-white/20"
            >
              <Globe2 size={17} strokeWidth={1.9} />
            </a>
          </div>
        </div>
      </nav>

      <div className="border-t border-white/10 p-3">
        <button
          type="button"
          onClick={handleLogout}
          title={collapsed ? 'Cerrar sesión' : undefined}
          className={`mt-1 flex h-10 w-full items-center gap-3 rounded-xl px-2 text-left text-xs font-semibold text-white/75 transition hover:bg-white/20/10 hover:text-white ${collapsed ? 'lg:justify-center lg:gap-0 lg:px-0' : ''}`}
        >
          <LogOut size={17} strokeWidth={1.8} className="shrink-0" />
          <span className={`${collapsed ? 'lg:hidden' : ''}`}>Cerrar sesión</span>
        </button>
      </div>

      <button type="button" onClick={onToggleCollapse} className="absolute -right-3 top-[86px] hidden h-6 w-6 items-center justify-center rounded-full border border-white/10 bg-[#E9F8FA] text-black shadow-lg transition hover:brightness-95 lg:flex" aria-label={collapsed ? 'Expandir menú lateral' : 'Contraer menú lateral'}>
        {collapsed ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
      </button>
    </aside>
  )
}
