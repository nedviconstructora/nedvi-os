import 'server-only'

// Dispatch after the database commit. This cannot block or roll back a valid
// client or attendance registration when the push provider is unavailable.
export async function dispatchWebPush(
  eventType: 'customers_insert' | 'attendance_entrada' | 'attendance_salida' | 'push_test',
  entityId: string,
) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !secret) {
    console.warn('Web Push dispatcher: missing server configuration')
    return
  }
  try {
    const response = await fetch(url.replace(/\/$/, '') + '/functions/v1/nedvi-send-push', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + secret,
        apikey: secret,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ event_type: eventType, entity_id: entityId }),
      cache: 'no-store',
      signal: AbortSignal.timeout(10000),
    })
    if (!response.ok) {
      console.error('Web Push dispatch returned HTTP', response.status)
    }
  } catch (error) {
    console.error('Web Push dispatch temporarily unavailable:', error)
  }
}
