import Link from 'next/link'
import { ArrowDown, ArrowUp, ArrowUpDown, Mail, MoreHorizontal, Phone } from 'lucide-react'
import type { Customer, CustomerSortKey, SortDirection } from '@/features/crm/types/customer'
import { formatCustomerDate, getCustomerInitials } from '@/features/crm/utils/customerUtils'
import { CustomerStatusBadge } from '@/features/crm/components/CustomerStatusBadge'

type CustomerTableProps = {
  customers: Customer[]
  sortKey: CustomerSortKey
  sortDirection: SortDirection
  onSort: (key: CustomerSortKey) => void
}

type SortableColumnProps = {
  label: string
  sortKey: CustomerSortKey
  activeKey: CustomerSortKey
  direction: SortDirection
  onSort: (key: CustomerSortKey) => void
}

function SortableColumn({ label, sortKey, activeKey, direction, onSort }: SortableColumnProps) {
  const isActive = sortKey === activeKey
  return (
    <button type="button" onClick={() => onSort(sortKey)} className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#646873] transition hover:text-white">
      {label}
      {isActive ? (direction === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />) : <ArrowUpDown size={12} />}
    </button>
  )
}

export function CustomerTable({ customers, sortKey, sortDirection, onSort }: CustomerTableProps) {
  return (
    <div className="hidden overflow-hidden rounded-2xl border border-white/[0.07] bg-[#20232A] shadow-[0_16px_50px_rgba(0,0,0,0.16)] lg:block">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[850px] border-collapse text-left">
          <thead className="border-b border-white/[0.06] bg-white/[0.015]">
            <tr>
              <th className="px-6 py-4"><SortableColumn label="Company" sortKey="company" activeKey={sortKey} direction={sortDirection} onSort={onSort} /></th>
              <th className="px-4 py-4"><SortableColumn label="Contact" sortKey="contact" activeKey={sortKey} direction={sortDirection} onSort={onSort} /></th>
              <th className="px-4 py-4"><SortableColumn label="Project type" sortKey="projectType" activeKey={sortKey} direction={sortDirection} onSort={onSort} /></th>
              <th className="px-4 py-4"><SortableColumn label="Status" sortKey="status" activeKey={sortKey} direction={sortDirection} onSort={onSort} /></th>
              <th className="px-4 py-4"><SortableColumn label="Last contact" sortKey="lastContact" activeKey={sortKey} direction={sortDirection} onSort={onSort} /></th>
              <th className="w-12 px-4 py-4"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.05]">
            {customers.map((customer) => (
              <tr className="group transition hover:bg-white/[0.025]" key={customer.id}>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#163DFF]/[0.12] text-[10px] font-semibold text-[#9aabff]">{getCustomerInitials(customer)}</span>
                    <div className="min-w-0"><Link href={`/crm/${customer.id}`} className="block max-w-[220px] truncate text-xs font-semibold text-white transition hover:text-[#91a2ff]">{customer.company}</Link><p className="mt-1 text-[10px] text-[#646873]">{customer.rfc}</p></div>
                  </div>
                </td>
                <td className="px-4 py-4"><p className="text-xs font-medium text-[#d5d7df]">{customer.contact}</p><div className="mt-1 flex items-center gap-2 text-[10px] text-[#646873]"><Mail size={12} /> {customer.email}</div></td>
                <td className="px-4 py-4 text-xs text-[#9CA3AF]">{customer.projectType}</td>
                <td className="px-4 py-4"><CustomerStatusBadge status={customer.status} /></td>
                <td className="px-4 py-4"><p className="text-xs text-[#d5d7df]">{formatCustomerDate(customer.lastContact)}</p><div className="mt-1 flex items-center gap-1 text-[10px] text-[#646873]"><Phone size={11} /> {customer.phone}</div></td>
                <td className="px-4 py-4"><Link href={`/crm/${customer.id}`} className="flex rounded-lg p-2 text-[#646873] transition hover:bg-white/[0.06] hover:text-white" aria-label={`Open ${customer.company}`}><MoreHorizontal size={17} /></Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
