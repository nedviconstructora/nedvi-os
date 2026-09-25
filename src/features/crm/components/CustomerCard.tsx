import Link from 'next/link'
import { ArrowUpRight, Mail, MapPin, Phone } from 'lucide-react'
import type { Customer } from '@/features/crm/types/customer'
import { formatCustomerDate, getCustomerInitials } from '@/features/crm/utils/customerUtils'
import { Card } from '@/components/ui/Card'
import { CustomerStatusBadge } from '@/features/crm/components/CustomerStatusBadge'

type CustomerCardProps = {
  customer: Customer
}

export function CustomerCard({ customer }: CustomerCardProps) {
  return (
    <Card className="p-5 transition duration-200 hover:border-white/[0.14]">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#163DFF]/[0.14] text-xs font-semibold text-[#9aabff]">{getCustomerInitials(customer)}</span>
          <div className="min-w-0">
            <Link href={`/crm/${customer.id}`} className="block truncate text-sm font-semibold text-white transition hover:text-[#91a2ff]">{customer.company}</Link>
            <p className="mt-1 truncate text-xs text-[#9CA3AF]">{customer.contact}</p>
          </div>
        </div>
        <CustomerStatusBadge status={customer.status} />
      </div>
      <div className="mt-5 space-y-2.5 text-xs text-[#9CA3AF]">
        <p className="flex items-center gap-2 truncate"><Mail size={14} className="shrink-0 text-[#646873]" />{customer.email}</p>
        <p className="flex items-center gap-2"><Phone size={14} className="shrink-0 text-[#646873]" />{customer.phone}</p>
        <p className="flex items-start gap-2"><MapPin size={14} className="mt-0.5 shrink-0 text-[#646873]" /><span className="line-clamp-2">{customer.address}</span></p>
      </div>
      <div className="mt-5 flex items-center justify-between border-t border-white/[0.06] pt-4">
        <span className="text-[11px] text-[#646873]">Last contact {formatCustomerDate(customer.lastContact)}</span>
        <Link href={`/crm/${customer.id}`} className="inline-flex items-center gap-1 text-xs font-semibold text-[#7187ff] transition hover:text-white">View <ArrowUpRight size={13} /></Link>
      </div>
    </Card>
  )
}
