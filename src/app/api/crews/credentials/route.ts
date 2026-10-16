import { NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/utils/supabase/server'
import { randomBytes, randomInt, scryptSync } from 'node:crypto'

export const dynamic = 'force-dynamic'
const validUuid = (x: unknown): x is string => typeof x === 'string' && /^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(x)
const allowedRoles = new Set(['administracion', 'obra'])
type RequestBody = { crewId?: string; names?: string[] }

export async function POST(request: Request) {
  try {
    const client = await createServerClient()
    const { data: { user } } = await client.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Inicia sesión.' }, { status: 401 })
    const { data: profile } = await client.from('profiles').select('role,active').eq('id', user.id).maybeSingle()
    if (!profile?.active || !allowedRoles.has(String(profile.role))) return NextResponse.json({ error: 'Sin permisos para asignar credenciales.' }, { status: 403 })
    const body = await request.json() as RequestBody
    if (!validUuid(body.crewId) || !Array.isArray(body.names) || body.names.length > 200) {
      return NextResponse.json({ error: 'Datos inválidos.' }, { status: 400 })
    }
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) throw new Error('Configuración incompleta.')
    const admin = createAdminClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
    const { data: crew, error: crewError } = await admin.from('nedvi_crews').select('id,members').eq('id', body.crewId).is('deleted_at', null).maybeSingle()
    if (crewError) throw crewError
    if (!crew) return NextResponse.json({ error: 'La cuadrilla no existe.' }, { status: 404 })
    const officialNames = new Set((crew.members as string[]).map(n => n.trim().toLocaleLowerCase('es-MX')))
    const requested = Array.from(new Set(body.names.map(n => String(n).trim()).filter(n => n.length > 0 && n.length <= 160)))
    if (requested.some(n => !officialNames.has(n.toLocaleLowerCase('es-MX')))) return NextResponse.json({ error: 'Los integrantes deben pertenecer a la cuadrilla.' }, { status: 400 })
    const { data: stored, error: fetchError } = await admin.from('crew_workers').select('id,full_name,employee_number,pin_hash').eq('crew_id',body.crewId)
    if (fetchError) throw fetchError
    const credentials: Array<{ name:string; employeeNumber:string; pin:string }> = []
    for (const name of requested) {
      let worker = (stored || []).find(w => w.full_name?.trim().toLocaleLowerCase('es-MX') === name.toLocaleLowerCase('es-MX'))
      if (!worker) {
        const { data, error } = await admin.from('crew_workers').insert({ crew_id:body.crewId, full_name:name }).select('id,full_name,employee_number,pin_hash').single()
        if (error) throw error
        worker = data
      }
      if (!worker.pin_hash) {
        const pin = String(randomInt(0, 10000)).padStart(4,'0')
        const salt = randomBytes(16).toString('hex')
        const pinHash = 'scrypt:' + salt + ':' + scryptSync(pin, salt, 64).toString('hex')
        const { data: updated, error } = await admin.from('crew_workers').update({pin_hash:pinHash}).eq('id',worker.id).is('pin_hash',null).select('employee_number').maybeSingle()
        if (error) throw error
        if (updated) credentials.push({name,employeeNumber:updated.employee_number,pin})
      }
    }
    return NextResponse.json({ credentials }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('Employee provision error',error)
    return NextResponse.json({error:'No fue posible generar las credenciales.'},{status:500})
  }
}
