'use client'

import { useEffect, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Save } from 'lucide-react'
import { projectStatuses, projectTypes } from '@/features/projects/types/project'
import { getProjectStatusLabel, getProjectTypeLabel } from '@/features/projects/utils/projectUtils'
import type { Project, ProjectFormValues, ProjectStatus, ProjectType } from '@/features/projects/types/project'
import {
  createProjectInSupabase,
  getProjectCustomersFromSupabase,
  updateProjectInSupabase,
  type ProjectCustomerOption,
} from '@/features/projects/services/projectSupabase'

type ProjectFormProps = {
  initialValues?: Partial<Project>
  mode: 'create' | 'edit'
  projectId?: string
}

const inputClassName = 'mt-2 h-11 w-full rounded-xl border border-white/[0.08] bg-[#17181C] px-3.5 text-sm text-white outline-none transition placeholder:text-[#646873] hover:border-white/[0.15] focus:border-[#163DFF] focus:ring-4 focus:ring-[#163DFF]/10'
const labelClassName = 'text-[11px] font-semibold uppercase tracking-[0.12em] text-[#9CA3AF]'

export function ProjectForm({ initialValues, mode, projectId }: ProjectFormProps) {
  const router = useRouter()
  const [customers, setCustomers] = useState<ProjectCustomerOption[]>([])
  const [loadingCustomers, setLoadingCustomers] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    async function loadCustomers() {
      try {
        const data = await getProjectCustomersFromSupabase()
        if (active) setCustomers(data)
      } catch (loadError) {
        if (active) setError(loadError instanceof Error ? loadError.message : 'No se pudieron cargar los clientes.')
      } finally {
        if (active) setLoadingCustomers(false)
      }
    }

    void loadCustomers()
    return () => { active = false }
  }, [])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
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

    const customerId = String(formData.get('customerId') ?? '').trim()
    if (!customerId) {
      setError('Selecciona el cliente relacionado con este proyecto.')
      return
    }

    const values: ProjectFormValues = {
      name: String(formData.get('name') ?? '').trim(),
      customerId,
      projectType,
      address: String(formData.get('address') ?? '').trim(),
      latitude: Number(formData.get('latitude') || 0),
      longitude: Number(formData.get('longitude') || 0),
      budget: Number(formData.get('budget') || 0),
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
          ? await createProjectInSupabase(values)
          : projectId
            ? await updateProjectInSupabase(projectId, values)
            : undefined

      if (!project) {
        setError('No se pudo guardar el proyecto en Supabase.')
        return
      }

      router.push('/projects/' + project.id)
      router.refresh()
    } catch (submitError) {
      console.error('Error al guardar proyecto en Supabase:', submitError)
      setError(submitError instanceof Error ? submitError.message : 'No se pudo guardar el proyecto.')
    } finally {
      setSaving(false)
    }
  }

  return <form className="space-y-7" onSubmit={handleSubmit}>
    <div className="space-y-5">
      <div>
        <h2 className="text-sm font-semibold text-white">Información del proyecto</h2>
        <p className="mt-1 text-xs text-[#646873]">Define el alcance y los responsables principales de este proyecto.</p>
      </div>
      <div className="grid gap-5 md:grid-cols-2">
        <label className={labelClassName}>Nombre del proyecto<input name="name" required defaultValue={initialValues?.name} placeholder="Ej. Torre Litoral" className={inputClassName} /></label>
        <label className={labelClassName}>Cliente<select name="customerId" required defaultValue={initialValues?.customerId ?? ''} className={inputClassName} disabled={loadingCustomers}><option value="">{loadingCustomers ? 'Cargando clientes...' : 'Seleccionar cliente'}</option>{customers.map((customer) => <option value={customer.id} key={customer.id}>{customer.company}{customer.folio ? ' · ' + customer.folio : ''}</option>)}</select></label>
        <label className={labelClassName}>Tipo de proyecto<select name="projectType" required defaultValue={initialValues?.projectType ?? ''} className={inputClassName}><option value="">Seleccionar tipo de proyecto</option>{projectTypes.map((type) => <option value={type} key={type}>{getProjectTypeLabel(type)}</option>)}</select></label>
        <label className={labelClassName + ' md:col-span-2'}>Dirección<input name="address" defaultValue={initialValues?.address} placeholder="Calle, ciudad, estado" className={inputClassName} /></label>
        <label className={labelClassName}>Latitud<input name="latitude" type="number" step="any" defaultValue={initialValues?.latitude} placeholder="20.6742" className={inputClassName} /></label>
        <label className={labelClassName}>Longitud<input name="longitude" type="number" step="any" defaultValue={initialValues?.longitude} placeholder="-103.3848" className={inputClassName} /></label>
      </div>
    </div>

    <div className="space-y-5 border-t border-white/[0.06] pt-7">
      <div><h2 className="text-sm font-semibold text-white">Calendario y responsables</h2><p className="mt-1 text-xs text-[#646873]">Mantén visibles las fechas, el presupuesto y los responsables desde el primer día.</p></div>
      <div className="grid gap-5 md:grid-cols-2">
        <label className={labelClassName}>Presupuesto<input name="budget" type="number" min="0" defaultValue={initialValues?.budget} placeholder="0" className={inputClassName} /></label>
        <label className={labelClassName}>Responsable del proyecto<input name="manager" defaultValue={initialValues?.manager} placeholder="Responsable del proyecto" className={inputClassName} /></label>
        <label className={labelClassName}>Fecha de inicio<input name="startDate" type="date" defaultValue={initialValues?.startDate} className={inputClassName} /></label>
        <label className={labelClassName}>Finalización estimada<input name="estimatedCompletion" type="date" defaultValue={initialValues?.estimatedCompletion} className={inputClassName} /></label>
        <label className={labelClassName}>Estado<select name="status" defaultValue={initialValues?.status ?? 'Planning'} className={inputClassName}>{projectStatuses.map((statusOption) => <option value={statusOption} key={statusOption}>{getProjectStatusLabel(statusOption)}</option>)}</select></label>
        <label className={labelClassName + ' md:col-span-2'}>Descripción<textarea name="description" rows={4} defaultValue={initialValues?.description} placeholder="Describe el alcance, la estrategia de ejecución y las restricciones principales..." className={inputClassName + ' h-auto resize-y py-3'} /></label>
      </div>
    </div>

    {error ? <p className="rounded-xl border border-red-400/20 bg-red-400/[0.08] px-4 py-3 text-xs text-red-200" role="alert">{error}</p> : null}

    <div className="flex flex-col-reverse items-stretch justify-between gap-4 border-t border-white/[0.06] pt-6 sm:flex-row sm:items-center">
      <p className="text-xs leading-5 text-[#646873]">Los cambios se guardan directamente en Supabase y quedan ligados al cliente seleccionado.</p>
      <div className="flex justify-end gap-3">
        <Link href={mode === 'edit' && projectId ? '/projects/' + projectId : '/projects'} className="inline-flex h-11 items-center justify-center rounded-xl px-4 text-xs font-semibold text-[#9CA3AF] transition hover:bg-white/[0.05] hover:text-white">Cancelar</Link>
        <button type="submit" disabled={saving || loadingCustomers} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#163DFF] px-4 text-xs font-semibold text-white shadow-[0_10px_25px_rgba(22,61,255,0.2)] transition hover:bg-[#3155ff] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#163DFF]/30 disabled:cursor-wait disabled:opacity-60"><Save size={15} />{saving ? 'Guardando en Supabase...' : mode === 'create' ? 'Crear proyecto' : 'Guardar cambios'}</button>
      </div>
    </div>
  </form>
}
