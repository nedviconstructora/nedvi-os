import { NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/utils/supabase/server'

export async function PATCH(request: Request) {
  try {
    const server = await createServerClient()
    const { data: { user } } = await server.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Sesión no válida.' }, { status: 401 })
    const { data: manager } = await server.from('profiles').select('role,active').eq('id', user.id).maybeSingle()
    const role = String(manager?.role ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    if (!manager?.active || !['administracion','administrador','admin'].includes(role)) {
      return NextResponse.json({ error: 'Solo Administración puede editar clientes.' }, { status: 403 })
    }
    const body = await request.json() as { userId?: string; name?: string; phone?: string }
    const userId = body.userId?.trim()
    const name = body.name?.trim() ?? ''
    const phone = body.phone?.trim() ?? ''
    if (!userId || !name || name.length > 180 || !/^\+?[0-9 ().-]{10,20}$/.test(phone) || phone.replace(/\D/g, '').length < 10) {
      return NextResponse.json({ error: 'Indica un nombre y teléfono válidos (mínimo 10 dígitos).' }, { status: 400 })
    }
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) return NextResponse.json({ error: 'Supabase no configurado.' }, { status: 500 })
    const admin = createAdminClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}})
    const { data: profile, error: profileError } = await admin.from('profiles').select('id,role,full_name,phone').eq('id',userId).maybeSingle()
    if (profileError || !profile || String(profile.role).toLowerCase() !== 'cliente') return NextResponse.json({ error:'El usuario no corresponde a un cliente.' },{status:403})
    const { data: link, error: linkError } = await admin.from('customer_users').select('customer_id').eq('user_id',userId).maybeSingle()
    if (linkError || !link?.customer_id) return NextResponse.json({error:'El cliente no tiene un folio vinculado.'},{status:404})
    const { data: customer, error: customerError } = await admin.from('customers').select('id,contact,phone').eq('id',link.customer_id).maybeSingle()
    if (customerError || !customer) return NextResponse.json({error:'Cliente no encontrado.'},{status:404})
    const { error: customerUpdateError } = await admin.from('customers').update({contact:name,phone}).eq('id',customer.id)
    if (customerUpdateError) return NextResponse.json({error:'No pudimos actualizar el cliente en CRM.'},{status:500})
    const {error: profileUpdateError}=await admin.from('profiles').update({full_name:name,first_name:name.split(/\s+/)[0],phone}).eq('id',userId)
    if(profileUpdateError) {
      await admin.from('customers').update({contact:customer.contact,phone:customer.phone}).eq('id',customer.id)
      return NextResponse.json({error:'No pudimos sincronizar el usuario. Inténtalo de nuevo.'},{status:500})
    }
    const {data: authUser, error: authReadError}=await admin.auth.admin.getUserById(userId)
    if(!authReadError && authUser.user) {
      const {error: metadataError}=await admin.auth.admin.updateUserById(userId,{user_metadata:{...(authUser.user.user_metadata??{}),full_name:name,first_name:name.split(/\s+/)[0]}})
      if(metadataError) console.error('No se pudo sincronizar metadata del cliente:',metadataError)
    }
    return NextResponse.json({updated:true,customerId:customer.id,name,phone},{headers:{'Cache-Control':'no-store'}})
  } catch (error) {
    console.error('Error editando cliente:',error)
    return NextResponse.json({error:'No pudimos guardar los cambios del cliente.'},{status:500})
  }
}
