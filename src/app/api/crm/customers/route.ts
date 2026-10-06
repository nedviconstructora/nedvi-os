import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/utils/supabase/server'

const CUSTOMER_SELECT = [
  'id',
  'folio',
  'company',
  'contact',
  'phone',
  'email',
  'address',
  'rfc',
  'project_type',
  'lead_source',
  'status',
  'assigned_salesperson',
  'notes',
  'created_at',
  'last_contact',
  'timeline',
].join(',')

type CreateCustomerBody = {
  company?: string
  contact?: string
  phone?: string
  email?: string
  address?: string
  rfc?: string
  projectType?: string
  leadSource?: string
  status?: string
  assignedSalesperson?: string
  notes?: string
}

export async function POST(request: Request) {
  try {
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Sesión no válida.' }, { status: 401 })
    }

    const body = (await request.json()) as CreateCustomerBody
    const company = body.company?.trim()
    const contact = body.contact?.trim()
    const phone = body.phone?.trim()
    const email = body.email?.trim().toLowerCase()

    if (!company || !contact || !phone || !email || !email.includes('@')) {
      return NextResponse.json(
        { error: 'Completa empresa, contacto, teléfono y un correo válido.' },
        { status: 400 },
      )
    }

    const { data, error } = await supabase
      .from('customers')
      .insert({
        company,
        contact,
        phone,
        email,
        address: body.address?.trim() ?? '',
        rfc: body.rfc?.trim() ?? '',
        project_type: body.projectType?.trim() || null,
        lead_source: body.leadSource?.trim() || null,
        status: body.status?.trim() || 'Lead',
        assigned_salesperson: body.assignedSalesperson?.trim() || null,
        notes: body.notes?.trim() ?? '',
        last_contact: new Date().toISOString(),
      })
      .select(CUSTOMER_SELECT)
      .single()

    if (error || !data) {
      console.error('Error creando cliente en Supabase:', error)
      return NextResponse.json(
        { error: error?.message || 'No se pudo guardar el cliente en Supabase.' },
        { status: 400 },
      )
    }

    return NextResponse.json({ customer: data }, { status: 201 })
  } catch (error) {
    console.error('Error inesperado creando cliente:', error)
    return NextResponse.json(
      { error: 'No se pudo crear el cliente. Inténtalo nuevamente.' },
      { status: 500 },
    )
  }
}
