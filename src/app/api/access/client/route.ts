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

function canManageClientAccess(role: unknown) {
  const normalizedRole = normalizeRole(role)
  return ['administracion', 'administrador', 'admin', 'obra', 'supervisor'].includes(normalizedRole)
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

    if (!currentProfile?.active || !canManageClientAccess(currentProfile.role)) {
      console.error('Permiso denegado para crear acceso de cliente:', {
        userId: currentUser.id,
        role: currentProfile?.role,
        active: currentProfile?.active,
      })
      return NextResponse.json({ error: 'No tienes permiso para crear accesos de cliente.' }, { status: 403 })
    }

    const body = (await request.json()) as {
      userId?: string
      email?: string
      password?: string
      fullName?: string
      customerFolio?: string
      company?: string
      contact?: string
      phone?: string
    }

    const email = body.email?.trim().toLowerCase()
    const password = body.password?.trim()
    const fullName = body.fullName?.trim() || 'Cliente NEDVI'
    const customerFolio = body.customerFolio?.trim()
    const company = body.company?.trim() || fullName
    const contact = body.contact?.trim() || fullName
    const phone = body.phone?.trim() || null

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Correo no válido.' }, { status: 400 })
    }

    if (!customerFolio) {
      return NextResponse.json({ error: 'El cliente no tiene folio asignado.' }, { status: 400 })
    }

    const admin = getAdminClient()
    const firstName = fullName.split(' ')[0] || fullName
    const initials = fullName
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('')

    let userId = body.userId?.trim()
    let createdNewUser = false
    let reusedExistingUser = false

    if (!userId) {
      if (!password || password.length < 8) {
        return NextResponse.json({ error: 'La contraseña temporal debe tener al menos 8 caracteres.' }, { status: 400 })
      }

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

      if (created.user) {
        userId = created.user.id
        createdNewUser = true
      } else if (createError?.message?.toLowerCase().includes('already')) {
        const { data: listedUsers, error: listUsersError } = await admin.auth.admin.listUsers({
          page: 1,
          perPage: 1000,
        })

        if (listUsersError) {
          console.error('Error buscando usuario existente en Supabase Auth:', listUsersError)
          return NextResponse.json({ error: 'No pudimos recuperar el usuario existente.' }, { status: 500 })
        }

        const existingUser = listedUsers.users.find(
          (user) => user.email?.trim().toLowerCase() === email,
        )

        if (!existingUser) {
          return NextResponse.json(
            { error: 'El correo ya existe en Supabase Auth, pero no pudimos recuperar ese usuario.' },
            { status: 409 },
          )
        }

        userId = existingUser.id
        reusedExistingUser = true
      } else {
        return NextResponse.json(
          { error: createError?.message || 'No pudimos crear el usuario en Supabase Auth.' },
          { status: 400 },
        )
      }
    }

    if (!userId) {
      return NextResponse.json({ error: 'No pudimos resolver el usuario del cliente.' }, { status: 500 })
    }

    const { error: profileError } = await admin.from('profiles').upsert({
      id: userId,
      full_name: fullName,
      first_name: firstName,
      initials,
      role: 'cliente',
      active: true,
    })

    if (profileError) {
      if (createdNewUser) await admin.auth.admin.deleteUser(userId)
      console.error('Error creando perfil cliente:', profileError)
      return NextResponse.json({ error: 'No pudimos crear el perfil del cliente.' }, { status: 500 })
    }

    const { data: existingCustomer, error: findCustomerError } = await admin
      .from('customers')
      .select('id')
      .eq('folio', customerFolio)
      .maybeSingle()

    if (findCustomerError) {
      console.error('Error buscando cliente por folio:', findCustomerError)
      return NextResponse.json({ error: 'No pudimos buscar el folio del cliente.' }, { status: 500 })
    }

    let customerId = existingCustomer?.id as string | undefined

    if (!customerId) {
      const newCustomerId = crypto.randomUUID()
      const { data: insertedCustomer, error: insertCustomerError } = await admin
        .from('customers')
        .insert({
          id: newCustomerId,
          folio: customerFolio,
          company,
          contact,
          phone,
          email,
        })
        .select('id')
        .single()

      if (insertCustomerError || !insertedCustomer?.id) {
        console.error('Error sincronizando cliente:', insertCustomerError)
        return NextResponse.json({ error: 'No pudimos sincronizar el folio del cliente.' }, { status: 500 })
      }

      customerId = insertedCustomer.id
    } else {
      const { error: updateCustomerError } = await admin
        .from('customers')
        .update({ company, contact, phone, email })
        .eq('id', customerId)

      if (updateCustomerError) {
        console.error('Error actualizando cliente:', updateCustomerError)
        return NextResponse.json({ error: 'No pudimos actualizar los datos del cliente.' }, { status: 500 })
      }
    }

    const { error: linkError } = await admin.from('customer_users').upsert({
      customer_id: customerId,
      user_id: userId,
    })

    if (linkError) {
      console.error('Error vinculando customer_users:', linkError)
      return NextResponse.json({ error: 'No pudimos vincular el folio con el usuario.' }, { status: 500 })
    }

    return NextResponse.json(
      {
        userId,
        linkedCustomerId: customerId,
        customerFolio,
        reusedExistingUser,
      },
      { status: createdNewUser ? 201 : 200 },
    )
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'No pudimos crear el acceso del cliente.' }, { status: 500 })
  }
}
