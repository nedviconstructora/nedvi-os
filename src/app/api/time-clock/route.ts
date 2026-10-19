import { NextResponse } from 'next/server'
import { getTimeClockContext } from '@/features/time-clock/services/server'

const bucket = 'nedvi-time-clock'

export async function GET() {
  try {
    const ctx = await getTimeClockContext()
    if (!ctx) return NextResponse.json({error:'Sesión no autorizada.'},{status:401})
    const canViewAll = ctx.isAdmin || ctx.isAccountant || ['obra','supervisor'].includes(String(ctx.profile.role ?? '').toLowerCase().trim())
    let query = ctx.admin.from('time_clock_entries')
      .select('id,user_id,employee_name,event_type,occurred_at,photo_path,latitude,longitude,location_accuracy_m')
      .is('deleted_at',null).order('occurred_at',{ascending:false}).limit(3000)
    if (!canViewAll) query = query.eq('user_id',ctx.user.id)
    const {data,error} = await query
    if (error) {
      console.error('Time clock DB read failed', {code:error.code,message:error.message})
      return NextResponse.json({error:'No se pudieron consultar las asistencias en Supabase.',code:error.code || 'DB_READ_ERROR'},{status:500})
    }
    const entries = (data ?? []).map(item => ({
      id:item.id,userId:item.user_id,name:item.employee_name,type:item.event_type,at:item.occurred_at,
      // Resolve the private photo only when opened, so backgrounded apps cannot keep expired links.
      photoUrl:item.photo_path ? `/api/time-clock/photo?id=${encodeURIComponent(item.id)}` : null,
      latitude:item.latitude,longitude:item.longitude,accuracy:item.location_accuracy_m,
    }))
    const {data:resolved,error:resolutionError}=await ctx.admin.from('time_clock_exit_requests').select('entry_id,status').eq('user_id',ctx.user.id).eq('status','aprobada')
    if(resolutionError)throw resolutionError
    return NextResponse.json({entries,resolvedExitEntryIds:(resolved||[]).map(x=>x.entry_id),me:ctx.user.id,canViewAll,canDelete:ctx.isAdmin,canClock:!ctx.isAccountant},{headers:{'Cache-Control':'no-store'}})
  } catch (error) {
    console.error('Time clock list failed',error)
    return NextResponse.json({error:'No se pudo consultar el checador. Revisa la sesión o la configuración del servidor.',code:'HISTORY_ERROR'},{status:500})
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await getTimeClockContext()
    if (!ctx) return NextResponse.json({error:'Sesión no autorizada.'},{status:401})
    if (ctx.isAccountant) return NextResponse.json({error:'Contabilidad solo puede consultar registros.'},{status:403})
    const form = await request.formData()
    const type = form.get('type')
    const photo = form.get('photo')
    const lat = Number(form.get('latitude'))
    const lon = Number(form.get('longitude'))
    const accuracy = Number(form.get('accuracy'))
    if (!form.has('latitude') || !form.has('longitude') || !form.has('accuracy') || !Number.isFinite(lat) || !Number.isFinite(lon) || !Number.isFinite(accuracy) || lat < -90 || lat > 90 || lon < -180 || lon > 180 || accuracy < 0)
      return NextResponse.json({error:'Se requiere la ubicación GPS actual para checar.'},{status:400})
    if (type !== 'entrada' && type !== 'salida')
      return NextResponse.json({error:'Tipo de registro inválido.'},{status:400})
    if (!(photo instanceof File) || photo.size < 100 || photo.size > 5 * 1024 * 1024 || !['image/jpeg','image/png','image/webp'].includes(photo.type))
      return NextResponse.json({error:'Adjunta una imagen JPG, PNG o WebP de máximo 5 MB.'},{status:400})
    const path = `${ctx.user.id}/${crypto.randomUUID()}.${photo.type === 'image/png' ? 'png' : photo.type === 'image/webp' ? 'webp' : 'jpg'}`
    const {error:uploadError} = await ctx.admin.storage.from(bucket).upload(path,photo,{contentType:photo.type,upsert:false})
    if (uploadError) throw uploadError
    const {error:entryError} = await ctx.admin.rpc('nedvi_clock_register',{
      p_user_id:ctx.user.id,
      p_employee_name:String(ctx.profile.full_name || ctx.user.email || 'Personal NEDVI'),
      p_event_type:type,
      p_photo_path:path,
      p_latitude:lat,
      p_longitude:lon,
      p_accuracy_m:accuracy,
    })
    if (entryError) {
      await ctx.admin.storage.from(bucket).remove([path])
      return NextResponse.json({error:entryError.message},{status:409})
    }
    return NextResponse.json({ok:true},{status:201})
  } catch (error) {
    console.error('Time clock registration failed',error)
    return NextResponse.json({error:'No se pudo registrar la asistencia.'},{status:500})
  }
}

export async function DELETE(request: Request) {
  try {
    const ctx = await getTimeClockContext()
    if (!ctx) return NextResponse.json({error:'Sesión no autorizada.'},{status:401})
    if (!ctx.isAdmin) return NextResponse.json({error:'Solo Administración puede anular registros de asistencia.'},{status:403})
    const body = await request.json().catch(() => null) as {id?:string;reason?:string}|null
    if (!body?.id || !/^[0-9a-f-]{36}$/i.test(body.id))
      return NextResponse.json({error:'Identificador de registro inválido.'},{status:400})
    const reason = body.reason?.trim() ?? ''
    if (reason.length < 8 || reason.length > 500)
      return NextResponse.json({error:'Escribe un motivo de al menos 8 caracteres para anular el registro.'},{status:400})
    const {error} = await ctx.admin.rpc('nedvi_clock_void_entry',{
      p_entry_id:body.id,
      p_admin_id:ctx.user.id,
      p_reason:reason,
    })
    if (error) return NextResponse.json({error:error.message},{status:409})
    return NextResponse.json({ok:true})
  } catch (error) {
    console.error('Time clock void failed',error)
    return NextResponse.json({error:'No se pudo anular la asistencia.'},{status:500})
  }
}
