import Link from 'next/link'
import { ArrowUpRight, Edit3, Mail, MapPin, Phone, Trash2 } from 'lucide-react'
import type { Customer } from '@/features/crm/types/customer'
import {
  formatCustomerDate,
  getCustomerInitials,
} from '@/features/crm/utils/customerUtils'
import { Card } from '@/components/ui/Card'
import { CustomerStatusBadge } from '@/features/crm/components/CustomerStatusBadge'

type CustomerCardProps = {
  customer: Customer
  onDelete: (customer: Customer) => void
}

export function CustomerCard({ customer, onDelete }: CustomerCardProps) {
  return (
    <Card className="p-5 transition duration-200 hover:border-white/[0.14]">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#163DFF]/[0.14] text-xs font-semibold text-[#9aabff]">
            {getCustomerInitials(customer)}
          </span>
          <div className="min-w-0">
            <Link
              href={`/crm/${customer.id}`}
              className="block truncate text-sm font-semibold text-white transition hover:text-[#91a2ff]"
            >
              {customer.company}
            </Link>
            <p className="mt-1 text-[10px] font-semibold text-[#7187ff]">
              {customer.folio ?? 'Sin folio'}
            </p>
            <p className="mt-1 truncate text-xs text-[#9CA3AF]">
              {customer.contact}
            </p>
          </div>
        </div>
        <CustomerStatusBadge status={customer.status} />
      </div>

      <div className="mt-5 space-y-2.5 text-xs text-[#9CA3AF]">
        <p className="flex items-center gap-2 truncate">
          <Mail size={14} className="shrink-0 text-[#646873]" />
          {customer.email}
        </p>
        <p className="flex items-center gap-2">
          <Phone size={14} className="shrink-0 text-[#646873]" />
          {customer.phone}
        </p>
        <p className="flex items-start gap-2">
          <MapPin size={14} className="mt-0.5 shrink-0 text-[#646873]" />
          <span className="line-clamp-2">{customer.address}</span>
        </p>
      </div>

      <div className="mt-5 border-t border-white/[0.06] pt-4">
        <span className="text-[11px] text-[#646873]">
          Último contacto {formatCustomerDate(customer.lastContact)}
        </span>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Link
            href={`/crm/${customer.id}`}
            className="inline-flex items-center gap-1 text-xs font-semibold text-[#7187ff] transition hover:text-white"
          >
            Ver <ArrowUpRight size={13} />
          </Link>
          <Link
            href={`/crm/${customer.id}/edit`}
            className="inline-flex items-center gap-1 rounded-lg border border-white/[0.08] px-2.5 py-1.5 text-xs font-semibold text-white/85 transition hover:bg-white/[0.06] hover:text-white"
          >
            <Edit3 size={12} /> Editar
          </Link>
          <button
            type="button"
            onClick={() => onDelete(customer)}
            className="inline-flex items-center gap-1 rounded-lg border border-red-400/25 px-2.5 py-1.5 text-xs font-semibold text-red-300 transition hover:bg-red-400/10"
          >
            <Trash2 size={12} /> Eliminar
          </button>
        </div>
      </div>
    </Card>
  )
}
