import { NextResponse } from 'next/server'
import { getTimeClockContext } from '@/features/time-clock/services/server'
export async function GET(request:Request){
 try{
  const ctx=await getTimeClockContext()
  if(!ctx||!ctx.isAdmin)return NextResponse.json({error:'Sin permisos.'},{status:403})
  const id=new URL(request.url).searchParams.get('id')
  if(!id||!/^[0-9a-f-]{36}$/i.test(id))return NextResponse.json({error:'ID inválido'},{status:400})
  const {data,error}=await ctx.admin.from('time_clock_exit_requests').select('photo_path').eq('id',id).maybeSingle()
  if(error||!data?.photo_path)return NextResponse.json({error:'Foto no encontrada.'},{status:404})
  const {data:file,error:downloadError}=await ctx.admin.storage.from('nedvi-time-clock').download(data.photo_path)
  if(downloadError||!file)return NextResponse.json({error:'No se pudo abrir la foto.'},{status:404})
  return new Response(await file.arrayBuffer(),{headers:{'Content-Type':file.type||'image/jpeg','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}})
 }catch(err){console.error('Review photo read failed',err);return NextResponse.json({error:'Error al abrir fotografía.'},{status:500})}
}
