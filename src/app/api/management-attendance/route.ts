import { NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createClient } from '@/utils/supabase/server'

export const dynamic = 'force-dynamic'
const permitted = new Set(['developer','gerente_operativo','gerente_comercial','gerente_administrativo'])

export async function GET() {
  try {
    const server = await createClient()
    const { data:{user} } = await server.auth.getUser()
    if(!user) return NextResponse.json({error:'Inicia sesión.'},{status:401})
    const {data:profile,error:profileError}=await server.from('profiles').select('role,active').eq('id',user.id).maybeSingle()
    if(profileError || !profile?.active || !permitted.has(String(profile.role))) return NextResponse.json({error:'Acceso exclusivo de Gerencia y DEVELOPER.'},{status:403})
    const url=process.env.NEXT_PUBLIC_SUPABASE_URL, key=process.env.SUPABASE_SERVICE_ROLE_KEY
    if(!url || !key) return NextResponse.json({error:'Servicio no configurado.'},{status:500})
    const admin=createAdminClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}})
    const {data,error}=await admin.from('time_clock_entries').select('id,user_id,employee_name,event_type,occurred_at').is('deleted_at',null).order('occurred_at',{ascending:false}).limit(3000)
    if(error)throw error
    const ids=(data??[]).map(x=>x.id)
    const {data:adjustments,error:adjustmentError}=await admin.from('time_clock_adjustments').select('entry_id,adjusted_at').in('entry_id',ids.length?ids:['00000000-0000-0000-0000-000000000000'])
    if(adjustmentError)throw adjustmentError
    const dates=new Map((adjustments??[]).map(item=>[item.entry_id,item.adjusted_at]))
    return NextResponse.json({entries:(data??[]).map(item=>({id:item.id,userId:item.user_id,name:item.employee_name,type:item.event_type,at:dates.get(item.id)??item.occurred_at}))},{headers:{'Cache-Control':'no-store'}})
  }catch(error){
    console.error('Manager attendance read failed',error)
    return NextResponse.json({error:'No fue posible consultar el historial.'},{status:500})
  }
}
