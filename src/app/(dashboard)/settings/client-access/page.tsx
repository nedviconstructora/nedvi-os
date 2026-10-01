'use client'

import Link from 'next/link'
import { FormEvent, useEffect, useMemo, useState } from 'react'
import { ArrowLeft, KeyRound, Plus, ShieldCheck, Trash2, UserRoundCheck } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { readCustomers } from '@/features/crm/services/customerStorage'
import type { Customer } from '@/features/crm/types/customer'
import {
  defaultPermissionsForRole,
  readAccessSession,
  readAccessUsers,
  writeAccessUsers,
  type AccessUser,
} from '@/features/access/services/accessStorage'

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value)
  const hashBuffer = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(hashBuffer))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

function formatDate(value?: string) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

export default function ClientAccessPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [users, setUsers] = useState<AccessUser[]>([])
  const [open, setOpen] = useState(false)
  const [customerId, setCustomerId] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')

  function refresh() {
    setCustomers(readCustomers())
    setUsers(readAccessUsers())
  }

  useEffect(() => {
    refresh()
    const handleRefresh = () => refresh()
    window.addEventListener('focus', handleRefresh)
    window.addEventListener('storage', handleRefresh)
    return () => {
      window.removeEventListener('focus', handleRefresh)
      window.removeEventListener('storage', handleRefresh)
    }
  }, [])

  const session = typeof window === 'undefined' ? null : readAccessSession()
  const isAdmin = session?.role === 'Administración'

  const clientUsers = useMemo(
    () => users.filter((user) => user.role === 'Cliente'),
    [users],
  )

  const selectedCustomer = customers.find((customer) => customer.id === customerId)

  function resetForm() {
    setCustomerId('')
    setName('')
    setEmail('')
    setPhone('')
    setPassword('')
    setConfirmPassword('')
    setError('')
  }

  function closeForm() {
    setOpen(false)
    resetForm()
  }

  async function createClientAccess(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')

    if (!isAdmin) {
      setError('Solo Administración puede crear accesos de clientes.')
      return
    }

    if (!selectedCustomer?.folio) {
      setError('Selecciona un cliente que tenga folio asignado.')
      return
    }

    const normalizedEmail = email.trim().toLowerCase()
    if (!normalizedEmail) {
      setError('El correo es obligatorio.')
      return
    }

    if (users.some((user) => user.email.trim().toLowerCase() === normalizedEmail)) {
      setError('Ya existe un usuario con ese correo.')
      return
    }

    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.')
      return
    }

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.')
      return
    }

    const now = new Date().toISOString()
    const newUser: AccessUser = {
      id: crypto.randomUUID(),
      name: name.trim() || selectedCustomer.contact || selectedCustomer.company,
      email: normalizedEmail,
      phone: phone.trim() || selectedCustomer.phone,
      position: 'Cliente',
      role: 'Cliente',
      permissions: defaultPermissionsForRole('Cliente'),
      status: 'Activo',
      createdAt: now,
      passwordHash: await sha256(password),
      passwordUpdatedAt: now,
      clientId: selectedCustomer.id,
      clientFolio: selectedCustomer.folio,
      clientName: selectedCustomer.company,
    }

    const next = [newUser, ...users]
    writeAccessUsers(next)
    setUsers(next)
    closeForm()
  }

  function toggleStatus(user: AccessUser) {
    if (!isAdmin) return
    const next = users.map((item) =>
      item.id === user.id
        ? { ...item, status: item.status === 'Activo' ? ('Inactivo' as const) : ('Activo' as const) }
        : item,
    )
    writeAccessUsers(next)
    setUsers(next)
  }

  function removeUser(user: AccessUser) {
    if (!isAdmin) return
    if (!window.confirm(`¿Eliminar el acceso de ${user.name} para ${user.clientName ?? 'este cliente'}?`)) return
    const next = users.filter((item) => item.id !== user.id)
    writeAccessUsers(next)
    setUsers(next)
  }

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-6xl space-y-6 pt-4 sm:pt-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Link
              href="/settings/users"
              className="mb-5 inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm font-semibold text-[var(--foreground)] shadow-sm transition hover:bg-[var(--surface-soft)]"
            >
              <ArrowLeft size={16} /> Usuarios y permisos
            </Link>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#5496CC]">Configuración</p>
            <h1 className="mt-2 text-3xl font-bold tracking-[-0.04em] text-[var(--foreground)]">Accesos de clientes</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">
              Crea cuentas vinculadas al folio del cliente. Estas cuentas solo entran al Portal del Cliente.
            </p>
          </div>

          <button
            type="button"
            onClick={() => { resetForm(); setOpen(true) }}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#7DC6FF] px-4 text-sm font-semibold text-black transition hover:brightness-95"
          >
            <Plus size={16} /> Crear acceso de cliente
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Metric label="Clientes registrados" value={customers.length.toString()} />
          <Metric label="Cuentas de cliente" value={clientUsers.length.toString()} />
          <Metric label="Activas" value={clientUsers.filter((user) => user.status === 'Activo').length.toString()} />
        </div>

        <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
          <div className="border-b border-[var(--border)] p-5">
            <h2 className="text-lg font-bold text-[var(--foreground)]">Cuentas vinculadas</h2>
            <p className="mt-1 text-xs text-[var(--muted)]">Cada cuenta queda ligada a un cliente y su folio.</p>
          </div>

          {!clientUsers.length ? (
            <div className="px-6 py-14 text-center">
              <UserRoundCheck size={32} className="mx-auto text-[#5496CC]" />
              <h3 className="mt-4 font-bold text-[var(--foreground)]">Todavía no hay accesos de clientes</h3>
              <p className="mt-2 text-sm text-[var(--muted)]">Crea el primero desde el botón superior.</p>
            </div>
          ) : (
            <div className="divide-y divide-[var(--border)]">
              {clientUsers.map((user) => (
                <div key={user.id} className="grid gap-4 p-5 md:grid-cols-[1.2fr_1fr_0.8fr_auto] md:items-center">
                  <div>
                    <p className="font-semibold text-[var(--foreground)]">{user.name}</p>
                    <p className="mt-1 text-xs text-[var(--muted)]">{user.email}</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[var(--foreground)]">{user.clientName || 'Cliente'}</p>
                    <p className="mt-1 text-xs text-[#5496CC]">Folio: {user.clientFolio || 'Sin folio'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[var(--muted)]">Creada: {formatDate(user.createdAt)}</p>
                    <button
                      type="button"
                      onClick={() => toggleStatus(user)}
                      className={`mt-2 rounded-full px-2.5 py-1 text-xs font-semibold ${user.status === 'Activo' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-slate-500/10 text-slate-500'}`}
                    >
                      {user.status}
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeUser(user)}
                    className="inline-flex items-center gap-2 rounded-xl border border-red-500/20 px-3 py-2 text-xs font-semibold text-red-500 hover:bg-red-500/10"
                  >
                    <Trash2 size={14} /> Eliminar
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        <div className="rounded-2xl border border-[#5496CC]/20 bg-[#5496CC]/5 p-4 text-xs leading-5 text-[var(--muted)]">
          <ShieldCheck size={16} className="mb-2 text-[#5496CC]" />
          El portal filtra la información por el cliente vinculado. Al migrar a Supabase, esta misma relación se protegerá con políticas RLS en la base de datos.
        </div>
      </div>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm">
          <div className="max-h-[94vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#5496CC]">Portal del Cliente</p>
                <h2 className="mt-2 text-xl font-bold text-[var(--foreground)]">Crear acceso</h2>
              </div>
              <button type="button" onClick={closeForm} className="rounded-lg px-2 py-1 text-[var(--muted)]">Cerrar</button>
            </div>

            <form onSubmit={createClientAccess} className="mt-6 space-y-4">
              <Field label="Cliente / Folio *">
                <select required value={customerId} onChange={(event) => setCustomerId(event.target.value)} className="client-input">
                  <option value="">Seleccionar cliente</option>
                  {customers
                    .filter((customer) => customer.folio)
                    .map((customer) => (
                      <option key={customer.id} value={customer.id}>{customer.folio} — {customer.company}</option>
                    ))}
                </select>
              </Field>

              {selectedCustomer ? (
                <div className="rounded-xl border border-[#5496CC]/20 bg-[#5496CC]/5 p-4 text-sm">
                  <p className="font-semibold text-[var(--foreground)]">{selectedCustomer.company}</p>
                  <p className="mt-1 text-xs text-[var(--muted)]">{selectedCustomer.contact || 'Sin contacto'} · {selectedCustomer.email || 'Sin correo'}</p>
                </div>
              ) : null}

              <Field label="Nombre del usuario *"><input required value={name} onChange={(event) => setName(event.target.value)} placeholder="Nombre de la persona" className="client-input" /></Field>
              <Field label="Correo de acceso *"><input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="cliente@empresa.com" className="client-input" /></Field>
              <Field label="Teléfono"><input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="Teléfono del usuario" className="client-input" /></Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Contraseña temporal *"><input required type="password" minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} className="client-input" /></Field>
                <Field label="Confirmar contraseña *"><input required type="password" minLength={8} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className="client-input" /></Field>
              </div>

              {error ? <p className="text-sm text-red-500">{error}</p> : null}

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={closeForm} className="rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm font-semibold">Cancelar</button>
                <button type="submit" className="inline-flex items-center gap-2 rounded-xl bg-[#7DC6FF] px-4 py-2.5 text-sm font-semibold text-black"><KeyRound size={15} /> Crear cuenta</button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      <style jsx global>{`.client-input{width:100%;border:1px solid var(--border);border-radius:.75rem;background:transparent;padding:.72rem .9rem;color:var(--foreground);outline:none}.client-input:focus{border-color:#5496CC}`}</style>
    </AppShell>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm"><p className="text-2xl font-bold text-[var(--foreground)]">{value}</p><p className="mt-1 text-sm text-[var(--muted)]">{label}</p></div>
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block space-y-2"><span className="text-sm font-semibold text-[var(--foreground)]">{label}</span>{children}</label>
}
