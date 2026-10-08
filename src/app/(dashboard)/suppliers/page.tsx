'use client'
import { PurchasingCloudMigration } from '@/features/purchasing/PurchasingCloudMigration'

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { Pencil, Plus, Search, Trash2, Truck, X } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import {
  PURCHASING_UPDATED_EVENT,
  SUPPLIERS_STORAGE_KEY,
  nextSupplierFolio,
  readSuppliers,
  writeSuppliers,
  type Supplier,
  type SupplierCategory,
  type SupplierStatus,
} from '@/features/purchasing/purchasingStorage'

const categories: SupplierCategory[] = [
  'Materiales',
  'Equipo / maquinaria',
  'Subcontratista',
  'Servicios',
  'Transporte',
  'Otro',
]

const emptyForm = {
  company: '',
  contact: '',
  phone: '',
  email: '',
  rfc: '',
  category: 'Materiales' as SupplierCategory,
  address: '',
  paymentTerms: '',
  bankAccountName: '',
  bankName: '',
  bankClabe: '',
  bankRfc: '',
  status: 'Activo' as SupplierStatus,
  notes: '',
}

function maskedClabe(value: string) {
  if (!value) return 'Sin CLABE / clave'
  const clean = value.replace(/\s+/g, '')
  if (clean.length <= 4) return clean
  return `•••• ${clean.slice(-4)}`
}

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'Todos' | SupplierStatus>('Todos')
  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)

  const loadData = useCallback(() => setSuppliers(readSuppliers()), [])

  useEffect(() => {
    loadData()
    const handleStorage = (event: StorageEvent) => {
      if (event.key === SUPPLIERS_STORAGE_KEY) loadData()
    }
    window.addEventListener('storage', handleStorage)
    window.addEventListener(PURCHASING_UPDATED_EVENT, loadData)
    window.addEventListener('focus', loadData)
    return () => {
      window.removeEventListener('storage', handleStorage)
      window.removeEventListener(PURCHASING_UPDATED_EVENT, loadData)
      window.removeEventListener('focus', loadData)
    }
  }, [loadData])

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    return suppliers.filter((supplier) => {
      const matchesText = [
        supplier.folio,
        supplier.company,
        supplier.contact,
        supplier.email,
        supplier.rfc,
        supplier.category,
        supplier.bankAccountName,
        supplier.bankName,
        supplier.bankClabe,
        supplier.bankRfc,
      ]
        .join(' ')
        .toLowerCase()
        .includes(query)
      const matchesStatus = statusFilter === 'Todos' || supplier.status === statusFilter
      return matchesText && matchesStatus
    })
  }, [suppliers, search, statusFilter])

  const activeCount = suppliers.filter((supplier) => supplier.status === 'Activo').length
  const inactiveCount = suppliers.length - activeCount

  function closeForm() {
    setOpen(false)
    setEditingId(null)
    setForm(emptyForm)
  }

  function openNew() {
    setEditingId(null)
    setForm(emptyForm)
    setOpen(true)
  }

  function openEdit(supplier: Supplier) {
    setEditingId(supplier.id)
    setForm({
      company: supplier.company,
      contact: supplier.contact,
      phone: supplier.phone,
      email: supplier.email,
      rfc: supplier.rfc,
      category: supplier.category,
      address: supplier.address,
      paymentTerms: supplier.paymentTerms,
      bankAccountName: supplier.bankAccountName,
      bankName: supplier.bankName,
      bankClabe: supplier.bankClabe,
      bankRfc: supplier.bankRfc,
      status: supplier.status,
      notes: supplier.notes,
    })
    setOpen(true)
  }

  function saveSupplier(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!form.company.trim()) return

    const cleanForm = {
      ...form,
      company: form.company.trim(),
      bankAccountName: form.bankAccountName.trim(),
      bankName: form.bankName.trim(),
      bankClabe: form.bankClabe.trim(),
      bankRfc: form.bankRfc.trim().toUpperCase(),
      rfc: form.rfc.trim().toUpperCase(),
    }

    if (editingId) {
      const next = suppliers.map((supplier) =>
        supplier.id === editingId
          ? { ...supplier, ...cleanForm }
          : supplier,
      )
      writeSuppliers(next)
      setSuppliers(next)
    } else {
      const supplier: Supplier = {
        id: crypto.randomUUID(),
        folio: nextSupplierFolio(),
        ...cleanForm,
        createdAt: new Date().toISOString(),
      }
      const next = [supplier, ...suppliers]
      writeSuppliers(next)
      setSuppliers(next)
    }

    closeForm()
  }

  function deleteSupplier(supplier: Supplier) {
    if (!window.confirm(`¿Eliminar al proveedor ${supplier.company}?`)) return
    const next = suppliers.filter((item) => item.id !== supplier.id)
    writeSuppliers(next)
    setSuppliers(next)
  }

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-[1600px] space-y-6">
        <PurchasingCloudMigration />
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#5496CC]">Compras y Suministros</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-[var(--foreground)]">Proveedores</h1>
            <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">Administra proveedores, datos fiscales, bancarios, categorías y condiciones de pago.</p>
          </div>
          <button type="button" onClick={openNew} className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#5496CC] px-4 text-sm font-semibold text-white transition hover:brightness-95">
            <Plus size={16} /> Nuevo proveedor
          </button>
        </header>

        <div className="grid gap-4 sm:grid-cols-3">
          <Metric label="Total proveedores" value={suppliers.length.toString()} detail="Registro general" />
          <Metric label="Activos" value={activeCount.toString()} detail="Disponibles para órdenes" />
          <Metric label="Inactivos" value={inactiveCount.toString()} detail="Suspendidos temporalmente" />
        </div>

        <div className="grid gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm md:grid-cols-[1fr_220px]">
          <div className="relative">
            <Search size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar proveedor, RFC, banco, contacto o categoría..." className="w-full rounded-xl border border-[var(--border)] bg-transparent py-3 pl-11 pr-4 text-sm text-[var(--foreground)] outline-none focus:border-[#5496CC]" />
          </div>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as 'Todos' | SupplierStatus)} className="rounded-xl border border-[var(--border)] bg-transparent px-4 py-3 text-sm text-[var(--foreground)] outline-none focus:border-[#5496CC]">
            <option>Todos</option><option>Activo</option><option>Inactivo</option>
          </select>
        </div>

        <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
          {filtered.length === 0 ? (
            <div className="px-6 py-16 text-center"><Truck className="mx-auto text-[#5496CC]" size={34} /><h2 className="mt-4 text-lg font-bold text-[var(--foreground)]">No hay proveedores registrados</h2><p className="mt-2 text-sm text-[var(--muted)]">Agrega el primer proveedor para comenzar a emitir órdenes de compra.</p></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1250px] text-left text-sm">
                <thead className="border-b border-[var(--border)] bg-[var(--surface-soft)] text-xs uppercase tracking-wide text-[var(--muted)]"><tr><th className="px-5 py-4">Folio</th><th className="px-5 py-4">Proveedor</th><th className="px-5 py-4">Contacto</th><th className="px-5 py-4">Categoría</th><th className="px-5 py-4">RFC</th><th className="px-5 py-4">Banco</th><th className="px-5 py-4">Condiciones</th><th className="px-5 py-4">Estado</th><th className="px-5 py-4">Acciones</th></tr></thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {filtered.map((supplier) => (
                    <tr key={supplier.id} className="hover:bg-[var(--surface-soft)]">
                      <td className="px-5 py-4 font-semibold text-[#5496CC]">{supplier.folio}</td>
                      <td className="px-5 py-4"><p className="font-semibold text-[var(--foreground)]">{supplier.company}</p><p className="mt-1 text-xs text-[var(--muted)]">{supplier.email || 'Sin correo'}</p></td>
                      <td className="px-5 py-4 text-[var(--foreground)]"><p>{supplier.contact || 'Sin contacto'}</p><p className="mt-1 text-xs text-[var(--muted)]">{supplier.phone || 'Sin teléfono'}</p></td>
                      <td className="px-5 py-4 text-[var(--foreground)]">{supplier.category}</td>
                      <td className="px-5 py-4 text-[var(--foreground)]">{supplier.rfc || 'Sin RFC'}</td>
                      <td className="px-5 py-4 text-[var(--foreground)]"><p>{supplier.bankName || 'Sin banco'}</p><p className="mt-1 text-xs text-[var(--muted)]">{maskedClabe(supplier.bankClabe)}</p></td>
                      <td className="px-5 py-4 text-[var(--foreground)]">{supplier.paymentTerms || 'Sin definir'}</td>
                      <td className="px-5 py-4"><span className={`rounded-full px-3 py-1.5 text-xs font-semibold ${supplier.status === 'Activo' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-500/10 text-slate-500'}`}>{supplier.status}</span></td>
                      <td className="px-5 py-4"><div className="flex gap-2"><button type="button" onClick={() => openEdit(supplier)} className="rounded-lg border border-[var(--border)] p-2 text-[var(--foreground)] hover:border-[#5496CC] hover:text-[#5496CC]" aria-label="Editar proveedor"><Pencil size={15} /></button><button type="button" onClick={() => deleteSupplier(supplier)} className="rounded-lg border border-red-500/20 p-2 text-red-500 hover:bg-red-500/10" aria-label="Eliminar proveedor"><Trash2 size={15} /></button></div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4">
          <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-[var(--surface)] p-6 shadow-2xl">
            <div className="mb-5 flex items-start justify-between"><div><p className="text-xs font-semibold uppercase tracking-wide text-[#5496CC]">Compras y Suministros</p><h2 className="mt-1 text-xl font-bold text-[var(--foreground)]">{editingId ? 'Editar proveedor' : 'Nuevo proveedor'}</h2></div><button type="button" onClick={closeForm} className="rounded-lg p-2 text-[var(--muted)] hover:bg-[var(--surface-soft)]"><X size={18} /></button></div>
            <form onSubmit={saveSupplier} className="space-y-6">
              <section>
                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-[#5496CC]">Datos del proveedor</p>
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Empresa / razón social *"><input required value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} className="input" /></Field>
                  <Field label="Contacto"><input value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} className="input" /></Field>
                  <Field label="Teléfono"><input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="input" /></Field>
                  <Field label="Correo"><input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="input" /></Field>
                  <Field label="RFC"><input value={form.rfc} onChange={(e) => setForm({ ...form, rfc: e.target.value.toUpperCase() })} className="input" /></Field>
                  <Field label="Categoría"><select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as SupplierCategory })} className="input">{categories.map((category) => <option key={category}>{category}</option>)}</select></Field>
                  <Field label="Condiciones de pago"><input value={form.paymentTerms} onChange={(e) => setForm({ ...form, paymentTerms: e.target.value })} placeholder="Ej. Crédito 30 días" className="input" /></Field>
                  <Field label="Estado"><select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as SupplierStatus })} className="input"><option>Activo</option><option>Inactivo</option></select></Field>
                  <Field label="Dirección" wide><textarea rows={2} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="input" /></Field>
                </div>
              </section>

              <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)]/40 p-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-[#5496CC]">Datos bancarios</p>
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Nombre"><input value={form.bankAccountName} onChange={(e) => setForm({ ...form, bankAccountName: e.target.value })} placeholder="Nombre del titular / beneficiario" className="input" /></Field>
                  <Field label="Banco"><input value={form.bankName} onChange={(e) => setForm({ ...form, bankName: e.target.value })} placeholder="Ej. BBVA" className="input" /></Field>
                  <Field label="CLABE / clave"><input value={form.bankClabe} onChange={(e) => setForm({ ...form, bankClabe: e.target.value })} placeholder="Clave bancaria" className="input" /></Field>
                  <Field label="RFC"><input value={form.bankRfc} onChange={(e) => setForm({ ...form, bankRfc: e.target.value.toUpperCase() })} placeholder="RFC asociado a la cuenta" className="input" /></Field>
                </div>
              </section>

              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Notas" wide><textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="input" /></Field>
              </div>
              <div className="flex justify-end gap-3"><button type="button" onClick={closeForm} className="rounded-xl border border-[var(--border)] px-5 py-3 font-semibold text-[var(--foreground)]">Cancelar</button><button type="submit" className="rounded-xl bg-[#5496CC] px-5 py-3 font-semibold text-white">{editingId ? 'Guardar cambios' : 'Crear proveedor'}</button></div>
            </form>
          </div>
        </div>
      ) : null}

      <style jsx global>{`.input{width:100%;border:1px solid var(--border);border-radius:.75rem;background:transparent;padding:.75rem 1rem;color:var(--foreground);outline:none}.input:focus{border-color:#5496CC}`}</style>
    </AppShell>
  )
}

function Metric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm"><p className="text-2xl font-bold text-[var(--foreground)]">{value}</p><p className="mt-1 text-sm font-semibold text-[var(--foreground)]">{label}</p><p className="mt-1 text-xs text-[var(--muted)]">{detail}</p></div>
}

function Field({ label, children, wide = false }: { label: string; children: React.ReactNode; wide?: boolean }) {
  return <label className={`space-y-2 ${wide ? 'md:col-span-2' : ''}`}><span className="text-sm font-semibold text-[var(--foreground)]">{label}</span>{children}</label>
}
