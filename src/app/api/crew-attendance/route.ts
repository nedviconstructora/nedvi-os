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
  const {data:entries,error:ae}=await ctx.admin.from('crew_attendance').select('id,worker_id,status,check_in,check_out,recorded_by,entry_photo_path,exit_photo_path').eq('crew_id',crewId).eq('work_date',date)
  if(ae) throw ae
  const signed=await Promise.all((entries||[]).map(async e=>{const urls=await Promise.all([e.entry_photo_path,e.exit_photo_path].map(async path=>path?(await ctx.admin.storage.from('nedvi-crew-attendance').createSignedUrl(path,300)).data?.signedUrl||null:null));return {id:e.id,worker_id:e.worker_id,status:e.status,check_in:e.check_in,check_out:e.check_out,entry_photo_url:urls[0],exit_photo_url:urls[1]}}))
  return NextResponse.json({workers:workers||[],entries:signed,date},{headers:{'Cache-Control':'no-store'}})
 } catch(error) {console.error('Crew attendance read failed',error);return NextResponse.json({error:'No se pudieron cargar las asistencias.'},{status:500})}
}
export async function POST(request:Request) {
 try {
  const ctx=await context()
  if(!ctx) return NextResponse.json({error:'Acceso reservado para supervisores y administración.'},{status:403})
  const form=await request.formData()
  const workerId=form.get('workerId'),crewId=form.get('crewId'),action=form.get('action'),date=form.get('date')
  if(!validId(workerId)||!validId(crewId)||!['entrada','salida','ausente'].includes(String(action))||!validDate(date))
    return NextResponse.json({error:'Solicitud inválida.'},{status:400})
  if(date!==localDay()) return NextResponse.json({error:'Solo se pueden registrar eventos de hoy.'},{status:400})
  const photo=form.get('photo')
  if(action!=='ausente' && (!(photo instanceof File)||photo.size<100||photo.size>5*1024*1024||!['image/jpeg','image/png','image/webp'].includes(photo.type)))
    return NextResponse.json({error:'Se requiere una fotografía JPG, PNG o WebP de hasta 5 MB para la entrada y la salida.'},{status:400})
  const {data:worker,error:we}=await ctx.admin.from('crew_workers').select('id,crew_id,entry_time').eq('id',workerId).eq('crew_id',crewId).maybeSingle()
  if(we||!worker) return NextResponse.json({error:'El trabajador no pertenece a esta cuadrilla.'},{status:404})
  const {data:existing,error:ee}=await ctx.admin.from('crew_attendance').select('id,status,check_in,check_out').eq('worker_id',worker.id).eq('work_date',date).maybeSingle()
  if(ee) throw ee
  if(action==='entrada'&&(existing?.check_in||existing?.status==='Ausente')) return NextResponse.json({error:'Ya existe entrada o ausencia.'},{status:409})
  if(action==='salida'&&(!existing?.check_in||existing.check_out)) return NextResponse.json({error:'Para registrar salida debe existir una entrada sin salida.'},{status:409})
  if(action==='ausente'&&(existing?.check_in||existing?.check_out)) return NextResponse.json({error:'La persona ya tiene asistencia.'},{status:409})
  const now=new Date()
  let photoPath:string|null=null
  if(photo instanceof File && action!=='ausente') {
   const extension=photo.type==='image/png'?'png':photo.type==='image/webp'?'webp':'jpg'
   photoPath=crewId+'/'+workerId+'/'+date+'/'+crypto.randomUUID()+'.'+extension
   const {error:uploadError}=await ctx.admin.storage.from('nedvi-crew-attendance').upload(photoPath,photo,{contentType:photo.type,upsert:false})
   if(uploadError) throw uploadError
  }
  let payload:Record<string,unknown>
  if(action==='entrada'){
   const localTime=new Intl.DateTimeFormat('en-GB',{timeZone:'America/Tijuana',hour:'2-digit',minute:'2-digit',hour12:false}).format(now)
   const late=/^\\d{2}:\\d{2}$/.test(worker.entry_time||'')&&localTime>worker.entry_time
   payload={check_in:now.toISOString(),entry_photo_path:photoPath,status:late?'Retardo':'Presente'}
  }else if(action==='salida')payload={check_out:now.toISOString(),exit_photo_path:photoPath}
  else payload={status:'Ausente'}
  let error
  if(existing) ({error}=await ctx.admin.from('crew_attendance').update({...payload,recorded_by:ctx.user.id,updated_at:now.toISOString()}).eq('id',existing.id))
  else ({error}=await ctx.admin.from('crew_attendance').insert({worker_id:worker.id,crew_id:worker.crew_id,work_date:date,recorded_by:ctx.user.id,...payload}))
  if(error) {
   if(photoPath) await ctx.admin.storage.from('nedvi-crew-attendance').remove([photoPath])
   if(error.code==='23505') return NextResponse.json({error:'Esta asistencia ya existe.'},{status:409})
   throw error
  }
  return NextResponse.json({ok:true},{status:201})
 } catch(error){console.error('Crew attendance write failed',error);return NextResponse.json({error:'No se pudo registrar la asistencia.'},{status:500})}
}

export async function PUT(request:Request){
 try {
  const ctx=await context()
  if(!ctx)return NextResponse.json({error:'No autorizado.'},{status:403})
  const body=await request.json().catch(()=>null) as {crewId?:string;workers?:Array<Record<string,unknown>>}|null
  if(!validId(body?.crewId)||!Array.isArray(body?.workers)||body!.workers.length>500||body!.workers.length===0)return NextResponse.json({error:'Selecciona una cuadrilla y un Excel con 1 a 500 trabajadores.'},{status:400})
  const {data:existing,error:readError}=await ctx.admin.from('crew_workers').select('full_name').eq('crew_id',body!.crewId)
  if(readError)throw readError
  const seen=new Set((existing||[]).map(x=>x.full_name.trim().toLocaleLowerCase('es-MX')))
  const batch:Record<string,unknown>[]=[]
  for(const worker of body!.workers){
   const name=String(worker.full_name||'').trim().slice(0,160)
   if(!name)continue
   const key=name.toLocaleLowerCase('es-MX')
   if(seen.has(key))continue
   seen.add(key)
   const str=(field:string,max=160)=>String(worker[field]||'').trim().slice(0,max)
   const salary=worker.salary===null||worker.salary===''?null:Number(worker.salary)
   if(salary!==null&&(!Number.isFinite(salary)||salary<0))continue
   batch.push({crew_id:body!.crewId,full_name:name,social_security_number:str('social_security_number',32),position:str('position'),salary,salary_period:str('salary_period',80),work_hours:str('work_hours',80),entry_time:str('entry_time',20),exit_time:str('exit_time',20),entry_supervisor:str('entry_supervisor'),curp:str('curp',24),rfc:str('rfc',20)})
  }
  if(!batch.length)return NextResponse.json({ok:true,imported:0,message:'Los empleados ya están registrados o no contienen nombres válidos.'})
  const {error}=await ctx.admin.from('crew_workers').insert(batch)
  if(error)throw error
  return NextResponse.json({ok:true,imported:batch.length})
 }catch(error){console.error('Crew Excel import failed',error);return NextResponse.json({error:'No se pudo importar el Excel.'},{status:500})}
}
