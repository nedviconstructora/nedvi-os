export type AppRole = 'DEVELOPER' | 'Gerente Comercial' | 'Gerente Administrativo' | 'Gerente Operativo' | 'Supervisor de Obra' | 'Supervisor Administrativo' | 'RH' | 'Administración' | 'Supervisor' | 'Contabilidad' | 'Cliente'

export type ModulePermission =
  | 'dashboard'
  | 'commercial'
  | 'projects'
  | 'purchasing'
  | 'operations'
  | 'agenda'
  | 'time-clock'
  | 'human-resources'
  | 'finance'
  | 'indicators'
  | 'settings'
  | 'coral'
  | 'client-portal'
  | 'developer-panel'
  | 'management-attendance'

export const ROLE_LABELS: Record<AppRole, string> = {
  DEVELOPER: 'DEVELOPER',
  'Gerente Comercial': 'GERENTE COMERCIAL',
  'Gerente Administrativo': 'GERENTE ADMINISTRATIVO',
  'Gerente Operativo': 'GERENTE OPERATIVO',
  'Supervisor de Obra': 'SUPERVISOR DE OBRA',
  'Supervisor Administrativo': 'SUPERVISOR ADMINISTRATIVO',
  Administración: 'ADMIN',
  Supervisor: 'SUPERVISOR',
  RH: 'RH',
  Contabilidad: 'CONTABILIDAD',
  Cliente: 'CLIENTE',
}

const MANAGEMENT_PERMISSIONS: readonly ModulePermission[] = ['management-attendance','dashboard','commercial','projects','purchasing','operations','agenda','time-clock','human-resources','finance','indicators','settings','coral']

export const ROLE_PERMISSIONS: Record<AppRole, readonly ModulePermission[]> = {
  'Gerente Comercial': MANAGEMENT_PERMISSIONS,
  'Gerente Administrativo': MANAGEMENT_PERMISSIONS,
  'Gerente Operativo': MANAGEMENT_PERMISSIONS,
  'Supervisor de Obra': ['dashboard','commercial','projects','operations','agenda','time-clock','indicators','coral'],
  // Bloqueado preventivamente hasta aplicar filtros de proyectos y lecturas en cada API.
  'Supervisor Administrativo': ['dashboard'],
  RH: ['dashboard'],
  DEVELOPER: ['management-attendance','dashboard','commercial','projects','purchasing','operations','agenda','time-clock','human-resources','finance','indicators','settings','coral','developer-panel'],
  Administración: [
    'dashboard',
    'commercial',
    'projects',
    'purchasing',
    'operations',
    'agenda',
    'time-clock',
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
    'operations',
    'agenda',
    'time-clock',
    'indicators',
    'coral',
  ],
  Contabilidad: ['time-clock'],
  Cliente: ['client-portal'],
}

export const ROLE_DESCRIPTIONS: Record<AppRole, string> = {
  'Gerente Comercial': 'Acceso empresarial completo a módulos presentes y futuros, excepto herramientas reservadas para DEVELOPER.',
  'Gerente Administrativo': 'Acceso empresarial completo a módulos presentes y futuros, excepto herramientas reservadas para DEVELOPER.',
  'Gerente Operativo': 'Acceso empresarial completo a módulos presentes y futuros, excepto herramientas reservadas para DEVELOPER.',
  'Supervisor de Obra': 'Acceso operativo a clientes, levantamientos, cotizaciones, proyectos y obra; sin RH, nómina ni administración sensible.',
  'Supervisor Administrativo': 'Acceso restringido preventivamente hasta completar las consultas de solo lectura y el filtro de proyectos autorizados.',
  DEVELOPER: 'Acceso técnico total, gestión de usuarios y configuración del sistema.',
  Administración:
    'Acceso total a NEDVI OS, incluidos usuarios y permisos, Recursos Humanos, nómina, finanzas y configuración administrativa.',
  Supervisor:
    'Acceso operativo amplio: clientes, oportunidades, levantamientos, cotizaciones, proyectos, documentos, compras, proveedores, obra, avances, reportes, asistencias, cuadrillas, agenda, indicadores y Coral AI. Sin acceso a Recursos Humanos, nómina, finanzas ni configuración de usuarios y permisos.',
  RH: 'Acceso restringido hasta completar permisos de Recursos Humanos y proyectos autorizados.',
  Contabilidad: 'Acceso de solo lectura al historial del Checador y sus exportaciones. Sin permisos de edición.',
  Cliente:
    'Acceso exclusivo al Portal del Cliente para consultar únicamente sus proyectos y la información de avance autorizada por NEDVI.',
}

export function hasModuleAccess(role: AppRole, permission: ModulePermission) {
  return ROLE_PERMISSIONS[role].includes(permission)
}

const ROUTE_PERMISSIONS: Array<{ prefix: string; permission: ModulePermission }> = [
  { prefix: '/client', permission: 'client-portal' },
  { prefix: '/dashboard', permission: 'dashboard' },
  { prefix: '/drive-reports', permission: 'dashboard' },
  { prefix: '/mail', permission: 'commercial' },
  { prefix: '/crm', permission: 'commercial' },
  { prefix: '/folio-search', permission: 'commercial' },
  { prefix: '/opportunities', permission: 'commercial' },
  { prefix: '/site-surveys', permission: 'commercial' },
  { prefix: '/quotes', permission: 'commercial' },
  { prefix: '/projects', permission: 'projects' },
  { prefix: '/cad-studio', permission: 'projects' },
  { prefix: '/documents', permission: 'projects' },
  { prefix: '/budgets', permission: 'projects' },
  { prefix: '/requisitions', permission: 'purchasing' },
  { prefix: '/purchase-orders', permission: 'purchasing' },
  { prefix: '/suppliers', permission: 'purchasing' },
  { prefix: '/site-progress', permission: 'operations' },
  { prefix: '/daily-reports', permission: 'operations' },
  { prefix: '/inspections', permission: 'operations' },
  { prefix: '/medidor', permission: 'operations' },
  { prefix: '/attendance', permission: 'operations' },
  { prefix: '/crews', permission: 'operations' },
  { prefix: '/agenda', permission: 'agenda' },
  { prefix: '/time-clock', permission: 'time-clock' },
  { prefix: '/personnel', permission: 'human-resources' },
  { prefix: '/hr-attendance', permission: 'human-resources' },
  { prefix: '/payroll', permission: 'human-resources' },
  { prefix: '/developer', permission: 'developer-panel' },
  { prefix: '/management-attendance', permission: 'management-attendance' },
  { prefix: '/settings', permission: 'settings' },
]

export function permissionForPath(pathname: string): ModulePermission | undefined {
  return ROUTE_PERMISSIONS.find(
    ({ prefix }) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  )?.permission
}

export function canAccessPath(role: AppRole, pathname: string) {
  if (pathname === '/drive-reports' || pathname.startsWith('/drive-reports/')) {
    return role !== 'Cliente'
  }
  const permission = permissionForPath(pathname)
  return permission ? hasModuleAccess(role, permission) : true
}
