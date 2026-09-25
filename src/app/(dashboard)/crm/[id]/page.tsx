import Link from 'next/link'
import { ArrowLeft, Edit3, Mail, MapPin, Phone } from 'lucide-react'
import { notFound } from 'next/navigation'
import { AppShell } from '@/components/layout/AppShell'
import { Card, CardHeader } from '@/components/ui/Card'
import { CustomerStatusBadge } from '@/features/crm/components/CustomerStatusBadge'
import { CustomerTimeline } from '@/features/crm/components/CustomerTimeline'
import { getCustomerById } from '@/features/crm/services/customerService'
import { formatCustomerDate, getCustomerInitials } from '@/features/crm/utils/customerUtils'

type CustomerDetailPageProps = { params: Promise<{ id: string }> }

export default async function CustomerDetailPage({ params }: CustomerDetailPageProps) {
  const { id } = await params
  const customer = getCustomerById(id)
  if (!customer) notFound()

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-[1300px] space-y-7">
        <header className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
          <div><Link href="/crm" className="inline-flex items-center gap-2 text-xs font-medium text-[#9CA3AF] transition hover:text-white"><ArrowLeft size={14} /> Back to customers</Link><div className="mt-6 flex items-start gap-4"><span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#163DFF]/[0.14] text-sm font-semibold text-[#9aabff]">{getCustomerInitials(customer)}</span><div><div className="flex flex-wrap items-center gap-3"><h1 className="text-3xl font-semibold tracking-[-0.05em] text-white">{customer.company}</h1><CustomerStatusBadge status={customer.status} /></div><p className="mt-2 text-sm text-[#9CA3AF]">{customer.contact} · {customer.projectType}</p></div></div></div>
          <Link href={`/crm/${customer.id}/edit`} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-white/[0.09] px-4 text-xs font-semibold text-[#d5d7df] transition hover:bg-white/[0.06] hover:text-white"><Edit3 size={14} /> Edit customer</Link>
        </header>
        <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="space-y-5">
            <Card><CardHeader title="Contact details" description="Primary customer information" /><div className="space-y-5 p-5 sm:p-6"><DetailItem icon={Mail} label="Email" value={customer.email} /><DetailItem icon={Phone} label="Phone" value={customer.phone} /><DetailItem icon={MapPin} label="Address" value={customer.address} /><div className="grid grid-cols-2 gap-5 border-t border-white/[0.06] pt-5"><div><p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#646873]">RFC</p><p className="mt-2 text-xs text-[#d5d7df]">{customer.rfc}</p></div><div><p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#646873]">Lead source</p><p className="mt-2 text-xs text-[#d5d7df]">{customer.leadSource}</p></div></div></div></Card>
            <Card><CardHeader title="Account context" description="Ownership and relationship health" /><div className="grid grid-cols-2 gap-5 p-5 sm:p-6"><div><p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#646873]">Salesperson</p><p className="mt-2 text-xs font-medium text-white">{customer.assignedSalesperson}</p></div><div><p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#646873]">Created</p><p className="mt-2 text-xs text-[#d5d7df]">{formatCustomerDate(customer.createdAt)}</p></div><div className="col-span-2 border-t border-white/[0.06] pt-5"><p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#646873]">Notes</p><p className="mt-2 text-xs leading-6 text-[#9CA3AF]">{customer.notes}</p></div></div></Card>
          </div>
          <Card><CardHeader title="Relationship timeline" description="Recent conversations and account activity" /><div className="p-5 sm:p-6">{customer.timeline.length ? <CustomerTimeline events={customer.timeline} /> : <p className="py-8 text-center text-sm text-[#646873]">No activity has been recorded for this customer yet.</p>}</div></Card>
        </div>
      </div>
    </AppShell>
  )
}

type DetailItemProps = { icon: typeof Mail; label: string; value: string }
function DetailItem({ icon: Icon, label, value }: DetailItemProps) { return <div className="flex items-start gap-3"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.05] text-[#7187ff]"><Icon size={14} /></span><div><p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#646873]">{label}</p><p className="mt-1 text-xs leading-5 text-[#d5d7df]">{value}</p></div></div> }
