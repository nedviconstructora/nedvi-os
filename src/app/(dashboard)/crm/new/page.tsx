import Link from 'next/link'
import { ArrowLeft, UserPlus } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { CustomerForm } from '@/features/crm/components/CustomerForm'

export default function NewCustomerPage() {
  return (
    <AppShell>
      <div className="mx-auto w-full max-w-4xl space-y-7">
        <header>
          <Link href="/crm" className="inline-flex items-center gap-2 text-xs font-medium text-[#9CA3AF] transition hover:text-white"><ArrowLeft size={14} /> Back to customers</Link>
          <div className="mt-6 flex items-start gap-4"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#163DFF]/[0.14] text-[#8296ff]"><UserPlus size={20} /></span><div><p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7187ff]">CRM / New record</p><h1 className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-white">Create customer</h1><p className="mt-2 text-sm text-[#9CA3AF]">Add a company and the key context your team needs to build the relationship.</p></div></div>
        </header>
        <div className="rounded-2xl border border-white/[0.07] bg-[#20232A] p-5 shadow-[0_16px_50px_rgba(0,0,0,0.16)] sm:p-8"><CustomerForm mode="create" /></div>
      </div>
    </AppShell>
  )
}
