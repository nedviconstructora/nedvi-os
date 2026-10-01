import { ROLE_PERMISSIONS, type AppRole, type ModulePermission } from '@/config/roles'

export const REGISTRATION_REQUESTS_KEY = 'nedvi-registration-requests'
export const ACCESS_USERS_KEY = 'nedvi-access-users'

export type RegistrationStatus = 'Pendiente' | 'Aprobada' | 'Rechazada'
export type AccessUserStatus = 'Activo' | 'Inactivo'

export type RegistrationRequest = {
  id: string
  name: string
  email: string
  phone: string
  position: string
  status: RegistrationStatus
  role: AppRole | null
  permissions?: ModulePermission[]
  createdAt: string
  reviewedAt?: string
}

export type AccessUser = {
  id: string
  name: string
  email: string
  phone: string
  position: string
  role: AppRole
  permissions: ModulePermission[]
  status: AccessUserStatus
  createdAt: string
}

function readArray<T>(key: string): T[] {
  if (typeof window === 'undefined') return []

  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return []
    const parsed = JSON.parse(raw) as T[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function readRegistrationRequests(): RegistrationRequest[] {
  return readArray<RegistrationRequest>(REGISTRATION_REQUESTS_KEY).map((request) => ({
    ...request,
    status: request.status ?? 'Pendiente',
    role: request.role ?? null,
  }))
}

export function writeRegistrationRequests(requests: RegistrationRequest[]) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(REGISTRATION_REQUESTS_KEY, JSON.stringify(requests))
}

export function readAccessUsers(): AccessUser[] {
  return readArray<AccessUser>(ACCESS_USERS_KEY)
}

export function writeAccessUsers(users: AccessUser[]) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(ACCESS_USERS_KEY, JSON.stringify(users))
}

export function defaultPermissionsForRole(role: AppRole): ModulePermission[] {
  return [...ROLE_PERMISSIONS[role]]
}
