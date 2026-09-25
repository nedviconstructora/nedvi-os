'use client'

import Link from 'next/link'
import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Save } from 'lucide-react'
import {
  createCustomer,
  updateCustomer,
} from '@/features/crm/services/customerStorage'
import type {
  CustomerFormValues,
  CustomerStatus,
  LeadSource,
  ProjectType,
} from '@/features/crm/types/customer'
import {
  customerStatuses,
  leadSources,
  projectTypes,
} from '@/features/crm/types/customer'
import { getCustomerStatusLabel } from '@/features/crm/utils/customerUtils'

type CustomerFormProps = {
  initialValues?: Partial<CustomerFormValues>
  mode: 'create' | 'edit'
  customerId?: string
}

const inputClassName =
  'mt-2 h-11 w-full rounded-xl border border-white/[0.08] bg-[#17181C] px-3.5 text-sm text-white outline-none transition placeholder:text-[#646873] hover:border-white/[0.15] focus:border-[#163DFF] focus:ring-4 focus:ring-[#163DFF]/10'

const labelClassName =
  'text-[11px] font-semibold uppercase tracking-[0.12em] text-[#9CA3AF]'

export function CustomerForm({
  initialValues,
  mode,
  customerId,
}: CustomerFormProps) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)

    const formData = new FormData(event.currentTarget)
    const projectType = String(formData.get('projectType') ?? '') as ProjectType
    const leadSource = String(formData.get('leadSource') ?? '') as LeadSource
    const status = String(formData.get('status') ?? 'Lead') as CustomerStatus

    if (!projectTypes.includes(projectType) || !leadSources.includes(leadSource)) {
      setError('Selecciona un tipo de proyecto y un origen del prospecto válidos.')
      return
    }

    const values: CustomerFormValues = {
      company: String(formData.get('company') ?? '').trim(),
      contact: String(formData.get('contact') ?? '').trim(),
      phone: String(formData.get('phone') ?? '').trim(),
      email: String(formData.get('email') ?? '').trim(),
      address: String(formData.get('address') ?? '').trim(),
      rfc: String(formData.get('rfc') ?? '').trim(),
      projectType,
      leadSource,
      status,
      assignedSalesperson: String(formData.get('assignedSalesperson') ?? '').trim(),
      notes: String(formData.get('notes') ?? '').trim(),
    }

    setSaving(true)

    try {
      const customer =
        mode === 'create'
          ? createCustomer(values)
          : customerId
            ? updateCustomer(customerId, values)
            : undefined

      if (!customer) {
        setError('No se pudo guardar el cliente. Actualiza la página e inténtalo de nuevo.')
        setSaving(false)
        return
      }

      router.push(`/crm/${customer.id}`)
      router.refresh()
    } catch (submitError) {
      console.error('Error al guardar el cliente:', submitError)
      setError('Ocurrió un error al guardar el cliente.')
      setSaving(false)
    }
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <div className="grid gap-5 md:grid-cols-2">
        <label className={labelClassName}>Empresa<input name="company" required defaultValue={initialValues?.company} placeholder="Ej. Grupo Arista Desarrollos" className={inputClassName} /></label>
        <label className={labelClassName}>Contacto principal<input name="contact" required defaultValue={initialValues?.contact} placeholder="Nombre del contacto principal" className={inputClassName} /></label>
        <label className={labelClassName}>Teléfono<input name="phone" type="tel" required defaultValue={initialValues?.phone} placeholder="+52 55 0000 0000" className={inputClassName} /></label>
        <label className={labelClassName}>Correo electrónico<input name="email" type="email" required defaultValue={initialValues?.email} placeholder="contacto@empresa.com" className={inputClassName} /></label>
        <label className={labelClassName}>RFC<input name="rfc" defaultValue={initialValues?.rfc} placeholder="GAD180426KQ2" className={inputClassName} /></label>
        <label className={labelClassName}>Responsable comercial<select name="assignedSalesperson" defaultValue={initialValues?.assignedSalesperson} className={inputClassName}><option value="">Seleccionar responsable</option><option>Ana Ruiz</option><option>Carlos Méndez</option><option>Lucía Castillo</option><option>Miguel García</option></select></label>
        <label className={`${labelClassName} md:col-span-2`}>Dirección<input name="address" defaultValue={initialValues?.address} placeholder="Calle, colonia, ciudad y estado" className={inputClassName} /></label>
        <label className={labelClassName}>Tipo de proyecto<select name="projectType" required defaultValue={initialValues?.projectType ?? ''} className={inputClassName}><option value="">Seleccionar tipo de proyecto</option>{projectTypes.map((type) => <option value={type} key={type}>{type}</option>)}</select></label>
        <label className={labelClassName}>Origen del prospecto<select name="leadSource" required defaultValue={initialValues?.leadSource ?? ''} className={inputClassName}><option value="">Seleccionar origen</option>{leadSources.map((source) => <option value={source} key={source}>{source}</option>)}</select></label>
        <label className={labelClassName}>Estado<select name="status" defaultValue={initialValues?.status ?? 'Lead'} className={inputClassName}>{customerStatuses.map((statusOption) => <option value={statusOption} key={statusOption}>{getCustomerStatusLabel(statusOption)}</option>)}</select></label>
        <label className={`${labelClassName} md:col-span-2`}>Notas<textarea name="notes" defaultValue={initialValues?.notes} rows={4} placeholder="Agrega contexto útil para el equipo comercial..." className={`${inputClassName} h-auto resize-y py-3`} /></label>
      </div>

      {error ? <p className="rounded-xl border border-red-400/20 bg-red-400/[0.08] px-4 py-3 text-xs text-red-200" role="alert">{error}</p> : null}

      <div className="flex flex-col-reverse items-stretch justify-between gap-4 border-t border-white/[0.06] pt-6 sm:flex-row sm:items-center">
        <p className="text-xs leading-5 text-[#646873]">Los cambios se guardan en este dispositivo mientras conectamos la base de datos central de NEDVI OS.</p>
        <div className="flex items-center justify-end gap-3">
          <Link href={mode === 'edit' && customerId ? `/crm/${customerId}` : '/crm'} className="inline-flex h-11 items-center justify-center rounded-xl px-4 text-xs font-semibold text-[#9CA3AF] transition hover:bg-white/[0.05] hover:text-white">Cancelar</Link>
          <button type="submit" disabled={saving} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#163DFF] px-4 text-xs font-semibold text-white shadow-[0_10px_25px_rgba(22,61,255,0.2)] transition hover:bg-[#3155ff] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#163DFF]/30 disabled:cursor-wait disabled:opacity-60"><Save size={15} />{saving ? 'Guardando...' : mode === 'create' ? 'Crear cliente' : 'Guardar cambios'}</button>
        </div>
      </div>
    </form>
  )
}
