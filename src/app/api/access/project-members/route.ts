import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/utils/supabase/server'

function normalizeRole(value: unknown) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

async function requireAdmin() {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return {
      supabase,
      user: null,
      error: NextResponse.json({ error: 'Sesión no válida.' }, { status: 401 }),
    }
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role, active')
    .eq('id', user.id)
    .maybeSingle()

  if (profileError) {
    console.error('Error consultando perfil administrador:', profileError)
    return {
      supabase,
      user: null,
      error: NextResponse.json(
        { error: 'No pudimos validar el perfil de Administración.' },
        { status: 500 },
      ),
    }
  }

  if (!profile?.active || normalizeRole(profile.role) !== 'administracion') {
    return {
      supabase,
      user: null,
      error: NextResponse.json(
        { error: 'Solo Administración puede asignar proyectos al portal.' },
        { status: 403 },
      ),
    }
  }

  return { supabase, user, error: null }
}

export async function GET(request: Request) {
  const auth = await requireAdmin()
  if (auth.error) return auth.error

  const userId = new URL(request.url).searchParams.get('userId')?.trim()
  if (!userId) {
    return NextResponse.json({ error: 'Usuario no válido.' }, { status: 400 })
  }

  const { data, error } = await auth.supabase
    .from('project_members')
    .select('project_id')
    .eq('user_id', userId)

  if (error) {
    console.error('Error consultando project_members:', error)
    return NextResponse.json(
      { error: 'No pudimos cargar los proyectos asignados.' },
      { status: 500 },
    )
  }

  return NextResponse.json(
    { projectIds: (data ?? []).map((row) => row.project_id) },
    { status: 200 },
  )
}

export async function POST(request: Request) {
  const auth = await requireAdmin()
  if (auth.error) return auth.error

  const body = (await request.json()) as {
    userId?: string
    customerId?: string
    projectIds?: string[]
  }

  const userId = body.userId?.trim()
  const customerId = body.customerId?.trim()
  const requestedProjectIds = Array.isArray(body.projectIds)
    ? Array.from(
        new Set(
          body.projectIds
            .filter((id): id is string => typeof id === 'string')
            .map((id) => id.trim())
            .filter(Boolean),
        ),
      )
    : []

  if (!userId || !customerId) {
    return NextResponse.json({ error: 'Usuario o cliente no válido.' }, { status: 400 })
  }

  const { data: customerLink, error: customerLinkError } = await auth.supabase
    .from('customer_users')
    .select('customer_id')
    .eq('user_id', userId)
    .eq('customer_id', customerId)
    .maybeSingle()

  if (customerLinkError) {
    console.error('Error validando customer_users:', customerLinkError)
    return NextResponse.json(
      { error: 'No pudimos validar el vínculo entre el usuario y el cliente.' },
      { status: 500 },
    )
  }

  if (!customerLink) {
    return NextResponse.json(
      { error: 'El usuario no está vinculado al cliente seleccionado.' },
      { status: 409 },
    )
  }

  const { data: validProjects, error: validationError } = requestedProjectIds.length
    ? await auth.supabase
        .from('projects')
        .select('id')
        .eq('customer_id', customerId)
        .in('id', requestedProjectIds)
    : { data: [], error: null }

  if (validationError) {
    console.error('Error validando proyectos del cliente:', validationError)
    return NextResponse.json(
      { error: 'No pudimos validar los proyectos del cliente.' },
      { status: 500 },
    )
  }

  const validProjectIds = (validProjects ?? []).map((project) => project.id)

  if (validProjectIds.length !== requestedProjectIds.length) {
    return NextResponse.json(
      { error: 'Uno o más proyectos seleccionados no pertenecen a este cliente.' },
      { status: 400 },
    )
  }

  const { data: existingMemberships, error: existingError } = await auth.supabase
    .from('project_members')
    .select('project_id')
    .eq('user_id', userId)

  if (existingError) {
    console.error('Error consultando project_members antes de sincronizar:', existingError)
    return NextResponse.json(
      { error: 'No pudimos consultar los proyectos asignados.' },
      { status: 500 },
    )
  }

  const existingIds = new Set((existingMemberships ?? []).map((row) => row.project_id))
  const desiredIds = new Set(validProjectIds)
  const toInsert = validProjectIds.filter((projectId) => !existingIds.has(projectId))
  const toDelete = Array.from(existingIds).filter((projectId) => !desiredIds.has(projectId))

  if (toInsert.length) {
    const { error: insertError } = await auth.supabase
      .from('project_members')
      .upsert(
        toInsert.map((projectId) => ({ project_id: projectId, user_id: userId })),
        { onConflict: 'project_id,user_id' },
      )

    if (insertError) {
      console.error('Error guardando project_members:', insertError)
      return NextResponse.json(
        { error: 'No pudimos guardar los proyectos asignados.' },
        { status: 500 },
      )
    }
  }

  if (toDelete.length) {
    const { error: deleteError } = await auth.supabase
      .from('project_members')
      .delete()
      .eq('user_id', userId)
      .in('project_id', toDelete)

    if (deleteError) {
      console.error('Error eliminando project_members:', deleteError)
      return NextResponse.json(
        { error: 'No pudimos quitar proyectos desasignados.' },
        { status: 500 },
      )
    }
  }

  const { data: persistedMemberships, error: persistedError } = await auth.supabase
    .from('project_members')
    .select('project_id')
    .eq('user_id', userId)

  if (persistedError) {
    console.error('Error verificando persistencia de project_members:', persistedError)
    return NextResponse.json(
      { error: 'Los cambios se guardaron, pero no pudimos verificarlos.' },
      { status: 500 },
    )
  }

  const persistedProjectIds = (persistedMemberships ?? []).map((row) => row.project_id)

  return NextResponse.json(
    { userId, projectIds: persistedProjectIds },
    { status: 200 },
  )
}
