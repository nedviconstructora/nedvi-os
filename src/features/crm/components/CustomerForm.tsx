'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Save } from 'lucide-react'
import type { CustomerFormValues } from '@/features/crm/types/customer'
import {
  customerStatuses,
  leadSources,
  projectTypes,
} from '@/features/crm/types/customer'
import { getCustomerStatusLabel } from '@/features/crm/utils/customerUtils'

type CustomerFormProps = {
  initialValues?: Partial<CustomerFormValues>
  mode: 'create' | 'edit'
}

const inputClassName =
  'mt-2 h-11 w-full rounded-xl border border-white/[0.08] bg-[#17181C] px-3.5 text-sm text-white outline-none transition placeholder:text-[#646873] hover:border-white/[0.15] focus:border-[#163DFF] focus:ring-4 focus:ring-[#163DFF]/10'

const labelClassName =
  'text-[11px] font-semibold uppercase tracking-[0.12em] text-[#9CA3AF]'

export function CustomerForm({ initialValues, mode }: CustomerFormProps) {
  const [hasBeenSubmitted, setHasBeenSubmitted] = useState(false)

  return (
    <form
      className="space-y-6"
      onSubmit={(event) => {
        event.preventDefault()
        setHasBeenSubmitted(true)
      }}
    >
      <div className="grid gap-5 md:grid-cols-2">
        <label className={labelClassName}>
          Empresa
          <input
            name="company"
            required
            defaultValue={initialValues?.company}
            placeholder="Ej. Grupo Arista Desarrollos"
            className={inputClassName}
          />
        </label>

        <label className={labelClassName}>
          Contacto principal
          <input
            name="contact"
            required
            defaultValue={initialValues?.contact}
            placeholder="Nombre del contacto principal"
            className={inputClassName}
          />
        </label>

        <label className={labelClassName}>
          Teléfono
          <input
            name="phone"
            type="tel"
            required
            defaultValue={initialValues?.phone}
            placeholder="+52 55 0000 0000"
            className={inputClassName}
          />
        </label>

        <label className={labelClassName}>
          Correo electrónico
          <input
            name="email"
            type="email"
            required
            defaultValue={initialValues?.email}
            placeholder="contacto@empresa.com"
            className={inputClassName}
          />
        </label>

        <label className={labelClassName}>
          RFC
          <input
            name="rfc"
            defaultValue={initialValues?.rfc}
            placeholder="GAD180426KQ2"
            className={inputClassName}
          />
        </label>

        <label className={labelClassName}>
          Responsable comercial
          <select
            name="assignedSalesperson"
            defaultValue={initialValues?.assignedSalesperson}
            className={inputClassName}
          >
            <option value="">Seleccionar responsable</option>
            <option>Ana Ruiz</option>
            <option>Carlos Méndez</option>
            <option>Lucía Castillo</option>
            <option>Miguel García</option>
          </select>
        </label>

        <label className={`${labelClassName} md:col-span-2`}>
          Dirección
          <input
            name="address"
            defaultValue={initialValues?.address}
            placeholder="Calle, colonia, ciudad y estado"
            className={inputClassName}
          />
        </label>

        <label className={labelClassName}>
          Tipo de proyecto
          <select
            name="projectType"
            defaultValue={initialValues?.projectType}
            className={inputClassName}
          >
            <option value="">Seleccionar tipo de proyecto</option>
            {projectTypes.map((type) => (
              <option value={type} key={type}>
                {type}
              </option>
            ))}
          </select>
        </label>

        <label className={labelClassName}>
          Origen del prospecto
          <select
            name="leadSource"
            defaultValue={initialValues?.leadSource}
            className={inputClassName}
          >
            <option value="">Seleccionar origen</option>
            {leadSources.map((source) => (
              <option value={source} key={source}>
                {source}
              </option>
            ))}
          </select>
        </label>

        <label className={labelClassName}>
          Estado
          <select
            name="status"
            defaultValue={initialValues?.status ?? 'Lead'}
            className={inputClassName}
          >
            {customerStatuses.map((status) => (
              <option value={status} key={status}>
                {getCustomerStatusLabel(status)}
              </option>
            ))}
          </select>
        </label>

        <label className={`${labelClassName} md:col-span-2`}>
          Notas
          <textarea
            name="notes"
            defaultValue={initialValues?.notes}
            rows={4}
            placeholder="Agrega contexto útil para el equipo comercial..."
            className={`${inputClassName} h-auto resize-y py-3`}
          />
        </label>
      </div>

      <div className="flex flex-col-reverse items-stretch justify-between gap-4 border-t border-white/[0.06] pt-6 sm:flex-row sm:items-center">
        <p className="text-xs leading-5 text-[#646873]">
          La persistencia definitiva del CRM se conectará mediante la capa de servicios de NEDVI OS.
        </p>

        <div className="flex items-center justify-end gap-3">
          <Link
            href="/crm"
            className="inline-flex h-11 items-center justify-center rounded-xl px-4 text-xs font-semibold text-[#9CA3AF] transition hover:bg-white/[0.05] hover:text-white"
          >
            Cancelar
          </Link>

          <button
            type="submit"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#163DFF] px-4 text-xs font-semibold text-white shadow-[0_10px_25px_rgba(22,61,255,0.2)] transition hover:bg-[#3155ff] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#163DFF]/30"
          >
            <Save size={15} />
            {mode === 'create' ? 'Crear cliente' : 'Guardar cambios'}
          </button>
        </div>
      </div>

      {hasBeenSubmitted ? (
        <p
          className="rounded-xl border border-sky-400/20 bg-sky-400/[0.08] px-4 py-3 text-xs text-sky-200"
          role="status"
        >
          Los datos están listos para conectarse con el servicio del CRM.
        </p>
      ) : null}
    </form>
  )
}
