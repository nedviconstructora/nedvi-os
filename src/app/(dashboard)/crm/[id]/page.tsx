'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { ArrowLeft, Edit3, Mail, MapPin, Phone } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { Card, CardHeader } from '@/components/ui/Card'
import { CustomerStatusBadge } from '@/features/crm/components/CustomerStatusBadge'
import { CustomerTimeline } from '@/features/crm/components/CustomerTimeline'
import { readCustomerById } from '@/features/crm/services/customerStorage'
import type { Customer } from '@/features/crm/types/customer'
import {
  formatCustomerDate,
  getCustomerInitials,
} from '@/features/crm/utils/customerUtils'

export default function CustomerDetailPage() {
  const params = useParams<{ id: string }>()
  const customerId = params.id
  const [customer, setCustomer] = useState<Customer | null | undefined>(undefined)

  useEffect(() => {
    setCustomer(readCustomerById(customerId) ?? null)
  }, [customerId])

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-[1300px] space-y-7">
        {customer === undefined ? (
          <div className="rounded-2xl border border-white/[0.07] bg-[#20232A] p-8 text-sm text-[#9CA3AF]">Cargando cliente...</div>
        ) : customer === null ? (
          <div className="rounded-2xl border border-red-400/20 bg-red-400/[0.06] p-8">
            <h1 className="text-xl font-semibold text-white">Cliente no encontrado</h1>
            <p className="mt-2 text-sm text-[#9CA3AF]">El registro ya no existe o no está disponible en este dispositivo.</p>
            <Link href="/crm" className="mt-5 inline-flex items-center gap-2 text-xs font-semibold text-[#7187ff] transition hover:text-white"><ArrowLeft size={14} /> Volver a clientes</Link>
          </div>
        ) : (
          <>
            <header className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
              <div>
                <Link href="/crm" className="inline-flex items-center gap-2 text-xs font-medium text-[#9CA3AF] transition hover:text-white"><ArrowLeft size={14} /> Volver a clientes</Link>
                <div className="mt-6 flex items-start gap-4">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#163DFF]/[0.14] text-sm font-semibold text-[#9aabff]">{getCustomerInitials(customer)}</span>
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <h1 className="text-3xl font-semibold tracking-[-0.05em] text-white">{customer.company}</h1>
                      <CustomerStatusBadge status={customer.status} />
                    </div>
                    <p className="mt-2 text-sm text-[#9CA3AF]">{customer.contact} · {customer.projectType}</p>
                  </div>
                </div>
              </div>
              <Link href={`/crm/${customer.id}/edit`} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-white/[0.09] px-4 text-xs font-semibold text-[#d5d7df] transition hover:bg-white/[0.06] hover:text-white"><Edit3 size={14} /> Editar cliente</Link>
            </header>

            <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
              <div className="space-y-5">
                <Card>
                  <CardHeader title="Datos de contacto" description="Información principal del cliente" />
                  <div className="space-y-5 p-5 sm:p-6">
                    <DetailItem icon={Mail} label="Correo" value={customer.email} />
                    <DetailItem icon={Phone} label="Teléfono" value={customer.phone} />
                    <DetailItem icon={MapPin} label="Dirección" value={customer.address} />
                    <div className="grid grid-cols-2 gap-5 border-t border-white/[0.06] pt-5">
                      <div><p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#646873]">RFC</p><p className="mt-2 text-xs text-[#d5d7df]">{customer.rfc || 'Sin registrar'}</p></div>
                      <div><p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#646873]">Origen</p><p className="mt-2 text-xs text-[#d5d7df]">{customer.leadSource}</p></div>
                    </div>
                  </div>
                </Card>

                <Card>
                  <CardHeader title="Contexto comercial" description="Responsable y estado de la relación" />
                  <div className="grid grid-cols-2 gap-5 p-5 sm:p-6">
                    <div><p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#646873]">Responsable</p><p className="mt-2 text-xs font-medium text-white">{customer.assignedSalesperson || 'Sin asignar'}</p></div>
                    <div><p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#646873]">Creado</p><p className="mt-2 text-xs text-[#d5d7df]">{formatCustomerDate(customer.createdAt)}</p></div>
                    <div className="col-span-2 border-t border-white/[0.06] pt-5"><p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#646873]">Notas</p><p className="mt-2 text-xs leading-6 text-[#9CA3AF]">{customer.notes || 'Sin notas registradas.'}</p></div>
                  </div>
                </Card>
              </div>

              <Card>
                <CardHeader title="Historial de relación" description="Conversaciones y actividad reciente" />
                <div className="p-5 sm:p-6">
                  {customer.timeline.length ? <CustomerTimeline events={customer.timeline} /> : <p className="py-8 text-center text-sm text-[#646873]">Todavía no hay actividad registrada para este cliente.</p>}
                </div>
              </Card>
            </div>
          </>
        )}
      </div>
    </AppShell>
  )
}

type DetailItemProps = {
  icon: typeof Mail
  label: string
  value: string
}

function DetailItem({ icon: Icon, label, value }: DetailItemProps) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.05] text-[#7187ff]"><Icon size={14} /></span>
      <div><p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#646873]">{label}</p><p className="mt-1 text-xs leading-5 text-[#d5d7df]">{value || 'Sin registrar'}</p></div>
    </div>
  )
}
