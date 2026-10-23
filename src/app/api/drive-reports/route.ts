import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/utils/supabase/server'
import { driveReportsConfigured, syncDriveReportIndex } from '@/lib/google-drive-reports'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = await createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Debes iniciar sesión.' }, { status: 401 })
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, active, deleted_at')
      .eq('id', user.id)
      .maybeSingle()

    if (profileError || !profile?.active || profile.deleted_at ||
        String(profile.role).toLowerCase() === 'cliente') {
      return NextResponse.json({ error: 'Acceso reservado al equipo NEDVI activo.' }, { status: 403 })
    }

    let warning: string | null = null
    const { data: latest } = await supabase
      .from('drive_report_files')
      .select('last_seen_at')
      .order('last_seen_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    // Pull from Drive when a staff member opens the page and the index is stale.
    // Source files stay in Drive; this operation only updates the metadata index.
    const stale = !latest?.last_seen_at ||
      Date.now() - new Date(latest.last_seen_at).getTime() > 10 * 60 * 1000
    if (driveReportsConfigured() && stale) {
      try {
        const syncResult = await syncDriveReportIndex()
        if (syncResult.warning) warning = syncResult.warning
      } catch (error) {
        console.error('Google Drive report sync unavailable', error)
        warning = 'No se pudo actualizar Drive. Se muestra el último índice disponible.'
      }
    }

    const { data, error } = await supabase
      .from('drive_report_files')
      .select('file_id,name,mime_type,web_view_link,folder_path,staff_name,report_year,report_month,modified_time,size_bytes,last_seen_at')
      .order('modified_time', { ascending: false, nullsFirst: false })
      .limit(2500)

    if (error) throw error

    const latestSync = (data ?? []).reduce<string | null>((max, item) =>
      !max || item.last_seen_at > max ? item.last_seen_at : max, null)

    return NextResponse.json({
      items: data ?? [],
      lastSyncedAt: latestSync,
      connectionConfigured: driveReportsConfigured(),
      warning,
    }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) {
    console.error('Drive reports listing failed', error)
    return NextResponse.json({ error: 'No fue posible consultar los reportes.' }, { status: 500 })
  }
}
