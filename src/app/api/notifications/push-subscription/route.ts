import { NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/utils/supabase/server'

export const dynamic = 'force-dynamic'

type SubscriptionInput = {
  endpoint?: unknown
  expirationTime?: unknown
  keys?: { p256dh?: unknown; auth?: unknown }
}

function isTrustedPushEndpoint(value: unknown): value is string {
  if (typeof value !== 'string' || value.length > 2048) return false
  try {
    const u = new URL(value)
    const h = u.hostname.toLowerCase()
    if (u.protocol !== 'https:' || u.username || u.password || u.port) return false
    return h === 'fcm.googleapis.com' || h === 'android.googleapis.com' ||
      h === 'updates.push.services.mozilla.com' ||
      h.endsWith('.push.apple.com') ||
      h === 'web.push.apple.com' ||
      h === 'wns2-pn1p.notify.windows.com' ||
      h.endsWith('.notify.windows.com') ||
      h === 'push.services.mozilla.com'
  } catch { return false }
}

async function staffContext() {
  const server = await createServerClient()
  const { data: { user }, error } = await server.auth.getUser()
  if (error || !user) return null
  const { data: profile, error: profileError } = await server.from('profiles')
    .select('role,active,deleted_at').eq('id', user.id).maybeSingle()
  if (profileError || !profile?.active || profile.deleted_at ||
    String(profile.role).toLowerCase() === 'cliente') return null
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Missing private Supabase server settings')
  const admin = createAdminClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  return { userId: user.id, admin }
}

export async function GET() {
  try {
    const ctx = await staffContext()
    if (!ctx) return NextResponse.json({ error: 'Acceso reservado al personal NEDVI.' }, { status: 403 })
    const { data: publicKey, error } = await ctx.admin.rpc('nedvi_webpush_public_key')
    if (error) throw error
    return NextResponse.json({
      configured: typeof publicKey === 'string' && publicKey.length > 0,
      publicKey: publicKey || null,
    }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) {
    console.error('Error revisando Web Push:', error)
    return NextResponse.json({ error: 'No se pudo consultar el servicio Push.' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await staffContext()
    if (!ctx) return NextResponse.json({ error: 'Acceso reservado al personal NEDVI.' }, { status: 403 })
    const { data: publicKey, error: configError } = await ctx.admin.rpc('nedvi_webpush_public_key')
    if (configError || !publicKey)
      return NextResponse.json({ error: 'Web Push todavía no está configurado en el servidor.' }, { status: 503 })
    const body = await request.json().catch(() => null) as SubscriptionInput | null
    const endpoint = body?.endpoint
    const p256dh = body?.keys?.p256dh
    const auth = body?.keys?.auth
    const keyRegex = /^[\w-]{10,200}$/
    if (!isTrustedPushEndpoint(endpoint) ||
        typeof p256dh !== 'string' || !keyRegex.test(p256dh) ||
        typeof auth !== 'string' || !keyRegex.test(auth)) {
      return NextResponse.json({ error: 'Suscripción Push inválida.' }, { status: 400 })
    }
    const { error } = await ctx.admin.from('nedvi_push_subscriptions').upsert({
      user_id: ctx.userId, endpoint, p256dh, auth,
      user_agent: (request.headers.get('user-agent') || '').slice(0, 256),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'endpoint' })
    if (error) {
      console.error('Device Push subscription rejected:', { code: error.code, message: error.message })
      return NextResponse.json({
        error: 'El servidor no pudo guardar este dispositivo. Intenta actualizar la aplicación y vuelve a activar Push.',
        code: error.code || 'PUSH_SAVE_ERROR',
      }, { status: 503 })
    }
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Error al registrar Web Push:', error)
    return NextResponse.json({ error: 'No se pudo registrar este dispositivo.' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const ctx = await staffContext()
    if (!ctx) return NextResponse.json({ error: 'Acceso reservado al personal NEDVI.' }, { status: 403 })
    const body = await request.json().catch(() => null) as { endpoint?: unknown } | null
    if (typeof body?.endpoint !== 'string' || body.endpoint.length > 2048)
      return NextResponse.json({ error: 'Suscripción inválida.' }, { status: 400 })
    const { error } = await ctx.admin.from('nedvi_push_subscriptions')
      .delete().eq('user_id', ctx.userId).eq('endpoint', body.endpoint)
    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Error al desactivar Web Push:', error)
    return NextResponse.json({ error: 'No se pudo desactivar el dispositivo.' }, { status: 500 })
  }
}
