'use client'

import type {
  Project,
  ProjectFormValues,
  ProjectStatus,
  ProjectType,
} from '@/features/projects/types/project'
import { projectStatuses, projectTypes } from '@/features/projects/types/project'

type StoredSession = { access_token?: string }

type ProjectRow = {
  id: string
  folio: string | null
  name: string
  customer_id: string | null
  client_name: string
  client_contact: string
  project_type: string | null
  address: string
  latitude: number | null
  longitude: number | null
  budget: number | string
  spent: number | string
  start_date: string | null
  estimated_completion: string | null
  progress: number
  manager: string
  status: string
  description: string
  created_at: string
}

export type ProjectCustomerOption = {
  id: string
  folio: string
  company: string
  contact: string
}

const PROJECT_SELECT = [
  'id','folio','name','customer_id','client_name','client_contact','project_type',
  'address','latitude','longitude','budget','spent','start_date',
  'estimated_completion','progress','manager','status','description','created_at',
].join(',')

function getStoredSession(): StoredSession | null {
  if (typeof window === 'undefined') return null
  const raw = window.localStorage.getItem('nedvi_session')
  if (!raw) return null
  try { return JSON.parse(raw) as StoredSession } catch { return null }
}

function getConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const keys = [
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  ].filter((value): value is string => Boolean(value?.trim()))
  const accessToken = getStoredSession()?.access_token?.trim()

  if (!url) throw new Error('Falta NEXT_PUBLIC_SUPABASE_URL en .env.local.')
  if (!keys.length) throw new Error('Falta una API key pública de Supabase.')
  if (!accessToken) throw new Error('No hay una sesión activa de NEDVI OS.')

  return { url, keys, accessToken }
}

async function request(path: string, init: RequestInit = {}) {
  const { url, keys, accessToken } = getConfig()
  let lastResponse: Response | null = null

  for (const key of keys) {
    const response = await fetch(`${url}${path}`, {
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
    if (response.status !== 401) return response
  }

  if (!lastResponse) throw new Error('No fue posible conectar con Supabase.')
  return lastResponse
}

function isProjectType(value: string | null): value is ProjectType {
  return Boolean(value && projectTypes.includes(value as ProjectType))
}

function isProjectStatus(value: string): value is ProjectStatus {
  return projectStatuses.includes(value as ProjectStatus)
}

function mapProject(row: ProjectRow): Project {
  return {
    id: row.id,
    folio: row.folio ?? '',
    customerId: row.customer_id ?? '',
    name: row.name,
    client: row.client_name ?? '',
    clientContact: row.client_contact ?? '',
    projectType: isProjectType(row.project_type) ? row.project_type : 'Residential',
    address: row.address ?? '',
    latitude: row.latitude ?? 0,
    longitude: row.longitude ?? 0,
    budget: Number(row.budget ?? 0),
    spent: Number(row.spent ?? 0),
    startDate: row.start_date ?? '',
    estimatedCompletion: row.estimated_completion ?? '',
    progress: row.progress ?? 0,
    manager: row.manager ?? '',
    assignedEmployees: [],
    materials: [],
    equipment: [],
    status: isProjectStatus(row.status) ? row.status : 'Planning',
    description: row.description ?? '',
    timeline: [],
    photos: [],
    documents: [],
    dailyLogs: [],
    tasks: [],
    inspections: [],
    safetyIncidents: [],
    progressHistory: [],
  }
}

async function readError(response: Response, fallback: string) {
  const detail = await response.text().catch(() => '')
  return new Error(`${fallback} [HTTP ${response.status}]${detail ? ` ${detail}` : ''}`)
}

export async function getProjectsFromSupabase(): Promise<Project[]> {
  const response = await request(`/rest/v1/projects?select=${PROJECT_SELECT}&order=created_at.desc`)
  if (!response.ok) throw await readError(response, 'No se pudieron cargar los proyectos desde Supabase.')
  const rows = (await response.json()) as ProjectRow[]
  return rows.map(mapProject)
}

export async function getProjectByIdFromSupabase(id: string): Promise<Project | undefined> {
  const response = await request(
    `/rest/v1/projects?id=eq.${encodeURIComponent(id)}&select=${PROJECT_SELECT}&limit=1`,
  )
  if (!response.ok) throw await readError(response, 'No se pudo cargar el proyecto desde Supabase.')
  const rows = (await response.json()) as ProjectRow[]
  return rows[0] ? mapProject(rows[0]) : undefined
}

export async function getProjectCustomersFromSupabase(): Promise<ProjectCustomerOption[]> {
  const response = await request('/rest/v1/customers?select=id,folio,company,contact&order=company.asc')
  if (!response.ok) throw await readError(response, 'No se pudieron cargar los clientes para el proyecto.')
  const rows = (await response.json()) as Array<{ id: string; folio: string | null; company: string; contact: string }>
  return rows.map((row) => ({ id: row.id, folio: row.folio ?? '', company: row.company, contact: row.contact }))
}

async function getCustomerForProject(customerId: string) {
  const response = await request(
    `/rest/v1/customers?id=eq.${encodeURIComponent(customerId)}&select=id,company,contact&limit=1`,
  )
  if (!response.ok) throw await readError(response, 'No se pudo validar el cliente seleccionado.')
  const rows = (await response.json()) as Array<{ id: string; company: string; contact: string }>
  return rows[0]
}

export async function createProjectInSupabase(values: ProjectFormValues): Promise<Project> {
  const customer = await getCustomerForProject(values.customerId)
  if (!customer) throw new Error('Selecciona un cliente válido para el proyecto.')

  const response = await request(`/rest/v1/projects?select=${PROJECT_SELECT}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' },
    body: JSON.stringify({
      name: values.name,
      customer_id: values.customerId,
      client_name: customer.company,
      client_contact: customer.contact,
      project_type: values.projectType,
      address: values.address,
      latitude: values.latitude || null,
      longitude: values.longitude || null,
      budget: values.budget,
      start_date: values.startDate || null,
      estimated_completion: values.estimatedCompletion || null,
      manager: values.manager,
      status: values.status,
      description: values.description,
    }),
  })

  if (!response.ok) throw await readError(response, 'No se pudo crear el proyecto en Supabase.')
  const rows = (await response.json()) as ProjectRow[]
  if (!rows[0]) throw new Error('Supabase no devolvió el proyecto creado.')
  return mapProject(rows[0])
}

export async function updateProjectInSupabase(id: string, values: ProjectFormValues): Promise<Project | undefined> {
  const customer = await getCustomerForProject(values.customerId)
  if (!customer) throw new Error('Selecciona un cliente válido para el proyecto.')

  const response = await request(
    `/rest/v1/projects?id=eq.${encodeURIComponent(id)}&select=${PROJECT_SELECT}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' },
      body: JSON.stringify({
        name: values.name,
        customer_id: values.customerId,
        client_name: customer.company,
        client_contact: customer.contact,
        project_type: values.projectType,
        address: values.address,
        latitude: values.latitude || null,
        longitude: values.longitude || null,
        budget: values.budget,
        start_date: values.startDate || null,
        estimated_completion: values.estimatedCompletion || null,
        manager: values.manager,
        status: values.status,
        description: values.description,
      }),
    },
  )

  if (!response.ok) throw await readError(response, 'No se pudo actualizar el proyecto en Supabase.')
  const rows = (await response.json()) as ProjectRow[]
  return rows[0] ? mapProject(rows[0]) : undefined
}

export async function deleteProjectFromSupabase(id: string): Promise<void> {
  const response = await request(`/rest/v1/projects?id=eq.${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: { Prefer: 'return=minimal' },
  })
  if (!response.ok) throw await readError(response, 'No se pudo eliminar el proyecto de Supabase.')
}
