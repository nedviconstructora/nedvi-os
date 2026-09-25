import type { CustomerStatus } from '@/features/crm/types/customer'
import { getCustomerStatusLabel } from '@/features/crm/utils/customerUtils'

type CustomerStatusBadgeProps = {
  status: CustomerStatus
}

const statusStyles: Record<CustomerStatus, string> = {
  Lead: 'border-slate-400/20 bg-slate-400/10 text-slate-300',
  Qualified: 'border-sky-400/20 bg-sky-400/10 text-sky-300',
  Proposal: 'border-violet-400/20 bg-violet-400/10 text-violet-300',
  Active: 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300',
  Inactive: 'border-white/10 bg-white/[0.05] text-[#9CA3AF]',
}

export function CustomerStatusBadge({ status }: CustomerStatusBadgeProps) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold ${statusStyles[status]}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
      {getCustomerStatusLabel(status)}
    </span>
  )
}
