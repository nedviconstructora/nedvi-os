'use client'

import type {
  Customer,
  CustomerFormValues,
  CustomerStatus,
  CustomerTimelineEvent,
  LeadSource,
  ProjectType,
} from '@/features/crm/types/customer'

type NedviSession = {
  access_token?: string
}

type DatabaseCustomer = {
  id: string
  folio: string | null
  company: string
  contact: string
  phone: string
  email: string
  address: string
  rfc: string
  project_type: string | null
  lead_source: string | null
  status: string
  assigned_salesperson: string | null
  notes: string
  created_at: string
  last_contact: string | null
  updated_at: string
  timeline: unknown
}

function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

  if (!url || !key) throw new Error('Supabase no está configurado.')
  return { url, key }
}

function getAccessToken() {
  if (typeof window === 'undefined') return ''
  try {
    const raw = window.localStorage.getItem('nedvi_session')
    if (!raw) return ''
    const parsed = JSON.parse(raw) as NedviSession
    return parsed.access_token || ''
  } catch {
    return ''
  }
}

async function supabaseFetch(path: string, init?: RequestInit) {
  const { url, key } = getSupabaseConfig()
  const accessToken = getAccessToken()
  if (!accessToken) throw new Error('La sesión de Supabase no está disponible. Inicia sesión de nuevo.')

  const response = await fetch(`${url}${path}`, {
    ...init,
    headers: {
      apikey: key,
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  })

  if (!response.ok) {
    const detail = await response.text().catch(() => '')
    throw new Error(`Supabase HTTP ${response.status}${detail ? `: ${detail}` : ''}`)
  }

  return response
}

function dateOnly(value?: string | null) {
  return value ? value.slice(0, 10) : ''
}

function normalizeTimeline(value: unknown): CustomerTimelineEvent[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is CustomerTimelineEvent => {
    if (!item || typeof item !== 'object') return false
    const event = item as Partial<CustomerTimelineEvent>
    return (
      typeof event.id === 'string' &&
      typeof event.type === 'string' &&
      typeof event.title === 'string' &&
      typeof event.description === 'string' &&
      typeof event.date === 'string' &&
      typeof event.author === 'string'
    )
  })
}

function mapDatabaseCustomer(row: DatabaseCustomer): Customer {
  return {
    id: row.id,
    folio: row.folio || undefined,
    company: row.company,
    contact: row.contact,
    phone: row.phone,
    email: row.email,
    address: row.address,
    rfc: row.rfc,
    projectType: (row.project_type || '') as ProjectType,
    leadSource: (row.lead_source || '') as LeadSource,
    status: (row.status || 'Lead') as CustomerStatus,
    assignedSalesperson: row.assigned_salesperson || '',
    notes: row.notes,
    createdAt: dateOnly(row.created_at),
    lastContact: dateOnly(row.last_contact || row.updated_at || row.created_at),
    timeline: normalizeTimeline(row.timeline),
  }
}

function toDatabasePayload(values: CustomerFormValues) {
  return {
    company: values.company,
    contact: values.contact,
    phone: values.phone,
    email: values.email,
    address: values.address,
    rfc: values.rfc,
    project_type: values.projectType,
    lead_source: values.leadSource,
    status: values.status,
    assigned_salesperson: values.assignedSalesperson || null,
    notes: values.notes,
  }
}

const SELECT_FIELDS =
  'id,folio,company,contact,phone,email,address,rfc,project_type,lead_source,status,assigned_salesperson,notes,created_at,last_contact,updated_at,timeline'

export async function listCustomersFromSupabase(): Promise<Customer[]> {
  const response = await supabaseFetch(
    `/rest/v1/customers?select=${SELECT_FIELDS}&order=created_at.desc`,
  )
  const rows = (await response.json()) as DatabaseCustomer[]
  return rows.map(mapDatabaseCustomer)
}

export async function getCustomerFromSupabase(id: string): Promise<Customer | undefined> {
  const response = await supabaseFetch(
    `/rest/v1/customers?id=eq.${encodeURIComponent(id)}&select=${SELECT_FIELDS}&limit=1`,
  )
  const rows = (await response.json()) as DatabaseCustomer[]
  return rows[0] ? mapDatabaseCustomer(rows[0]) : undefined
}

export async function createCustomerInSupabase(values: CustomerFormValues): Promise<Customer> {
  const response = await supabaseFetch(`/rest/v1/customers?select=${SELECT_FIELDS}`, {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({
      ...toDatabasePayload(values),
      last_contact: new Date().toISOString(),
      timeline: [],
    }),
  })
  const rows = (await response.json()) as DatabaseCustomer[]
  if (!rows[0]) throw new Error('Supabase no devolvió el cliente creado.')
  return mapDatabaseCustomer(rows[0])
}

export async function updateCustomerInSupabase(
  id: string,
  values: CustomerFormValues,
): Promise<Customer | undefined> {
  const response = await supabaseFetch(
    `/rest/v1/customers?id=eq.${encodeURIComponent(id)}&select=${SELECT_FIELDS}`,
    {
      method: 'PATCH',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({
        ...toDatabasePayload(values),
        last_contact: new Date().toISOString(),
      }),
    },
  )
  const rows = (await response.json()) as DatabaseCustomer[]
  return rows[0] ? mapDatabaseCustomer(rows[0]) : undefined
}

export async function deleteCustomerFromSupabase(id: string): Promise<boolean> {
  const response = await supabaseFetch(
    `/rest/v1/customers?id=eq.${encodeURIComponent(id)}&select=id`,
    {
      method: 'DELETE',
      headers: { Prefer: 'return=representation' },
    },
  )
  const rows = (await response.json()) as Array<{ id: string }>
  return rows.length > 0
}
