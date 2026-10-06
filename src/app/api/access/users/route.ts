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
    'client-portal',
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

function normalizeRole(value: unknown) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}


function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceRoleKey) {
    throw new Error('Falta la configuración privada de Supabase.')
  }

  return createAdminClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

function databaseRole(value: unknown) {
  const normalized = normalizeRole(value)
  if (normalized === 'administracion' || normalized === 'administrador' || normalized === 'admin') {
    return 'administracion'
  }
  if (normalized === 'supervisor' || normalized === 'obra') return 'obra'
  return 'cliente'
}

function temporaryPassword() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'
  const values = new Uint32Array(18)
  crypto.getRandomValues(values)
  return `Nedvi-${Array.from(values, (value) => alphabet[value % alphabet.length]).join('')}!`
}

function roleLabel(role: string) {
  if (role === 'administracion') return 'Administración'
  if (role === 'obra') return 'Supervisor'
  return 'Cliente'
}

export async function GET() {
  try {
    const supabase = await createServerClient()

    const {
      data: { user: currentUser },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !currentUser) {
      return NextResponse.json({ error: 'Sesión no válida.' }, { status: 401 })
    }

    const { data: currentProfile, error: profileError } = await supabase
      .from('profiles')
      .select('role, active')
      .eq('id', currentUser.id)
      .maybeSingle()

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 500 })
    }

    if (!currentProfile?.active || normalizeRole(currentProfile.role) !== 'administracion') {
      return NextResponse.json(
        { error: 'Solo Administración puede consultar usuarios.' },
        { status: 403 },
      )
    }

    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('id,email,full_name,first_name,role,phone,active,position,permissions,created_at,deleted_at')
      .is('deleted_at', null)
      .order('created_at', { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

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
    console.error('Error cargando usuarios desde Supabase:', error)
    return NextResponse.json(
      { error: 'No pudimos consultar los usuarios de Supabase.' },
      { status: 500 },
    )
  }
}


export async function POST(request: Request) {
  try {
    const serverSupabase = await createServerClient()
    const {
      data: { user: currentUser },
      error: currentUserError,
    } = await serverSupabase.auth.getUser()

    if (currentUserError || !currentUser) {
      return NextResponse.json({ error: 'Sesión no válida.' }, { status: 401 })
    }

    const { data: currentProfile } = await serverSupabase
      .from('profiles')
      .select('role, active')
      .eq('id', currentUser.id)
      .maybeSingle()

    if (!currentProfile?.active || normalizeRole(currentProfile.role) !== 'administracion') {
      return NextResponse.json(
        { error: 'Solo Administración puede aprobar usuarios.' },
        { status: 403 },
      )
    }

    const body = (await request.json()) as {
      name?: string
      email?: string
      phone?: string
      position?: string
      role?: string
      permissions?: ModulePermission[]
    }

    const name = body.name?.trim()
    const email = body.email?.trim().toLowerCase()
    const phone = body.phone?.trim() ?? ''
    const position = body.position?.trim() ?? ''
    const role = databaseRole(body.role)
    const permissions =
      role === 'administracion'
        ? DEFAULT_PERMISSIONS.administracion
        : Array.isArray(body.permissions)
          ? body.permissions
          : DEFAULT_PERMISSIONS[role] ?? []

    if (!name || !email || !email.includes('@')) {
      return NextResponse.json(
        { error: 'Nombre y correo válido son obligatorios.' },
        { status: 400 },
      )
    }

    const admin = getAdminClient()
    let authUserId: string | undefined
    let createdNewUser = false

    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password: temporaryPassword(),
      email_confirm: true,
      user_metadata: {
        full_name: name,
        first_name: name.split(' ')[0] || name,
        role,
      },
    })

    if (created.user) {
      authUserId = created.user.id
      createdNewUser = true
    } else if (createError?.message?.toLowerCase().includes('already')) {
      const { data: listed, error: listError } = await admin.auth.admin.listUsers({
        page: 1,
        perPage: 1000,
      })

      if (listError) {
        return NextResponse.json(
          { error: 'No pudimos recuperar el usuario existente.' },
          { status: 500 },
        )
      }

      authUserId = listed.users.find(
        (user) => user.email?.trim().toLowerCase() === email,
      )?.id
    } else {
      return NextResponse.json(
        { error: createError?.message || 'No pudimos crear el usuario en Supabase.' },
        { status: 400 },
      )
    }

    if (!authUserId) {
      return NextResponse.json(
        { error: 'No pudimos resolver el usuario aprobado.' },
        { status: 500 },
      )
    }

    const firstName = name.split(' ')[0] || name
    const initials = name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('')

    const { data: profile, error: profileError } = await admin
      .from('profiles')
      .upsert({
        id: authUserId,
        email,
        full_name: name,
        first_name: firstName,
        initials,
        role,
        phone,
        position,
        permissions,
        active: true,
        deleted_at: null,
      })
      .select('id,email,full_name,first_name,role,phone,active,position,permissions,created_at')
      .single()

    if (profileError || !profile) {
      if (createdNewUser) {
        await admin.auth.admin.deleteUser(authUserId)
      }

      console.error('Error persistiendo usuario aprobado:', profileError)
      return NextResponse.json(
        { error: 'No pudimos guardar el usuario aprobado en Supabase.' },
        { status: 500 },
      )
    }

    return NextResponse.json(
      {
        user: {
          id: profile.id,
          name: profile.full_name || profile.first_name || email,
          email: profile.email || email,
          phone: profile.phone || '',
          position: profile.position || '',
          role: roleLabel(normalizeRole(profile.role)),
          permissions: profile.permissions ?? permissions,
          status: profile.active ? 'Activo' : 'Inactivo',
          createdAt: profile.created_at,
        },
        needsPasswordSetup: createdNewUser,
      },
      { status: createdNewUser ? 201 : 200 },
    )
  } catch (error) {
    console.error('Error aprobando usuario:', error)
    return NextResponse.json(
      { error: 'No pudimos aprobar el usuario.' },
      { status: 500 },
    )
  }
}


export async function PATCH(request: Request) {
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
      return NextResponse.json(
        { error: 'Solo Administración puede modificar usuarios.' },
        { status: 403 },
      )
    }

    const body = (await request.json()) as {
      userId?: string
      active?: boolean
    }

    const userId = body.userId?.trim()
    if (!userId || typeof body.active !== 'boolean') {
      return NextResponse.json({ error: 'Datos de usuario no válidos.' }, { status: 400 })
    }

    if (userId === currentUser.id) {
      return NextResponse.json(
        { error: 'La cuenta principal no puede desactivarse desde esta pantalla.' },
        { status: 400 },
      )
    }

    const admin = getAdminClient()

    const { error: profileError } = await admin
      .from('profiles')
      .update({ active: body.active })
      .eq('id', userId)

    if (profileError) {
      return NextResponse.json(
        { error: profileError.message || 'No pudimos actualizar el estado del usuario.' },
        { status: 500 },
      )
    }

    const { error: authError } = await admin.auth.admin.updateUserById(userId, {
      ban_duration: body.active ? 'none' : '876000h',
    })

    if (authError) {
      await admin.from('profiles').update({ active: !body.active }).eq('id', userId)
      return NextResponse.json(
        { error: authError.message || 'No pudimos sincronizar el estado de acceso.' },
        { status: 500 },
      )
    }

    return NextResponse.json({ userId, active: body.active }, { status: 200 })
  } catch (error) {
    console.error('Error actualizando estado de usuario:', error)
    return NextResponse.json(
      { error: 'No pudimos actualizar el estado del usuario.' },
      { status: 500 },
    )
  }
}

export async function DELETE(request: Request) {
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
      return NextResponse.json(
        { error: 'Solo Administración puede eliminar usuarios.' },
        { status: 403 },
      )
    }

    const body = (await request.json()) as { userId?: string }
    const userId = body.userId?.trim()

    if (!userId) {
      return NextResponse.json({ error: 'Usuario no válido.' }, { status: 400 })
    }

    if (userId === currentUser.id) {
      return NextResponse.json(
        { error: 'La cuenta principal no puede eliminarse desde esta pantalla.' },
        { status: 400 },
      )
    }

    const admin = getAdminClient()

    const nullableReferences = [
      ['project_documents', 'uploaded_by'],
      ['project_evidence', 'uploaded_by'],
      ['project_milestones', 'created_by'],
      ['project_progress_updates', 'created_by'],
      ['project_reports', 'created_by'],
      ['project_tasks', 'created_by'],
    ] as const

    for (const [table, column] of nullableReferences) {
      const { error } = await admin.from(table).update({ [column]: null }).eq(column, userId)
      if (error) {
        console.error(`Error limpiando referencia ${table}.${column}:`, error)
        return NextResponse.json(
          { error: 'No pudimos preparar la eliminación del usuario.' },
          { status: 500 },
        )
      }
    }

    const { error: deleteError } = await admin.auth.admin.deleteUser(userId)
    if (deleteError) {
      return NextResponse.json(
        { error: deleteError.message || 'No pudimos eliminar el usuario.' },
        { status: 500 },
      )
    }

    return NextResponse.json({ userId }, { status: 200 })
  } catch (error) {
    console.error('Error eliminando usuario:', error)
    return NextResponse.json(
      { error: 'No pudimos eliminar el usuario.' },
      { status: 500 },
    )
  }
}
