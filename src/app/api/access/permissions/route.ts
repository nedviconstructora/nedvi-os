import { NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/utils/supabase/server'
import type { ModulePermission } from '@/config/roles'

const ALLOWED_PERMISSIONS: ModulePermission[] = [
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
]

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

function canManagePermissions(role: unknown) {
  return ['administracion', 'administrador', 'admin'].includes(normalizeRole(role))
}

async function findUserByEmail(admin: ReturnType<typeof getAdminClient>, email: string) {
  for (let page = 1; page <= 10; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 100 })
    if (error) throw error
    const match = data.users.find((user) => user.email?.toLowerCase() === email)
    if (match) return match
    if (data.users.length < 100) break
  }
  return null
}

export async function POST(request: Request) {
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

    if (!currentProfile?.active || !canManagePermissions(currentProfile.role)) {
      return NextResponse.json({ error: 'Solo Administración puede cambiar permisos.' }, { status: 403 })
    }

    const body = (await request.json()) as {
      userId?: string
      email?: string
      permissions?: string[]
    }

    if (!Array.isArray(body.permissions)) {
      return NextResponse.json({ error: 'La lista de permisos no es válida.' }, { status: 400 })
    }

    const permissions = body.permissions.filter((permission): permission is ModulePermission =>
      ALLOWED_PERMISSIONS.includes(permission as ModulePermission),
    )

    const admin = getAdminClient()
    let targetUser = null

    if (body.userId?.trim()) {
      const { data, error } = await admin.auth.admin.getUserById(body.userId.trim())
      if (!error && data.user) targetUser = data.user
    }

    if (!targetUser && body.email?.trim()) {
      targetUser = await findUserByEmail(admin, body.email.trim().toLowerCase())
    }

    if (!targetUser) {
      return NextResponse.json({ error: 'No encontramos el usuario en Supabase Auth.' }, { status: 404 })
    }

    const { error: updateError } = await admin.auth.admin.updateUserById(targetUser.id, {
      user_metadata: {
        ...(targetUser.user_metadata ?? {}),
        permissions,
      },
    })

    if (updateError) {
      return NextResponse.json({ error: updateError.message || 'No pudimos actualizar los permisos.' }, { status: 500 })
    }

    const { error: profileUpdateError } = await admin
      .from('profiles')
      .update({ permissions })
      .eq('id', targetUser.id)

    if (profileUpdateError) {
      return NextResponse.json(
        { error: profileUpdateError.message || 'No pudimos sincronizar los permisos del perfil.' },
        { status: 500 },
      )
    }

    return NextResponse.json({ userId: targetUser.id, permissions }, { status: 200 })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'No pudimos actualizar los permisos.' }, { status: 500 })
  }
}
