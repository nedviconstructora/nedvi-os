import { createClient } from '@/lib/supabase/client'

export type AgendaStatus = 'Pendiente' | 'En progreso' | 'Completada'

export type AgendaItem = {
  id: number
  title: string
  date: string
  time: string
  type: string
  status: AgendaStatus
}

export const AGENDA_STORAGE_KEY = 'nedvi-agenda-activities'
export const AGENDA_UPDATED_EVENT = 'nedvi-agenda-updated'

function isAgendaStatus(value: unknown): value is AgendaStatus {
  return (
    value === 'Pendiente' ||
    value === 'En progreso' ||
    value === 'Completada'
  )
}

export function normalizeAgendaActivities(value: unknown): AgendaItem[] {
  if (!Array.isArray(value)) return []

  return value.flatMap((item) => {
    if (typeof item !== 'object' || item === null) return []

    const record = item as Record<string, unknown>

    if (
      typeof record.id !== 'number' ||
      typeof record.title !== 'string' ||
      typeof record.date !== 'string' ||
      typeof record.time !== 'string' ||
      typeof record.type !== 'string'
    ) {
      return []
    }

    return [
      {
        id: record.id,
        title: record.title,
        date: record.date,
        time: record.time.slice(0, 5),
        type: record.type,
        status: isAgendaStatus(record.status) ? record.status : 'Pendiente',
      },
    ]
  })
}

export function readAgendaActivities(): AgendaItem[] {
  if (typeof window === 'undefined') return []

  const storedValue = window.localStorage.getItem(AGENDA_STORAGE_KEY)
  if (!storedValue) return []

  try {
    return normalizeAgendaActivities(JSON.parse(storedValue) as unknown)
  } catch (error) {
    console.error('Error al leer la agenda:', error)
    return []
  }
}

export function writeAgendaActivities(activities: AgendaItem[]) {
  if (typeof window === 'undefined') return

  window.localStorage.setItem(
    AGENDA_STORAGE_KEY,
    JSON.stringify(activities)
  )
  window.dispatchEvent(new Event(AGENDA_UPDATED_EVENT))
}

export function sortAgendaActivities(activities: AgendaItem[]) {
  return [...activities].sort((first, second) => {
    const firstDateTime = `${first.date}T${first.time}`
    const secondDateTime = `${second.date}T${second.time}`
    return firstDateTime.localeCompare(secondDateTime)
  })
}

type AgendaRow = {
  id: number
  title: string
  activity_date: string
  activity_time: string
  type: string
  status: string
}

function mapRow(row: AgendaRow): AgendaItem {
  return {
    id: Number(row.id),
    title: row.title,
    date: row.activity_date,
    time: row.activity_time.slice(0, 5),
    type: row.type,
    status: isAgendaStatus(row.status) ? row.status : 'Pendiente',
  }
}

export async function loadAgendaActivities(): Promise<AgendaItem[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('agenda_activities')
    .select('id,title,activity_date,activity_time,type,status')
    .order('activity_date', { ascending: true })
    .order('activity_time', { ascending: true })

  if (error) throw error

  const items = ((data ?? []) as AgendaRow[]).map(mapRow)
  writeAgendaActivities(items)
  return items
}

export async function createAgendaActivity(
  activity: Omit<AgendaItem, 'id'>
): Promise<AgendaItem> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('agenda_activities')
    .insert({
      title: activity.title,
      activity_date: activity.date,
      activity_time: activity.time,
      type: activity.type,
      status: activity.status,
    })
    .select('id,title,activity_date,activity_time,type,status')
    .single()

  if (error) throw error
  return mapRow(data as AgendaRow)
}

export async function updateAgendaActivity(
  activity: AgendaItem
): Promise<AgendaItem> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('agenda_activities')
    .update({
      title: activity.title,
      activity_date: activity.date,
      activity_time: activity.time,
      type: activity.type,
      status: activity.status,
      updated_at: new Date().toISOString(),
    })
    .eq('id', activity.id)
    .select('id,title,activity_date,activity_time,type,status')
    .single()

  if (error) throw error
  return mapRow(data as AgendaRow)
}

export async function deleteAgendaActivity(id: number): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('agenda_activities')
    .delete()
    .eq('id', id)

  if (error) throw error
}

export async function migrateLocalAgendaIfNeeded(): Promise<AgendaItem[]> {
  const remote = await loadAgendaActivities()
  if (remote.length > 0) return remote

  const local = readAgendaActivities()
  if (local.length === 0) return remote

  const supabase = createClient()
  const { data, error } = await supabase
    .from('agenda_activities')
    .insert(
      local.map((item) => ({
        title: item.title,
        activity_date: item.date,
        activity_time: item.time,
        type: item.type,
        status: item.status,
      }))
    )
    .select('id,title,activity_date,activity_time,type,status')

  if (error) throw error

  const migrated = ((data ?? []) as AgendaRow[]).map(mapRow)
  writeAgendaActivities(migrated)
  return sortAgendaActivities(migrated)
}
