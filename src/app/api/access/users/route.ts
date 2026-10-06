import { NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/utils/supabase/server'
import type { ModulePermission } from '@/config/roles'

const DEFAULT_PERMISSIONS: Record<string, ModulePermission[]> = {
  administracion: [
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
  obra: [
    'dashboard',
    'commercial',
    'projects',
    'purchasing',
    'operations',
    'agenda',
    'indicators',
    'coral',
  ],
  cliente: ['client-portal'],
}

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceRoleKey) {
    throw new Error('Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local')
  }

  return createAdminClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

function normalizeRole(value: unknown) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function roleLabel(role: string) {
  if (role === 'administracion') return 'Administración'
  if (role === 'obra') return 'Supervisor'
  return 'Cliente'
}

export async function GET() {
  try {
    const serverSupabase = await createServerClient()
    const {
      data: { user: currentUser },
    } = await serverSupabase.auth.getUser()

    if (!currentUser) {
      return NextResponse.json({ error: 'Sesión no válida.' }, { status: 401 })
    }

    const { data: currentProfile } = await serverSupabase
      .from('profiles')
      .select('role, active')
      .eq('id', currentUser.id)
      .maybeSingle()

    if (!currentProfile?.active || normalizeRole(currentProfile.role) !== 'administracion') {
      return NextResponse.json({ error: 'Solo Administración puede consultar usuarios.' }, { status: 403 })
    }

    const admin = getAdminClient()
    const { data: profiles, error } = await admin
      .from('profiles')
      .select('id,email,full_name,first_name,initials,role,phone,active,position,permissions,created_at,deleted_at')
      .is('deleted_at', null)
      .order('created_at', { ascending: true })

    if (error) throw error

    const users = (profiles ?? []).map((profile) => {
      const normalizedRole = normalizeRole(profile.role)
      const permissions =
        Array.isArray(profile.permissions) && profile.permissions.length
          ? (profile.permissions as ModulePermission[])
          : DEFAULT_PERMISSIONS[normalizedRole] ?? []

      return {
        id: profile.id,
        name: profile.full_name || profile.first_name || profile.email || 'Usuario NEDVI',
        email: profile.email || '',
        phone: profile.phone || '',
        position: profile.position || '',
        role: roleLabel(normalizedRole),
        permissions,
        status: profile.active ? 'Activo' : 'Inactivo',
        createdAt: profile.created_at,
      }
    })

    return NextResponse.json({ users }, { status: 200 })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'No pudimos consultar los usuarios de Supabase.' }, { status: 500 })
  }
}
