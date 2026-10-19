import { NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/utils/supabase/server'
export const dynamic = 'force-dynamic'
const allowed = new Set(['developer','gerente_operativo','gerente_comercial','gerente_administrativo','administracion','administrador','admin','supervisor_obra','supervisor','obra'])
const uuid=(x:unknown):x is string=>typeof x==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(x)
async function ctx(){
 const s=await createServerClient()
 const {data:{user}}=await s.auth.getUser()
 if(!user)return null
 const {data:profile}=await s.from('profiles').select('role,active').eq('id',user.id).maybeSingle()
 if(!profile?.active||!allowed.has(String(profile.role).toLowerCase().trim()))return null
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY
 if(!url||!key)throw new Error('Configuración de Supabase incompleta')
 return {db:createAdminClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}}),role:String(profile.role).toLowerCase().trim()}
}
export async function GET(){
 try{
  const c=await ctx();if(!c)return NextResponse.json({error:'Sin autorización'},{status:403})
  const {data,error}=await c.db.from('nedvi_crews').select('id,name,foreman,specialty,members,active,project_id,updated_at').is('deleted_at',null).order('name')
  if(error)throw error
  return NextResponse.json({crews:data||[]},{headers:{'Cache-Control':'no-store'}})
 }catch(e){console.error('Crew listing failed',e);return NextResponse.json({error:'No se pudieron sincronizar las cuadrillas.'},{status:500})}
}
export async function PUT(request:Request){
 try{
  const c=await ctx();if(!c)return NextResponse.json({error:'Sin autorización'},{status:403})
  const body=await request.json().catch(()=>null) as {crews?:unknown[]}|null
  if(!Array.isArray(body?.crews)||body!.crews.length<1||body!.crews.length>500)return NextResponse.json({error:'Datos inválidos.'},{status:400})
  const validIds=[...new Set(body!.crews.map(x=>x && typeof x==='object'?(x as Record<string,unknown>).project_id:null).filter((x):x is string=>typeof x==='string' && x.length>0))]
  if(validIds.some(id=>!uuid(id)))return NextResponse.json({error:'Proyecto inválido.'},{status:400})
  if(validIds.length){const {data:validProjects,error:projectError}=await c.db.from('projects').select('id').in('id',validIds);if(projectError)throw projectError;if(validProjects?.length!==validIds.length)return NextResponse.json({error:'El proyecto seleccionado no existe.'},{status:400})}
  const rows=[]
  for(const raw of body!.crews){
   if(!raw||typeof raw!=='object')return NextResponse.json({error:'Cuadrilla inválida.'},{status:400})
   const crew=raw as Record<string,unknown>
   if(!uuid(crew.id)||typeof crew.name!=='string'||!crew.name.trim()||!Array.isArray(crew.members)||crew.members.length>1000)return NextResponse.json({error:'Revisa el identificador, nombre e integrantes.'},{status:400})
   rows.push({id:crew.id,project_id:typeof crew.project_id==='string'&&crew.project_id?crew.project_id:null,name:crew.name.trim().slice(0,160),foreman:String(crew.foreman||'').slice(0,160),specialty:String(crew.specialty||'').slice(0,160),members:crew.members.filter((x):x is string=>typeof x==='string').map(x=>x.slice(0,160)),active:crew.active!==false,updated_at:new Date().toISOString()})
  }
  const {data:archived,error:archivedError}=await c.db.from('nedvi_crews').select('id').in('id',rows.map(row=>row.id)).not('deleted_at','is',null)
  if(archivedError)throw archivedError
  if(archived?.length)return NextResponse.json({error:'Una cuadrilla eliminada no puede restaurarse mediante sincronización local.'},{status:409})
  const {error}=await c.db.from('nedvi_crews').upsert(rows,{onConflict:'id'})
  if(error)throw error
  return NextResponse.json({ok:true,count:rows.length})
 }catch(e){console.error('Crew sync failed',e);return NextResponse.json({error:'No fue posible guardar las cuadrillas en Supabase.'},{status:500})}
}
export async function DELETE(request:Request){
 try{
  const c=await ctx();if(!c)return NextResponse.json({error:'Sin autorización'},{status:403})
  const id=new URL(request.url).searchParams.get('id')
  if(!uuid(id))return NextResponse.json({error:'Identificador inválido'},{status:400})
  // Archive the crew without destroying legally relevant employee attendance history.
  const {error}=await c.db.from('nedvi_crews').update({active:false,deleted_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq('id',id).is('deleted_at',null)
  if(error)throw error
  return NextResponse.json({ok:true})
 }catch(e){console.error('Crew disable failed',e);return NextResponse.json({error:'No fue posible desactivar la cuadrilla.'},{status:500})}
}
