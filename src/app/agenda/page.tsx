'use client'

import { useEffect, useState, type FormEvent } from 'react'
import {
  CalendarDays,
  Clock3,
  Pencil,
  Plus,
  Trash2,
  X,
} from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'

type AgendaItem = {
  id: number
  title: string
  date: string
  time: string
  type: string
}

const STORAGE_KEY = 'nedvi-agenda-activities'

const initialActivities: AgendaItem[] = [
  {
    id: 1,
    title: 'Revisar planos estructurales',
    date: '2026-09-25',
    time: '14:00',
    type: 'Tarea',
  },
  {
    id: 2,
    title: 'Enviar propuesta comercial',
    date: '2026-09-26',
    time: '09:30',
    type: 'Cotización',
  },
  {
    id: 3,
    title: 'Visita de obra con cliente',
    date: '2026-09-29',
    time: '11:00',
    type: 'Visita de obra',
  },
]

export default function AgendaPage() {
  const [activities, setActivities] =
    useState<AgendaItem[]>(initialActivities)

  const [modalOpen, setModalOpen] = useState(false)

  const [editingActivityId, setEditingActivityId] =
    useState<number | null>(null)

  const [title, setTitle] = useState('')
  const [type, setType] = useState('Tarea')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')

  useEffect(() => {
    const savedActivities =
      window.localStorage.getItem(STORAGE_KEY)

    if (!savedActivities) {
      return
    }

    try {
      const parsedActivities =
        JSON.parse(savedActivities)

      if (Array.isArray(parsedActivities)) {
        setActivities(parsedActivities)
      }
    } catch (error) {
      console.error(
        'Error al cargar la agenda:',
        error
      )
    }
  }, [])

  const saveActivities = (
    updatedActivities: AgendaItem[]
  ) => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(updatedActivities)
    )
  }

  const resetForm = () => {
    setTitle('')
    setType('Tarea')
    setDate('')
    setTime('')
    setEditingActivityId(null)
  }

  const openCreateModal = () => {
    resetForm()
    setModalOpen(true)
  }

  const openEditModal = (
    activity: AgendaItem
  ) => {
    setEditingActivityId(activity.id)
    setTitle(activity.title)
    setType(activity.type)
    setDate(activity.date)
    setTime(activity.time)
    setModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
    resetForm()
  }

  const handleSubmit = (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault()

    if (!title.trim() || !date || !time) {
      return
    }

    if (editingActivityId !== null) {
      setActivities((currentActivities) => {
        const updatedActivities =
          currentActivities.map((activity) =>
            activity.id === editingActivityId
              ? {
                  ...activity,
                  title: title.trim(),
                  type,
                  date,
                  time,
                }
              : activity
          )

        saveActivities(updatedActivities)

        return updatedActivities
      })
    } else {
      const newActivity: AgendaItem = {
        id: Date.now(),
        title: title.trim(),
        type,
        date,
        time,
      }

      setActivities((currentActivities) => {
        const updatedActivities = [
          ...currentActivities,
          newActivity,
        ]

        saveActivities(updatedActivities)

        return updatedActivities
      })
    }

    setModalOpen(false)
    resetForm()
  }

  const deleteActivity = (
    activityId: number,
    activityTitle: string
  ) => {
    const confirmed = window.confirm(
      `¿Eliminar la actividad "${activityTitle}"?`
    )

    if (!confirmed) {
      return
    }

    setActivities((currentActivities) => {
      const updatedActivities =
        currentActivities.filter(
          (activity) =>
            activity.id !== activityId
        )

      saveActivities(updatedActivities)

      return updatedActivities
    })
  }

  return (
    <AppShell>
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
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#163DFF] px-4 text-xs font-semibold text-white shadow-[0_10px_25px_rgba(22,61,255,0.2)] transition hover:bg-[#3155ff]"
          >
            <Plus
              size={16}
              strokeWidth={2}
            />

            Nueva actividad
          </button>
        </header>

        <section className="overflow-hidden rounded-2xl border border-white/[0.06] bg-[#20232A]">
          <div className="flex items-center justify-between border-b border-white/[0.06] px-6 py-5">
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

            <CalendarDays
              size={19}
              className="text-[#7187ff]"
            />
          </div>

          {activities.length > 0 ? (
            <div className="divide-y divide-white/[0.05]">
              {activities.map((activity) => (
                <div
                  key={activity.id}
                  className="flex flex-col gap-4 px-6 py-5 transition hover:bg-white/[0.02] sm:flex-row sm:items-center"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#163DFF]/10 text-[#7187ff]">
                    <CalendarDays
                      size={18}
                      strokeWidth={1.8}
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-white">
                      {activity.title}
                    </p>

                    <p className="mt-1 text-xs text-[#646873]">
                      {activity.type}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-[#9CA3AF]">
                    <span>
                      {activity.date}
                    </span>

                    <span className="flex items-center gap-1.5">
                      <Clock3 size={13} />
                      {activity.time}
                    </span>

                    <button
                      type="button"
                      onClick={() =>
                        openEditModal(activity)
                      }
                      className="flex h-9 w-9 items-center justify-center rounded-lg text-[#646873] transition hover:bg-[#163DFF]/10 hover:text-[#7187ff]"
                      aria-label={`Editar ${activity.title}`}
                      title="Editar actividad"
                    >
                      <Pencil
                        size={15}
                        strokeWidth={1.8}
                      />
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        deleteActivity(
                          activity.id,
                          activity.title
                        )
                      }
                      className="flex h-9 w-9 items-center justify-center rounded-lg text-[#646873] transition hover:bg-red-500/10 hover:text-red-400"
                      aria-label={`Eliminar ${activity.title}`}
                      title="Eliminar actividad"
                    >
                      <Trash2
                        size={15}
                        strokeWidth={1.8}
                      />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex min-h-[360px] flex-col items-center justify-center px-6 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#163DFF]/10 text-[#7187ff]">
                <CalendarDays size={26} />
              </div>

              <h3 className="mt-5 text-base font-semibold text-white">
                No hay actividades
              </h3>

              <p className="mt-2 max-w-sm text-sm text-[#646873]">
                Crea una nueva actividad para comenzar a organizar la agenda.
              </p>
            </div>
          )}
        </section>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-white/[0.08] bg-[#20232A] shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/[0.06] px-6 py-5">
              <div>
                <h2 className="text-lg font-semibold text-white">
                  {editingActivityId !== null
                    ? 'Editar actividad'
                    : 'Nueva actividad'}
                </h2>

                <p className="mt-1 text-xs text-[#646873]">
                  {editingActivityId !== null
                    ? 'Actualiza los datos de la actividad'
                    : 'Agrega una actividad a la agenda de NEDVI'}
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-[#9CA3AF] transition hover:bg-white/[0.06] hover:text-white"
                aria-label="Cerrar ventana"
              >
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              className="space-y-5 p-6"
            >
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
                  onChange={(event) =>
                    setTitle(event.target.value)
                  }
                  placeholder="Ej. Visita de obra"
                  required
                  autoFocus
                  className="h-11 w-full rounded-xl border border-white/[0.08] bg-[#17181C] px-4 text-sm text-white outline-none transition placeholder:text-[#646873] focus:border-[#163DFF]"
                />
              </div>

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
                  onChange={(event) =>
                    setType(event.target.value)
                  }
                  className="h-11 w-full rounded-xl border border-white/[0.08] bg-[#17181C] px-4 text-sm text-white outline-none transition focus:border-[#163DFF]"
                >
                  <option value="Tarea">
                    Tarea
                  </option>

                  <option value="Reunión">
                    Reunión
                  </option>

                  <option value="Visita de obra">
                    Visita de obra
                  </option>

                  <option value="Cotización">
                    Cotización
                  </option>

                  <option value="Entrega">
                    Entrega
                  </option>

                  <option value="Otro">
                    Otro
                  </option>
                </select>
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
                    onChange={(event) =>
                      setDate(event.target.value)
                    }
                    required
                    className="h-11 w-full rounded-xl border border-white/[0.08] bg-[#17181C] px-4 text-sm text-white outline-none transition focus:border-[#163DFF]"
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
                    onChange={(event) =>
                      setTime(event.target.value)
                    }
                    required
                    className="h-11 w-full rounded-xl border border-white/[0.08] bg-[#17181C] px-4 text-sm text-white outline-none transition focus:border-[#163DFF]"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 border-t border-white/[0.06] pt-5">
                <button
                  type="button"
                  onClick={closeModal}
                  className="h-10 rounded-xl border border-white/[0.08] px-4 text-xs font-medium text-[#9CA3AF] transition hover:bg-white/[0.05] hover:text-white"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#163DFF] px-4 text-xs font-semibold text-white transition hover:bg-[#3155ff]"
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
      )}
    </AppShell>
  )
}