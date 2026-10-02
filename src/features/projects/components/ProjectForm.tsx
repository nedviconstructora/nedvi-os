'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { ExternalLink, Save } from 'lucide-react'
import { readCustomers } from '@/features/crm/services/customerStorage'
import type { Customer } from '@/features/crm/types/customer'
import {
  createProject,
  updateProject,
} from '@/features/projects/services/projectStorage'
import {
  projectStatuses,
  projectTypes,
  type ProjectFormValues,
  type ProjectStatus,
  type ProjectType,
} from '@/features/projects/types/project'

type ProjectFormProps = {
  initialValues?: Partial<ProjectFormValues>
  mode: 'create' | 'edit'
  projectId?: string
}

const inputClassName =
  'mt-2 h-11 w-full rounded-xl border border-white/[0.08] bg-[#17181C] px-3.5 text-sm text-white outline-none transition placeholder:text-[#646873] hover:border-white/[0.15] focus:border-[#163DFF] focus:ring-4 focus:ring-[#163DFF]/10'

const labelClassName =
  'text-[11px] font-semibold uppercase tracking-[0.12em] text-[#9CA3AF]'

const projectTypeLabels: Record<ProjectType, string> = {
  Residential: 'Residencial',
  Commercial: 'Comercial',
  Industrial: 'Industrial',
  Infrastructure: 'Infraestructura',
  Renovation: 'Remodelación',
}

const projectStatusLabels: Record<ProjectStatus, string> = {
  Planning: 'Planeación',
  Active: 'Activo',
  'At Risk': 'En riesgo',
  Completed: 'Completado',
  'On Hold': 'En pausa',
}

export function ProjectForm({
  initialValues,
  mode,
  projectId,
}: ProjectFormProps) {
  const router = useRouter()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [selectedClientId, setSelectedClientId] = useState(
    initialValues?.clientId ?? ''
  )
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const availableCustomers = readCustomers()
    setCustomers(availableCustomers)

    if (!initialValues?.clientId && initialValues?.client) {
      const matchingCustomer = availableCustomers.find(
        (customer) => customer.company === initialValues.client
      )

      if (matchingCustomer) {
        setSelectedClientId(matchingCustomer.id)
      }
    }
  }, [initialValues?.client, initialValues?.clientId])

  const selectedCustomer = useMemo(
    () => customers.find((customer) => customer.id === selectedClientId),
    [customers, selectedClientId]
  )

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)

    const formData = new FormData(event.currentTarget)
    const projectType = String(formData.get('projectType') ?? '') as ProjectType
    const status = String(formData.get('status') ?? 'Planning') as ProjectStatus

    if (!projectTypes.includes(projectType)) {
      setError('Selecciona un tipo de proyecto válido.')
      return
    }

    if (!projectStatuses.includes(status)) {
      setError('Selecciona un estado válido.')
      return
    }

    const customer =
      customers.find((item) => item.id === selectedClientId) ?? null

    const client = customer?.company ?? initialValues?.client ?? ''
    const clientContact = customer?.contact ?? initialValues?.clientContact ?? ''

    if (!client.trim()) {
      setError('Selecciona un cliente del CRM para continuar.')
      return
    }

    const values: ProjectFormValues = {
      name: String(formData.get('name') ?? '').trim(),
      clientId: customer?.id,
      client,
      clientContact,
      projectType,
      address: String(formData.get('address') ?? '').trim(),
      latitude: Number(formData.get('latitude') ?? 0),
      longitude: Number(formData.get('longitude') ?? 0),
      budget: Number(formData.get('budget') ?? 0),
      startDate: String(formData.get('startDate') ?? ''),
      estimatedCompletion: String(formData.get('estimatedCompletion') ?? ''),
      manager: String(formData.get('manager') ?? '').trim(),
      status,
      description: String(formData.get('description') ?? '').trim(),
    }

    setSaving(true)

    try {
      const project =
        mode === 'create'
          ? createProject(values)
          : projectId
            ? updateProject(projectId, values)
            : undefined

      if (!project) {
        setError('No se pudo guardar el proyecto. Actualiza la página e inténtalo de nuevo.')
        setSaving(false)
        return
      }

      router.push(`/projects/${project.id}`)
      router.refresh()
    } catch (submitError) {
      console.error('Error al guardar el proyecto:', submitError)
      setError('Ocurrió un error al guardar el proyecto.')
      setSaving(false)
    }
  }

  return (
    <form className="space-y-7" onSubmit={handleSubmit}>
      <div className="space-y-5">
        <div>
          <h2 className="text-sm font-semibold text-white">Información del proyecto</h2>
          <p className="mt-1 text-xs text-[#646873]">
            Define el alcance principal y vincula el proyecto con un cliente del CRM.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <label className={labelClassName}>
            Nombre del proyecto
            <input
              name="name"
              required
              defaultValue={initialValues?.name}
              placeholder="Ej. Torre Litoral"
              className={inputClassName}
            />
          </label>

          <label className={labelClassName}>
            Cliente del CRM
            <select
              value={selectedClientId}
              onChange={(event) => setSelectedClientId(event.target.value)}
              required={mode === 'create'}
              className={inputClassName}
            >
              <option value="">
                {mode === 'edit' && initialValues?.client
                  ? `Mantener: ${initialValues.client}`
                  : 'Seleccionar cliente'}
              </option>
              {customers.map((customer) => (
                <option value={customer.id} key={customer.id}>
                  {customer.company} — {customer.contact}
                </option>
              ))}
            </select>
          </label>

          <div className="rounded-xl border border-white/[0.06] bg-[#17181C] p-4 md:col-span-2">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#646873]">
                  Contacto vinculado
                </p>
                <p className="mt-1 text-sm font-medium text-white">
                  {selectedCustomer?.contact ?? initialValues?.clientContact ?? 'Sin contacto seleccionado'}
                </p>
                <p className="mt-1 text-xs text-[#646873]">
                  {selectedCustomer?.email ?? 'Selecciona un cliente para cargar sus datos del CRM.'}
                </p>
              </div>

              {selectedCustomer ? (
                <Link
                  href={`/crm/${selectedCustomer.id}`}
                  className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-white/[0.08] px-3 text-xs font-medium text-[#9CA3AF] transition hover:bg-white/[0.05] hover:text-white"
                >
                  Ver cliente
                  <ExternalLink size={13} />
                </Link>
              ) : null}
            </div>
          </div>

          <label className={labelClassName}>
            Tipo de proyecto
            <select
              name="projectType"
              required
              defaultValue={initialValues?.projectType ?? ''}
              className={inputClassName}
            >
              <option value="">Seleccionar tipo de proyecto</option>
              {projectTypes.map((type) => (
                <option value={type} key={type}>
                  {projectTypeLabels[type]}
                </option>
              ))}
            </select>
          </label>

          <label className={`${labelClassName} md:col-span-2`}>
            Dirección de la obra
            <input
              name="address"
              defaultValue={initialValues?.address}
              placeholder="Calle, ciudad y estado"
              className={inputClassName}
            />
          </label>

          <label className={labelClassName}>
            Latitud
            <input
              name="latitude"
              type="number"
              step="any"
              defaultValue={initialValues?.latitude}
              placeholder="20.6742"
              className={inputClassName}
            />
          </label>

          <label className={labelClassName}>
            Longitud
            <input
              name="longitude"
              type="number"
              step="any"
              defaultValue={initialValues?.longitude}
              placeholder="-103.3848"
              className={inputClassName}
            />
          </label>
        </div>
      </div>

      <div className="space-y-5 border-t border-white/[0.06] pt-7">
        <div>
          <h2 className="text-sm font-semibold text-white">Calendario y responsables</h2>
          <p className="mt-1 text-xs text-[#646873]">
            Mantén visibles presupuesto, fechas y responsabilidad desde el inicio.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <label className={labelClassName}>
            Presupuesto
            <input
              name="budget"
              type="number"
              min="0"
              defaultValue={initialValues?.budget}
              placeholder="0"
              className={inputClassName}
            />
          </label>

          <label className={labelClassName}>
            Responsable del proyecto
            <select
              name="manager"
              defaultValue={initialValues?.manager}
              className={inputClassName}
            >
              <option value="">Seleccionar responsable</option>
              <option>Javier Moreno</option>
              <option>Ana Ruiz</option>
              <option>Carlos Méndez</option>
              <option>Lucía Castillo</option>
              <option>Miguel García</option>
            </select>
          </label>

          <label className={labelClassName}>
            Fecha de inicio
            <input
              name="startDate"
              type="date"
              defaultValue={initialValues?.startDate}
              className={inputClassName}
            />
          </label>

          <label className={labelClassName}>
            Terminación estimada
            <input
              name="estimatedCompletion"
              type="date"
              defaultValue={initialValues?.estimatedCompletion}
              className={inputClassName}
            />
          </label>

          <label className={labelClassName}>
            Estado
            <select
              name="status"
              defaultValue={initialValues?.status ?? 'Planning'}
              className={inputClassName}
            >
              {projectStatuses.map((status) => (
                <option value={status} key={status}>
                  {projectStatusLabels[status]}
                </option>
              ))}
            </select>
          </label>

          <label className={`${labelClassName} md:col-span-2`}>
            Descripción
            <textarea
              name="description"
              rows={4}
              defaultValue={initialValues?.description}
              placeholder="Describe alcance, estrategia de ejecución y restricciones clave..."
              className={`${inputClassName} h-auto resize-y py-3`}
            />
          </label>
        </div>
      </div>

      {error ? (
        <p
          className="rounded-xl border border-red-400/20 bg-red-400/[0.08] px-4 py-3 text-xs text-red-200"
          role="alert"
        >
          {error}
        </p>
      ) : null}

      <div className="flex flex-col-reverse items-stretch justify-between gap-4 border-t border-white/[0.06] pt-6 sm:flex-row sm:items-center">
        <p className="text-xs leading-5 text-[#646873]">
          Los proyectos se guardan en este dispositivo y quedan vinculados con los clientes del CRM.
        </p>

        <div className="flex justify-end gap-3">
          <Link
            href={mode === 'edit' && projectId ? `/projects/${projectId}` : '/projects'}
            className="inline-flex h-11 items-center justify-center rounded-xl px-4 text-xs font-semibold text-[#9CA3AF] transition hover:bg-white/[0.05] hover:text-white"
          >
            Cancelar
          </Link>

          <button
            type="submit"
            disabled={saving}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#163DFF] px-4 text-xs font-semibold text-white shadow-[0_10px_25px_rgba(22,61,255,0.2)] transition hover:bg-[#3155ff] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#163DFF]/30 disabled:cursor-wait disabled:opacity-60"
          >
            <Save size={15} />
            {saving
              ? 'Guardando...'
              : mode === 'create'
                ? 'Crear proyecto'
                : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </form>
  )
}
