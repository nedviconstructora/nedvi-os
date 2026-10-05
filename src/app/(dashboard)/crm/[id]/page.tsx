'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Edit3, Mail, MapPin, Phone, Trash2 } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { Card, CardHeader } from '@/components/ui/Card'
import { CustomerStatusBadge } from '@/features/crm/components/CustomerStatusBadge'
import { CustomerTimeline } from '@/features/crm/components/CustomerTimeline'
import {
  deleteCustomerFromSupabase,
  getCustomerFromSupabase,
} from '@/features/crm/services/supabaseCustomerService'
import type { Customer } from '@/features/crm/types/customer'
import {
  formatCustomerDate,
  getCustomerInitials,
} from '@/features/crm/utils/customerUtils'

export default function CustomerDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const customerId = params.id
  const [customer, setCustomer] = useState<Customer | null | undefined>(undefined)
  const [error, setError] = useState('')
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    let active = true
    setCustomer(undefined)
    setError('')

    void getCustomerFromSupabase(customerId)
      .then((result) => {
        if (active) setCustomer(result ?? null)
      })
      .catch((loadError) => {
        if (!active) return
        setError(loadError instanceof Error ? loadError.message : 'No fue posible cargar el cliente.')
        setCustomer(null)
      })

    return () => {
      active = false
    }
  }, [customerId])

  async function handleDelete() {
    if (!customer || deleting) return

    const confirmed = window.confirm(
      `¿Eliminar al cliente ${customer.company}?\n\nEsta acción lo eliminará de la base de datos de NEDVI OS. Los proyectos vinculados conservarán su registro y quedarán sin cliente asignado.`
    )
    if (!confirmed) return

    setDeleting(true)
    setError('')
    try {
      const deleted = await deleteCustomerFromSupabase(customer.id)
      if (!deleted) {
        setError('No se pudo eliminar el cliente.')
        return
      }
      router.push('/crm')
      router.refresh()
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'No se pudo eliminar el cliente.')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-[1300px] space-y-7">
        {customer === undefined ? (
          <div className="rounded-2xl border border-white/[0.07] bg-[#20232A] p-8 text-sm text-[#9CA3AF]">
            Cargando cliente desde Supabase...
          </div>
        ) : customer === null ? (
          <div className="rounded-2xl border border-red-400/20 bg-red-400/[0.06] p-8">
            <h1 className="text-xl font-semibold text-white">Cliente no encontrado</h1>
            <p className="mt-2 text-sm text-[#9CA3AF]">
              {error || 'El registro ya no existe o no está disponible en la base de datos.'}
            </p>
            <Link href="/crm" className="mt-5 inline-flex items-center gap-2 text-xs font-semibold text-[#7187ff] transition hover:text-white">
              <ArrowLeft size={14} /> Volver a clientes
            </Link>
          </div>
        ) : (
          <>
            {error ? (
              <div className="rounded-xl border border-red-400/20 bg-red-400/[0.07] px-4 py-3 text-xs text-red-200">{error}</div>
            ) : null}

            <header className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
              <div>
                <Link href="/crm" className="inline-flex items-center gap-2 text-xs font-medium text-[#9CA3AF] transition hover:text-white">
                  <ArrowLeft size={14} /> Volver a clientes
                </Link>

                <div className="mt-6 flex items-start gap-4">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#163DFF]/[0.14] text-sm font-semibold text-[#9aabff]">
                    {getCustomerInitials(customer)}
                  </span>

                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <h1 className="text-3xl font-semibold tracking-[-0.05em] text-white">{customer.company}</h1>
                      <CustomerStatusBadge status={customer.status} />
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-[#163DFF]/25 bg-[#163DFF]/10 px-2.5 py-1 text-[10px] font-semibold tracking-[0.08em] text-[#91a2ff]">
                        {customer.folio ?? 'Sin folio'}
                      </span>
                      <p className="text-sm text-[#9CA3AF]">
                        {customer.contact} · {customer.projectType || 'Tipo de proyecto sin definir'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Link href={`/crm/${customer.id}/edit`} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-white/[0.09] px-4 text-xs font-semibold text-[#d5d7df] transition hover:bg-white/[0.06] hover:text-white">
                  <Edit3 size={14} /> Editar cliente
                </Link>
                <button type="button" onClick={() => void handleDelete()} disabled={deleting} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-red-400/25 px-4 text-xs font-semibold text-red-300 transition hover:bg-red-400/10 hover:text-red-200 disabled:cursor-wait disabled:opacity-60">
                  <Trash2 size={14} /> {deleting ? 'Eliminando...' : 'Eliminar cliente'}
                </button>
              </div>
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
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#646873]">Folio</p>
                        <p className="mt-2 text-xs font-semibold text-[#91a2ff]">{customer.folio ?? 'Sin folio'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#646873]">RFC</p>
                        <p className="mt-2 text-xs text-[#d5d7df]">{customer.rfc || 'Sin registrar'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#646873]">Origen</p>
                        <p className="mt-2 text-xs text-[#d5d7df]">{customer.leadSource || 'Sin definir'}</p>
                      </div>
                    </div>
                  </div>
                </Card>

                <Card>
                  <CardHeader title="Contexto comercial" description="Responsable y estado de la relación" />
                  <div className="grid grid-cols-2 gap-5 p-5 sm:p-6">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#646873]">Responsable</p>
                      <p className="mt-2 text-xs font-medium text-white">{customer.assignedSalesperson || 'Sin asignar'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#646873]">Creado</p>
                      <p className="mt-2 text-xs text-[#d5d7df]">{formatCustomerDate(customer.createdAt)}</p>
                    </div>
                    <div className="col-span-2 border-t border-white/[0.06] pt-5">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#646873]">Notas</p>
                      <p className="mt-2 text-xs leading-6 text-[#9CA3AF]">{customer.notes || 'Sin notas registradas.'}</p>
                    </div>
                  </div>
                </Card>
              </div>

              <Card>
                <CardHeader title="Historial de relación" description="Conversaciones y actividad reciente" />
                <div className="p-5 sm:p-6">
                  {customer.timeline.length ? (
                    <CustomerTimeline events={customer.timeline} />
                  ) : (
                    <p className="py-8 text-center text-sm text-[#646873]">Todavía no hay actividad registrada para este cliente.</p>
                  )}
                </div>
              </Card>
            </div>

            <div className="rounded-2xl border border-emerald-400/15 bg-emerald-400/[0.05] px-4 py-3 text-xs text-[#9CA3AF]">
              <strong className="text-emerald-300">Cliente sincronizado:</strong> este registro se está leyendo directamente desde Supabase.
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
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.05] text-[#7187ff]">
        <Icon size={14} />
      </span>
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#646873]">{label}</p>
        <p className="mt-1 text-xs leading-5 text-[#d5d7df]">{value || 'Sin registrar'}</p>
      </div>
    </div>
  )
}
