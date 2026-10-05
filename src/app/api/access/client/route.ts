import { NextResponse } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

type CallerProfile = {
  role?: string
  active?: boolean
  permissions?: string[]
}

type CustomerLink = {
  user_id: string
}

type ClientProfile = {
  id: string
  full_name: string
  email: string | null
  active: boolean
}

function configError() {
  if (!supabaseUrl || !serviceRoleKey) {
    return 'Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local.'
  }
  return null
}

function adminHeaders(extra?: Record<string, string>) {
  return {
    apikey: serviceRoleKey as string,
    Authorization: `Bearer ${serviceRoleKey}`,
    ...extra,
  }
}

async function getCaller(request: Request) {
  const authorization = request.headers.get('authorization')
  const token = authorization?.startsWith('Bearer ') ? authorization.slice(7) : null

  if (!token || !supabaseUrl || !serviceRoleKey) return null

  const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${token}`,
    },
    cache: 'no-store',
  })

  if (!userResponse.ok) return null
  const user = (await userResponse.json()) as { id?: string }
  if (!user.id) return null

  const profileResponse = await fetch(
    `${supabaseUrl}/rest/v1/profiles?id=eq.${encodeURIComponent(user.id)}&select=role,active,permissions&limit=1`,
    { headers: adminHeaders(), cache: 'no-store' },
  )

  if (!profileResponse.ok) return null
  const profiles = (await profileResponse.json()) as CallerProfile[]
  const profile = profiles[0]

  if (!profile?.active) return null

  const canManageClients =
    profile.role === 'administracion' ||
    profile.role === 'obra' ||
    profile.permissions?.includes('commercial')

  return canManageClients ? { userId: user.id, profile } : null
}

async function getCustomerLink(customerId: string) {
  if (!supabaseUrl) return null

  const response = await fetch(
    `${supabaseUrl}/rest/v1/customer_users?customer_id=eq.${encodeURIComponent(customerId)}&select=user_id&limit=1`,
    { headers: adminHeaders(), cache: 'no-store' },
  )

  if (!response.ok) return null
  const rows = (await response.json()) as CustomerLink[]
  return rows[0] ?? null
}

async function getClientProfile(userId: string) {
  if (!supabaseUrl) return null

  const response = await fetch(
    `${supabaseUrl}/rest/v1/profiles?id=eq.${encodeURIComponent(userId)}&select=id,full_name,email,active&limit=1`,
    { headers: adminHeaders(), cache: 'no-store' },
  )

  if (!response.ok) return null
  const rows = (await response.json()) as ClientProfile[]
  return rows[0] ?? null
}

function temporaryPassword() {
  const randomPart = crypto.randomUUID().replace(/-/g, '').slice(0, 10).toUpperCase()
  return `Nedvi#${randomPart}`
}

async function readJson<T>(response: Response): Promise<T | null> {
  try {
    return (await response.json()) as T
  } catch {
    return null
  }
}

export async function GET(request: Request) {
  const missingConfig = configError()
  if (missingConfig) return NextResponse.json({ error: missingConfig }, { status: 500 })

  const caller = await getCaller(request)
  if (!caller) return NextResponse.json({ error: 'No tienes permiso para administrar accesos.' }, { status: 403 })

  const { searchParams } = new URL(request.url)
  const customerId = searchParams.get('customerId')?.trim()
  if (!customerId) return NextResponse.json({ error: 'Falta customerId.' }, { status: 400 })

  const link = await getCustomerLink(customerId)
  if (!link) return NextResponse.json({ linked: false })

  const profile = await getClientProfile(link.user_id)
  return NextResponse.json({
    linked: true,
    userId: link.user_id,
    email: profile?.email ?? null,
    fullName: profile?.full_name ?? 'Cliente NEDVI',
    active: profile?.active ?? false,
  })
}

export async function POST(request: Request) {
  const missingConfig = configError()
  if (missingConfig) return NextResponse.json({ error: missingConfig }, { status: 500 })

  const caller = await getCaller(request)
  if (!caller) return NextResponse.json({ error: 'No tienes permiso para crear accesos.' }, { status: 403 })

  const body = (await request.json().catch(() => null)) as {
    customerId?: string
    email?: string
    fullName?: string
  } | null

  const customerId = body?.customerId?.trim()
  const email = body?.email?.trim().toLowerCase()
  const fullName = body?.fullName?.trim() || 'Cliente NEDVI'

  if (!customerId) return NextResponse.json({ error: 'Falta el cliente.' }, { status: 400 })
  if (!email || !email.includes('@')) return NextResponse.json({ error: 'Escribe un correo válido.' }, { status: 400 })

  const existingLink = await getCustomerLink(customerId)
  if (existingLink) {
    return NextResponse.json({ error: 'Este cliente ya tiene un acceso vinculado.' }, { status: 409 })
  }

  const password = temporaryPassword()
  const firstName = fullName.split(' ')[0] || fullName
  const initials = fullName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')

  const createResponse = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
    method: 'POST',
    headers: adminHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        first_name: firstName,
        initials,
      },
      app_metadata: {
        role: 'cliente',
      },
    }),
  })

  const created = await readJson<{ id?: string; user?: { id?: string }; msg?: string; message?: string }>(createResponse)
  const userId = created?.id ?? created?.user?.id

  if (!createResponse.ok || !userId) {
    const message = created?.msg || created?.message || 'No se pudo crear el usuario en Supabase Auth.'
    return NextResponse.json({ error: message }, { status: 400 })
  }

  const profileResponse = await fetch(`${supabaseUrl}/rest/v1/profiles?on_conflict=id`, {
    method: 'POST',
    headers: adminHeaders({
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=minimal',
    }),
    body: JSON.stringify({
      id: userId,
      full_name: fullName,
      first_name: firstName,
      initials,
      email,
      role: 'cliente',
      active: true,
      permissions: [],
    }),
  })

  if (!profileResponse.ok) {
    await fetch(`${supabaseUrl}/auth/v1/admin/users/${encodeURIComponent(userId)}`, {
      method: 'DELETE',
      headers: adminHeaders(),
    })
    return NextResponse.json({ error: 'No se pudo crear el perfil del cliente.' }, { status: 500 })
  }

  const linkResponse = await fetch(`${supabaseUrl}/rest/v1/customer_users`, {
    method: 'POST',
    headers: adminHeaders({
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    }),
    body: JSON.stringify({ customer_id: customerId, user_id: userId }),
  })

  if (!linkResponse.ok) {
    await fetch(`${supabaseUrl}/auth/v1/admin/users/${encodeURIComponent(userId)}`, {
      method: 'DELETE',
      headers: adminHeaders(),
    })
    return NextResponse.json({ error: 'No se pudo vincular el usuario con el cliente.' }, { status: 500 })
  }

  return NextResponse.json({
    linked: true,
    userId,
    email,
    fullName,
    active: true,
    temporaryPassword: password,
  }, { status: 201 })
}

export async function PATCH(request: Request) {
  const missingConfig = configError()
  if (missingConfig) return NextResponse.json({ error: missingConfig }, { status: 500 })

  const caller = await getCaller(request)
  if (!caller) return NextResponse.json({ error: 'No tienes permiso para administrar accesos.' }, { status: 403 })

  const body = (await request.json().catch(() => null)) as {
    customerId?: string
    action?: 'reset-password' | 'set-active'
    active?: boolean
  } | null

  const customerId = body?.customerId?.trim()
  if (!customerId) return NextResponse.json({ error: 'Falta el cliente.' }, { status: 400 })

  const link = await getCustomerLink(customerId)
  if (!link) return NextResponse.json({ error: 'Este cliente todavía no tiene acceso.' }, { status: 404 })

  if (body?.action === 'reset-password') {
    const password = temporaryPassword()
    const response = await fetch(`${supabaseUrl}/auth/v1/admin/users/${encodeURIComponent(link.user_id)}`, {
      method: 'PUT',
      headers: adminHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ password }),
    })

    if (!response.ok) return NextResponse.json({ error: 'No se pudo restablecer la contraseña.' }, { status: 500 })
    return NextResponse.json({ temporaryPassword: password })
  }

  if (body?.action === 'set-active' && typeof body.active === 'boolean') {
    const response = await fetch(
      `${supabaseUrl}/rest/v1/profiles?id=eq.${encodeURIComponent(link.user_id)}`,
      {
        method: 'PATCH',
        headers: adminHeaders({ 'Content-Type': 'application/json', Prefer: 'return=minimal' }),
        body: JSON.stringify({ active: body.active }),
      },
    )

    if (!response.ok) return NextResponse.json({ error: 'No se pudo cambiar el estado del acceso.' }, { status: 500 })
    return NextResponse.json({ active: body.active })
  }

  return NextResponse.json({ error: 'Acción no válida.' }, { status: 400 })
}
