import { NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/utils/supabase/server'
import type { ModulePermission } from '@/config/roles'

const DEFAULT_PERMISSIONS: Record<string, ModulePermission[]> = {
  developer: ['dashboard','commercial','projects','purchasing','operations','agenda','time-clock','human-resources','finance','indicators','settings','coral'],
  gerente_comercial: ['dashboard','commercial','projects','purchasing','operations','agenda','time-clock','human-resources','finance','indicators','settings','coral'],
  gerente_administrativo: ['dashboard','commercial','projects','purchasing','operations','agenda','time-clock','human-resources','finance','indicators','settings','coral'],
  gerente_operativo: ['dashboard','commercial','projects','purchasing','operations','agenda','time-clock','human-resources','finance','indicators','settings','coral'],
  supervisor_obra: ['dashboard','commercial','projects','operations','agenda','time-clock','indicators','coral'],
  supervisor_administrativo: ['dashboard'],
  administracion: [
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
    'client-portal',
  ],
  obra: [
    'dashboard',
    'commercial',
    'projects',
    'purchasing',
    'operations',
    'agenda',
    'time-clock',
    'indicators',
    'coral',
  ],
  contabilidad: ['time-clock'],
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
  if (['developer','gerente_comercial','gerente_administrativo','gerente_operativo','supervisor_obra','supervisor_administrativo'].includes(normalized)) return normalized
  if (normalized === 'supervisor de obra') return 'supervisor_obra'
  if (normalized === 'supervisor administrativo') return 'supervisor_administrativo'
  if (normalized === 'gerente comercial') return 'gerente_comercial'
  if (normalized === 'gerente administrativo') return 'gerente_administrativo'
  if (normalized === 'gerente operativo') return 'gerente_operativo'
  if (normalized === 'supervisor' || normalized === 'obra') return 'obra'
  if (normalized === 'contabilidad') return 'contabilidad'
  return 'cliente'
}

function temporaryPassword() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'
  const values = new Uint32Array(18)
  crypto.getRandomValues(values)
  return `Nedvi-${Array.from(values, (value) => alphabet[value % alphabet.length]).join('')}!`
}

function roleLabel(role: string) {
  if (role === 'developer') return 'DEVELOPER'
  if (role === 'gerente_comercial') return 'Gerente Comercial'
  if (role === 'gerente_administrativo') return 'Gerente Administrativo'
  if (role === 'gerente_operativo') return 'Gerente Operativo'
  if (role === 'supervisor_obra') return 'Supervisor de Obra'
  if (role === 'supervisor_administrativo') return 'Supervisor Administrativo'
  if (role === 'administracion') return 'Administración'
  if (role === 'obra') return 'Supervisor'
  if (role === 'contabilidad') return 'Contabilidad'
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

    if (!currentProfile?.active || !['developer','administracion'].includes(normalizeRole(currentProfile.role))) {
      return NextResponse.json(
        { error: 'Solo Administración puede consultar usuarios.' },
        { status: 403 },
      )
    }

    const admin = getAdminClient()
    const { data: profiles, error } = await admin
      .from('profiles')
      .select('id,email,full_name,first_name,role,phone,active,position,permissions,created_at,deleted_at')
      .is('deleted_at', null)
      .order('created_at', { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const { data: customerLinks } = await admin
      .from('customer_users')
      .select('user_id,customer_id')

    const customerIds = [...new Set((customerLinks ?? []).map((link) => link.customer_id))]
    const { data: linkedCustomers } = customerIds.length
      ? await admin.from('customers').select('id,folio').in('id', customerIds)
      : { data: [] }

    const folioByCustomerId = new Map(
      (linkedCustomers ?? []).map((customer) => [customer.id, customer.folio ?? undefined]),
    )

    const { data: memberships } = await admin
      .from('project_members')
      .select('user_id,project_id')

    const customerLinkByUser = new Map(
      (customerLinks ?? []).map((link) => [
        link.user_id,
        {
          customerId: link.customer_id,
          customerFolio: folioByCustomerId.get(link.customer_id),
        },
      ]),
    )

    const projectIdsByUser = new Map<string, string[]>()
    for (const membership of memberships ?? []) {
      const current = projectIdsByUser.get(membership.user_id) ?? []
      current.push(membership.project_id)
      projectIdsByUser.set(membership.user_id, current)
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
        customerId: customerLinkByUser.get(profile.id)?.customerId,
        customerFolio: customerLinkByUser.get(profile.id)?.customerFolio,
        projectIds: projectIdsByUser.get(profile.id) ?? [],
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

    if (!currentProfile?.active || !['developer','administracion'].includes(normalizeRole(currentProfile.role))) {
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
      password?: string
    }

    const name = body.name?.trim()
    const email = body.email?.trim().toLowerCase()
    const phone = body.phone?.trim() ?? ''
    if (!/^\+?[\d\s().-]{10,20}$/.test(phone) || phone.replace(/\D/g, '').length < 10) {
      return NextResponse.json({ error: 'El número de contacto del usuario es obligatorio (mínimo 10 dígitos).' }, { status: 400 })
    }
    const position = body.position?.trim() ?? ''
    const requestedPassword = body.password?.trim()
    const role = databaseRole(body.role)
    const permissions =
      role === 'administracion'
        ? DEFAULT_PERMISSIONS.administracion
        : role === 'contabilidad' ? DEFAULT_PERMISSIONS.contabilidad
        : Array.isArray(body.permissions)
          ? body.permissions
          : DEFAULT_PERMISSIONS[role] ?? []

    if (!name || !email || !email.includes('@')) {
      return NextResponse.json(
        { error: 'Nombre y correo válido son obligatorios.' },
        { status: 400 },
      )
    }

    if (requestedPassword && requestedPassword.length < 8) {
      return NextResponse.json(
        { error: 'La contraseña debe tener al menos 8 caracteres.' },
        { status: 400 },
      )
    }

    const admin = getAdminClient()
    let authUserId: string | undefined
    let createdNewUser = false

    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password: requestedPassword || temporaryPassword(),
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

    if (!currentProfile?.active || !['developer','administracion'].includes(normalizeRole(currentProfile.role))) {
      return NextResponse.json(
        { error: 'Solo Administración puede modificar usuarios.' },
        { status: 403 },
      )
    }

    const body = (await request.json()) as {
      userId?: string
      active?: boolean
      role?: string
      permissions?: ModulePermission[]
      phone?: string
      name?: string
      position?: string
    }

    const userId = body.userId?.trim()
    if (!userId) {
      return NextResponse.json({ error: 'Usuario no válido.' }, { status: 400 })
    }

    if (userId === currentUser.id && (typeof body.active === 'boolean' || body.role)) {
      return NextResponse.json(
        { error: 'La cuenta principal no puede modificarse desde esta pantalla.' },
        { status: 400 },
      )
    }

    const admin = getAdminClient()

    const { data: protectedTarget } = await admin.from('profiles').select('role').eq('id',userId).maybeSingle()
    if (!protectedTarget) return NextResponse.json({error:'Usuario no encontrado.'},{status:404})
    if (normalizeRole(protectedTarget.role) === 'developer' && (body.role || typeof body.active === 'boolean')) return NextResponse.json({error:'La cuenta DEVELOPER principal está protegida.'},{status:403})
    if (body.role && databaseRole(body.role) === 'developer') return NextResponse.json({error:'No se puede asignar DEVELOPER desde esta pantalla.'},{status:403})

    if (typeof body.phone === 'string' || typeof body.name === 'string' || typeof body.position === 'string') {
      const phone = body.phone?.trim() ?? ''
      const name = body.name?.trim() ?? ''
      if (!name || !/^\\+?[\\d\\s().-]{10,20}$/.test(phone) || phone.replace(/\\D/g, '').length < 10) {
        return NextResponse.json({ error: 'Nombre y teléfono válido (mínimo 10 dígitos) son obligatorios.' }, { status: 400 })
      }
      const { data: existing, error: readError } = await admin.from('profiles').select('role').eq('id',userId).maybeSingle()
      if (readError || !existing || databaseRole(existing.role) === 'cliente') {
        return NextResponse.json({ error: 'Solo puedes editar integrantes del equipo NEDVI.' }, { status: 403 })
      }
      const { error: updateError } = await admin.from('profiles').update({ full_name:name,first_name:name.split(' ')[0],phone,position:body.position?.trim() ?? '',updated_at:new Date().toISOString() }).eq('id',userId)
      if (updateError) return NextResponse.json({ error: 'No pudimos guardar los datos del integrante.' }, { status: 500 })
      return NextResponse.json({ userId,updated:true })
    }

    if (body.role) {
      const role = databaseRole(body.role)
      const permissions = DEFAULT_PERMISSIONS[role] ?? []

      const { data: profile, error: profileError } = await admin
        .from('profiles')
        .update({
          role,
          permissions,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId)
        .select('id,role,permissions,active')
        .single()

      if (profileError || !profile) {
        return NextResponse.json(
          { error: profileError?.message || 'No pudimos actualizar el rol del usuario.' },
          { status: 500 },
        )
      }

      const { data: authUser, error: authReadError } = await admin.auth.admin.getUserById(userId)
      if (authReadError || !authUser.user) {
        return NextResponse.json(
          { error: authReadError?.message || 'No pudimos cargar el usuario de autenticación.' },
          { status: 500 },
        )
      }

      const { error: authError } = await admin.auth.admin.updateUserById(userId, {
        user_metadata: {
          ...(authUser.user.user_metadata ?? {}),
          role,
          permissions,
        },
      })

      if (authError) {
        return NextResponse.json(
          { error: authError.message || 'No pudimos sincronizar el rol en autenticación.' },
          { status: 500 },
        )
      }

      return NextResponse.json(
        {
          userId,
          role: roleLabel(role),
          permissions: profile.permissions ?? permissions,
          active: profile.active,
        },
        { status: 200 },
      )
    }

    if (typeof body.active !== 'boolean') {
      return NextResponse.json({ error: 'Datos de usuario no válidos.' }, { status: 400 })
    }

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
    console.error('Error actualizando usuario:', error)
    return NextResponse.json(
      { error: 'No pudimos actualizar el usuario.' },
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

    if (!currentProfile?.active || !['developer','administracion'].includes(normalizeRole(currentProfile.role))) {
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
