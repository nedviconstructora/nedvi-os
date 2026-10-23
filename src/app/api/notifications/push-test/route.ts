import { NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/utils/supabase/server'
import { dispatchWebPush } from '@/lib/dispatchWebPush'

export async function POST() {
  try {
    const server = await createServerClient()
    const { data: { user } } = await server.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Inicia sesión.' }, { status: 401 })
    const { data: profile } = await server.from('profiles')
      .select('role,active,deleted_at').eq('id', user.id).maybeSingle()
    if (!profile?.active || profile.deleted_at || String(profile.role) === 'cliente')
      return NextResponse.json({ error: 'Solo el equipo NEDVI puede probar las notificaciones.' }, { status: 403 })

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) throw new Error('Server configuration unavailable')
    const admin = createAdminClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
    const { count, error: countError } = await admin.from('nedvi_push_subscriptions')
      .select('id', { count: 'exact', head: true }).eq('user_id', user.id)
    if (countError) throw countError
    if (!count) return NextResponse.json({ error: 'Activa primero Push en tu dispositivo.' }, { status: 400 })

    // Avoid users repeatedly generating notifications as a load test.
    const { data: recent, error: recentError } = await admin.from('internal_notifications')
      .select('id').eq('recipient_id', user.id).eq('event_type', 'push_test')
      .gte('created_at', new Date(Date.now() - 60_000).toISOString()).limit(1)
    if (recentError) throw recentError
    if (recent?.length) return NextResponse.json({ error: 'Ya se envió una prueba. Inténtalo después de un minuto.' }, { status: 429 })

    const entityId = crypto.randomUUID()
    const { data: notice, error } = await admin.from('internal_notifications').insert({
      recipient_id: user.id, actor_id: user.id,
      event_type: 'push_test', entity_id: entityId,
      title: 'NEDVI OS · Notificación de prueba',
      body: '¡Las notificaciones Push están conectadas! Puedes cerrar la app y seguir recibiendo avisos.',
      target_path: '/dashboard',
    }).select('id').single()
    if (error) throw error
    const result = await dispatchWebPush('push_test', entityId)
    if (!result.ok) {
      // Failed attempts should not lock the user out of retesting for 60 seconds.
      if (notice?.id && result.sent === 0) {
        const { error: cleanupError } = await admin.from('internal_notifications')
          .delete().eq('id', notice.id).eq('recipient_id', user.id)
        if (cleanupError) console.warn('Could not discard unsuccessful push test record:', cleanupError.code)
      }
      const reason = result.reason === 'no registered devices'
        ? 'No se encontraron dispositivos Push activos para tu cuenta.'
        : result.reason === 'no recent notices'
          ? 'El servidor no encontró el aviso de prueba.'
          : result.reason || 'El servidor no confirmó el envío al dispositivo.'
      return NextResponse.json({ error: reason, sent: result.sent, failed: result.failed }, { status: 503 })
    }
    return NextResponse.json({
      ok: true,
      sent: result.sent,
      failed: result.failed,
      message: result.failed > 0
        ? 'Push aceptado por ' + result.sent + ' dispositivo(s); ' + result.failed + ' intento(s) fallaron.'
        : 'Push aceptado por ' + result.sent + ' dispositivo(s). Comprueba si aparece la notificación.',
    })
  } catch (error) {
    console.error('Push test failed:', error)
    return NextResponse.json({ error: 'No se pudo enviar la prueba.' }, { status: 500 })
  }
}
