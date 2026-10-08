import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Inicia sesión.' }, { status: 401 })

  const { data: requester } = await supabase.from('profiles').select('role,active').eq('id', user.id).maybeSingle()
  if (!requester?.active) return NextResponse.json({ error: 'Cuenta inactiva.' }, { status: 403 })
  const role = String(requester.role ?? '').toLowerCase()
  const params = new URL(request.url).searchParams
  const projectId = params.get('projectId')?.trim()
  const name = params.get('name')?.trim() ?? ''
  const isStaff = ['administracion','obra','supervisor'].includes(role)
  if (!isStaff && (role !== 'cliente' || !projectId)) return NextResponse.json({ error: 'Acceso no permitido.' }, { status: 403 })
  if (!name || name.length > 120) return NextResponse.json({ phone: null }, { status: 200 })

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return NextResponse.json({ error: 'Configuración no disponible.' }, { status: 500 })
  const admin = createAdminClient(url,key,{auth:{autoRefreshToken:false,persistSession:false}})
  if (!isStaff) {
    const { data: link } = await admin.from('customer_users').select('customer_id').eq('user_id',user.id).maybeSingle()
    if (!link) return NextResponse.json({error:'Cliente sin vincular.'},{status:403})
    const { data: membership } = await admin.from('project_members').select('project_id').eq('user_id',user.id).eq('project_id',projectId).maybeSingle()
    if (!membership) return NextResponse.json({error:'Proyecto no asignado.'},{status:403})
    const { data: project } = await admin.from('projects').select('customer_id,manager').eq('id',projectId).maybeSingle()
    if (!project || project.customer_id !== link.customer_id || project.manager !== name) return NextResponse.json({error:'Contacto no autorizado.'},{status:403})
  }
  const { data, error } = await admin.from('profiles').select('full_name,phone,role,active').eq('full_name',name).eq('active',true).limit(2)
  if (error) return NextResponse.json({ error: 'No pudimos consultar el contacto.' }, { status: 500 })
  const staff = (data ?? []).filter(person => ['administracion','obra','supervisor'].includes(String(person.role ?? '').toLowerCase()))
  return NextResponse.json({ phone: staff.length === 1 ? staff[0].phone || null : null })
}
