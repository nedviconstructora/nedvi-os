import type { CustomerStatus } from '@/features/crm/types/customer'
import { getCustomerStatusLabel } from '@/features/crm/utils/customerUtils'

type CustomerStatusBadgeProps = {
  status: CustomerStatus
}

const statusStyles: Record<CustomerStatus, string> = {
  Lead: 'nedvi-customer-status-lead',
  Qualified: 'nedvi-customer-status-qualified',
  Proposal: 'nedvi-customer-status-proposal',
  Active: 'nedvi-customer-status-active',
  Inactive: 'nedvi-customer-status-inactive',
}

export function CustomerStatusBadge({ status }: CustomerStatusBadgeProps) {
  return (
    <span className={`inline-flex items-center gap-1.5 nedvi-customer-status rounded-full border px-2.5 py-1 text-[10px] font-bold ${statusStyles[status]}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
      {getCustomerStatusLabel(status)}
    </span>
  )
}
