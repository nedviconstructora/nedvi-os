import { NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/utils/supabase/server'

export const dynamic = 'force-dynamic'
const allowed = new Set(['administracion','administrador','admin','supervisor'])

async function context() {
  const server = await createServerClient()
  const {data:{user}} = await server.auth.getUser()
  if (!user) return null
  const {data:profile} = await server.from('profiles').select('role,active,full_name').eq('id',user.id).maybeSingle()
  if (!profile?.active || !allowed.has(String(profile.role).trim().toLowerCase())) return null
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Configuración de servidor incompleta')
  return {user, admin:createAdminClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}})}
}
const validDate = (v:unknown):v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v+'T12:00:00Z'))
const validId = (v:unknown):v is string => typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)
function localDay() { return new Intl.DateTimeFormat('en-CA',{timeZone:'America/Tijuana',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()) }

export async function GET(request:Request) {
 try {
  const ctx=await context()
  if(!ctx) return NextResponse.json({error:'Acceso reservado para supervisores y administración.'},{status:403})
  const {searchParams}=new URL(request.url)
  const crewId=searchParams.get('crewId'), date=searchParams.get('date') || localDay()
  if(!validId(crewId)||!validDate(date)) return NextResponse.json({error:'Cuadrilla o fecha inválida.'},{status:400})
  const {data:workers,error:we}=await ctx.admin.from('crew_workers').select('id,full_name,position,entry_time').eq('crew_id',crewId).order('full_name')
  if(we) throw we
  const {data:entries,error:ae}=await ctx.admin.from('crew_attendance').select('id,worker_id,status,check_in,check_out,recorded_by').eq('crew_id',crewId).eq('work_date',date)
  if(ae) throw ae
  return NextResponse.json({workers:workers||[],entries:entries||[],date},{headers:{'Cache-Control':'no-store'}})
 } catch(error) {console.error('Crew attendance read failed',error);return NextResponse.json({error:'No se pudieron cargar las asistencias.'},{status:500})}
}
export async function POST(request:Request) {
 try {
  const ctx=await context()
  if(!ctx) return NextResponse.json({error:'Acceso reservado para supervisores y administración.'},{status:403})
  const body=await request.json().catch(()=>null) as {workerId?:string;crewId?:string;action?:string;date?:string}|null
  if(!validId(body?.workerId)||!validId(body?.crewId)||!['entrada','salida','ausente'].includes(body?.action||'')||!validDate(body?.date))
    return NextResponse.json({error:'Solicitud inválida.'},{status:400})
  if(body!.date!==localDay()) return NextResponse.json({error:'Solo se pueden registrar eventos de hoy.'},{status:400})
  const {data:worker,error:we}=await ctx.admin.from('crew_workers').select('id,crew_id,entry_time').eq('id',body!.workerId).eq('crew_id',body!.crewId).maybeSingle()
  if(we || !worker) return NextResponse.json({error:'El trabajador no pertenece a esta cuadrilla.'},{status:404})
  const {data:existing,error:ee}=await ctx.admin.from('crew_attendance').select('id,status,check_in,check_out').eq('worker_id',worker.id).eq('work_date',body!.date).maybeSingle()
  if(ee) throw ee
  const now=new Date()
  let payload:Record<string,unknown>
  if(body!.action==='entrada') {
    if(existing?.check_in || existing?.status==='Ausente') return NextResponse.json({error:'La entrada ya fue registrada o el trabajador está marcado ausente.'},{status:409})
    const localTime=new Intl.DateTimeFormat('en-GB',{timeZone:'America/Tijuana',hour:'2-digit',minute:'2-digit',hour12:false}).format(now)
    const late= /^\d{2}:\d{2}$/.test(worker.entry_time||'') && localTime > worker.entry_time
    payload={check_in:now.toISOString(),status:late?'Retardo':'Presente'}
  } else if(body!.action==='salida') {
    if(!existing?.check_in || existing.check_out) return NextResponse.json({error:'Primero registra la entrada; la salida no puede duplicarse.'},{status:409})
    payload={check_out:now.toISOString()}
  } else {
    if(existing?.check_in || existing?.check_out) return NextResponse.json({error:'No se puede marcar ausente después de registrar una entrada.'},{status:409})
    payload={status:'Ausente'}
  }
  let error
  if(existing) ({error}=await ctx.admin.from('crew_attendance').update({...payload,recorded_by:ctx.user.id,updated_at:now.toISOString()}).eq('id',existing.id))
  else ({error}=await ctx.admin.from('crew_attendance').insert({worker_id:worker.id,crew_id:worker.crew_id,work_date:body!.date,recorded_by:ctx.user.id,...payload}))
  if(error) { if(error.code==='23505') return NextResponse.json({error:'Esta asistencia ya está registrada.'},{status:409});throw error }
  return NextResponse.json({ok:true})
 } catch(error) {console.error('Crew attendance write failed',error);return NextResponse.json({error:'No se pudo registrar la asistencia.'},{status:500})}
}
