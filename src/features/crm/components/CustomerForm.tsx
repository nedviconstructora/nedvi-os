'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Save } from 'lucide-react'
import type { CustomerFormValues } from '@/features/crm/types/customer'
import { customerStatuses, leadSources, projectTypes } from '@/features/crm/types/customer'

type CustomerFormProps = {
  initialValues?: Partial<CustomerFormValues>
  mode: 'create' | 'edit'
}

const inputClassName = 'mt-2 h-11 w-full rounded-xl border border-white/[0.08] bg-[#17181C] px-3.5 text-sm text-white outline-none transition placeholder:text-[#646873] hover:border-white/[0.15] focus:border-[#163DFF] focus:ring-4 focus:ring-[#163DFF]/10'
const labelClassName = 'text-[11px] font-semibold uppercase tracking-[0.12em] text-[#9CA3AF]'

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
        <label className={labelClassName}>Company<input name="company" required defaultValue={initialValues?.company} placeholder="e.g. Grupo Arista Desarrollos" className={inputClassName} /></label>
        <label className={labelClassName}>Contact<input name="contact" required defaultValue={initialValues?.contact} placeholder="Primary contact name" className={inputClassName} /></label>
        <label className={labelClassName}>Phone<input name="phone" type="tel" required defaultValue={initialValues?.phone} placeholder="+52 55 0000 0000" className={inputClassName} /></label>
        <label className={labelClassName}>Email<input name="email" type="email" required defaultValue={initialValues?.email} placeholder="contact@company.com" className={inputClassName} /></label>
        <label className={labelClassName}>RFC<input name="rfc" defaultValue={initialValues?.rfc} placeholder="GAD180426KQ2" className={inputClassName} /></label>
        <label className={labelClassName}>Assigned salesperson<select name="assignedSalesperson" defaultValue={initialValues?.assignedSalesperson} className={inputClassName}><option value="">Select a salesperson</option><option>Ana Ruiz</option><option>Carlos Méndez</option><option>Lucía Castillo</option><option>Miguel García</option></select></label>
        <label className={`${labelClassName} md:col-span-2`}>Address<input name="address" defaultValue={initialValues?.address} placeholder="Street, neighborhood, city, state" className={inputClassName} /></label>
        <label className={labelClassName}>Project type<select name="projectType" defaultValue={initialValues?.projectType} className={inputClassName}><option value="">Select a project type</option>{projectTypes.map((type) => <option value={type} key={type}>{type}</option>)}</select></label>
        <label className={labelClassName}>Lead source<select name="leadSource" defaultValue={initialValues?.leadSource} className={inputClassName}><option value="">Select a lead source</option>{leadSources.map((source) => <option value={source} key={source}>{source}</option>)}</select></label>
        <label className={labelClassName}>Status<select name="status" defaultValue={initialValues?.status ?? 'Lead'} className={inputClassName}>{customerStatuses.map((status) => <option value={status} key={status}>{status}</option>)}</select></label>
        <label className={`${labelClassName} md:col-span-2`}>Notes<textarea name="notes" defaultValue={initialValues?.notes} rows={4} placeholder="Add context for the sales team..." className={`${inputClassName} h-auto resize-y py-3`} /></label>
      </div>
      <div className="flex flex-col-reverse items-stretch justify-between gap-4 border-t border-white/[0.06] pt-6 sm:flex-row sm:items-center">
        <p className="text-xs leading-5 text-[#646873]">Frontend-only workspace. Persistence will be connected through the CRM service layer.</p>
        <div className="flex items-center justify-end gap-3">
          <Link href="/crm" className="inline-flex h-11 items-center justify-center rounded-xl px-4 text-xs font-semibold text-[#9CA3AF] transition hover:bg-white/[0.05] hover:text-white">Cancel</Link>
          <button type="submit" className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#163DFF] px-4 text-xs font-semibold text-white shadow-[0_10px_25px_rgba(22,61,255,0.2)] transition hover:bg-[#3155ff] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#163DFF]/30"><Save size={15} />{mode === 'create' ? 'Create customer' : 'Save changes'}</button>
        </div>
      </div>
      {hasBeenSubmitted ? <p className="rounded-xl border border-sky-400/20 bg-sky-400/[0.08] px-4 py-3 text-xs text-sky-200" role="status">Your changes are ready to connect to the CRM service.</p> : null}
    </form>
  )
}
