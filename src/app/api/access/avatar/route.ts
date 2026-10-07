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

export async function PATCH(request: Request) {
  try {
    const supabase = await createServerClient()
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Sesión no válida.' }, { status: 401 })
    }

    const body = (await request.json()) as { avatarUrl?: string }
    const avatarUrl = body.avatarUrl?.trim()

    if (!avatarUrl) {
      return NextResponse.json({ error: 'La foto de perfil no es válida.' }, { status: 400 })
    }

    const admin = getAdminClient()
    const { data: profile, error } = await admin
      .from('profiles')
      .update({
        avatar_url: avatarUrl,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)
      .select('id,avatar_url')
      .single()

    if (error || !profile) {
      return NextResponse.json(
        { error: error?.message || 'No pudimos guardar la foto de perfil.' },
        { status: 500 },
      )
    }

    return NextResponse.json({ avatarUrl: profile.avatar_url }, { status: 200 })
  } catch (error) {
    console.error('Error guardando avatar:', error)
    return NextResponse.json(
      { error: 'No pudimos guardar la foto de perfil.' },
      { status: 500 },
    )
  }
}
