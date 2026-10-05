import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()

  if (!url || !serviceRoleKey) {
    throw new Error('Falta configurar Supabase del lado servidor.')
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

export async function GET(request: Request) {
  try {
    const authorization = request.headers.get('authorization') ?? ''
    const token = authorization.startsWith('Bearer ')
      ? authorization.slice('Bearer '.length).trim()
      : ''

    if (!token) {
      return NextResponse.json({ error: 'Sesión no válida.' }, { status: 401 })
    }

    const admin = getAdminClient()
    const { data: userData, error: userError } = await admin.auth.getUser(token)
    const user = userData.user

    if (userError || !user) {
      return NextResponse.json({ error: 'La sesión expiró. Inicia sesión nuevamente.' }, { status: 401 })
    }

    const { data: profile, error: profileError } = await admin
      .from('profiles')
      .select('role, active')
      .eq('id', user.id)
      .maybeSingle()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'No encontramos el perfil del usuario.' }, { status: 403 })
    }

    if (!profile.active) {
      return NextResponse.json({ error: 'Tu acceso está desactivado.' }, { status: 403 })
    }

    if (profile.role !== 'cliente') {
      return NextResponse.json({ error: 'Este usuario no pertenece al portal de clientes.' }, { status: 403 })
    }

    const { data: link, error: linkError } = await admin
      .from('customer_users')
      .select('customer_id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (linkError || !link?.customer_id) {
      return NextResponse.json(
        { error: 'Tu usuario todavía no está vinculado a un cliente de NEDVI OS.' },
        { status: 404 },
      )
    }

    const { data: customer, error: customerError } = await admin
      .from('customers')
      .select('id, folio, company, contact, phone, email, address, rfc, project_type, status, notes, created_at')
      .eq('id', link.customer_id)
      .maybeSingle()

    if (customerError || !customer) {
      return NextResponse.json({ error: 'No encontramos la información de tu empresa.' }, { status: 404 })
    }

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email ?? '',
      },
      customer,
    })
  } catch (error) {
    console.error('Portal bootstrap error:', error)
    return NextResponse.json({ error: 'No fue posible abrir el portal del cliente.' }, { status: 500 })
  }
}
