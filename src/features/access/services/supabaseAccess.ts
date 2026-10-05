'use client'

import { defaultPermissionsForRole } from '@/features/access/services/accessStorage'
import type { AppRole, ModulePermission } from '@/config/roles'

export type DatabaseProfile = {
  id: string
  email: string | null
  full_name: string | null
  phone: string | null
  position: string | null
  role: string
  active: boolean
  permissions: string[] | null
  updated_at?: string | null
  deleted_at?: string | null
}

type NedviSession = {
  access_token?: string
}

function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

  if (!url || !key) throw new Error('Supabase no está configurado.')
  return { url, key }
}

function getAccessToken() {
  if (typeof window === 'undefined') return ''
  try {
    const raw = window.localStorage.getItem('nedvi_session')
    if (!raw) return ''
    const parsed = JSON.parse(raw) as NedviSession
    return parsed.access_token || ''
  } catch {
    return ''
  }
}

async function supabaseFetch(path: string, init?: RequestInit) {
  const { url, key } = getSupabaseConfig()
  const accessToken = getAccessToken()
  if (!accessToken) throw new Error('La sesión de Supabase no está disponible. Inicia sesión de nuevo.')

  const response = await fetch(`${url}${path}`, {
    ...init,
    headers: {
      apikey: key,
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  })

  if (!response.ok) {
    const detail = await response.text().catch(() => '')
    throw new Error(`Supabase HTTP ${response.status}${detail ? `: ${detail}` : ''}`)
  }

  return response
}

export function mapDatabaseRole(role: string): AppRole {
  const normalized = role.trim().toLowerCase()
  if (normalized === 'cliente') return 'Cliente'
  if (normalized === 'obra' || normalized === 'supervisor') return 'Supervisor'
  return 'Administración'
}

function mapAppRoleToDatabase(role: string) {
  const normalized = role.trim().toLowerCase()
  if (normalized === 'cliente') return 'cliente'
  if (normalized === 'supervisor' || normalized === 'obra') return 'obra'
  return 'administracion'
}

export function profilePermissions(profile: DatabaseProfile): ModulePermission[] {
  const role = mapDatabaseRole(profile.role)
  const allowed = new Set<ModulePermission>([
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
    'client-portal',
  ])
  const permissions = (profile.permissions || []).filter(
    (permission): permission is ModulePermission => allowed.has(permission as ModulePermission),
  )
  return permissions.length ? permissions : defaultPermissionsForRole(role)
}

export async function listDatabaseProfiles(): Promise<DatabaseProfile[]> {
  const response = await supabaseFetch(
    '/rest/v1/profiles?select=id,email,full_name,phone,position,role,active,permissions,updated_at,deleted_at&deleted_at=is.null&order=full_name.asc.nullslast',
  )
  return (await response.json()) as DatabaseProfile[]
}

export async function updateDatabaseProfile(
  id: string,
  changes: Partial<
    Pick<
      DatabaseProfile,
      'role' | 'active' | 'permissions' | 'full_name' | 'phone' | 'position' | 'deleted_at'
    >
  >,
) {
  const payload = {
    ...changes,
    ...(changes.role ? { role: mapAppRoleToDatabase(changes.role) } : {}),
  }

  await supabaseFetch(`/rest/v1/profiles?id=eq.${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify(payload),
  })
}
