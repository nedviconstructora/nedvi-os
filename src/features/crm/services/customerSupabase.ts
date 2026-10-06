'use client'

import type {
  Customer,
  CustomerFormValues,
  CustomerStatus,
  CustomerTimelineEvent,
  LeadSource,
  ProjectType,
} from '@/features/crm/types/customer'
import {
  customerStatuses,
  leadSources,
  projectTypes,
} from '@/features/crm/types/customer'

type StoredSession = {
  access_token?: string
}

type CustomerRow = {
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
  timeline: unknown
}

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

function getStoredSession(): StoredSession | null {
  if (typeof window === 'undefined') return null

  const rawSession = window.localStorage.getItem('nedvi_session')
  if (!rawSession) return null

  try {
    return JSON.parse(rawSession) as StoredSession
  } catch {
    return null
  }
}

function getSupabaseConfig() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const keys = [
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  ].filter((value): value is string => Boolean(value?.trim()))
  const accessToken = getStoredSession()?.access_token?.trim()

  if (!supabaseUrl) {
    throw new Error('Falta NEXT_PUBLIC_SUPABASE_URL en .env.local.')
  }

  if (keys.length === 0) {
    throw new Error('Falta una API key pública de Supabase en .env.local.')
  }

  if (!accessToken) {
    throw new Error('No hay una sesión activa de NEDVI OS. Inicia sesión nuevamente.')
  }

  return { supabaseUrl, keys, accessToken }
}

async function supabaseRequest(path: string, init: RequestInit = {}) {
  const { supabaseUrl, keys, accessToken } = getSupabaseConfig()
  let lastResponse: Response | null = null

  for (const key of keys) {
    const response = await fetch(`${supabaseUrl}${path}`, {
      ...init,
      headers: {
        Accept: 'application/json',
        apikey: key,
        Authorization: `Bearer ${accessToken}`,
        ...init.headers,
      },
      cache: 'no-store',
    })

    lastResponse = response

    if (response.status !== 401) {
      return response
    }
  }

  if (!lastResponse) {
    throw new Error('No fue posible conectar con Supabase.')
  }

  return lastResponse
}

function isCustomerStatus(value: string): value is CustomerStatus {
  return customerStatuses.includes(value as CustomerStatus)
}

function isProjectType(value: string | null): value is ProjectType {
  return Boolean(value && projectTypes.includes(value as ProjectType))
}

function isLeadSource(value: string | null): value is LeadSource {
  return Boolean(value && leadSources.includes(value as LeadSource))
}

function parseTimeline(value: unknown): CustomerTimelineEvent[] {
  return Array.isArray(value) ? (value as CustomerTimelineEvent[]) : []
}

function normalizeDate(value: string | null) {
  if (!value) return ''
  return value.slice(0, 10)
}

function mapCustomerRow(row: CustomerRow): Customer {
  return {
    id: row.id,
    folio: row.folio ?? '',
    company: row.company ?? '',
    contact: row.contact ?? '',
    phone: row.phone ?? '',
    email: row.email ?? '',
    address: row.address ?? '',
    rfc: row.rfc ?? '',
    projectType: isProjectType(row.project_type) ? row.project_type : '',
    leadSource: isLeadSource(row.lead_source) ? row.lead_source : '',
    status: isCustomerStatus(row.status) ? row.status : 'Lead',
    assignedSalesperson: row.assigned_salesperson ?? '',
    notes: row.notes ?? '',
    createdAt: normalizeDate(row.created_at),
    lastContact: normalizeDate(row.last_contact ?? row.created_at),
    timeline: parseTimeline(row.timeline),
  }
}

async function readError(response: Response, fallback: string) {
  const detail = await response.text().catch(() => '')
  return new Error(`${fallback} [HTTP ${response.status}]${detail ? ` ${detail}` : ''}`)
}

export async function getCustomersFromSupabase(): Promise<Customer[]> {
  const response = await supabaseRequest(
    `/rest/v1/customers?select=${CUSTOMER_SELECT}&order=created_at.desc`,
  )

  if (!response.ok) {
    throw await readError(response, 'No se pudieron cargar los clientes desde Supabase.')
  }

  const rows = (await response.json()) as CustomerRow[]
  return rows.map(mapCustomerRow)
}

export async function getCustomerByIdFromSupabase(
  id: string,
): Promise<Customer | undefined> {
  const response = await supabaseRequest(
    `/rest/v1/customers?id=eq.${encodeURIComponent(id)}&select=${CUSTOMER_SELECT}&limit=1`,
  )

  if (!response.ok) {
    throw await readError(response, 'No se pudo cargar el cliente desde Supabase.')
  }

  const rows = (await response.json()) as CustomerRow[]
  return rows[0] ? mapCustomerRow(rows[0]) : undefined
}

export async function createCustomerInSupabase(
  values: CustomerFormValues,
): Promise<Customer> {
  const response = await supabaseRequest(`/rest/v1/customers?select=${CUSTOMER_SELECT}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify({
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
      last_contact: new Date().toISOString(),
    }),
  })

  if (!response.ok) {
    throw await readError(response, 'No se pudo crear el cliente en Supabase.')
  }

  const rows = (await response.json()) as CustomerRow[]
  if (!rows[0]) throw new Error('Supabase no devolvió el cliente creado.')

  return mapCustomerRow(rows[0])
}

export async function updateCustomerInSupabase(
  id: string,
  values: CustomerFormValues,
): Promise<Customer | undefined> {
  const response = await supabaseRequest(
    `/rest/v1/customers?id=eq.${encodeURIComponent(id)}&select=${CUSTOMER_SELECT}`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify({
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
        last_contact: new Date().toISOString(),
      }),
    },
  )

  if (!response.ok) {
    throw await readError(response, 'No se pudo actualizar el cliente en Supabase.')
  }

  const rows = (await response.json()) as CustomerRow[]
  return rows[0] ? mapCustomerRow(rows[0]) : undefined
}

export async function deleteCustomerFromSupabase(id: string): Promise<void> {
  const response = await supabaseRequest(
    `/rest/v1/customers?id=eq.${encodeURIComponent(id)}`,
    {
      method: 'DELETE',
      headers: {
        Prefer: 'return=minimal',
      },
    },
  )

  if (!response.ok) {
    throw await readError(response, 'No se pudo eliminar el cliente de Supabase.')
  }
}
