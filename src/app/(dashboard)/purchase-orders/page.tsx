'use client'

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { Eye, Plus, Search, ShoppingCart, Trash2, X } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import {
  PURCHASE_ORDERS_STORAGE_KEY,
  PURCHASING_UPDATED_EVENT,
  calculateOrderTotals,
  nextPurchaseOrderFolio,
  readConvertedProjects,
  readPurchaseOrders,
  readRequisitions,
  readSuppliers,
  writePurchaseOrders,
  writeRequisitions,
  type PurchaseOrder,
  type PurchaseOrderItem,
  type PurchaseOrderStatus,
  type PurchasingCurrency,
  type Requisition,
  type Supplier,
} from '@/features/purchasing/purchasingStorage'

type DraftOrderItem = {
  id: string
  description: string
  unit: PurchaseOrderItem['unit']
  quantity: string
  unitPrice: string
}

const statuses: PurchaseOrderStatus[] = ['Borrador', 'Emitida', 'Confirmada', 'Recibida', 'Cancelada']

function today() {
  return new Date().toISOString().slice(0, 10)
}

function money(value: number, currency: PurchasingCurrency) {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

function statusClass(status: PurchaseOrderStatus) {
  if (status === 'Recibida') return 'bg-emerald-500/10 text-emerald-500'
  if (status === 'Cancelada') return 'bg-red-500/10 text-red-500'
  if (status === 'Confirmada') return 'bg-blue-500/10 text-blue-500'
  if (status === 'Emitida') return 'bg-amber-500/10 text-amber-500'
  return 'bg-slate-500/10 text-slate-500'
}

export default function PurchaseOrdersPage() {
  const [orders, setOrders] = useState<PurchaseOrder[]>([])
  const [requisitions, setRequisitions] = useState<Requisition[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'Todas' | PurchaseOrderStatus>('Todas')
  const [open, setOpen] = useState(false)
  const [viewing, setViewing] = useState<PurchaseOrder | null>(null)
  const [requisitionId, setRequisitionId] = useState('')
  const [supplierId, setSupplierId] = useState('')
  const [currency, setCurrency] = useState<PurchasingCurrency>('MXN')
  const [orderDate, setOrderDate] = useState(today())
  const [deliveryDate, setDeliveryDate] = useState('')
  const [taxRate, setTaxRate] = useState('16')
  const [status, setStatus] = useState<PurchaseOrderStatus>('Borrador')
  const [notes, setNotes] = useState('')
  const [items, setItems] = useState<DraftOrderItem[]>([])

  const loadData = useCallback(() => {
    setOrders(readPurchaseOrders())
    setRequisitions(readRequisitions())
    setSuppliers(readSuppliers())
  }, [])

  useEffect(() => {
    loadData()
    const handleStorage = (event: StorageEvent) => {
      if (
        event.key === PURCHASE_ORDERS_STORAGE_KEY ||
        event.key === 'nedvi_requisitions' ||
        event.key === 'nedvi_suppliers'
      ) loadData()
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

  const availableRequisitions = useMemo(() => {
    const orderedIds = new Set(orders.map((order) => order.requisitionId))
    return requisitions.filter(
      (requisition) => requisition.status === 'Aprobada' && !orderedIds.has(requisition.id),
    )
  }, [requisitions, orders])

  const activeSuppliers = useMemo(
    () => suppliers.filter((supplier) => supplier.status === 'Activo'),
    [suppliers],
  )

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    return orders.filter((order) => {
      const matchesText = [
        order.folio,
        order.requisitionFolio,
        order.projectFolio,
        order.projectName,
        order.client,
        order.supplier.company,
      ]
        .join(' ')
        .toLowerCase()
        .includes(query)
      const matchesStatus = statusFilter === 'Todas' || order.status === statusFilter
      return matchesText && matchesStatus
    })
  }, [orders, search, statusFilter])

  const totalMXN = orders
    .filter((order) => order.currency === 'MXN' && order.status !== 'Cancelada')
    .reduce((sum, order) => sum + order.total, 0)
  const totalUSD = orders
    .filter((order) => order.currency === 'USD' && order.status !== 'Cancelada')
    .reduce((sum, order) => sum + order.total, 0)
  const receivedCount = orders.filter((order) => order.status === 'Recibida').length

  const draftItems: PurchaseOrderItem[] = items
    .filter((item) => item.description.trim())
    .map((item) => ({
      id: item.id,
      description: item.description.trim(),
      unit: item.unit,
      quantity: Number(item.quantity || 0),
      unitPrice: Number(item.unitPrice || 0),
    }))
  const formTotals = calculateOrderTotals(draftItems, Number(taxRate || 0))

  function resetForm() {
    setRequisitionId('')
    setSupplierId('')
    setCurrency('MXN')
    setOrderDate(today())
    setDeliveryDate('')
    setTaxRate('16')
    setStatus('Borrador')
    setNotes('')
    setItems([])
  }

  function closeForm() {
    setOpen(false)
    resetForm()
  }

  function handleRequisitionChange(id: string) {
    setRequisitionId(id)
    const requisition = requisitions.find((item) => item.id === id)
    if (!requisition) {
      setItems([])
      return
    }

    const project = readConvertedProjects().find((item) => item.id === requisition.projectQuoteId)
    setCurrency(project?.currency ?? 'MXN')
    setItems(
      requisition.items.map((item) => ({
        id: crypto.randomUUID(),
        description: item.description,
        unit: item.unit,
        quantity: String(item.quantity),
        unitPrice: item.estimatedUnitPrice ? String(item.estimatedUnitPrice) : '',
      })),
    )
  }

  function updateItem(id: string, field: keyof DraftOrderItem, value: string) {
    setItems((current) => current.map((item) => (item.id === id ? { ...item, [field]: value } : item)))
  }

  function saveOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const requisition = requisitions.find((item) => item.id === requisitionId)
    const supplier = suppliers.find((item) => item.id === supplierId)

    if (!requisition || requisition.status !== 'Aprobada') {
      alert('Selecciona una requisición aprobada.')
      return
    }
    if (!supplier || supplier.status !== 'Activo') {
      alert('Selecciona un proveedor activo.')
      return
    }
    if (!draftItems.length || draftItems.some((item) => item.quantity <= 0)) {
      alert('Revisa las partidas de la orden.')
      return
    }

    const totals = calculateOrderTotals(draftItems, Number(taxRate || 0))
    const order: PurchaseOrder = {
      id: crypto.randomUUID(),
      folio: nextPurchaseOrderFolio(),
      requisitionId: requisition.id,
      requisitionFolio: requisition.folio,
      projectQuoteId: requisition.projectQuoteId,
      projectFolio: requisition.projectFolio,
      projectName: requisition.projectName,
      client: requisition.client,
      supplierId: supplier.id,
      supplier: {
        company: supplier.company,
        contact: supplier.contact,
        phone: supplier.phone,
        email: supplier.email,
        rfc: supplier.rfc,
        address: supplier.address,
        paymentTerms: supplier.paymentTerms,
      },
      currency,
      orderDate,
      deliveryDate,
      taxRate: Number(taxRate || 0),
      items: draftItems,
      ...totals,
      status,
      notes: notes.trim(),
      createdAt: new Date().toISOString(),
    }

    const nextOrders = [order, ...orders]
    const nextRequisitions = requisitions.map((item) =>
      item.id === requisition.id ? { ...item, status: 'Ordenada' as const } : item,
    )
    writePurchaseOrders(nextOrders)
    writeRequisitions(nextRequisitions)
    setOrders(nextOrders)
    setRequisitions(nextRequisitions)
    closeForm()
  }

  function changeStatus(id: string, nextStatus: PurchaseOrderStatus) {
    const next = orders.map((order) => (order.id === id ? { ...order, status: nextStatus } : order))
    writePurchaseOrders(next)
    setOrders(next)
  }

  function deleteOrder(order: PurchaseOrder) {
    if (!window.confirm(`¿Eliminar la orden ${order.folio}? La requisición volverá a estado Aprobada.`)) return
    const nextOrders = orders.filter((item) => item.id !== order.id)
    const nextRequisitions = requisitions.map((item) =>
      item.id === order.requisitionId ? { ...item, status: 'Aprobada' as const } : item,
    )
    writePurchaseOrders(nextOrders)
    writeRequisitions(nextRequisitions)
    setOrders(nextOrders)
    setRequisitions(nextRequisitions)
  }

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-[1600px] space-y-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#5496CC]">Compras y Suministros</p><h1 className="mt-2 text-3xl font-bold tracking-tight text-[var(--foreground)]">Órdenes de compra</h1><p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">Convierte requisiciones aprobadas en órdenes formales para proveedores.</p></div>
          <button type="button" onClick={() => { resetForm(); setOpen(true) }} className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#5496CC] px-4 text-sm font-semibold text-white transition hover:brightness-95"><Plus size={16} /> Nueva orden</button>
        </header>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Metric label="Total órdenes" value={orders.length.toString()} detail="Histórico registrado" /><Metric label="Recibidas" value={receivedCount.toString()} detail="Compras completadas" /><Metric label="Compras MXN" value={money(totalMXN, 'MXN')} detail="Sin canceladas" /><Metric label="Compras USD" value={money(totalUSD, 'USD')} detail="Sin canceladas" /></div>

        <div className="grid gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm md:grid-cols-[1fr_220px]"><div className="relative"><Search size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--muted)]" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar orden, requisición, proyecto o proveedor..." className="w-full rounded-xl border border-[var(--border)] bg-transparent py-3 pl-11 pr-4 text-sm text-[var(--foreground)] outline-none focus:border-[#5496CC]" /></div><select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as 'Todas' | PurchaseOrderStatus)} className="rounded-xl border border-[var(--border)] bg-transparent px-4 py-3 text-sm text-[var(--foreground)] outline-none"><option>Todas</option>{statuses.map((item) => <option key={item}>{item}</option>)}</select></div>

        <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
          {filtered.length === 0 ? <div className="px-6 py-16 text-center"><ShoppingCart className="mx-auto text-[#5496CC]" size={34} /><h2 className="mt-4 text-lg font-bold text-[var(--foreground)]">No hay órdenes de compra</h2><p className="mt-2 text-sm text-[var(--muted)]">Aprueba una requisición y registra un proveedor activo para crear la primera orden.</p></div> : <div className="overflow-x-auto"><table className="w-full min-w-[1250px] text-left text-sm"><thead className="border-b border-[var(--border)] bg-[var(--surface-soft)] text-xs uppercase tracking-wide text-[var(--muted)]"><tr><th className="px-5 py-4">Orden</th><th className="px-5 py-4">Proyecto</th><th className="px-5 py-4">Proveedor</th><th className="px-5 py-4">Requisición</th><th className="px-5 py-4">Total</th><th className="px-5 py-4">Entrega</th><th className="px-5 py-4">Estado</th><th className="px-5 py-4">Acciones</th></tr></thead><tbody className="divide-y divide-[var(--border)]">{filtered.map((order) => <tr key={order.id} className="hover:bg-[var(--surface-soft)]"><td className="px-5 py-4 font-semibold text-[#5496CC]">{order.folio}</td><td className="px-5 py-4"><p className="font-semibold text-[var(--foreground)]">{order.projectName}</p><p className="mt-1 text-xs text-[var(--muted)]">{order.projectFolio} · {order.client}</p></td><td className="px-5 py-4 text-[var(--foreground)]">{order.supplier.company}</td><td className="px-5 py-4 text-[var(--foreground)]">{order.requisitionFolio}</td><td className="px-5 py-4 font-semibold text-[var(--foreground)]">{money(order.total, order.currency)}</td><td className="px-5 py-4 text-[var(--foreground)]">{order.deliveryDate || 'Sin fecha'}</td><td className="px-5 py-4"><select value={order.status} onChange={(e) => changeStatus(order.id, e.target.value as PurchaseOrderStatus)} className={`rounded-full border-0 px-3 py-1.5 text-xs font-semibold outline-none ${statusClass(order.status)}`}>{statuses.map((item) => <option key={item}>{item}</option>)}</select></td><td className="px-5 py-4"><div className="flex gap-2"><button type="button" onClick={() => setViewing(order)} className="rounded-lg border border-[var(--border)] p-2 text-[var(--foreground)] hover:border-[#5496CC] hover:text-[#5496CC]"><Eye size={15} /></button><button type="button" onClick={() => deleteOrder(order)} className="rounded-lg border border-red-500/20 p-2 text-red-500 hover:bg-red-500/10"><Trash2 size={15} /></button></div></td></tr>)}</tbody></table></div>}
        </div>
      </div>

      {open ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4"><div className="max-h-[94vh] w-full max-w-5xl overflow-y-auto rounded-2xl bg-[var(--surface)] p-6 shadow-2xl"><div className="mb-5 flex items-start justify-between"><div><p className="text-xs font-semibold uppercase tracking-wide text-[#5496CC]">Compras y Suministros</p><h2 className="mt-1 text-xl font-bold text-[var(--foreground)]">Nueva orden de compra</h2></div><button type="button" onClick={closeForm} className="rounded-lg p-2 text-[var(--muted)]"><X size={18} /></button></div>
        <form onSubmit={saveOrder} className="space-y-6"><div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3"><Field label="Requisición aprobada *"><select required value={requisitionId} onChange={(e) => handleRequisitionChange(e.target.value)} className="po-input"><option value="">Seleccionar requisición</option>{availableRequisitions.map((item) => <option key={item.id} value={item.id}>{item.folio} — {item.projectName}</option>)}</select></Field><Field label="Proveedor *"><select required value={supplierId} onChange={(e) => setSupplierId(e.target.value)} className="po-input"><option value="">Seleccionar proveedor</option>{activeSuppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.folio} — {supplier.company}</option>)}</select></Field><Field label="Moneda"><select value={currency} onChange={(e) => setCurrency(e.target.value as PurchasingCurrency)} className="po-input"><option value="MXN">MXN</option><option value="USD">USD</option></select></Field><Field label="Fecha de orden"><input type="date" value={orderDate} onChange={(e) => setOrderDate(e.target.value)} className="po-input" /></Field><Field label="Fecha de entrega"><input type="date" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} className="po-input" /></Field><Field label="IVA (%)"><input type="number" min="0" step="0.01" value={taxRate} onChange={(e) => setTaxRate(e.target.value)} className="po-input" /></Field><Field label="Estado"><select value={status} onChange={(e) => setStatus(e.target.value as PurchaseOrderStatus)} className="po-input">{statuses.map((item) => <option key={item}>{item}</option>)}</select></Field></div>
        <section><div className="mb-3"><h3 className="font-semibold text-[var(--foreground)]">Partidas de compra</h3><p className="text-xs text-[var(--muted)]">Se cargan desde la requisición; puedes ajustar cantidades y precios.</p></div><div className="space-y-3">{items.length === 0 ? <div className="rounded-xl border border-dashed border-[var(--border)] p-8 text-center text-sm text-[var(--muted)]">Selecciona una requisición aprobada.</div> : items.map((item) => <div key={item.id} className="grid gap-2 rounded-xl border border-[var(--border)] p-3 md:grid-cols-[minmax(240px,1fr)_160px_110px_160px]"><input value={item.description} readOnly className="po-input opacity-80" /><input value={item.unit} readOnly className="po-input opacity-80" /><input type="number" min="0.01" step="0.01" value={item.quantity} onChange={(e) => updateItem(item.id, 'quantity', e.target.value)} className="po-input" /><input type="number" min="0" step="0.01" value={item.unitPrice} onChange={(e) => updateItem(item.id, 'unitPrice', e.target.value)} className="po-input" /></div>)}</div></section>
        <Field label="Notas"><textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Condiciones, instrucciones de entrega, observaciones..." className="po-input" /></Field><div className="grid gap-3 rounded-2xl bg-[var(--surface-soft)] p-4 sm:grid-cols-3"><Summary label="Subtotal" value={money(formTotals.subtotal, currency)} /><Summary label={`IVA (${taxRate || 0}%)`} value={money(formTotals.tax, currency)} /><Summary label="Total" value={money(formTotals.total, currency)} accent /></div><div className="flex justify-end gap-3"><button type="button" onClick={closeForm} className="rounded-xl border border-[var(--border)] px-5 py-3 font-semibold text-[var(--foreground)]">Cancelar</button><button type="submit" className="rounded-xl bg-[#5496CC] px-5 py-3 font-semibold text-white">Crear orden</button></div></form>
      </div></div> : null}

      {viewing ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4"><div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-[var(--surface)] p-6 shadow-2xl"><div className="flex items-start justify-between border-b border-[var(--border)] pb-5"><div><p className="text-xs font-semibold uppercase tracking-wide text-[#5496CC]">{viewing.folio}</p><h2 className="mt-1 text-2xl font-bold text-[var(--foreground)]">{viewing.projectName}</h2><p className="mt-1 text-sm text-[var(--muted)]">Proveedor: {viewing.supplier.company}</p></div><button type="button" onClick={() => setViewing(null)} className="rounded-lg p-2 text-[var(--muted)]"><X size={18} /></button></div><div className="mt-5 grid gap-3 sm:grid-cols-3"><Summary label="Subtotal" value={money(viewing.subtotal, viewing.currency)} /><Summary label={`IVA (${viewing.taxRate}%)`} value={money(viewing.tax, viewing.currency)} /><Summary label="Total" value={money(viewing.total, viewing.currency)} accent /></div><div className="mt-5 overflow-hidden rounded-2xl border border-[var(--border)]"><table className="w-full text-left text-sm"><thead className="bg-[var(--surface-soft)] text-xs uppercase text-[var(--muted)]"><tr><th className="px-5 py-4">Descripción</th><th className="px-5 py-4">UM</th><th className="px-5 py-4 text-right">Cantidad</th><th className="px-5 py-4 text-right">P. Unitario</th><th className="px-5 py-4 text-right">Importe</th></tr></thead><tbody className="divide-y divide-[var(--border)]">{viewing.items.map((item) => <tr key={item.id}><td className="px-5 py-4 text-[var(--foreground)]">{item.description}</td><td className="px-5 py-4 text-[var(--muted)]">{item.unit}</td><td className="px-5 py-4 text-right text-[var(--foreground)]">{item.quantity}</td><td className="px-5 py-4 text-right text-[var(--foreground)]">{money(item.unitPrice, viewing.currency)}</td><td className="px-5 py-4 text-right font-semibold text-[var(--foreground)]">{money(item.quantity * item.unitPrice, viewing.currency)}</td></tr>)}</tbody></table></div><div className="mt-5 grid gap-4 md:grid-cols-2"><div className="rounded-2xl border border-[var(--border)] p-4 text-sm text-[var(--foreground)]"><p className="text-xs font-semibold uppercase text-[var(--muted)]">Proveedor</p><p className="mt-3 font-semibold">{viewing.supplier.company}</p><p className="mt-1">{viewing.supplier.contact || 'Sin contacto'}</p><p className="mt-1">{viewing.supplier.email || 'Sin correo'}</p><p className="mt-1">{viewing.supplier.phone || 'Sin teléfono'}</p><p className="mt-1">RFC: {viewing.supplier.rfc || 'Sin RFC'}</p></div><div className="rounded-2xl border border-[var(--border)] p-4 text-sm text-[var(--foreground)]"><p className="text-xs font-semibold uppercase text-[var(--muted)]">Datos de orden</p><p className="mt-3">Requisición: {viewing.requisitionFolio}</p><p className="mt-1">Fecha: {viewing.orderDate}</p><p className="mt-1">Entrega: {viewing.deliveryDate || 'Sin fecha'}</p><p className="mt-1">Condiciones: {viewing.supplier.paymentTerms || 'Sin definir'}</p><p className="mt-3 whitespace-pre-wrap">{viewing.notes || 'Sin notas.'}</p></div></div></div></div> : null}

      <style jsx global>{`.po-input{width:100%;border:1px solid var(--border);border-radius:.75rem;background:transparent;padding:.7rem .9rem;color:var(--foreground);outline:none}.po-input:focus{border-color:#5496CC}`}</style>
    </AppShell>
  )
}

function Metric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm"><p className="break-words text-2xl font-bold text-[var(--foreground)]">{value}</p><p className="mt-1 text-sm font-semibold text-[var(--foreground)]">{label}</p><p className="mt-1 text-xs text-[var(--muted)]">{detail}</p></div>
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block space-y-2"><span className="text-sm font-semibold text-[var(--foreground)]">{label}</span>{children}</label>
}
function Summary({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return <div><p className="text-xs uppercase text-[var(--muted)]">{label}</p><p className={`mt-1 text-lg font-bold ${accent ? 'text-[#5496CC]' : 'text-[var(--foreground)]'}`}>{value}</p></div>
}
