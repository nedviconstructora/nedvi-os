import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Inicia sesión.' }, { status: 401 })

  const { data: requester } = await supabase.from('profiles').select('role,active').eq('id', user.id).maybeSingle()
  if (!requester?.active || !['administracion','obra','supervisor'].includes(String(requester.role ?? '').toLowerCase())) {
    return NextResponse.json({ error: 'Acceso restringido al equipo NEDVI.' }, { status: 403 })
  }

  const name = new URL(request.url).searchParams.get('name')?.trim() ?? ''
  if (!name || name.length > 120) return NextResponse.json({ phone: null }, { status: 200 })

  const { data, error } = await supabase.from('profiles').select('full_name,phone,role,active').eq('full_name',name).eq('active',true).limit(2)
  if (error) return NextResponse.json({ error: 'No pudimos consultar el contacto.' }, { status: 500 })
  const staff = (data ?? []).filter(person => ['administracion','obra','supervisor'].includes(String(person.role ?? '').toLowerCase()))
  return NextResponse.json({ phone: staff.length === 1 ? staff[0].phone || null : null })
}
