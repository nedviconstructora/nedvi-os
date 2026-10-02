'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import {
  CalendarClock,
  Check,
  ChevronRight,
} from 'lucide-react'
import { Card, CardHeader } from '@/components/ui/Card'
import {
  type AgendaItem,
  AGENDA_STORAGE_KEY,
  readAgendaActivities,
  sortAgendaActivities,
  writeAgendaActivities,
} from '@/features/agenda/services/agendaStorage'

const MAX_VISIBLE_ACTIVITIES = 3

function formatActivityDate(activity: AgendaItem) {
  const value = new Date(`${activity.date}T${activity.time}:00`)

  if (Number.isNaN(value.getTime())) {
    return `${activity.date} ${activity.time}`
  }

  return new Intl.DateTimeFormat('es-MX', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(value)
}

export function DashboardAgendaTasks() {
  const [activities, setActivities] = useState<AgendaItem[]>([])

  useEffect(() => {
    const loadActivities = () => {
      setActivities(readAgendaActivities())
    }

    loadActivities()

    const handleStorage = (event: StorageEvent) => {
      if (event.key === AGENDA_STORAGE_KEY) {
        loadActivities()
      }
    }

    window.addEventListener('storage', handleStorage)
    window.addEventListener('focus', loadActivities)

    return () => {
      window.removeEventListener('storage', handleStorage)
      window.removeEventListener('focus', loadActivities)
    }
  }, [])

  const pendingActivities = sortAgendaActivities(activities)
    .filter((activity) => activity.status !== 'Completada')
    .slice(0, MAX_VISIBLE_ACTIVITIES)

  const completeActivity = (activityId: number) => {
    setActivities((current) => {
      const updated = current.map((activity) =>
        activity.id === activityId
          ? { ...activity, status: 'Completada' as const }
          : activity
      )

      writeAgendaActivities(updated)
      return updated
    })
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader
        title="Próximas tareas"
        description="Actividades reales de tu agenda"
        action={
          <CalendarClock
            size={17}
            className="text-[#7187ff]"
          />
        }
      />

      {pendingActivities.length > 0 ? (
        <div className="space-y-1 px-5 py-3 sm:px-6">
          {pendingActivities.map((activity) => (
            <div
              key={activity.id}
              className="flex gap-3 rounded-xl py-3"
            >
              <button
                type="button"
                onClick={() => completeActivity(activity.id)}
                className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-white/[0.12] text-transparent transition hover:border-[#163DFF] hover:bg-[#163DFF] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#163DFF]/40"
                aria-label={`Marcar ${activity.title} como completada`}
                title="Marcar como completada"
              >
                <Check size={12} strokeWidth={2.5} />
              </button>

              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-[#d5d7df]">
                  {activity.title}
                </p>

                <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] text-[#646873]">
                  <span>{activity.type}</span>
                  <span aria-hidden="true">•</span>
                  <span
                    className={
                      activity.status === 'En progreso'
                        ? 'text-[#91a2ff]'
                        : undefined
                    }
                  >
                    {activity.status}
                  </span>
                </div>
              </div>

              <span className="shrink-0 text-right text-[10px] text-[#646873]">
                {formatActivityDate(activity)}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className="px-6 py-8 text-center">
          <p className="text-xs font-medium text-[#d5d7df]">
            No hay tareas pendientes
          </p>
          <p className="mt-1 text-[10px] text-[#646873]">
            Las nuevas actividades de Agenda aparecerán aquí.
          </p>
        </div>
      )}

      <Link
        href="/agenda"
        className="flex w-full items-center justify-center gap-1 border-t border-white/[0.06] py-3 text-xs font-medium text-[#9CA3AF] transition hover:bg-white/[0.03] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#163DFF]/40"
      >
        Ver agenda
        <ChevronRight size={14} />
      </Link>
    </Card>
  )
}
