import { NextResponse } from 'next/server'
import { getTimeClockContext } from '@/features/time-clock/services/server'
const bucket='nedvi-time-clock'
const day=(value:string)=>new Intl.DateTimeFormat('sv-SE',{timeZone:'America/Tijuana',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(value))
export async function POST(request:Request){
 try{
  const ctx=await getTimeClockContext()
  if(!ctx||ctx.isAccountant)return NextResponse.json({error:'No autorizado'},{status:403})
  const form=await request.formData()
  const entryId=String(form.get('entryId')||'')
  const reason=String(form.get('reason')||'').trim()
  const exitTime=String(form.get('exitTime')||'')
  const photo=form.get('photo')
  if(!/^[0-9a-f-]{36}$/i.test(entryId)||reason.length<12||reason.length>500)return NextResponse.json({error:'Completa el motivo de la incidencia (mínimo 12 caracteres).'}, {status:400})
  const claimed=new Date(exitTime)
  if(!Number.isFinite(claimed.getTime())||claimed>new Date())return NextResponse.json({error:'Hora de salida declarada inválida.'},{status:400})
  const {data:entry,error:findError}=await ctx.admin.from('time_clock_entries').select('id,occurred_at,event_type').eq('id',entryId).eq('user_id',ctx.user.id).is('deleted_at',null).maybeSingle()
  if(findError)throw findError
  if(!entry||entry.event_type!=='entrada'||day(entry.occurred_at)!==day(claimed.toISOString())||claimed.getTime()<new Date(entry.occurred_at).getTime())return NextResponse.json({error:'La salida declarada debe corresponder a la fecha de esa entrada.'},{status:400})
  const {data:events,error:eventsError}=await ctx.admin.from('time_clock_entries').select('event_type,occurred_at').eq('user_id',ctx.user.id).is('deleted_at',null).gte('occurred_at',entry.occurred_at).order('occurred_at',{ascending:true})
  if(eventsError)throw eventsError
  if(events?.some(e=>day(e.occurred_at)===day(entry.occurred_at)&&e.event_type==='salida'))return NextResponse.json({error:'Ese día ya tiene una salida.'},{status:409})
  if(!(photo instanceof File)||!['image/jpeg','image/png','image/webp'].includes(photo.type)||photo.size<100||photo.size>5*1024*1024)return NextResponse.json({error:'Adjunta una foto actual de máximo 5 MB.'},{status:400})
  const path=ctx.user.id+'/incidencias/'+crypto.randomUUID()+'.'+(photo.type==='image/png'?'png':photo.type==='image/webp'?'webp':'jpg')
  const {error:uploadError}=await ctx.admin.storage.from(bucket).upload(path,photo,{contentType:photo.type,upsert:false})
  if(uploadError)throw uploadError
  const {error}=await ctx.admin.from('time_clock_exit_requests').insert({user_id:ctx.user.id,entry_id:entryId,requested_exit_time:claimed.toISOString(),reason,photo_path:path})
  if(error){await ctx.admin.storage.from(bucket).remove([path]);return NextResponse.json({error:error.code==='23505'?'Ya existe una solicitud para esta entrada.':'No se pudo registrar la incidencia.'},{status:409})}
  return NextResponse.json({ok:true,message:'Incidencia enviada a revisión de Administración. No modifica las horas de asistencia.'},{status:201})
 }catch(e){console.error('Retroactive clock request failed',e);return NextResponse.json({error:'No se pudo enviar la solicitud de regularización.'},{status:500})}
}
