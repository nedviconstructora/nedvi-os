'use client'
import { PurchasingCloudMigration } from '@/features/purchasing/PurchasingCloudMigration'

import Link from 'next/link'
import { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import {
  Download,
  Eye,
  Paperclip,
  Pencil,
  Plus,
  Search,
  ShoppingCart,
  Trash2,
  Upload,
  X,
} from 'lucide-react'
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

type PaymentFilter = 'Todas' | 'Pendiente de pago' | 'Pagada'

type ProofFile = {
  id: string
  name: string
  type: string
  size: number
  dataUrl: string
  uploadedAt: string
}

const PROOFS_STORAGE_KEY = 'nedvi_purchase_order_proofs'
const MAX_PROOF_FILES = 5
const MAX_PROOF_SIZE = 2 * 1024 * 1024

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

function paymentLabel(order: PurchaseOrder): Exclude<PaymentFilter, 'Todas'> {
  return order.status === 'Recibida' ? 'Pagada' : 'Pendiente de pago'
}

function paymentClass(order: PurchaseOrder) {
  return order.status === 'Recibida'
    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-500'
    : 'border-amber-500/30 bg-amber-500/10 text-amber-500'
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function readProofs(): Record<string, ProofFile[]> {
  if (typeof window === 'undefined') return {}
  const raw = window.localStorage.getItem(PROOFS_STORAGE_KEY)
  if (!raw) return {}

  try {
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}

    const result: Record<string, ProofFile[]> = {}
    for (const [orderId, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (!Array.isArray(value)) continue
      result[orderId] = value
        .filter((item): item is Record<string, unknown> => typeof item === 'object' && item !== null)
        .filter(
          (item) =>
            typeof item.id === 'string' &&
            typeof item.name === 'string' &&
            typeof item.dataUrl === 'string',
        )
        .map((item) => ({
          id: item.id as string,
          name: item.name as string,
          type: typeof item.type === 'string' ? item.type : '',
          size: typeof item.size === 'number' ? item.size : 0,
          dataUrl: item.dataUrl as string,
          uploadedAt: typeof item.uploadedAt === 'string' ? item.uploadedAt : '',
        }))
    }
    return result
  } catch {
    return {}
  }
}

function writeProofs(value: Record<string, ProofFile[]>) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(PROOFS_STORAGE_KEY, JSON.stringify(value))
}

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '')
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

export default function PurchaseOrdersPage() {
  const [orders, setOrders] = useState<PurchaseOrder[]>([])
  const [requisitions, setRequisitions] = useState<Requisition[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [proofsByOrderId, setProofsByOrderId] = useState<Record<string, ProofFile[]>>({})
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<PaymentFilter>('Todas')
  const [open, setOpen] = useState(false)
  const [viewing, setViewing] = useState<PurchaseOrder | null>(null)
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null)
  const [requisitionId, setRequisitionId] = useState('')
  const [supplierId, setSupplierId] = useState('')
  const [currency, setCurrency] = useState<PurchasingCurrency>('MXN')
  const [orderDate, setOrderDate] = useState(today())
  const [deliveryDate, setDeliveryDate] = useState('')
  const [taxRate, setTaxRate] = useState('16')
  const [notes, setNotes] = useState('')
  const [items, setItems] = useState<DraftOrderItem[]>([])
  const [proofFiles, setProofFiles] = useState<ProofFile[]>([])

  const loadData = useCallback(() => {
    setOrders(readPurchaseOrders())
    setRequisitions(readRequisitions())
    setSuppliers(readSuppliers())
    setProofsByOrderId(readProofs())
  }, [])

  useEffect(() => {
    loadData()
    const handleStorage = (event: StorageEvent) => {
      if (
        event.key === PURCHASE_ORDERS_STORAGE_KEY ||
        event.key === 'nedvi_requisitions' ||
        event.key === 'nedvi_suppliers' ||
        event.key === PROOFS_STORAGE_KEY
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

  const editingOrder = editingOrderId
    ? orders.find((order) => order.id === editingOrderId) ?? null
    : null

  const availableRequisitions = useMemo(() => {
    const orderedIds = new Set(
      orders
        .filter((order) => order.id !== editingOrderId)
        .map((order) => order.requisitionId),
    )

    return requisitions.filter(
      (requisition) =>
        (requisition.status === 'Aprobada' || requisition.id === editingOrder?.requisitionId) &&
        !orderedIds.has(requisition.id),
    )
  }, [requisitions, orders, editingOrderId, editingOrder])

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
      const matchesStatus = statusFilter === 'Todas' || paymentLabel(order) === statusFilter
      return matchesText && matchesStatus
    })
  }, [orders, search, statusFilter])

  const totalMXN = orders
    .filter((order) => order.currency === 'MXN')
    .reduce((sum, order) => sum + order.total, 0)
  const totalUSD = orders
    .filter((order) => order.currency === 'USD')
    .reduce((sum, order) => sum + order.total, 0)
  const paidCount = orders.filter((order) => order.status === 'Recibida').length

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
    setEditingOrderId(null)
    setRequisitionId('')
    setSupplierId('')
    setCurrency('MXN')
    setOrderDate(today())
    setDeliveryDate('')
    setTaxRate('16')
    setNotes('')
    setItems([])
    setProofFiles([])
  }

  function openNewOrder() {
    resetForm()
    setOpen(true)
  }

  function openEditOrder(order: PurchaseOrder) {
    setEditingOrderId(order.id)
    setRequisitionId(order.requisitionId)
    setSupplierId(order.supplierId)
    setCurrency(order.currency)
    setOrderDate(order.orderDate)
    setDeliveryDate(order.deliveryDate)
    setTaxRate(String(order.taxRate))
    setNotes(order.notes)
    setItems(
      order.items.map((item) => ({
        id: item.id,
        description: item.description,
        unit: item.unit,
        quantity: String(item.quantity),
        unitPrice: String(item.unitPrice),
      })),
    )
    setProofFiles(proofsByOrderId[order.id] ?? [])
    setOpen(true)
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

  async function handleProofUpload(event: ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files ?? [])
    event.target.value = ''
    if (!selected.length) return

    if (proofFiles.length + selected.length > MAX_PROOF_FILES) {
      alert(`Puedes guardar hasta ${MAX_PROOF_FILES} comprobantes por orden.`)
      return
    }

    const accepted: ProofFile[] = []
    for (const file of selected) {
      if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
        alert(`${file.name}: usa una imagen o PDF.`)
        continue
      }
      if (file.size > MAX_PROOF_SIZE) {
        alert(`${file.name}: el archivo supera 2 MB.`)
        continue
      }

      try {
        accepted.push({
          id: crypto.randomUUID(),
          name: file.name,
          type: file.type,
          size: file.size,
          dataUrl: await fileToDataUrl(file),
          uploadedAt: new Date().toISOString(),
        })
      } catch {
        alert(`No se pudo leer ${file.name}.`)
      }
    }

    if (accepted.length) setProofFiles((current) => [...current, ...accepted])
  }

  function removeProof(id: string) {
    setProofFiles((current) => current.filter((file) => file.id !== id))
  }

  function saveOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const requisition = requisitions.find((item) => item.id === requisitionId)
    const supplier = suppliers.find((item) => item.id === supplierId)
    const existingOrder = editingOrderId
      ? orders.find((item) => item.id === editingOrderId)
      : undefined

    const requisitionIsAllowed =
      requisition &&
      (requisition.status === 'Aprobada' || requisition.id === existingOrder?.requisitionId)

    if (!requisition || !requisitionIsAllowed) {
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

    if (deliveryDate && orderDate && deliveryDate < orderDate) {
      alert('La fecha de entrega no puede ser anterior a la fecha de la orden.')
      return
    }

    const totals = calculateOrderTotals(draftItems, Number(taxRate || 0))
    const order: PurchaseOrder = {
      id: existingOrder?.id ?? crypto.randomUUID(),
      folio: existingOrder?.folio ?? nextPurchaseOrderFolio(),
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
      status: existingOrder?.status === 'Recibida' ? 'Recibida' : 'Borrador',
      notes: notes.trim(),
      createdAt: existingOrder?.createdAt ?? new Date().toISOString(),
    }

    const nextOrders = existingOrder
      ? orders.map((item) => (item.id === existingOrder.id ? order : item))
      : [order, ...orders]

    const nextRequisitions = requisitions.map((item) => {
      if (existingOrder && item.id === existingOrder.requisitionId && item.id !== requisition.id) {
        return { ...item, status: 'Aprobada' as const }
      }
      if (item.id === requisition.id) return { ...item, status: 'Ordenada' as const }
      return item
    })

    const nextProofs = { ...proofsByOrderId, [order.id]: proofFiles }
    writePurchaseOrders(nextOrders)
    writeRequisitions(nextRequisitions)
    writeProofs(nextProofs)
    setOrders(nextOrders)
    setRequisitions(nextRequisitions)
    setProofsByOrderId(nextProofs)
    closeForm()
  }

  function togglePayment(order: PurchaseOrder) {
    const next = orders.map((item) =>
      item.id === order.id
        ? { ...item, status: item.status === 'Recibida' ? ('Borrador' as const) : ('Recibida' as const) }
        : item,
    )
    writePurchaseOrders(next)
    setOrders(next)
    if (viewing?.id === order.id) {
      setViewing(next.find((item) => item.id === order.id) ?? null)
    }
  }

  function deleteOrder(order: PurchaseOrder) {
    if (!window.confirm(`¿Eliminar la orden ${order.folio}? La requisición volverá a estado Aprobada.`)) return
    const nextOrders = orders.filter((item) => item.id !== order.id)
    const nextRequisitions = requisitions.map((item) =>
      item.id === order.requisitionId ? { ...item, status: 'Aprobada' as const } : item,
    )
    const nextProofs = { ...proofsByOrderId }
    delete nextProofs[order.id]
    writePurchaseOrders(nextOrders)
    writeRequisitions(nextRequisitions)
    writeProofs(nextProofs)
    setOrders(nextOrders)
    setRequisitions(nextRequisitions)
    setProofsByOrderId(nextProofs)
    if (viewing?.id === order.id) setViewing(null)
  }

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-[1600px] space-y-6">
        <PurchasingCloudMigration />
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#5496CC]">Compras y Suministros</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-[var(--foreground)]">Órdenes de compra</h1>
            <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">Controla órdenes, comprobantes y el estado de pago a proveedores.</p>
          </div>
          <button type="button" onClick={openNewOrder} className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#5496CC] px-4 text-sm font-semibold text-white transition hover:brightness-95"><Plus size={16} /> Nueva orden</button>
        </header>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Metric label="Total órdenes" value={orders.length.toString()} detail="Histórico registrado" />
          <Metric label="Pagadas" value={paidCount.toString()} detail="Pago completado" />
          <Metric label="Compras MXN" value={money(totalMXN, 'MXN')} detail="Total registrado" />
          <Metric label="Compras USD" value={money(totalUSD, 'USD')} detail="Total registrado" />
        </div>

        <div className="grid gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm md:grid-cols-[1fr_220px]">
          <div className="relative"><Search size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--muted)]" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar orden, requisición, proyecto o proveedor..." className="w-full rounded-xl border border-[var(--border)] bg-transparent py-3 pl-11 pr-4 text-sm text-[var(--foreground)] outline-none focus:border-[#5496CC]" /></div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as PaymentFilter)} className="rounded-xl border border-[var(--border)] bg-transparent px-4 py-3 text-sm text-[var(--foreground)] outline-none"><option value="Todas">Todas</option><option value="Pendiente de pago">Pendiente de pago</option><option value="Pagada">Pagada</option></select>
        </div>

        <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
          {filtered.length === 0 ? (
            <div className="px-6 py-16 text-center"><ShoppingCart className="mx-auto text-[#5496CC]" size={34} /><h2 className="mt-4 text-lg font-bold text-[var(--foreground)]">No hay órdenes de compra</h2><p className="mt-2 text-sm text-[var(--muted)]">Aprueba una requisición y registra un proveedor activo para crear la primera orden.</p></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1380px] text-left text-sm">
                <thead className="border-b border-[var(--border)] bg-[var(--surface-soft)] text-xs uppercase tracking-wide text-[var(--muted)]"><tr><th className="px-5 py-4">Orden</th><th className="px-5 py-4">Proyecto</th><th className="px-5 py-4">Proveedor</th><th className="px-5 py-4">Requisición</th><th className="px-5 py-4">Total</th><th className="px-5 py-4">Entrega</th><th className="px-5 py-4">Comprobantes</th><th className="px-5 py-4">Pago</th><th className="px-5 py-4">Acciones</th></tr></thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {filtered.map((order) => {
                    const proofs = proofsByOrderId[order.id] ?? []
                    return (
                      <tr key={order.id} className="hover:bg-[var(--surface-soft)]">
                        <td className="px-5 py-4 font-semibold text-[#5496CC]">{order.folio}</td>
                        <td className="px-5 py-4"><p className="font-semibold text-[var(--foreground)]">{order.projectName}</p><p className="mt-1 text-xs text-[var(--muted)]">{order.projectFolio} · {order.client}</p></td>
                        <td className="px-5 py-4 text-[var(--foreground)]">{order.supplier.company}</td>
                        <td className="px-5 py-4 text-[var(--foreground)]">{order.requisitionFolio}</td>
                        <td className="px-5 py-4 font-semibold text-[var(--foreground)]">{money(order.total, order.currency)}</td>
                        <td className="px-5 py-4 text-[var(--foreground)]">{order.deliveryDate || 'Sin fecha'}</td>
                        <td className="px-5 py-4"><span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--foreground)]"><Paperclip size={14} className="text-[#5496CC]" /> {proofs.length || 'Sin archivos'}</span></td>
                        <td className="px-5 py-4"><button type="button" onClick={() => togglePayment(order)} className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${paymentClass(order)}`}>{paymentLabel(order)}</button></td>
                        <td className="px-5 py-4"><div className="flex gap-2"><button type="button" onClick={() => setViewing(order)} title="Ver orden" className="rounded-lg border border-[var(--border)] p-2 text-[var(--foreground)] hover:border-[#5496CC] hover:text-[#5496CC]"><Eye size={15} /></button><button type="button" onClick={() => openEditOrder(order)} title="Editar orden" className="rounded-lg border border-[var(--border)] p-2 text-[var(--foreground)] hover:border-[#5496CC] hover:text-[#5496CC]"><Pencil size={15} /></button><button type="button" onClick={() => deleteOrder(order)} title="Eliminar orden" className="rounded-lg border border-red-500/20 p-2 text-red-500 hover:bg-red-500/10"><Trash2 size={15} /></button></div></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4">
          <div className="max-h-[94vh] w-full max-w-5xl overflow-y-auto rounded-2xl bg-[var(--surface)] p-6 shadow-2xl">
            <div className="mb-5 flex items-start justify-between"><div><p className="text-xs font-semibold uppercase tracking-wide text-[#5496CC]">Compras y Suministros</p><h2 className="mt-1 text-xl font-bold text-[var(--foreground)]">{editingOrder ? `Editar ${editingOrder.folio}` : 'Nueva orden de compra'}</h2></div><button type="button" onClick={closeForm} className="rounded-lg p-2 text-[var(--muted)]"><X size={18} /></button></div>
            <form onSubmit={saveOrder} className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-semibold text-[var(--foreground)]">Requisición aprobada *</span>
                    <Link
                      href="/requisitions"
                      className="inline-flex items-center gap-1.5 rounded-lg border border-[#5496CC]/35 px-2.5 py-1.5 text-[11px] font-semibold text-[#5496CC] transition hover:bg-[#5496CC]/10"
                    >
                      <Plus size={13} />
                      Nueva requisición
                    </Link>
                  </div>
                  <select
                    required
                    value={requisitionId}
                    onChange={(e) => handleRequisitionChange(e.target.value)}
                    className="po-input"
                  >
                    <option value="">
                      {availableRequisitions.length ? 'Seleccionar requisición' : 'No hay requisiciones aprobadas'}
                    </option>
                    {availableRequisitions.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.folio} — {item.projectName}
                      </option>
                    ))}
                  </select>
                  {!availableRequisitions.length ? (
                    <p className="text-[11px] leading-5 text-[var(--muted)]">
                      Crea una requisición y cámbiala a estado Aprobada para poder usarla en una orden de compra.
                    </p>
                  ) : null}
                </div>
                <Field label="Proveedor *"><select required value={supplierId} onChange={(e) => setSupplierId(e.target.value)} className="po-input"><option value="">Seleccionar proveedor</option>{activeSuppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.folio} — {supplier.company}</option>)}</select></Field>
                <Field label="Moneda"><select value={currency} onChange={(e) => setCurrency(e.target.value as PurchasingCurrency)} className="po-input"><option value="MXN">MXN</option><option value="USD">USD</option></select></Field>
                <Field label="Fecha de orden"><input type="date" max={today()} value={orderDate} onChange={(e) => {
                  const nextOrderDate = e.target.value
                  setOrderDate(nextOrderDate)
                  if (deliveryDate && deliveryDate < nextOrderDate) setDeliveryDate('')
                }} className="po-input" /></Field>
                <Field label="Fecha de entrega"><input type="date" min={orderDate || today()} value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} className="po-input" /></Field>
                <Field label="IVA (%)"><input type="number" min="0" step="0.01" value={taxRate} onChange={(e) => setTaxRate(e.target.value)} className="po-input" /></Field>
              </div>

              <section>
                <div className="mb-3"><h3 className="font-semibold text-[var(--foreground)]">Partidas de compra</h3><p className="text-xs text-[var(--muted)]">Se cargan desde la requisición; puedes ajustar cantidades y precios.</p></div>
                <div className="space-y-3">{items.length === 0 ? <div className="rounded-xl border border-dashed border-[var(--border)] p-8 text-center text-sm text-[var(--muted)]">Selecciona una requisición aprobada.</div> : items.map((item) => <div key={item.id} className="grid gap-2 rounded-xl border border-[var(--border)] p-3 md:grid-cols-[minmax(240px,1fr)_160px_110px_160px]"><input value={item.description} readOnly className="po-input opacity-80" /><input value={item.unit} readOnly className="po-input opacity-80" /><input type="number" min="0.01" step="0.01" value={item.quantity} onChange={(e) => updateItem(item.id, 'quantity', e.target.value)} className="po-input" /><input type="number" min="0" step="0.01" value={item.unitPrice} onChange={(e) => updateItem(item.id, 'unitPrice', e.target.value)} className="po-input" /></div>)}</div>
              </section>

              <section className="rounded-2xl border border-[var(--border)] p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div><h3 className="font-semibold text-[var(--foreground)]">Comprobantes</h3><p className="mt-1 text-xs text-[var(--muted)]">Adjunta imágenes o PDF. Máximo {MAX_PROOF_FILES} archivos de 2 MB cada uno.</p></div>
                  <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-[#5496CC]/40 px-4 py-2.5 text-sm font-semibold text-[#5496CC] hover:bg-[#5496CC]/10"><Upload size={16} /> Subir comprobante<input type="file" multiple accept="image/*,application/pdf" onChange={handleProofUpload} className="hidden" /></label>
                </div>
                {proofFiles.length ? <div className="mt-4 space-y-2">{proofFiles.map((file) => <div key={file.id} className="flex items-center justify-between gap-3 rounded-xl bg-[var(--surface-soft)] px-3 py-3"><div className="min-w-0"><p className="truncate text-sm font-semibold text-[var(--foreground)]">{file.name}</p><p className="mt-0.5 text-xs text-[var(--muted)]">{formatFileSize(file.size)}</p></div><div className="flex gap-2"><a href={file.dataUrl} download={file.name} className="rounded-lg p-2 text-[#5496CC] hover:bg-[#5496CC]/10" title="Descargar"><Download size={15} /></a><button type="button" onClick={() => removeProof(file.id)} className="rounded-lg p-2 text-red-500 hover:bg-red-500/10" title="Quitar"><Trash2 size={15} /></button></div></div>)}</div> : <p className="mt-4 text-sm text-[var(--muted)]">Todavía no hay comprobantes adjuntos.</p>}
              </section>

              <Field label="Notas"><textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Condiciones, instrucciones de entrega, observaciones..." className="po-input" /></Field>
              <div className="grid gap-3 rounded-2xl bg-[var(--surface-soft)] p-4 sm:grid-cols-3"><Summary label="Subtotal" value={money(formTotals.subtotal, currency)} /><Summary label={`IVA (${taxRate || 0}%)`} value={money(formTotals.tax, currency)} /><Summary label="Total" value={money(formTotals.total, currency)} accent /></div>
              <div className="flex justify-end gap-3"><button type="button" onClick={closeForm} className="rounded-xl border border-[var(--border)] px-5 py-3 font-semibold text-[var(--foreground)]">Cancelar</button><button type="submit" className="rounded-xl bg-[#5496CC] px-5 py-3 font-semibold text-white">{editingOrder ? 'Guardar cambios' : 'Crear orden'}</button></div>
            </form>
          </div>
        </div>
      ) : null}

      {viewing ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4">
          <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-[var(--surface)] p-6 shadow-2xl">
            <div className="flex items-start justify-between border-b border-[var(--border)] pb-5"><div><p className="text-xs font-semibold uppercase tracking-wide text-[#5496CC]">{viewing.folio}</p><h2 className="mt-1 text-2xl font-bold text-[var(--foreground)]">{viewing.projectName}</h2><p className="mt-1 text-sm text-[var(--muted)]">Proveedor: {viewing.supplier.company}</p></div><button type="button" onClick={() => setViewing(null)} className="rounded-lg p-2 text-[var(--muted)]"><X size={18} /></button></div>
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3"><div className="grid flex-1 gap-3 sm:grid-cols-3"><Summary label="Subtotal" value={money(viewing.subtotal, viewing.currency)} /><Summary label={`IVA (${viewing.taxRate}%)`} value={money(viewing.tax, viewing.currency)} /><Summary label="Total" value={money(viewing.total, viewing.currency)} accent /></div><button type="button" onClick={() => togglePayment(viewing)} className={`rounded-full border px-4 py-2 text-xs font-semibold ${paymentClass(viewing)}`}>{paymentLabel(viewing)}</button></div>
            <div className="mt-5 overflow-hidden rounded-2xl border border-[var(--border)]"><table className="w-full text-left text-sm"><thead className="bg-[var(--surface-soft)] text-xs uppercase text-[var(--muted)]"><tr><th className="px-5 py-4">Descripción</th><th className="px-5 py-4">UM</th><th className="px-5 py-4 text-right">Cantidad</th><th className="px-5 py-4 text-right">P. Unitario</th><th className="px-5 py-4 text-right">Importe</th></tr></thead><tbody className="divide-y divide-[var(--border)]">{viewing.items.map((item) => <tr key={item.id}><td className="px-5 py-4 text-[var(--foreground)]">{item.description}</td><td className="px-5 py-4 text-[var(--muted)]">{item.unit}</td><td className="px-5 py-4 text-right text-[var(--foreground)]">{item.quantity}</td><td className="px-5 py-4 text-right text-[var(--foreground)]">{money(item.unitPrice, viewing.currency)}</td><td className="px-5 py-4 text-right font-semibold text-[var(--foreground)]">{money(item.quantity * item.unitPrice, viewing.currency)}</td></tr>)}</tbody></table></div>
            <div className="mt-5 grid gap-4 md:grid-cols-2"><div className="rounded-2xl border border-[var(--border)] p-4 text-sm text-[var(--foreground)]"><p className="text-xs font-semibold uppercase text-[var(--muted)]">Proveedor</p><p className="mt-3 font-semibold">{viewing.supplier.company}</p><p className="mt-1">{viewing.supplier.contact || 'Sin contacto'}</p><p className="mt-1">{viewing.supplier.email || 'Sin correo'}</p><p className="mt-1">{viewing.supplier.phone || 'Sin teléfono'}</p><p className="mt-1">RFC: {viewing.supplier.rfc || 'Sin RFC'}</p></div><div className="rounded-2xl border border-[var(--border)] p-4 text-sm text-[var(--foreground)]"><p className="text-xs font-semibold uppercase text-[var(--muted)]">Datos de orden</p><p className="mt-3">Requisición: {viewing.requisitionFolio}</p><p className="mt-1">Fecha: {viewing.orderDate}</p><p className="mt-1">Entrega: {viewing.deliveryDate || 'Sin fecha'}</p><p className="mt-1">Condiciones: {viewing.supplier.paymentTerms || 'Sin definir'}</p><p className="mt-3 whitespace-pre-wrap">{viewing.notes || 'Sin notas.'}</p></div></div>
            <section className="mt-5 rounded-2xl border border-[var(--border)] p-4"><div className="flex items-center gap-2"><Paperclip size={16} className="text-[#5496CC]" /><h3 className="font-semibold text-[var(--foreground)]">Comprobantes</h3></div>{(proofsByOrderId[viewing.id] ?? []).length ? <div className="mt-3 grid gap-2 sm:grid-cols-2">{(proofsByOrderId[viewing.id] ?? []).map((file) => <a key={file.id} href={file.dataUrl} download={file.name} className="flex items-center justify-between gap-3 rounded-xl bg-[var(--surface-soft)] px-3 py-3 hover:ring-1 hover:ring-[#5496CC]/40"><div className="min-w-0"><p className="truncate text-sm font-semibold text-[var(--foreground)]">{file.name}</p><p className="mt-0.5 text-xs text-[var(--muted)]">{formatFileSize(file.size)}</p></div><Download size={15} className="shrink-0 text-[#5496CC]" /></a>)}</div> : <p className="mt-3 text-sm text-[var(--muted)]">Sin comprobantes adjuntos.</p>}</section>
            <div className="mt-5 flex justify-end"><button type="button" onClick={() => { setViewing(null); openEditOrder(viewing) }} className="inline-flex items-center gap-2 rounded-xl bg-[#5496CC] px-4 py-2.5 text-sm font-semibold text-white"><Pencil size={15} /> Editar orden</button></div>
          </div>
        </div>
      ) : null}

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
