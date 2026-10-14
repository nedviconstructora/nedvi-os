import { NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/utils/supabase/server'

const bucket = 'nedvi-time-clock'
const roles = ['administracion','administrador','admin','obra','supervisor']
const admins = ['administracion','administrador','admin']

async function getContext() {
  const server = await createServerClient()
  const { data: { user } } = await server.auth.getUser()
  if (!user) return null
  const { data: profile } = await server.from('profiles').select('full_name,role,active').eq('id',user.id).maybeSingle()
  if (!profile?.active || !roles.includes(String(profile.role ?? '').toLowerCase().trim())) return null
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Configuración de Supabase incompleta')
  return {
    user, profile,
    admin: createAdminClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}}),
    isAdmin: admins.includes(String(profile.role ?? '').toLowerCase().trim()),
  }
}

export async function GET() {
  try {
    const ctx = await getContext()
    if (!ctx) return NextResponse.json({error:'Sesión no autorizada.'},{status:401})
    let query = ctx.admin.from('time_clock_entries')
      .select('id,user_id,employee_name,event_type,occurred_at,photo_path')
      .order('occurred_at',{ascending:false}).limit(150)
    if (!ctx.isAdmin) query = query.eq('user_id',ctx.user.id)
    const {data,error} = await query
    if (error) {
      console.error('Time clock DB read failed', {code:error.code,message:error.message})
      return NextResponse.json({error:'No se pudieron consultar las asistencias en Supabase.',code:error.code || 'DB_READ_ERROR'},{status:500})
    }
    const entries = await Promise.all((data ?? []).map(async (item) => {
      // A temporary photo-signing failure must not hide successful attendance events.
      let photoUrl: string | null = null
      try {
        const {data: link,error: signError} = await ctx.admin.storage.from(bucket).createSignedUrl(item.photo_path,300)
        if (signError) console.warn('Time clock photo URL could not be signed',signError.message)
        photoUrl = link?.signedUrl ?? null
      } catch (signError) { console.warn('Time clock photo URL failed',signError) }
      return {id:item.id,userId:item.user_id,name:item.employee_name,type:item.event_type,at:item.occurred_at,photoUrl}
    }))
    return NextResponse.json({entries,me:ctx.user.id,canViewAll:ctx.isAdmin},{headers:{'Cache-Control':'no-store'}})
  } catch (error) {
    console.error('Time clock list failed',error)
    return NextResponse.json({error:'No se pudo consultar el checador. Revisa la sesión o la configuración del servidor.',code:'HISTORY_ERROR'},{status:500})
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await getContext()
    if (!ctx) return NextResponse.json({error:'Sesión no autorizada.'},{status:401})
    const form = await request.formData()
    const type = form.get('type')
    const photo = form.get('photo')
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
