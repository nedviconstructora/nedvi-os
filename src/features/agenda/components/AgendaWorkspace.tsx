'use client'

import { useEffect, useState, type FormEvent } from 'react'
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  Pencil,
  Plus,
  RotateCcw,
  Trash2,
  X,
} from 'lucide-react'

type AgendaStatus = 'Pendiente' | 'En progreso' | 'Completada'
type AgendaFilter = 'Todas' | AgendaStatus

type AgendaItem = {
  id: number
  title: string
  date: string
  time: string
  type: string
  status: AgendaStatus
}

const STORAGE_KEY = 'nedvi-agenda-activities'

const initialActivities: AgendaItem[] = [
  {
    id: 1,
    title: 'Revisar planos estructurales',
    date: '2026-09-25',
    time: '14:00',
    type: 'Tarea',
    status: 'Pendiente',
  },
  {
    id: 2,
    title: 'Enviar propuesta comercial',
    date: '2026-09-26',
    time: '09:30',
    type: 'Cotización',
    status: 'Pendiente',
  },
  {
    id: 3,
    title: 'Visita de obra con cliente',
    date: '2026-09-29',
    time: '11:00',
    type: 'Visita de obra',
    status: 'En progreso',
  },
]

const statusOptions: AgendaStatus[] = [
  'Pendiente',
  'En progreso',
  'Completada',
]

const filterOptions: AgendaFilter[] = [
  'Todas',
  ...statusOptions,
]

function isAgendaStatus(value: unknown): value is AgendaStatus {
  return (
    value === 'Pendiente' ||
    value === 'En progreso' ||
    value === 'Completada'
  )
}

function normalizeStoredActivities(value: unknown): AgendaItem[] | null {
  if (!Array.isArray(value)) {
    return null
  }

  const normalized = value.flatMap((item) => {
    if (
      typeof item !== 'object' ||
      item === null ||
      !('id' in item) ||
      !('title' in item) ||
      !('date' in item) ||
      !('time' in item) ||
      !('type' in item)
    ) {
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

  return normalized
}

function getStatusClass(status: AgendaStatus) {
  if (status === 'Completada') {
    return 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300'
  }

  if (status === 'En progreso') {
    return 'border-[#7187ff]/20 bg-[#163DFF]/10 text-[#9dacff]'
  }

  return 'border-amber-400/20 bg-amber-400/10 text-amber-300'
}

export function AgendaWorkspace() {
  const [activities, setActivities] =
    useState<AgendaItem[]>(initialActivities)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingActivityId, setEditingActivityId] =
    useState<number | null>(null)
  const [filter, setFilter] = useState<AgendaFilter>('Todas')

  const [title, setTitle] = useState('')
  const [type, setType] = useState('Tarea')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [status, setStatus] = useState<AgendaStatus>('Pendiente')

  useEffect(() => {
    const savedActivities = window.localStorage.getItem(STORAGE_KEY)

    if (!savedActivities) {
      return
    }

    try {
      const parsed = JSON.parse(savedActivities) as unknown
      const normalized = normalizeStoredActivities(parsed)

      if (normalized) {
        setActivities(normalized)

        window.localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify(normalized)
        )
      }
    } catch (error) {
      console.error('Error al cargar la agenda:', error)
    }
  }, [])

  useEffect(() => {
    if (!modalOpen) {
      return
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setModalOpen(false)
        setEditingActivityId(null)
      }
    }

    window.addEventListener('keydown', handleEscape)

    return () => {
      window.removeEventListener('keydown', handleEscape)
    }
  }, [modalOpen])

  const saveActivities = (updatedActivities: AgendaItem[]) => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(updatedActivities)
    )
  }

  const updateActivities = (
    updater: (current: AgendaItem[]) => AgendaItem[]
  ) => {
    setActivities((current) => {
      const updated = updater(current)
      saveActivities(updated)
      return updated
    })
  }

  const resetForm = () => {
    setTitle('')
    setType('Tarea')
    setDate('')
    setTime('')
    setStatus('Pendiente')
    setEditingActivityId(null)
  }

  const closeModal = () => {
    setModalOpen(false)
    resetForm()
  }

  const openCreateModal = () => {
    resetForm()
    setModalOpen(true)
  }

  const openEditModal = (activity: AgendaItem) => {
    setEditingActivityId(activity.id)
    setTitle(activity.title)
    setType(activity.type)
    setDate(activity.date)
    setTime(activity.time)
    setStatus(activity.status)
    setModalOpen(true)
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!title.trim() || !date || !time) {
      return
    }

    if (editingActivityId !== null) {
      updateActivities((current) =>
        current.map((activity) =>
          activity.id === editingActivityId
            ? {
                ...activity,
                title: title.trim(),
                type,
                date,
                time,
                status,
              }
            : activity
        )
      )
    } else {
      const newActivity: AgendaItem = {
        id: Date.now(),
        title: title.trim(),
        type,
        date,
        time,
        status,
      }

      updateActivities((current) => [...current, newActivity])
    }

    closeModal()
  }

  const deleteActivity = (activity: AgendaItem) => {
    const confirmed = window.confirm(
      `¿Eliminar la actividad "${activity.title}"?`
    )

    if (!confirmed) {
      return
    }

    updateActivities((current) =>
      current.filter((item) => item.id !== activity.id)
    )
  }

  const toggleCompleted = (activity: AgendaItem) => {
    updateActivities((current) =>
      current.map((item) =>
        item.id === activity.id
          ? {
              ...item,
              status:
                item.status === 'Completada'
                  ? 'Pendiente'
                  : 'Completada',
            }
          : item
      )
    )
  }

  const sortedActivities = [...activities].sort((first, second) => {
    const firstDateTime = `${first.date}T${first.time}`
    const secondDateTime = `${second.date}T${second.time}`

    return firstDateTime.localeCompare(secondDateTime)
  })

  const visibleActivities = sortedActivities.filter((activity) =>
    filter === 'Todas' ? true : activity.status === filter
  )

  const counts = {
    Todas: activities.length,
    Pendiente: activities.filter(
      (activity) => activity.status === 'Pendiente'
    ).length,
    'En progreso': activities.filter(
      (activity) => activity.status === 'En progreso'
    ).length,
    Completada: activities.filter(
      (activity) => activity.status === 'Completada'
    ).length,
  }

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-8">
      <header className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7187ff]">
            Organización
          </p>

          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-white sm:text-4xl">
            Agenda
          </h1>

          <p className="mt-2 text-sm text-[#9CA3AF]">
            Organiza tareas, visitas, reuniones y actividades de NEDVI
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#163DFF] px-4 text-xs font-semibold text-white shadow-[0_10px_25px_rgba(22,61,255,0.2)] transition hover:bg-[#3155ff] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#163DFF]/30"
        >
          <Plus size={16} strokeWidth={2} />
          Nueva actividad
        </button>
      </header>

      <section className="overflow-hidden rounded-2xl border border-white/[0.06] bg-[#20232A]">
        <div className="border-b border-white/[0.06] px-5 py-5 sm:px-6">
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
            <div>
              <h2 className="text-sm font-semibold text-white">
                Próximas actividades
              </h2>
              <p className="mt-1 text-xs text-[#646873]">
                {activities.length}{' '}
                {activities.length === 1
                  ? 'actividad programada'
                  : 'actividades programadas'}
              </p>
            </div>

            <div
              className="flex flex-wrap gap-2"
              aria-label="Filtrar actividades por estado"
            >
              {filterOptions.map((option) => {
                const active = filter === option

                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setFilter(option)}
                    aria-pressed={active}
                    className={`inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-[11px] font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#163DFF]/40 ${
                      active
                        ? 'border-[#163DFF]/40 bg-[#163DFF]/15 text-white'
                        : 'border-white/[0.06] bg-[#17181C] text-[#9CA3AF] hover:border-white/[0.12] hover:text-white'
                    }`}
                  >
                    {option}
                    <span className="rounded-md bg-white/[0.05] px-1.5 py-0.5 text-[9px] text-[#9CA3AF]">
                      {counts[option]}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {visibleActivities.length > 0 ? (
          <div className="divide-y divide-white/[0.05]">
            {visibleActivities.map((activity) => (
              <div
                key={activity.id}
                className={`flex flex-col gap-4 px-5 py-5 transition hover:bg-white/[0.02] sm:px-6 lg:flex-row lg:items-center ${
                  activity.status === 'Completada' ? 'opacity-70' : ''
                }`}
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#163DFF]/10 text-[#7187ff]">
                  <CalendarDays size={18} strokeWidth={1.8} />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p
                      className={`truncate text-sm font-medium ${
                        activity.status === 'Completada'
                          ? 'text-[#9CA3AF] line-through'
                          : 'text-white'
                      }`}
                    >
                      {activity.title}
                    </p>
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[9px] font-semibold ${getStatusClass(
                        activity.status
                      )}`}
                    >
                      {activity.status}
                    </span>
                  </div>

                  <p className="mt-1 text-xs text-[#646873]">
                    {activity.type}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3 text-xs text-[#9CA3AF]">
                  <span>{activity.date}</span>
                  <span className="flex items-center gap-1.5">
                    <Clock3 size={13} />
                    {activity.time}
                  </span>

                  <button
                    type="button"
                    onClick={() => toggleCompleted(activity)}
                    className={`flex h-9 w-9 items-center justify-center rounded-lg transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#163DFF]/40 ${
                      activity.status === 'Completada'
                        ? 'text-emerald-300 hover:bg-emerald-400/10'
                        : 'text-[#646873] hover:bg-emerald-400/10 hover:text-emerald-300'
                    }`}
                    aria-label={
                      activity.status === 'Completada'
                        ? `Reabrir ${activity.title}`
                        : `Completar ${activity.title}`
                    }
                    title={
                      activity.status === 'Completada'
                        ? 'Reabrir actividad'
                        : 'Marcar como completada'
                    }
                  >
                    {activity.status === 'Completada' ? (
                      <RotateCcw size={15} strokeWidth={1.8} />
                    ) : (
                      <CheckCircle2 size={15} strokeWidth={1.8} />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => openEditModal(activity)}
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-[#646873] transition hover:bg-[#163DFF]/10 hover:text-[#7187ff] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#163DFF]/40"
                    aria-label={`Editar ${activity.title}`}
                    title="Editar actividad"
                  >
                    <Pencil size={15} strokeWidth={1.8} />
                  </button>

                  <button
                    type="button"
                    onClick={() => deleteActivity(activity)}
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-[#646873] transition hover:bg-red-500/10 hover:text-red-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/30"
                    aria-label={`Eliminar ${activity.title}`}
                    title="Eliminar actividad"
                  >
                    <Trash2 size={15} strokeWidth={1.8} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex min-h-[320px] flex-col items-center justify-center px-6 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#163DFF]/10 text-[#7187ff]">
              <CalendarDays size={26} />
            </div>
            <h3 className="mt-5 text-base font-semibold text-white">
              No hay actividades en este estado
            </h3>
            <p className="mt-2 max-w-sm text-sm text-[#646873]">
              Cambia el filtro o crea una nueva actividad para continuar.
            </p>
          </div>
        )}
      </section>

      {modalOpen ? (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) {
              closeModal()
            }
          }}
        >
          <div
            className="w-full max-w-lg overflow-hidden rounded-2xl border border-white/[0.08] bg-[#20232A] shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="agenda-modal-title"
          >
            <div className="flex items-center justify-between border-b border-white/[0.06] px-6 py-5">
              <div>
                <h2
                  id="agenda-modal-title"
                  className="text-lg font-semibold text-white"
                >
                  {editingActivityId !== null
                    ? 'Editar actividad'
                    : 'Nueva actividad'}
                </h2>
                <p className="mt-1 text-xs text-[#646873]">
                  {editingActivityId !== null
                    ? 'Actualiza los datos y el estado de la actividad'
                    : 'Agrega una actividad a la agenda de NEDVI'}
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-[#9CA3AF] transition hover:bg-white/[0.06] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#163DFF]/40"
                aria-label="Cerrar ventana"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5 p-6">
              <div>
                <label
                  htmlFor="activity-title"
                  className="mb-2 block text-xs font-medium text-[#9CA3AF]"
                >
                  Nombre de la actividad
                </label>
                <input
                  id="activity-title"
                  type="text"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Ej. Visita de obra"
                  required
                  autoFocus
                  className="h-11 w-full rounded-xl border border-white/[0.08] bg-[#17181C] px-4 text-sm text-white outline-none transition placeholder:text-[#646873] focus:border-[#163DFF] focus:ring-2 focus:ring-[#163DFF]/20"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="activity-type"
                    className="mb-2 block text-xs font-medium text-[#9CA3AF]"
                  >
                    Tipo de actividad
                  </label>
                  <select
                    id="activity-type"
                    value={type}
                    onChange={(event) => setType(event.target.value)}
                    className="h-11 w-full rounded-xl border border-white/[0.08] bg-[#17181C] px-4 text-sm text-white outline-none transition focus:border-[#163DFF] focus:ring-2 focus:ring-[#163DFF]/20"
                  >
                    <option value="Tarea">Tarea</option>
                    <option value="Reunión">Reunión</option>
                    <option value="Visita de obra">Visita de obra</option>
                    <option value="Cotización">Cotización</option>
                    <option value="Entrega">Entrega</option>
                    <option value="Otro">Otro</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="activity-status"
                    className="mb-2 block text-xs font-medium text-[#9CA3AF]"
                  >
                    Estado
                  </label>
                  <select
                    id="activity-status"
                    value={status}
                    onChange={(event) =>
                      setStatus(event.target.value as AgendaStatus)
                    }
                    className="h-11 w-full rounded-xl border border-white/[0.08] bg-[#17181C] px-4 text-sm text-white outline-none transition focus:border-[#163DFF] focus:ring-2 focus:ring-[#163DFF]/20"
                  >
                    {statusOptions.map((option) => (
                      <option value={option} key={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="activity-date"
                    className="mb-2 block text-xs font-medium text-[#9CA3AF]"
                  >
                    Fecha
                  </label>
                  <input
                    id="activity-date"
                    type="date"
                    value={date}
                    onChange={(event) => setDate(event.target.value)}
                    required
                    className="h-11 w-full rounded-xl border border-white/[0.08] bg-[#17181C] px-4 text-sm text-white outline-none transition focus:border-[#163DFF] focus:ring-2 focus:ring-[#163DFF]/20"
                  />
                </div>

                <div>
                  <label
                    htmlFor="activity-time"
                    className="mb-2 block text-xs font-medium text-[#9CA3AF]"
                  >
                    Hora
                  </label>
                  <input
                    id="activity-time"
                    type="time"
                    value={time}
                    onChange={(event) => setTime(event.target.value)}
                    required
                    className="h-11 w-full rounded-xl border border-white/[0.08] bg-[#17181C] px-4 text-sm text-white outline-none transition focus:border-[#163DFF] focus:ring-2 focus:ring-[#163DFF]/20"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 border-t border-white/[0.06] pt-5">
                <button
                  type="button"
                  onClick={closeModal}
                  className="h-10 rounded-xl border border-white/[0.08] px-4 text-xs font-medium text-[#9CA3AF] transition hover:bg-white/[0.05] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#163DFF] px-4 text-xs font-semibold text-white transition hover:bg-[#3155ff] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#163DFF]/30"
                >
                  {editingActivityId !== null ? (
                    <>
                      <Pencil size={15} />
                      Guardar cambios
                    </>
                  ) : (
                    <>
                      <Plus size={15} />
                      Crear actividad
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  )
}
