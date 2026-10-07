'use client'

import { useEffect, useState, type FormEvent } from 'react'
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  LoaderCircle,
  Pencil,
  Plus,
  RotateCcw,
  Trash2,
  X,
} from 'lucide-react'
import {
  createAgendaActivity,
  deleteAgendaActivity,
  migrateLocalAgendaIfNeeded,
  sortAgendaActivities,
  updateAgendaActivity,
  writeAgendaActivities,
  type AgendaItem,
  type AgendaStatus,
} from '@/features/agenda/services/agendaStorage'

type AgendaFilter = 'Todas' | AgendaStatus

const statusOptions: AgendaStatus[] = ['Pendiente', 'En progreso', 'Completada']
const filterOptions: AgendaFilter[] = ['Todas', ...statusOptions]

function getStatusClass(status: AgendaStatus) {
  if (status === 'Completada') {
    return 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300'
  }

  if (status === 'En progreso') {
    return 'border-[#5496CC]/30 bg-[#5496CC]/10 text-[#8ec5ef]'
  }

  return 'border-amber-400/20 bg-amber-400/10 text-amber-300'
}

export function AgendaWorkspace() {
  const [activities, setActivities] = useState<AgendaItem[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingActivityId, setEditingActivityId] = useState<number | null>(null)
  const [filter, setFilter] = useState<AgendaFilter>('Todas')

  const [title, setTitle] = useState('')
  const [type, setType] = useState('Tarea')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [status, setStatus] = useState<AgendaStatus>('Pendiente')

  useEffect(() => {
    let active = true

    async function loadActivities() {
      try {
        setLoading(true)
        setErrorMessage('')
        const items = await migrateLocalAgendaIfNeeded()
        if (active) setActivities(sortAgendaActivities(items))
      } catch (error) {
        console.error('Error al cargar la agenda:', error)
        if (active) {
          setErrorMessage('No pudimos cargar tus actividades. Intenta de nuevo.')
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    void loadActivities()

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (!modalOpen) return

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeModal()
    }

    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [modalOpen])

  function syncActivities(updated: AgendaItem[]) {
    const sorted = sortAgendaActivities(updated)
    setActivities(sorted)
    writeAgendaActivities(sorted)
  }

  function resetForm() {
    setTitle('')
    setType('Tarea')
    setDate('')
    setTime('')
    setStatus('Pendiente')
    setEditingActivityId(null)
  }

  function closeModal() {
    setModalOpen(false)
    resetForm()
  }

  function openCreateModal() {
    resetForm()
    setModalOpen(true)
  }

  function openEditModal(activity: AgendaItem) {
    setEditingActivityId(activity.id)
    setTitle(activity.title)
    setType(activity.type)
    setDate(activity.date)
    setTime(activity.time)
    setStatus(activity.status)
    setModalOpen(true)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!title.trim() || !date || !time || saving) return

    setSaving(true)
    setErrorMessage('')

    try {
      if (editingActivityId !== null) {
        const current = activities.find((item) => item.id === editingActivityId)
        if (!current) throw new Error('No encontramos la actividad a editar.')

        const updated = await updateAgendaActivity({
          ...current,
          title: title.trim(),
          type,
          date,
          time,
          status,
        })

        syncActivities(
          activities.map((item) => (item.id === updated.id ? updated : item))
        )
      } else {
        const created = await createAgendaActivity({
          title: title.trim(),
          type,
          date,
          time,
          status,
        })

        syncActivities([...activities, created])
      }

      closeModal()
    } catch (error) {
      console.error('Error guardando actividad:', error)
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'No pudimos guardar la actividad.'
      )
    } finally {
      setSaving(false)
    }
  }

  async function deleteActivity(activity: AgendaItem) {
    const confirmed = window.confirm(
      `¿Eliminar la actividad "${activity.title}"?`
    )
    if (!confirmed) return

    try {
      setErrorMessage('')
      await deleteAgendaActivity(activity.id)
      syncActivities(activities.filter((item) => item.id !== activity.id))
    } catch (error) {
      console.error('Error eliminando actividad:', error)
      setErrorMessage('No pudimos eliminar la actividad.')
    }
  }

  async function toggleCompleted(activity: AgendaItem) {
    const nextStatus: AgendaStatus =
      activity.status === 'Completada' ? 'Pendiente' : 'Completada'

    try {
      setErrorMessage('')
      const updated = await updateAgendaActivity({
        ...activity,
        status: nextStatus,
      })
      syncActivities(
        activities.map((item) => (item.id === updated.id ? updated : item))
      )
    } catch (error) {
      console.error('Error actualizando actividad:', error)
      setErrorMessage('No pudimos actualizar el estado de la actividad.')
    }
  }

  const sortedActivities = sortAgendaActivities(activities)
  const visibleActivities = sortedActivities.filter((activity) =>
    filter === 'Todas' ? true : activity.status === filter
  )

  const counts: Record<AgendaFilter, number> = {
    Todas: activities.length,
    Pendiente: activities.filter((activity) => activity.status === 'Pendiente').length,
    'En progreso': activities.filter((activity) => activity.status === 'En progreso').length,
    Completada: activities.filter((activity) => activity.status === 'Completada').length,
  }

  return (
    <div className="relative mx-auto w-full max-w-[1600px] space-y-8 overflow-hidden rounded-[28px] border border-[#5496CC]/15 bg-[radial-gradient(circle_at_top_left,rgba(84,150,204,0.16),transparent_34%),linear-gradient(145deg,rgba(13,30,48,0.98),rgba(31,41,55,0.96)_48%,rgba(17,24,39,0.98))] p-4 shadow-[0_30px_80px_rgba(2,12,27,0.35)] sm:p-6 lg:p-8">
      <div className="pointer-events-none absolute inset-0 opacity-[0.08] [background-image:linear-gradient(rgba(255,255,255,.3)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.3)_1px,transparent_1px)] [background-size:32px_32px]" />

      <header className="relative z-10 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8ec5ef]">
            Organización
          </p>

          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-white sm:text-4xl">
            Actividades
          </h1>

          <p className="mt-2 text-sm text-[#b6c4d3]">
            Organiza tareas, visitas, reuniones y actividades de NEDVI
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#5496CC] px-4 text-xs font-semibold text-white shadow-[0_12px_30px_rgba(84,150,204,0.28)] transition hover:bg-[#6aa9dc] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#5496CC]/30"
        >
          <Plus size={16} strokeWidth={2} />
          Nueva actividad
        </button>
      </header>

      {errorMessage ? (
        <div className="relative z-10 rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {errorMessage}
        </div>
      ) : null}

      <section className="relative z-10 overflow-hidden rounded-2xl border border-white/[0.08] bg-[#172331]/90 shadow-[0_20px_60px_rgba(0,0,0,0.2)] backdrop-blur-xl">
        <div className="border-b border-white/[0.07] bg-[linear-gradient(90deg,rgba(84,150,204,0.14),rgba(255,255,255,0.02))] px-5 py-5 sm:px-6">
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
            <div>
              <h2 className="text-sm font-semibold text-white">Próximas actividades</h2>
              <p className="mt-1 text-xs text-[#8da0b4]">
                {activities.length} {activities.length === 1 ? 'actividad programada' : 'actividades programadas'}
              </p>
            </div>

            <div className="flex flex-wrap gap-2" aria-label="Filtrar actividades por estado">
              {filterOptions.map((option) => {
                const active = filter === option
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setFilter(option)}
                    aria-pressed={active}
                    className={`inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-[11px] font-medium transition ${
                      active
                        ? 'border-[#5496CC]/50 bg-[#5496CC]/20 text-white'
                        : 'border-white/[0.08] bg-[#101923]/70 text-[#a9b6c5] hover:border-white/[0.14] hover:text-white'
                    }`}
                  >
                    {option}
                    <span className="rounded-md bg-white/[0.06] px-1.5 py-0.5 text-[9px] text-[#b8c4d0]">
                      {counts[option]}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex min-h-[320px] items-center justify-center">
            <div className="flex items-center gap-3 text-sm text-[#b6c4d3]">
              <LoaderCircle size={20} className="animate-spin text-[#5496CC]" />
              Cargando actividades...
            </div>
          </div>
        ) : visibleActivities.length > 0 ? (
          <div className="divide-y divide-white/[0.05]">
            {visibleActivities.map((activity) => (
              <div
                key={activity.id}
                className={`flex flex-col gap-4 px-5 py-5 transition hover:bg-[#5496CC]/[0.05] sm:px-6 lg:flex-row lg:items-center ${
                  activity.status === 'Completada' ? 'opacity-70' : ''
                }`}
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#5496CC]/15 text-[#8ec5ef] ring-1 ring-[#5496CC]/20">
                  <CalendarDays size={18} strokeWidth={1.8} />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className={`truncate text-sm font-medium ${
                      activity.status === 'Completada'
                        ? 'text-[#8fa1b4] line-through'
                        : 'text-white'
                    }`}>
                      {activity.title}
                    </p>
                    <span className={`rounded-full border px-2 py-0.5 text-[9px] font-semibold ${getStatusClass(activity.status)}`}>
                      {activity.status}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-[#7f93a8]">{activity.type}</p>
                </div>

                <div className="flex flex-wrap items-center gap-3 text-xs text-[#a9b6c5]">
                  <span>{activity.date}</span>
                  <span className="flex items-center gap-1.5">
                    <Clock3 size={13} />
                    {activity.time}
                  </span>

                  <button
                    type="button"
                    onClick={() => void toggleCompleted(activity)}
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-[#8fa1b4] transition hover:bg-emerald-400/10 hover:text-emerald-300"
                    title={activity.status === 'Completada' ? 'Reabrir actividad' : 'Marcar como completada'}
                  >
                    {activity.status === 'Completada' ? <RotateCcw size={15} /> : <CheckCircle2 size={15} />}
                  </button>

                  <button
                    type="button"
                    onClick={() => openEditModal(activity)}
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-[#8fa1b4] transition hover:bg-[#5496CC]/10 hover:text-[#8ec5ef]"
                    title="Editar actividad"
                  >
                    <Pencil size={15} />
                  </button>

                  <button
                    type="button"
                    onClick={() => void deleteActivity(activity)}
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-[#8fa1b4] transition hover:bg-red-500/10 hover:text-red-400"
                    title="Eliminar actividad"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex min-h-[320px] flex-col items-center justify-center px-6 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#5496CC]/12 text-[#8ec5ef]">
              <CalendarDays size={26} />
            </div>
            <h3 className="mt-5 text-base font-semibold text-white">No hay actividades en este estado</h3>
            <p className="mt-2 max-w-sm text-sm text-[#7f93a8]">
              Cambia el filtro o crea una nueva actividad para continuar.
            </p>
          </div>
        )}
      </section>

      {modalOpen ? (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#07111c]/80 p-4 backdrop-blur-md"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) closeModal()
          }}
        >
          <div
            className="w-full max-w-lg overflow-hidden rounded-2xl border border-[#5496CC]/20 bg-[#152331] shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="agenda-modal-title"
          >
            <div className="flex items-center justify-between border-b border-white/[0.07] bg-[#5496CC]/[0.06] px-6 py-5">
              <div>
                <h2 id="agenda-modal-title" className="text-lg font-semibold text-white">
                  {editingActivityId !== null ? 'Editar actividad' : 'Nueva actividad'}
                </h2>
                <p className="mt-1 text-xs text-[#8397aa]">
                  {editingActivityId !== null
                    ? 'Actualiza los datos y el estado de la actividad'
                    : 'Agrega una actividad a la agenda de NEDVI'}
                </p>
              </div>
              <button type="button" onClick={closeModal} className="flex h-9 w-9 items-center justify-center rounded-lg text-[#9fb0c0] hover:bg-white/[0.06] hover:text-white">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5 p-6">
              <div>
                <label htmlFor="activity-title" className="mb-2 block text-xs font-medium text-[#a9b6c5]">
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
                  className="h-11 w-full rounded-xl border border-white/[0.08] bg-[#0f1924] px-4 text-sm text-white outline-none placeholder:text-[#607286] focus:border-[#5496CC] focus:ring-2 focus:ring-[#5496CC]/20"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="activity-type" className="mb-2 block text-xs font-medium text-[#a9b6c5]">Tipo de actividad</label>
                  <select id="activity-type" value={type} onChange={(event) => setType(event.target.value)} className="h-11 w-full rounded-xl border border-white/[0.08] bg-[#0f1924] px-4 text-sm text-white outline-none focus:border-[#5496CC]">
                    <option value="Tarea">Tarea</option>
                    <option value="Reunión">Reunión</option>
                    <option value="Visita de obra">Visita de obra</option>
                    <option value="Cotización">Cotización</option>
                    <option value="Entrega">Entrega</option>
                    <option value="Otro">Otro</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="activity-status" className="mb-2 block text-xs font-medium text-[#a9b6c5]">Estado</label>
                  <select id="activity-status" value={status} onChange={(event) => setStatus(event.target.value as AgendaStatus)} className="h-11 w-full rounded-xl border border-white/[0.08] bg-[#0f1924] px-4 text-sm text-white outline-none focus:border-[#5496CC]">
                    {statusOptions.map((option) => <option value={option} key={option}>{option}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="activity-date" className="mb-2 block text-xs font-medium text-[#a9b6c5]">Fecha</label>
                  <input id="activity-date" type="date" value={date} onChange={(event) => setDate(event.target.value)} required className="h-11 w-full rounded-xl border border-white/[0.08] bg-[#0f1924] px-4 text-sm text-white outline-none focus:border-[#5496CC]" />
                </div>
                <div>
                  <label htmlFor="activity-time" className="mb-2 block text-xs font-medium text-[#a9b6c5]">Hora</label>
                  <input id="activity-time" type="time" value={time} onChange={(event) => setTime(event.target.value)} required className="h-11 w-full rounded-xl border border-white/[0.08] bg-[#0f1924] px-4 text-sm text-white outline-none focus:border-[#5496CC]" />
                </div>
              </div>

              <div className="flex justify-end gap-3 border-t border-white/[0.07] pt-5">
                <button type="button" onClick={closeModal} className="h-10 rounded-xl border border-white/[0.08] px-4 text-xs font-medium text-[#a9b6c5] hover:bg-white/[0.05] hover:text-white">
                  Cancelar
                </button>
                <button type="submit" disabled={saving} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#5496CC] px-4 text-xs font-semibold text-white transition hover:bg-[#6aa9dc] disabled:cursor-wait disabled:opacity-60">
                  {saving ? <LoaderCircle size={15} className="animate-spin" /> : editingActivityId !== null ? <Pencil size={15} /> : <Plus size={15} />}
                  {saving ? 'Guardando...' : editingActivityId !== null ? 'Guardar cambios' : 'Crear actividad'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  )
}
