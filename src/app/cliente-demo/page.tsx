'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Building2,
  CalendarDays,
  FileText,
  LogOut,
  Mail,
  MapPin,
  ShieldCheck,
  UserRound,
} from 'lucide-react'

type StoredSession = {
  access_token?: string
  user?: { id?: string; email?: string }
  role?: string
}

type CustomerRow = {
  id: string
  folio: string | null
  company: string
  contact: string
  phone: string
  email: string
  address: string
  rfc: string
  project_type: string | null
  status: string
  notes: string
  created_at: string
}

type BootstrapResponse = {
  user?: { id: string; email: string }
  customer?: CustomerRow
  error?: string
}

type PortalCustomer = {
  id: string
  folio: string
  company: string
  contact: string
  phone: string
  email: string
  address: string
  rfc: string
  projectType: string
  status: string
  notes: string
  createdAt: string
}

function getStoredSession(): StoredSession | null {
  if (typeof window === 'undefined') return null
  const raw = window.localStorage.getItem('nedvi_session')
  if (!raw) return null

  try {
    return JSON.parse(raw) as StoredSession
  } catch {
    return null
  }
}

export default function ClienteDemoPage() {
  const router = useRouter()
  const [customer, setCustomer] = useState<PortalCustomer | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState('')

  useEffect(() => {
    let active = true
    const controller = new AbortController()
    const timeout = window.setTimeout(() => controller.abort(), 12000)

    async function loadPortal() {
      const session = getStoredSession()
      const accessToken = session?.access_token
      const role = session?.role

      if (!accessToken) {
        router.replace('/login')
        return
      }

      if (role !== 'cliente') {
        router.replace('/dashboard')
        return
      }

      try {
        const response = await fetch('/api/portal/bootstrap', {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: 'application/json',
          },
          cache: 'no-store',
          signal: controller.signal,
        })

        const data = (await response.json().catch(() => ({}))) as BootstrapResponse

        if (!response.ok || !data.customer) {
          throw new Error(data.error || `No fue posible abrir el portal. [HTTP ${response.status}]`)
        }

        const row = data.customer

        if (active) {
          setUserEmail(data.user?.email ?? session?.user?.email ?? '')
          setCustomer({
            id: row.id,
            folio: row.folio ?? '',
            company: row.company,
            contact: row.contact,
            phone: row.phone,
            email: row.email,
            address: row.address,
            rfc: row.rfc,
            projectType: row.project_type ?? 'Sin asignar',
            status: row.status,
            notes: row.notes,
            createdAt: row.created_at,
          })
        }
      } catch (portalError) {
        if (!active) return

        if (portalError instanceof DOMException && portalError.name === 'AbortError') {
          setError('La carga del portal tardó demasiado. Intenta iniciar sesión nuevamente.')
        } else {
          setError(
            portalError instanceof Error
              ? portalError.message
              : 'No fue posible cargar el portal del cliente.',
          )
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    void loadPortal()

    return () => {
      active = false
      controller.abort()
      window.clearTimeout(timeout)
    }
  }, [router])

  function handleLogout() {
    window.localStorage.removeItem('nedvi_session')
    window.location.assign('/login')
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#0B0B0D] px-6 text-white">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-white/10 border-t-[#7BAEE3]" />
          <p className="mt-4 text-sm text-[#9CA3AF]">Preparando tu portal NEDVI...</p>
        </div>
      </main>
    )
  }

  if (error || !customer) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#0B0B0D] px-6 text-white">
        <div className="w-full max-w-xl rounded-2xl border border-red-400/20 bg-[#20232A] p-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-red-300">Portal del cliente</p>
          <h1 className="mt-3 text-2xl font-semibold">No pudimos abrir tu espacio</h1>
          <p className="mt-3 text-sm leading-6 text-[#9CA3AF]">{error ?? 'No encontramos la información de tu empresa.'}</p>
          <button type="button" onClick={handleLogout} className="mt-6 inline-flex h-10 items-center gap-2 rounded-xl border border-white/[0.08] px-4 text-xs font-semibold text-white transition hover:bg-white/[0.05]">
            <LogOut size={14} /> Volver al inicio de sesión
          </button>
        </div>
      </main>
    )
  }

  const createdDate = customer.createdAt
    ? new Intl.DateTimeFormat('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(customer.createdAt))
    : 'Sin registrar'

  return (
    <main className="min-h-screen bg-[#111820] text-white">
      <header className="border-b border-white/[0.07] bg-[#0D141B]/95 px-6 py-4 backdrop-blur sm:px-8 lg:px-12">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#7BAEE3]/15 text-[#7BAEE3]">
              <Building2 size={20} />
            </div>
            <div>
              <p className="text-sm font-semibold tracking-[-0.02em]">NEDVI OS</p>
              <p className="text-[10px] uppercase tracking-[0.14em] text-[#6D7A88]">Portal del cliente</p>
            </div>
          </div>
          <button type="button" onClick={handleLogout} className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/[0.08] px-4 text-xs font-semibold text-[#AEB8C2] transition hover:bg-white/[0.05] hover:text-white">
            <LogOut size={14} /> Cerrar sesión
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-[1400px] space-y-6 px-6 py-8 sm:px-8 lg:px-12 lg:py-10">
        <section className="rounded-3xl border border-white/[0.08] bg-[#1A222C] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.18)] sm:p-8">
          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-start">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center gap-2 rounded-full bg-emerald-400/10 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-300">
                  <ShieldCheck size={13} /> Acceso verificado
                </span>
                {customer.folio ? <span className="text-xs font-medium text-[#7BAEE3]">{customer.folio}</span> : null}
              </div>
              <h1 className="mt-5 text-4xl font-semibold tracking-[-0.05em] sm:text-5xl">{customer.company}</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[#8E9AA8]">Bienvenido a tu espacio privado de NEDVI. Aquí podrás consultar el avance, documentación y actividad relacionada con tu empresa.</p>
            </div>
            <div className="rounded-2xl border border-white/[0.07] bg-[#111820] px-5 py-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#667383]">Sesión iniciada</p>
              <p className="mt-2 text-sm font-medium text-white">{userEmail || customer.email}</p>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <InfoCard icon={UserRound} label="Contacto" value={customer.contact || 'Sin registrar'} />
          <InfoCard icon={Building2} label="Tipo de proyecto" value={customer.projectType} />
          <InfoCard icon={CalendarDays} label="Cliente desde" value={createdDate} />
          <InfoCard icon={ShieldCheck} label="Estado" value={customer.status || 'Activo'} />
        </section>

        <section className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-2xl border border-white/[0.07] bg-[#1A222C]">
            <div className="border-b border-white/[0.06] px-6 py-5">
              <h2 className="text-base font-semibold">Información de tu empresa</h2>
              <p className="mt-1 text-xs text-[#718090]">Datos vinculados a tu cuenta de cliente.</p>
            </div>
            <div className="grid gap-5 p-6 sm:grid-cols-2">
              <Detail icon={Mail} label="Correo" value={customer.email} />
              <Detail icon={MapPin} label="Dirección" value={customer.address || 'Sin registrar'} />
              <Detail icon={FileText} label="RFC" value={customer.rfc || 'Sin registrar'} />
              <Detail icon={Building2} label="Folio NEDVI" value={customer.folio || 'Sin registrar'} />
            </div>
          </div>

          <div className="rounded-2xl border border-white/[0.07] bg-[#1A222C]">
            <div className="border-b border-white/[0.06] px-6 py-5">
              <h2 className="text-base font-semibold">Avance del proyecto</h2>
              <p className="mt-1 text-xs text-[#718090]">El seguimiento detallado se habilitará al vincular proyectos a Supabase.</p>
            </div>
            <div className="p-6">
              <div className="rounded-2xl border border-[#7BAEE3]/15 bg-[#7BAEE3]/[0.06] p-5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#7BAEE3]">Siguiente etapa</p>
                <p className="mt-3 text-lg font-semibold">Portal conectado correctamente</p>
                <p className="mt-2 text-sm leading-6 text-[#8E9AA8]">Tu cuenta ya está enlazada de forma privada con {customer.company}. El siguiente módulo mostrará progreso, hitos, evidencias y documentos reales.</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}

function InfoCard({ icon: Icon, label, value }: { icon: typeof Building2; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-[#1A222C] p-5">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#7BAEE3]/10 text-[#7BAEE3]"><Icon size={17} /></span>
      <p className="mt-4 text-[10px] font-semibold uppercase tracking-[0.13em] text-[#667383]">{label}</p>
      <p className="mt-2 text-sm font-semibold text-white">{value}</p>
    </div>
  )
}

function Detail({ icon: Icon, label, value }: { icon: typeof Building2; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.05] text-[#7BAEE3]"><Icon size={14} /></span>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#667383]">{label}</p>
        <p className="mt-1 break-words text-xs leading-5 text-[#D4DAE1]">{value}</p>
      </div>
    </div>
  )
}
