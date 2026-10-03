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

    if (!currentProfile?.active || !['administracion', 'obra'].includes(currentProfile.role)) {
      return NextResponse.json({ error: 'No tienes permiso para crear accesos de cliente.' }, { status: 403 })
    }

    const body = (await request.json()) as {
      email?: string
      password?: string
      fullName?: string
      customerFolio?: string
    }

    const email = body.email?.trim().toLowerCase()
    const password = body.password?.trim()
    const fullName = body.fullName?.trim() || 'Cliente NEDVI'
    const customerFolio = body.customerFolio?.trim()

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Correo no válido.' }, { status: 400 })
    }

    if (!password || password.length < 8) {
      return NextResponse.json({ error: 'La contraseña temporal debe tener al menos 8 caracteres.' }, { status: 400 })
    }

    const admin = getAdminClient()
    const firstName = fullName.split(' ')[0] || fullName
    const initials = fullName
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('')

    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        first_name: firstName,
        initials,
        role: 'cliente',
      },
    })

    if (createError || !created.user) {
      const message = createError?.message?.toLowerCase().includes('already')
        ? 'Ya existe un usuario con ese correo en Supabase Auth.'
        : createError?.message || 'No pudimos crear el usuario en Supabase Auth.'
      return NextResponse.json({ error: message }, { status: 400 })
    }

    const userId = created.user.id

    const { error: profileError } = await admin.from('profiles').upsert({
      id: userId,
      full_name: fullName,
      first_name: firstName,
      initials,
      role: 'cliente',
      active: true,
    })

    if (profileError) {
      await admin.auth.admin.deleteUser(userId)
      console.error('Error creando perfil cliente:', profileError)
      return NextResponse.json({ error: 'No pudimos crear el perfil del cliente.' }, { status: 500 })
    }

    let linkedCustomerId: string | null = null

    if (customerFolio) {
      const { data: customer } = await admin
        .from('customers')
        .select('id')
        .eq('folio', customerFolio)
        .maybeSingle()

      if (customer?.id) {
        linkedCustomerId = customer.id
        const { error: linkError } = await admin.from('customer_users').upsert({
          customer_id: customer.id,
          user_id: userId,
        })

        if (linkError) {
          return NextResponse.json(
            {
              userId,
              warning: 'El usuario fue creado, pero no se pudo vincular al cliente.',
            },
            { status: 201 },
          )
        }
      }
    }

    return NextResponse.json(
      {
        userId,
        linkedCustomerId,
      },
      { status: 201 },
    )
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'No pudimos crear el acceso del cliente.' }, { status: 500 })
  }
}
