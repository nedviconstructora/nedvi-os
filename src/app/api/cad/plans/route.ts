import { NextResponse } from 'next/server'
import { createClient as adminClient } from '@supabase/supabase-js'
import { createClient as sessionClient } from '@/utils/supabase/server'

export const runtime = 'nodejs'
const BUCKET = 'nedvi-cad-plans'
const MAX_SIZE = 20 * 1024 * 1024

function backend() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Almacenamiento de CAD no configurado.')
  return adminClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}
async function context() {
  const session = await sessionClient()
  const { data: { user } } = await session.auth.getUser()
  if (!user) return null
  const db = backend()
  const { data: profile } = await db.from('profiles').select('role,active').eq('id',user.id).maybeSingle()
  if (!profile?.active) return null
  return { db, user, role: String(profile.role).toLowerCase() }
}
async function access(ctx: NonNullable<Awaited<ReturnType<typeof context>>>, projectId:string) {
  const {data: project}=await ctx.db.from('projects').select('id,customer_id').eq('id',projectId).maybeSingle()
  if (!project?.customer_id) return null
  const staff=['developer','gerente_operativo','gerente_comercial','gerente_administrativo','administracion','supervisor_obra','obra'].includes(ctx.role)
  const {data: member}=await ctx.db.from('project_members').select('user_id').eq('project_id',projectId).eq('user_id',ctx.user.id).maybeSingle()
  const manage=['developer','gerente_operativo','gerente_comercial','gerente_administrativo','administracion'].includes(ctx.role) || (['supervisor_obra','obra'].includes(ctx.role) && !!member)
  const {data: linked}=await ctx.db.from('customer_users').select('user_id').eq('customer_id',project.customer_id).eq('user_id',ctx.user.id).maybeSingle()
  const client=ctx.role==='cliente' && !!linked
  return { project, manage, view:manage || (staff && !!member) || client, client }
}
export async function GET(request:Request) {
  try {
    const ctx=await context()
    if (!ctx) return NextResponse.json({error:'Inicia sesión.'},{status:401})
    const params=new URL(request.url).searchParams
    const projectId=params.get('projectId')||''
    const id=params.get('id')
    const permission=await access(ctx,projectId)
    if (!permission?.view) return NextResponse.json({error:'No tienes acceso a este proyecto.'},{status:403})
    let query=ctx.db.from('cad_plans').select('id,project_id,original_name,file_size,visible_to_client,created_at,storage_path').eq('project_id',projectId).order('created_at',{ascending:false})
    if (id) query=query.eq('id',id)
    if (permission.client) query=query.eq('visible_to_client',true)
    const {data,error}=await query
    if(error)throw error
    if(id){
      const plan=data?.[0]
      if(!plan)return NextResponse.json({error:'Plano no encontrado.'},{status:404})
      const {data:signed,error:signError}=await ctx.db.storage.from(BUCKET).createSignedUrl(plan.storage_path,60)
      if(signError || !signed)return NextResponse.json({error:'No se pudo abrir el archivo.'},{status:500})
      return NextResponse.json({url:signed.signedUrl})
    }
    return NextResponse.json({plans:(data||[]).map(({storage_path,...plan})=>plan),canManage:permission.manage})
  }catch(error){console.error('CAD GET',error);return NextResponse.json({error:'No se pudieron consultar los planos.'},{status:500})}
}
export async function POST(request:Request) {
  try {
    const ctx=await context()
    if(!ctx)return NextResponse.json({error:'Inicia sesión.'},{status:401})
    const body=await request.formData()
    const projectId=String(body.get('projectId')||'')
    const file=body.get('file')
    const permission=await access(ctx,projectId)
    if(!permission?.manage)return NextResponse.json({error:'Sin permiso para guardar planos.'},{status:403})
    if(!(file instanceof File) || file.size<1 || file.size>MAX_SIZE || !/\.(dwg|dxf|pdf)$/i.test(file.name))
      return NextResponse.json({error:'Elige DWG, DXF o PDF de hasta 20 MB.'},{status:400})
    const extension=file.name.split('.').pop()?.toLowerCase()
    const id=crypto.randomUUID()
    const storagePath=`${permission.project.customer_id}/${projectId}/${id}.${extension}`
    const {error:uploadError}=await ctx.db.storage.from(BUCKET).upload(storagePath,await file.arrayBuffer(),{contentType:extension==='pdf'?'application/pdf':'application/octet-stream',upsert:false})
    if(uploadError)throw uploadError
    const {error:insertError}=await ctx.db.from('cad_plans').insert({id,project_id:projectId,customer_id:permission.project.customer_id,original_name:file.name,file_size:file.size,storage_path:storagePath,uploaded_by:ctx.user.id,visible_to_client:false})
    if(insertError){await ctx.db.storage.from(BUCKET).remove([storagePath]);throw insertError}
    return NextResponse.json({ok:true,id})
  }catch(error){console.error('CAD POST',error);return NextResponse.json({error:'No se pudo guardar el plano en la nube.'},{status:500})}
}
export async function PATCH(request:Request) {
  try {
    const ctx=await context()
    if(!ctx)return NextResponse.json({error:'Inicia sesión.'},{status:401})
    const body=await request.json() as {projectId?:string,id?:string,visibleToClient?:boolean}
    const permission=await access(ctx,body.projectId||'')
    if(!permission?.manage || !body.id || typeof body.visibleToClient!=='boolean')return NextResponse.json({error:'No autorizado.'},{status:403})
    const {data,error}=await ctx.db.from('cad_plans').update({visible_to_client:body.visibleToClient}).eq('id',body.id).eq('project_id',body.projectId).select('id').maybeSingle()
    if(error)throw error
    if(!data)return NextResponse.json({error:'Plano no encontrado.'},{status:404})
    return NextResponse.json({ok:true})
  }catch(error){console.error('CAD PATCH',error);return NextResponse.json({error:'No se pudo actualizar el permiso.'},{status:500})}
}
