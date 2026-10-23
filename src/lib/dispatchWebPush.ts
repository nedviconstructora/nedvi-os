import 'server-only'

// Dispatch a persisted notification from a trusted server route.
// Do not block legitimate business operations if a push provider fails.
export type PushDispatchResult = {
  ok: boolean
  sent: number
  failed: number
  reason?: string
}

export async function dispatchWebPush(
  eventType: 'customers_insert' | 'attendance_entrada' | 'attendance_salida' | 'push_test',
  entityId: string,
): Promise<PushDispatchResult> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !secret) {
    console.error('Web Push dispatcher: missing server configuration')
    return { ok: false, sent: 0, failed: 0, reason: 'Falta configurar el servicio de envío.' }
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
      return { ok: false, sent: 0, failed: 0, reason: 'El servicio de envío respondió con error HTTP ' + response.status + '.' }
    }
    const body: unknown = await response.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return { ok: false, sent: 0, failed: 0, reason: 'El servidor de notificaciones no confirmó el resultado.' }
    }
    const value = body as { ok?: unknown; sent?: unknown; failed?: unknown; reason?: unknown }
    const sent = typeof value.sent === 'number' ? value.sent : 0
    const failed = typeof value.failed === 'number' ? value.failed : 0
    return {
      ok: value.ok === true && sent > 0,
      sent,
      failed,
      reason: typeof value.reason === 'string' ? value.reason : undefined,
    }
  } catch (error) {
    console.error('Web Push dispatch temporarily unavailable:', error)
    return { ok: false, sent: 0, failed: 0, reason: 'No se pudo conectar con el servicio Push.' }
  }
}
