import { NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/utils/supabase/server'

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
    return { supabase, user: null, error: NextResponse.json({ error: 'Sesión no válida.' }, { status: 401 }) }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, active')
    .eq('id', user.id)
    .maybeSingle()

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

  const admin = getAdminClient()
  const { data, error } = await admin
    .from('project_members')
    .select('project_id')
    .eq('user_id', userId)

  if (error) {
    return NextResponse.json({ error: 'No pudimos cargar los proyectos asignados.' }, { status: 500 })
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
    ? Array.from(new Set(body.projectIds.filter((id): id is string => typeof id === 'string' && id.trim().length > 0)))
    : []

  if (!userId || !customerId) {
    return NextResponse.json({ error: 'Usuario o cliente no válido.' }, { status: 400 })
  }

  const admin = getAdminClient()

  const { data: validProjects, error: validationError } = requestedProjectIds.length
    ? await admin
        .from('projects')
        .select('id')
        .eq('customer_id', customerId)
        .in('id', requestedProjectIds)
    : { data: [], error: null }

  if (validationError) {
    return NextResponse.json({ error: 'No pudimos validar los proyectos del cliente.' }, { status: 500 })
  }

  const validProjectIds = (validProjects ?? []).map((project) => project.id)

  const { error: clearError } = await admin
    .from('project_members')
    .delete()
    .eq('user_id', userId)

  if (clearError) {
    return NextResponse.json({ error: 'No pudimos actualizar los proyectos asignados.' }, { status: 500 })
  }

  if (validProjectIds.length) {
    const { error: insertError } = await admin
      .from('project_members')
      .insert(validProjectIds.map((projectId) => ({ project_id: projectId, user_id: userId })))

    if (insertError) {
      return NextResponse.json({ error: 'No pudimos guardar los proyectos asignados.' }, { status: 500 })
    }
  }

  return NextResponse.json({ userId, projectIds: validProjectIds }, { status: 200 })
}
