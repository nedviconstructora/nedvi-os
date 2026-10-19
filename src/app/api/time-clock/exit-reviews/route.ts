import { NextResponse } from 'next/server'
import { getTimeClockContext } from '@/features/time-clock/services/server'
const bucket='nedvi-time-clock'
export async function GET(){
 try{
  const ctx=await getTimeClockContext()
  if(!ctx||!ctx.isAdmin)return NextResponse.json({error:'Solo Administración.'},{status:403})
  const {data,error}=await ctx.admin.from('time_clock_exit_requests').select('id,user_id,entry_id,requested_exit_time,reason,photo_path,submitted_at,status,reviewed_at').order('submitted_at',{ascending:false}).limit(150)
  if(error)throw error
  const ids=[...new Set((data||[]).map(x=>x.entry_id))]
  const {data:entries,error:entryError}=ids.length?await ctx.admin.from('time_clock_entries').select('id,employee_name,occurred_at').in('id',ids):{data:[],error:null}
  if(entryError)throw entryError
  const byId=new Map((entries||[]).map(x=>[x.id,x]))
  return NextResponse.json({requests:(data||[]).map(r=>({...r,employee_name:byId.get(r.entry_id)?.employee_name||'Empleado',entry_at:byId.get(r.entry_id)?.occurred_at||null,has_photo:Boolean(r.photo_path),photo_path:undefined}))},{headers:{'Cache-Control':'private, no-store'}})
 }catch(err){console.error('Exit request list failed',err);return NextResponse.json({error:'No se pudieron consultar solicitudes.'},{status:500})}
}
export async function PATCH(request:Request){
 try{
  const ctx=await getTimeClockContext()
  if(!ctx||!ctx.isAdmin)return NextResponse.json({error:'Solo Administración.'},{status:403})
  const body=await request.json() as {id?:string;decision?:string}
  if(!body.id||!/^[0-9a-f-]{36}$/i.test(body.id)||!['aprobada','rechazada'].includes(body.decision||''))return NextResponse.json({error:'Solicitud o decisión inválida.'},{status:400})
  const {data,error}=await ctx.admin.from('time_clock_exit_requests').update({status:body.decision,reviewed_by:ctx.user.id,reviewed_at:new Date().toISOString()}).eq('id',body.id).eq('status','pendiente').select('id').maybeSingle()
  if(error)throw error
  if(!data)return NextResponse.json({error:'La solicitud ya fue revisada o no existe.'},{status:409})
  return NextResponse.json({ok:true,note:'Decisión registrada. No altera automáticamente el historial de checadas.'})
 }catch(err){console.error('Exit request review failed',err);return NextResponse.json({error:'No se pudo completar la revisión.'},{status:500})}
}
