import { NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/utils/supabase/server'

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceRoleKey) {
    throw new Error('Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local')
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

function canResetPasswords(role: unknown) {
  return ['administracion', 'administrador', 'admin'].includes(normalizeRole(role))
}

async function findUserIdByEmail(
  admin: ReturnType<typeof getAdminClient>,
  email: string,
): Promise<string | null> {
  for (let page = 1; page <= 10; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 100 })
    if (error) throw error
    const match = data.users.find((user) => user.email?.toLowerCase() === email)
    if (match) return match.id
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

    if (!currentProfile?.active || !canResetPasswords(currentProfile.role)) {
      return NextResponse.json({ error: 'Solo Administración puede restablecer contraseñas.' }, { status: 403 })
    }

    const body = (await request.json()) as {
      userId?: string
      email?: string
      password?: string
    }

    const email = body.email?.trim().toLowerCase()
    const password = body.password?.trim()

    if (!password || password.length < 8) {
      return NextResponse.json({ error: 'La contraseña temporal debe tener al menos 8 caracteres.' }, { status: 400 })
    }

    const admin = getAdminClient()
    let userId = body.userId?.trim()

    if (!userId && email) {
      userId = (await findUserIdByEmail(admin, email)) ?? undefined
    }

    if (!userId) {
      return NextResponse.json({ error: 'No encontramos el usuario en Supabase Auth.' }, { status: 404 })
    }

    const { error: updateError } = await admin.auth.admin.updateUserById(userId, {
      password,
    })

    if (updateError) {
      console.error('Error restableciendo contraseña:', updateError)
      return NextResponse.json({ error: updateError.message || 'No pudimos actualizar la contraseña.' }, { status: 500 })
    }

    return NextResponse.json({ userId }, { status: 200 })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'No pudimos restablecer la contraseña.' }, { status: 500 })
  }
}
