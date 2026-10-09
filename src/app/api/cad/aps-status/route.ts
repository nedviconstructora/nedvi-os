import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Inicia sesión en NEDVI OS.' }, { status: 401 })

    const { data: profile, error: profileError } = await supabase.from('profiles')
      .select('role,active,deleted_at').eq('id', user.id).single()
    if (profileError || !profile || !profile.active || profile.deleted_at || !['administracion', 'obra'].includes(profile.role)) {
      return NextResponse.json({ error: 'Solo el equipo interno NEDVI puede utilizar APS.' }, { status: 403 })
    }

    const id = process.env.APS_CLIENT_ID
    const secret = process.env.APS_CLIENT_SECRET
    if (!id || !secret) return NextResponse.json({ error: 'Faltan las credenciales APS en el servidor.' }, { status: 503 })

    const auth = Buffer.from(`${id}:${secret}`).toString('base64')
    const response = await fetch('https://developer.api.autodesk.com/authentication/v2/token', {
      method: 'POST',
      headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'client_credentials', scope: 'viewables:read' }),
      cache: 'no-store',
    })
    if (!response.ok) {
      console.error('Autodesk APS authentication returned', response.status)
      return NextResponse.json({ error: 'Autodesk rechazó la autenticación. Revisa el Client ID y Client Secret.', status: response.status }, { status: 502 })
    }
    // This endpoint checks connectivity only. Credentials and access tokens never reach the browser.
    return NextResponse.json({ connected: true, service: 'Autodesk Platform Services', checkedAt: new Date().toISOString() }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('APS connection check failed:', error)
    return NextResponse.json({ error: 'No fue posible comprobar la conexión APS.' }, { status: 500 })
  }
}
