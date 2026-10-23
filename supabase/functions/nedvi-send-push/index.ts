// NEDVI OS — trusted, server-to-server Web Push sender.
// The service-role token is required; VAPID credentials live in Supabase Vault.
import { createClient } from 'npm:@supabase/supabase-js@2.57.0'
import webpush from 'npm:web-push@3.6.7'

const allowedEvents = new Set(['customers_insert', 'attendance_entrada', 'attendance_salida', 'push_test'])
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  })
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const url = Deno.env.get('SUPABASE_URL')
  if (!serviceKey || !url) return json({ error: 'Server configuration unavailable' }, 503)
  if (req.headers.get('authorization') !== 'Bearer ' + serviceKey) return json({ error: 'Unauthorized' }, 401)
  const payload = await req.json().catch(() => null) as { event_type?: unknown; entity_id?: unknown } | null
  if (!allowedEvents.has(String(payload?.event_type)) ||
      typeof payload?.entity_id !== 'string' || !uuidPattern.test(payload.entity_id))
    return json({ error: 'Invalid event' }, 400)

  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  try {
    const cutoff = new Date(Date.now() - 10 * 60 * 1000).toISOString()
    const { data: notices, error: noticeError } = await admin.from('internal_notifications')
      .select('id,recipient_id,title,body,target_path')
      .eq('event_type', payload.event_type)
      .eq('entity_id', payload.entity_id)
      .gte('created_at', cutoff)
      .limit(80)
    if (noticeError) throw noticeError
    if (!notices?.length) return json({ ok: true, sent: 0, reason: 'no recent notices' })

    const recipients = [...new Set(notices.map(n => n.recipient_id))]
    const { data: subscriptions, error: subscriptionError } = await admin.from('nedvi_push_subscriptions')
      .select('id,user_id,endpoint,p256dh,auth')
      .in('user_id', recipients).limit(200)
    if (subscriptionError) throw subscriptionError
    if (!subscriptions?.length) return json({ ok: true, sent: 0, reason: 'no registered devices' })

    const { data: vapid, error: vapidError } = await admin.rpc('nedvi_webpush_credentials')
    if (vapidError || !vapid?.publicKey || !vapid?.privateKey)
      throw new Error('Missing private Web Push credentials')
    webpush.setVapidDetails('mailto:nedviconstructora@gmail.com', vapid.publicKey, vapid.privateKey)

    const { data: previous, error: deliveryError } = await admin.from('nedvi_push_deliveries')
      .select('notification_id,subscription_id,sent_at')
      .in('notification_id', notices.map(n => n.id))
    if (deliveryError) throw deliveryError
    const delivered = new Set((previous ?? []).filter(row => row.sent_at)
      .map(row => row.notification_id + ':' + row.subscription_id))

    let sent = 0
    let failed = 0
    for (const notice of notices) {
      for (const subscription of subscriptions) {
        if (subscription.user_id !== notice.recipient_id) continue
        if (delivered.has(notice.id + ':' + subscription.id)) continue
        try {
          await webpush.sendNotification({
            endpoint: subscription.endpoint,
            keys: { p256dh: subscription.p256dh, auth: subscription.auth },
          }, JSON.stringify({
            id: notice.id, title: notice.title, body: notice.body,
            path: notice.target_path || '/dashboard',
          }), { TTL: 3600 })
          sent++
          const { error } = await admin.from('nedvi_push_deliveries').upsert({
            notification_id: notice.id,
            subscription_id: subscription.id,
            attempted_at: new Date().toISOString(),
            sent_at: new Date().toISOString(),
            last_error: null,
          }, { onConflict: 'notification_id,subscription_id' })
          if (error) throw error
          await admin.from('nedvi_push_subscriptions')
            .update({ last_success_at: new Date().toISOString() }).eq('id', subscription.id)
        } catch (error) {
          failed++
          const status = typeof error === 'object' && error !== null && 'statusCode' in error
            ? Number((error as { statusCode?: number }).statusCode) : 0
          if (status === 404 || status === 410) {
            await admin.from('nedvi_push_subscriptions').delete().eq('id', subscription.id)
          } else {
            const message = error instanceof Error ? error.message : 'Web Push transport error'
            console.error('Web Push delivery failed:', status || 'unknown', message.slice(0, 180))
            await admin.from('nedvi_push_deliveries').upsert({
              notification_id: notice.id, subscription_id: subscription.id,
              attempted_at: new Date().toISOString(),
              sent_at: null, last_error: message.slice(0, 180),
            }, { onConflict: 'notification_id,subscription_id' })
          }
        }
      }
    }
    return json({ ok: true, sent, failed })
  } catch (error) {
    console.error('NEDVI Push dispatcher error:', error)
    return json({ error: 'Push dispatch temporarily unavailable' }, 500)
  }
})
