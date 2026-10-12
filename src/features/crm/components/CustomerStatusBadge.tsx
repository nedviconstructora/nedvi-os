import type { CustomerStatus } from '@/features/crm/types/customer'
import { getCustomerStatusLabel } from '@/features/crm/utils/customerUtils'

type CustomerStatusBadgeProps = {
  status: CustomerStatus
}

const statusStyles: Record<CustomerStatus, string> = {
  Lead: 'border-slate-400/50 bg-slate-100 text-slate-700 dark:border-slate-500/40 dark:bg-slate-500/15 dark:text-slate-200',
  Qualified: 'border-sky-500/45 bg-sky-100 text-sky-800 dark:border-sky-400/35 dark:bg-sky-400/10 dark:text-sky-300',
  Proposal: 'border-violet-500/45 bg-violet-100 text-violet-800 dark:border-violet-400/35 dark:bg-violet-400/10 dark:text-violet-300',
  Active: 'border-emerald-500/45 bg-emerald-100 text-emerald-800 dark:border-emerald-400/35 dark:bg-emerald-400/10 dark:text-emerald-300',
  Inactive: 'border-slate-400/50 bg-slate-100 text-slate-700 dark:border-white/15 dark:bg-white/[0.05] dark:text-slate-300',
}

export function CustomerStatusBadge({ status }: CustomerStatusBadgeProps) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold ${statusStyles[status]}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
      {getCustomerStatusLabel(status)}
    </span>
  )
}
