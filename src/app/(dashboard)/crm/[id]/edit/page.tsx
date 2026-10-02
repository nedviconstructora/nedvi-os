'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { ArrowLeft, Edit3 } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { CustomerForm } from '@/features/crm/components/CustomerForm'
import { readCustomerById } from '@/features/crm/services/customerStorage'
import type { Customer } from '@/features/crm/types/customer'

export default function EditCustomerPage() {
  const params = useParams<{ id: string }>()
  const customerId = params.id
  const [customer, setCustomer] = useState<Customer | null | undefined>(undefined)

  useEffect(() => {
    setCustomer(readCustomerById(customerId) ?? null)
  }, [customerId])

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-4xl space-y-7">
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
            <header>
              <Link href={`/crm/${customer.id}`} className="inline-flex items-center gap-2 text-xs font-medium text-[#9CA3AF] transition hover:text-white"><ArrowLeft size={14} /> Volver al cliente</Link>
              <div className="mt-6 flex items-start gap-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#163DFF]/[0.14] text-[#8296ff]"><Edit3 size={19} /></span>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7187ff]">CRM / Editar registro</p>
                  <h1 className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-white">Editar {customer.company}</h1>
                  <p className="mt-2 text-sm text-[#9CA3AF]">Actualiza los datos de contacto y el contexto comercial del cliente.</p>
                </div>
              </div>
            </header>
            <div className="rounded-2xl border border-white/[0.07] bg-[#20232A] p-5 shadow-[0_16px_50px_rgba(0,0,0,0.16)] sm:p-8">
              <CustomerForm mode="edit" customerId={customer.id} initialValues={customer} />
            </div>
          </>
        )}
      </div>
    </AppShell>
  )
}
