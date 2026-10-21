import { NextResponse } from 'next/server'
import { getTimeClockContext } from '@/features/time-clock/services/server'

/** Mailbox status only. No credentials, message content, or private configuration are exposed. */
export async function GET() {
  const ctx = await getTimeClockContext()
  if (!ctx) return NextResponse.json({ error: 'Sesión no autorizada' }, { status: 401 })
  const permitted = String(ctx.user.email ?? '').toLowerCase() === 'pedrog@nedviconstructora.com' || String(ctx.profile.role ?? '').toLowerCase() === 'developer'
  if (!permitted) return NextResponse.json({ error: 'Buzón no autorizado' }, { status: 403 })
  const configured = Boolean(process.env.SPACEMAIL_USER && process.env.SPACEMAIL_PASSWORD)
  return NextResponse.json({ mailbox: 'pedrog@nedviconstructora.com', configured, connected: false, status: configured ? 'pending_validation' : 'missing_credentials' }, { headers: { 'Cache-Control':'no-store' } })
}
