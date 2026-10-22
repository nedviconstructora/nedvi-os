import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/utils/supabase/server'
import { driveReportsConfigured, syncDriveReportIndex } from '@/lib/google-drive-reports'

export const dynamic = 'force-dynamic'

const syncRoles = new Set([
  'developer', 'administracion', 'gerente_comercial',
  'gerente_administrativo', 'gerente_operativo',
])

export async function POST() {
  try {
    const supabase = await createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Debes iniciar sesión.' }, { status: 401 })
    }
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('role, active, deleted_at')
      .eq('id', user.id)
      .maybeSingle()
    if (error || !profile?.active || profile.deleted_at ||
        !syncRoles.has(String(profile.role).toLowerCase())) {
      return NextResponse.json({ error: 'La sincronización manual requiere permiso de Gerencia o DEVELOPER.' }, { status: 403 })
    }
    if (!driveReportsConfigured()) {
      return NextResponse.json({
        error: 'Falta autorizar la cuenta de servicio de Google Drive en el servidor.'
      }, { status: 503 })
    }
    const result = await syncDriveReportIndex()
    return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('Drive reports manual sync failed', error)
    return NextResponse.json({ error: 'No se pudo sincronizar. Verifica el acceso de lectura a la carpeta y la configuración privada.' }, { status: 502 })
  }
}
