'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { readAccessSession } from '@/features/access/services/accessStorage'
import {
  CalendarClock,
  Check,
  ChevronRight,
} from 'lucide-react'
import { Card, CardHeader } from '@/components/ui/Card'
import {
  type AgendaItem,
  AGENDA_STORAGE_KEY,
  AGENDA_UPDATED_EVENT,
  readAgendaActivities,
  migrateLocalAgendaIfNeeded,
  setAgendaActivityStatus,
  sortAgendaActivities,
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
  const [syncError, setSyncError] = useState('')
  const [completingId, setCompletingId] = useState<number | null>(null)
  const [canEdit, setCanEdit] = useState(false)

  useEffect(() => {
    setCanEdit(Boolean(readAccessSession()?.permissions?.includes('agenda')))
  }, [])

  useEffect(() => {
    let mounted = true
    let inFlight = false

    const loadLocal = () => setActivities(readAgendaActivities())
    const syncFromServer = async () => {
      if (!mounted || inFlight || document.hidden) return
      inFlight = true
      try {
        const fresh = await migrateLocalAgendaIfNeeded()
        if (mounted) {
          setActivities(fresh)
          setSyncError('')
        }
      } catch (error) {
        console.error('No se pudo sincronizar el resumen de Agenda:', error)
        if (mounted) setSyncError('No se pudo sincronizar la agenda. Se muestran los datos locales hasta reconectar.')
      } finally {
        inFlight = false
      }
    }

    const handleStorage = (event: StorageEvent) => {
      if (event.key === AGENDA_STORAGE_KEY) loadLocal()
    }
    const handleFocus = () => { loadLocal(); void syncFromServer() }
    const handleVisibility = () => {
      if (!document.hidden) void syncFromServer()
    }

    loadLocal()
    void syncFromServer()
    const timer = window.setInterval(() => void syncFromServer(), 30000)
    window.addEventListener('storage', handleStorage)
    window.addEventListener('focus', handleFocus)
    window.addEventListener(AGENDA_UPDATED_EVENT, loadLocal)
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      mounted = false
      window.clearInterval(timer)
      window.removeEventListener('storage', handleStorage)
      window.removeEventListener('focus', handleFocus)
      window.removeEventListener(AGENDA_UPDATED_EVENT, loadLocal)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [])

  const pendingActivities = sortAgendaActivities(activities)
    .filter((activity) => activity.status !== 'Completada')
    .slice(0, MAX_VISIBLE_ACTIVITIES)

  const completeActivity = async (activityId: number) => {
    if (!canEdit || completingId !== null) return
    setCompletingId(activityId)
    setSyncError('')
    try {
      await setAgendaActivityStatus(activityId, 'Completada')
      const fresh = await migrateLocalAgendaIfNeeded()
      setActivities(fresh)
    } catch (error) {
      console.error('Error al completar una actividad en Supabase:', error)
      setSyncError('La actividad no se confirmó en Supabase. Intenta de nuevo con conexión.')
    } finally {
      setCompletingId(null)
    }
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

      {syncError ? <p role="alert" className="px-5 pt-3 text-xs text-red-500">{syncError}</p> : null}

      {pendingActivities.length > 0 ? (
        <div className="space-y-1 px-5 py-3 sm:px-6">
          {pendingActivities.map((activity) => (
            <div
              key={activity.id}
              className="flex gap-3 rounded-xl py-3"
            >
              {canEdit ? (
                <button
                  type="button"
                  onClick={() => void completeActivity(activity.id)}
                  disabled={completingId !== null}
                  className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-white/[0.12] text-transparent transition hover:border-[#163DFF] hover:bg-[#163DFF] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#163DFF]/40"
                  aria-label={`Marcar ${activity.title} como completada`}
                  title="Marcar como completada"
                >
                  <Check size={12} strokeWidth={2.5} />
                </button>
              ) : null}

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
