import { supabase } from '@/lib/supabase'
import type { Project, ProjectFormValues, ProjectStatus, ProjectType } from '@/features/projects/types/project'

type ProjectRow = {
  id: string
  folio: string | null
  client_id: string | null
  client_name: string | null
  client_contact: string | null
  name: string
  project_type: string | null
  address: string | null
  latitude: number | null
  longitude: number | null
  budget: number | null
  spent: number | null
  start_date: string | null
  estimated_completion: string | null
  progress: number | null
  manager: string | null
  status: string | null
  description: string | null
}

function rowToProject(row: ProjectRow): Project {
  return {
    id: row.id,
    folio: row.folio ?? undefined,
    clientId: row.client_id ?? undefined,
    name: row.name,
    client: row.client_name ?? '',
    clientContact: row.client_contact ?? '',
    projectType: (row.project_type ?? 'Commercial') as ProjectType,
    address: row.address ?? '',
    latitude: row.latitude ?? 0,
    longitude: row.longitude ?? 0,
    budget: Number(row.budget ?? 0),
    spent: Number(row.spent ?? 0),
    startDate: row.start_date ?? '',
    estimatedCompletion: row.estimated_completion ?? '',
    progress: row.progress ?? 0,
    manager: row.manager ?? '',
    status: (row.status ?? 'Planning') as ProjectStatus,
    description: row.description ?? '',
    assignedEmployees: [],
    materials: [],
    equipment: [],
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

export async function readProjectsFromSupabase(): Promise<Project[]> {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return ((data ?? []) as ProjectRow[]).map(rowToProject)
}

export async function createProjectInSupabase(values: ProjectFormValues): Promise<Project> {
  const payload = {
    client_id: values.clientId || null,
    client_name: values.client,
    client_contact: values.clientContact,
    name: values.name,
    project_type: values.projectType,
    address: values.address,
    latitude: values.latitude,
    longitude: values.longitude,
    budget: values.budget,
    spent: 0,
    start_date: values.startDate || null,
    estimated_completion: values.estimatedCompletion || null,
    progress: 0,
    manager: values.manager,
    status: values.status,
    description: values.description,
  }

  const { data, error } = await supabase
    .from('projects')
    .insert(payload)
    .select('*')
    .single()

  if (error) throw error
  return rowToProject(data as ProjectRow)
}

export async function updateProjectInSupabase(
  id: string,
  values: ProjectFormValues,
): Promise<Project> {
  const { data, error } = await supabase
    .from('projects')
    .update({
      client_id: values.clientId || null,
      client_name: values.client,
      client_contact: values.clientContact,
      name: values.name,
      project_type: values.projectType,
      address: values.address,
      latitude: values.latitude,
      longitude: values.longitude,
      budget: values.budget,
      start_date: values.startDate || null,
      estimated_completion: values.estimatedCompletion || null,
      manager: values.manager,
      status: values.status,
      description: values.description,
    })
    .eq('id', id)
    .select('*')
    .single()

  if (error) throw error
  return rowToProject(data as ProjectRow)
}
