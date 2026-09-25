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

function isAgendaStatus(value: unknown): value is AgendaStatus {
  return (
    value === 'Pendiente' ||
    value === 'En progreso' ||
    value === 'Completada'
  )
}

export function normalizeAgendaActivities(value: unknown): AgendaItem[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value.flatMap((item) => {
    if (typeof item !== 'object' || item === null) {
      return []
    }

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
        time: record.time,
        type: record.type,
        status: isAgendaStatus(record.status)
          ? record.status
          : 'Pendiente',
      },
    ]
  })
}

export function readAgendaActivities(): AgendaItem[] {
  if (typeof window === 'undefined') {
    return []
  }

  const storedValue = window.localStorage.getItem(AGENDA_STORAGE_KEY)

  if (!storedValue) {
    return []
  }

  try {
    return normalizeAgendaActivities(JSON.parse(storedValue) as unknown)
  } catch (error) {
    console.error('Error al leer la agenda:', error)
    return []
  }
}

export function writeAgendaActivities(activities: AgendaItem[]) {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(
    AGENDA_STORAGE_KEY,
    JSON.stringify(activities)
  )
}

export function sortAgendaActivities(activities: AgendaItem[]) {
  return [...activities].sort((first, second) => {
    const firstDateTime = `${first.date}T${first.time}`
    const secondDateTime = `${second.date}T${second.time}`

    return firstDateTime.localeCompare(secondDateTime)
  })
}
