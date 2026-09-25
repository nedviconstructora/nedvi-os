import Link from 'next/link'
import { ArrowLeft, Edit3 } from 'lucide-react'
import { notFound } from 'next/navigation'
import { AppShell } from '@/components/layout/AppShell'
import { CustomerForm } from '@/features/crm/components/CustomerForm'
import { getCustomerById } from '@/features/crm/services/customerService'

type EditCustomerPageProps = { params: Promise<{ id: string }> }

export default async function EditCustomerPage({ params }: EditCustomerPageProps) {
  const { id } = await params
  const customer = getCustomerById(id)
  if (!customer) notFound()

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-4xl space-y-7">
        <header><Link href={`/crm/${customer.id}`} className="inline-flex items-center gap-2 text-xs font-medium text-[#9CA3AF] transition hover:text-white"><ArrowLeft size={14} /> Back to customer</Link><div className="mt-6 flex items-start gap-4"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#163DFF]/[0.14] text-[#8296ff]"><Edit3 size={19} /></span><div><p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7187ff]">CRM / Edit record</p><h1 className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-white">Edit {customer.company}</h1><p className="mt-2 text-sm text-[#9CA3AF]">Keep account ownership, contact details, and commercial context current.</p></div></div></header>
        <div className="rounded-2xl border border-white/[0.07] bg-[#20232A] p-5 shadow-[0_16px_50px_rgba(0,0,0,0.16)] sm:p-8"><CustomerForm mode="edit" initialValues={customer} /></div>
      </div>
    </AppShell>
  )
}
