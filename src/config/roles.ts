export type AppRole = 'Administración' | 'Supervisor' | 'Cliente'

export type ModulePermission =
  | 'dashboard'
  | 'commercial'
  | 'projects'
  | 'purchasing'
  | 'operations'
  | 'agenda'
  | 'human-resources'
  | 'finance'
  | 'indicators'
  | 'settings'
  | 'coral'
  | 'client-portal'

export const ROLE_PERMISSIONS: Record<AppRole, readonly ModulePermission[]> = {
  Administración: [
    'dashboard',
    'commercial',
    'projects',
    'purchasing',
    'operations',
    'agenda',
    'human-resources',
    'finance',
    'indicators',
    'settings',
    'coral',
  ],
  Supervisor: [
    'dashboard',
    'commercial',
    'projects',
    'purchasing',
    'operations',
    'agenda',
  ],
  Cliente: ['client-portal'],
}

export const ROLE_DESCRIPTIONS: Record<AppRole, string> = {
  Administración: 'Acceso total a NEDVI OS.',
  Supervisor:
    'Acceso a Comercial y Ventas, Gestión de Proyectos, Compras y Suministros, Operaciones / Obra y Agenda.',
  Cliente: 'Acceso exclusivo al portal del cliente y a la información vinculada con su folio.',
}

export function hasModuleAccess(role: AppRole, permission: ModulePermission) {
  return ROLE_PERMISSIONS[role].includes(permission)
}

const ROUTE_PERMISSIONS: Array<{ prefix: string; permission: ModulePermission }> = [
  { prefix: '/client', permission: 'client-portal' },
  { prefix: '/dashboard', permission: 'dashboard' },
  { prefix: '/crm', permission: 'commercial' },
  { prefix: '/opportunities', permission: 'commercial' },
  { prefix: '/site-surveys', permission: 'commercial' },
  { prefix: '/quotes', permission: 'commercial' },
  { prefix: '/projects', permission: 'projects' },
  { prefix: '/documents', permission: 'projects' },
  { prefix: '/budgets', permission: 'projects' },
  { prefix: '/requisitions', permission: 'purchasing' },
  { prefix: '/purchase-orders', permission: 'purchasing' },
  { prefix: '/suppliers', permission: 'purchasing' },
  { prefix: '/site-progress', permission: 'operations' },
  { prefix: '/daily-reports', permission: 'operations' },
  { prefix: '/attendance', permission: 'operations' },
  { prefix: '/crews', permission: 'operations' },
  { prefix: '/agenda', permission: 'agenda' },
  { prefix: '/personnel', permission: 'human-resources' },
  { prefix: '/hr-attendance', permission: 'human-resources' },
  { prefix: '/payroll', permission: 'human-resources' },
  { prefix: '/settings', permission: 'settings' },
]

export function permissionForPath(pathname: string): ModulePermission | undefined {
  return ROUTE_PERMISSIONS.find(
    ({ prefix }) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  )?.permission
}

export function canAccessPath(role: AppRole, pathname: string) {
  const permission = permissionForPath(pathname)
  return permission ? hasModuleAccess(role, permission) : true
}
