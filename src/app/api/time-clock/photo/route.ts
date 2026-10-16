import { NextResponse } from 'next/server'
import { getTimeClockContext } from '@/features/time-clock/services/server'

export const dynamic = 'force-dynamic'
const headers = { 'Cache-Control': 'private, no-store', 'Referrer-Policy': 'no-referrer' }

export async function GET(request: Request) {
  try {
    const ctx = await getTimeClockContext()
    if (!ctx) return NextResponse.json({ error: 'Sesión no autorizada.' }, { status: 401, headers })
    const id = new URL(request.url).searchParams.get('id')
    if (!id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      return NextResponse.json({ error: 'Registro inválido.' }, { status: 400, headers })
    }

    // Apply the same visibility rules as the history before using the privileged storage client.
    const { data: entry, error } = await ctx.admin.from('time_clock_entries')
      .select('user_id,photo_path').eq('id', id).is('deleted_at', null).maybeSingle()
    if (error) throw error
    if (!entry?.photo_path) return NextResponse.json({ error: 'Fotografía no disponible.' }, { status: 404, headers })
    const canViewAll = ctx.isAdmin || ctx.isAccountant || ['obra', 'supervisor'].includes(String(ctx.profile.role ?? '').toLowerCase().trim())
    if (!canViewAll && entry.user_id !== ctx.user.id) {
      return NextResponse.json({ error: 'Acceso no autorizado.' }, { status: 403, headers })
    }

    const { data, error: signError } = await ctx.admin.storage.from('nedvi-time-clock').createSignedUrl(entry.photo_path, 60)
    if (signError || !data?.signedUrl) throw signError ?? new Error('No se pudo generar el enlace de la fotografía.')
    return NextResponse.redirect(data.signedUrl, { status: 307, headers })
  } catch (error) {
    console.error('Time clock photo failed', error)
    return NextResponse.json({ error: 'No se pudo abrir la fotografía. Intenta nuevamente.' }, { status: 503, headers })
  }
}
