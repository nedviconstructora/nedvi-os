import { NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/utils/supabase/server'

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id))
      return NextResponse.json({ error: 'Identificador inválido.' }, { status: 400 })
    const server = await createServerClient()
    const { data: { user } } = await server.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Sesión no válida.' }, { status: 401 })
    const { data: profile, error: profileError } = await server.from('profiles').select('role,active').eq('id',user.id).maybeSingle()
    if (profileError || !profile?.active || !['administracion','administrador','admin','obra','supervisor'].includes(String(profile.role ?? '').toLowerCase().trim()))
      return NextResponse.json({ error: 'Solo Administración y Supervisores de obra pueden eliminar completamente un cliente.' }, { status: 403 })
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) return NextResponse.json({ error: 'Configuración del servidor incompleta.' }, { status: 500 })
    const admin = createAdminClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}})
    const { data: customer, error: customerError } = await admin.from('customers').select('id,company').eq('id',id).maybeSingle()
    if (customerError || !customer) return NextResponse.json({ error: 'Cliente no encontrado.' }, { status: 404 })
    const { data: relations, error: relationError } = await admin.from('customer_users').select('user_id').eq('customer_id',id)
    if (relationError) throw relationError
    const userIds = (relations ?? []).map(x=>x.user_id)
    // Never erase an account linked to any other customer or assigned to projects.
    const removableIds: string[] = []
    for (const userId of userIds) {
      const [{count:otherCustomers,error:e1},{count:memberships,error:e2},{data:linkedProfile,error:e3}] = await Promise.all([
        admin.from('customer_users').select('*',{count:'exact',head:true}).eq('user_id',userId).neq('customer_id',id),
        admin.from('project_members').select('*',{count:'exact',head:true}).eq('user_id',userId),
        admin.from('profiles').select('role').eq('id',userId).maybeSingle()
      ])
      if (e1||e2||e3) throw new Error('No se pudieron verificar las cuentas asociadas.')
      if (!otherCustomers && !memberships && String(linkedProfile?.role).toLowerCase()==='cliente') removableIds.push(userId)
    }
    // Single PostgreSQL transaction for core records and FK-dependent project data.
    const { data: deleted, error: deletionError } = await admin.rpc('nedvi_delete_customer_bundle',{p_customer_id:id})
    if (deletionError) throw deletionError
    const accountErrors: string[] = []
    for (const userId of removableIds) {
      const {error} = await admin.auth.admin.deleteUser(userId)
      if (error) { console.error('Cliente eliminado, pero falló borrar su acceso:',userId,error); accountErrors.push(userId) }
    }
    return NextResponse.json({deleted,accountsDeleted:removableIds.length-accountErrors.length,accountCleanupPending:accountErrors.length,warning:accountErrors.length?'Se eliminaron los registros del cliente, pero quedaron accesos que requieren revisión.':null})
  } catch (error) {
    console.error('Error eliminando cliente integralmente:', error)
    const details = error && typeof error === 'object'
      ? (error as { code?: string; message?: string; details?: string; hint?: string })
      : {}
    const code = details.code || 'SERVER_ERROR'
    const safeMessage = code === '42501'
      ? 'Supabase rechazó los permisos para eliminar. Revisa el rol administrativo y la función de eliminación.'
      : code === '23503'
      ? 'Existen registros vinculados que impiden completar el borrado. Revisa las relaciones de la base de datos.'
      : code === 'PGRST202' || code === '42883'
      ? 'La función de eliminación no está disponible en Supabase. Revisa la migración nedvi_delete_customer_bundle.'
      : 'No se pudo completar la eliminación integral.'
    return NextResponse.json(
      { error: safeMessage, errorCode: code, diagnostic: details.message?.slice(0, 250) || null },
      { status: 500 },
    )
  }
}
