import { NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/utils/supabase/server'

function normalizeRole(value: unknown) {
  return String(value ?? '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

export async function POST(request: Request) {
  try {
    const server = await createServerClient()
    const { data: { user } } = await server.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Sesión no válida.' }, { status: 401 })

    const { data: profile, error: profileError } = await server.from('profiles').select('role, active').eq('id', user.id).maybeSingle()
    if (profileError || !profile?.active || !['administracion', 'administrador', 'admin', 'obra', 'supervisor'].includes(normalizeRole(profile.role))) {
      return NextResponse.json({ error: 'No tienes permiso para regenerar contraseñas.' }, { status: 403 })
    }

    const body = await request.json() as { userId?: string; customerFolio?: string }
    if (!body.userId || !body.customerFolio) {
      return NextResponse.json({ error: 'Faltan el usuario o el folio del cliente.' }, { status: 400 })
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) return NextResponse.json({ error: 'Configuración de Supabase incompleta.' }, { status: 500 })
    const admin = createAdminClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })

    const { data: customer, error: customerError } = await admin.from('customers').select('id').eq('folio', body.customerFolio).maybeSingle()
    if (customerError || !customer) return NextResponse.json({ error: 'Folio del cliente no encontrado.' }, { status: 404 })

    const { data: relation, error: relationError } = await admin.from('customer_users').select('user_id').eq('customer_id', customer.id).eq('user_id', body.userId).maybeSingle()
    if (relationError || !relation) return NextResponse.json({ error: 'El usuario no está vinculado a ese cliente.' }, { status: 403 })

    const { data: targetProfile, error: targetError } = await admin.from('profiles').select('role').eq('id', body.userId).maybeSingle()
    if (targetError || normalizeRole(targetProfile?.role) !== 'cliente') {
      return NextResponse.json({ error: 'La cuenta no corresponde a un cliente.' }, { status: 403 })
    }

    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'
    const bytes = new Uint32Array(14)
    crypto.getRandomValues(bytes)
    const password = 'Nedvi-' + Array.from(bytes, value => alphabet[value % alphabet.length]).join('') + '!'
    const { error: resetError } = await admin.auth.admin.updateUserById(body.userId, { password })
    if (resetError) {
      console.error('Error restableciendo contraseña de cliente:', resetError)
      return NextResponse.json({ error: 'No pudimos actualizar la contraseña.' }, { status: 500 })
    }
    return NextResponse.json({ password }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('Error regenerando credenciales:', error)
    return NextResponse.json({ error: 'No pudimos regenerar la contraseña.' }, { status: 500 })
  }
}
