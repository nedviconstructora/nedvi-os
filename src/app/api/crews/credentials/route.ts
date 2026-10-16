import { NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/utils/supabase/server'
import { createHmac, randomBytes, randomInt, scryptSync } from 'node:crypto'

export const dynamic = 'force-dynamic'
const validUuid = (x: unknown): x is string => typeof x === 'string' && /^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(x)
const allowedRoles = new Set(['administracion', 'obra'])
type RequestBody = { crewId?: string; names?: string[]; resetWorkerId?: string }

export async function POST(request: Request) {
  try {
    const client = await createServerClient()
    const { data: { user } } = await client.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Inicia sesión.' }, { status: 401 })
    const { data: profile } = await client.from('profiles').select('role,active').eq('id', user.id).maybeSingle()
    if (!profile?.active || !allowedRoles.has(String(profile.role))) return NextResponse.json({ error: 'Sin permisos para asignar credenciales.' }, { status: 403 })
    const body = await request.json() as RequestBody
    if (!validUuid(body.crewId) || (!body.resetWorkerId && !Array.isArray(body.names)) || (body.names?.length || 0) > 200) {
      return NextResponse.json({ error: 'Datos inválidos.' }, { status: 400 })
    }
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) throw new Error('Configuración incompleta.')
    const admin = createAdminClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
    const { data: crew, error: crewError } = await admin.from('nedvi_crews').select('id,members').eq('id', body.crewId).is('deleted_at', null).maybeSingle()
    if (crewError) throw crewError
    if (!crew) return NextResponse.json({ error: 'La cuadrilla no existe.' }, { status: 404 })
    if (body.resetWorkerId) {
      if (String(profile.role) !== 'administracion' || !validUuid(body.resetWorkerId)) return NextResponse.json({error:'Solo administración puede restablecer PIN.'},{status:403})
      const {data: target,error:targetError}=await admin.from('crew_workers').select('id,full_name,employee_number').eq('id',body.resetWorkerId).eq('crew_id',body.crewId).maybeSingle()
      if(targetError)throw targetError
      if(!target)return NextResponse.json({error:'Trabajador no encontrado en esta cuadrilla.'},{status:404})
      for(let attempt=0;attempt<100;attempt++){
        const pin=String(randomInt(0,10000)).padStart(4,'0')
        const pinLookup=createHmac('sha256',key).update('nedvi-pin-v1:'+pin).digest('hex')
        const salt=randomBytes(16).toString('hex')
        const pinHash='scrypt:'+salt+':'+scryptSync(pin,salt,64).toString('hex')
        const {error}=await admin.from('crew_workers').update({pin_hash:pinHash,pin_lookup:pinLookup}).eq('id',target.id)
        if(error?.code==='23505')continue
        if(error)throw error
        return NextResponse.json({credentials:[{name:target.full_name,employeeNumber:target.employee_number,pin}]},{headers:{'Cache-Control':'no-store'}})
      }
      throw new Error('No se encontró PIN disponible.')
    }
    const officialNames = new Set((crew.members as string[]).map(n => n.trim().toLocaleLowerCase('es-MX')))
    const requested = Array.from(new Set((body.names || []).map(n => String(n).trim()).filter(n => n.length > 0 && n.length <= 160)))
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
        let assigned = false
        for (let attempt = 0; attempt < 100 && !assigned; attempt++) {
          const pin = String(randomInt(0, 10000)).padStart(4,'0')
          const pinLookup = createHmac('sha256',key).update('nedvi-pin-v1:' + pin).digest('hex')
          const salt = randomBytes(16).toString('hex')
          const pinHash = 'scrypt:' + salt + ':' + scryptSync(pin, salt, 64).toString('hex')
          const { data: updated, error } = await admin.from('crew_workers').update({pin_hash:pinHash,pin_lookup:pinLookup}).eq('id',worker.id).is('pin_hash',null).select('employee_number').maybeSingle()
          if (error?.code === '23505') continue
          if (error) throw error
          if (updated) {credentials.push({name,employeeNumber:updated.employee_number,pin});assigned = true}
          else assigned = true
        }
        if (!assigned) throw new Error('No hay un PIN disponible; intenta nuevamente.')
      }
    }
    return NextResponse.json({ credentials }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('Employee provision error',error)
    return NextResponse.json({error:'No fue posible generar las credenciales.'},{status:500})
  }
}
