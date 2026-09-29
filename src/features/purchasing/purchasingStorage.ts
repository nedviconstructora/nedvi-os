'use client'

export type PurchasingCurrency = 'MXN' | 'USD'
export type SupplierStatus = 'Activo' | 'Inactivo'
export type SupplierCategory =
  | 'Materiales'
  | 'Equipo / maquinaria'
  | 'Subcontratista'
  | 'Servicios'
  | 'Transporte'
  | 'Otro'

export type Supplier = {
  id: string
  folio: string
  company: string
  contact: string
  phone: string
  email: string
  rfc: string
  category: SupplierCategory
  address: string
  paymentTerms: string
  status: SupplierStatus
  notes: string
  createdAt: string
}

export type RequisitionPriority = 'Baja' | 'Media' | 'Alta' | 'Urgente'
export type RequisitionStatus =
  | 'Borrador'
  | 'Pendiente de aprobación'
  | 'Aprobada'
  | 'Rechazada'
  | 'Ordenada'

export type PurchasingUnit =
  | 'Kilómetros'
  | 'Metros Cuadrados'
  | 'Metros Cúbicos'
  | 'Metros Lineales'
  | 'Piezas'
  | 'Litros'
  | 'Servicios'
  | 'Otros'

export type RequisitionItem = {
  id: string
  description: string
  unit: PurchasingUnit
  quantity: number
  estimatedUnitPrice: number
}

export type Requisition = {
  id: string
  folio: string
  projectQuoteId: string
  projectFolio: string
  projectName: string
  client: string
  requester: string
  requestedAt: string
  neededBy: string
  priority: RequisitionPriority
  status: RequisitionStatus
  items: RequisitionItem[]
  notes: string
  createdAt: string
}

export type PurchaseOrderStatus =
  | 'Borrador'
  | 'Emitida'
  | 'Confirmada'
  | 'Recibida'
  | 'Cancelada'

export type PurchaseOrderItem = {
  id: string
  description: string
  unit: PurchasingUnit
  quantity: number
  unitPrice: number
}

export type SupplierSnapshot = {
  company: string
  contact: string
  phone: string
  email: string
  rfc: string
  address: string
  paymentTerms: string
}

export type PurchaseOrder = {
  id: string
  folio: string
  requisitionId: string
  requisitionFolio: string
  projectQuoteId: string
  projectFolio: string
  projectName: string
  client: string
  supplierId: string
  supplier: SupplierSnapshot
  currency: PurchasingCurrency
  orderDate: string
  deliveryDate: string
  taxRate: number
  items: PurchaseOrderItem[]
  subtotal: number
  tax: number
  total: number
  status: PurchaseOrderStatus
  notes: string
  createdAt: string
}

export type PurchasingProject = {
  id: string
  folio: string
  project: string
  client: string
  owner: string
  currency: PurchasingCurrency
  approvedTotal: number
}

export const SUPPLIERS_STORAGE_KEY = 'nedvi_suppliers'
export const REQUISITIONS_STORAGE_KEY = 'nedvi_requisitions'
export const PURCHASE_ORDERS_STORAGE_KEY = 'nedvi_purchase_orders'
export const PURCHASING_UPDATED_EVENT = 'nedvi-purchasing-updated'

const QUOTES_STORAGE_KEY = 'nedvi_quotes'
const SEQUENCES_STORAGE_KEY = 'nedvi_purchasing_sequences'

const supplierCategories: SupplierCategory[] = [
  'Materiales',
  'Equipo / maquinaria',
  'Subcontratista',
  'Servicios',
  'Transporte',
  'Otro',
]

const requisitionPriorities: RequisitionPriority[] = ['Baja', 'Media', 'Alta', 'Urgente']
const requisitionStatuses: RequisitionStatus[] = [
  'Borrador',
  'Pendiente de aprobación',
  'Aprobada',
  'Rechazada',
  'Ordenada',
]
const purchaseOrderStatuses: PurchaseOrderStatus[] = [
  'Borrador',
  'Emitida',
  'Confirmada',
  'Recibida',
  'Cancelada',
]
const units: PurchasingUnit[] = [
  'Kilómetros',
  'Metros Cuadrados',
  'Metros Cúbicos',
  'Metros Lineales',
  'Piezas',
  'Litros',
  'Servicios',
  'Otros',
]

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function readArray(key: string): unknown[] {
  if (typeof window === 'undefined') return []
  const raw = window.localStorage.getItem(key)
  if (!raw) return []

  try {
    const parsed = JSON.parse(raw) as unknown
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeArray<T>(key: string, values: T[]) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(key, JSON.stringify(values))
  window.dispatchEvent(new Event(PURCHASING_UPDATED_EVENT))
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

function nextSequence(type: 'SUP' | 'REQ' | 'OC') {
  if (typeof window === 'undefined') return 1
  const year = new Date().getFullYear()
  const raw = window.localStorage.getItem(SEQUENCES_STORAGE_KEY)
  let sequences: Record<string, { year: number; value: number }> = {}

  try {
    const parsed = raw ? (JSON.parse(raw) as unknown) : {}
    if (isRecord(parsed)) {
      for (const [key, value] of Object.entries(parsed)) {
        if (
          isRecord(value) &&
          typeof value.year === 'number' &&
          typeof value.value === 'number'
        ) {
          sequences[key] = { year: value.year, value: value.value }
        }
      }
    }
  } catch {
    sequences = {}
  }

  const current = sequences[type]
  const nextValue = current && current.year === year ? current.value + 1 : 1
  sequences[type] = { year, value: nextValue }
  window.localStorage.setItem(SEQUENCES_STORAGE_KEY, JSON.stringify(sequences))
  return nextValue
}

export function nextSupplierFolio() {
  return `NEDVI-PROV-${String(nextSequence('SUP')).padStart(4, '0')}`
}

export function nextRequisitionFolio() {
  const year = new Date().getFullYear()
  return `REQ-${year}-${String(nextSequence('REQ')).padStart(4, '0')}`
}

export function nextPurchaseOrderFolio() {
  const year = new Date().getFullYear()
  return `OC-${year}-${String(nextSequence('OC')).padStart(4, '0')}`
}

export function readSuppliers(): Supplier[] {
  return readArray(SUPPLIERS_STORAGE_KEY)
    .filter(isRecord)
    .filter(
      (value) =>
        typeof value.id === 'string' &&
        typeof value.folio === 'string' &&
        typeof value.company === 'string',
    )
    .map((value) => ({
      id: value.id as string,
      folio: value.folio as string,
      company: value.company as string,
      contact: typeof value.contact === 'string' ? value.contact : '',
      phone: typeof value.phone === 'string' ? value.phone : '',
      email: typeof value.email === 'string' ? value.email : '',
      rfc: typeof value.rfc === 'string' ? value.rfc : '',
      category: supplierCategories.includes(value.category as SupplierCategory)
        ? (value.category as SupplierCategory)
        : 'Otro',
      address: typeof value.address === 'string' ? value.address : '',
      paymentTerms: typeof value.paymentTerms === 'string' ? value.paymentTerms : '',
      status: value.status === 'Inactivo' ? 'Inactivo' : 'Activo',
      notes: typeof value.notes === 'string' ? value.notes : '',
      createdAt: typeof value.createdAt === 'string' ? value.createdAt : today(),
    }))
}

export function writeSuppliers(values: Supplier[]) {
  writeArray(SUPPLIERS_STORAGE_KEY, values)
}

export function readConvertedProjects(): PurchasingProject[] {
  return readArray(QUOTES_STORAGE_KEY)
    .filter(isRecord)
    .filter((quote) => quote.convertedToProject === true)
    .filter(
      (quote) =>
        typeof quote.id === 'string' &&
        typeof quote.folio === 'string' &&
        typeof quote.client === 'string' &&
        typeof quote.project === 'string' &&
        typeof quote.total === 'number',
    )
    .map((quote) => ({
      id: quote.id as string,
      folio: quote.folio as string,
      project: quote.project as string,
      client: quote.client as string,
      owner: typeof quote.owner === 'string' ? quote.owner : '',
      currency: quote.currency === 'USD' ? 'USD' : 'MXN',
      approvedTotal: quote.total as number,
    }))
}

export function readRequisitions(): Requisition[] {
  return readArray(REQUISITIONS_STORAGE_KEY)
    .filter(isRecord)
    .filter(
      (value) =>
        typeof value.id === 'string' &&
        typeof value.folio === 'string' &&
        typeof value.projectQuoteId === 'string' &&
        typeof value.projectName === 'string' &&
        Array.isArray(value.items),
    )
    .map((value) => ({
      id: value.id as string,
      folio: value.folio as string,
      projectQuoteId: value.projectQuoteId as string,
      projectFolio: typeof value.projectFolio === 'string' ? value.projectFolio : '',
      projectName: value.projectName as string,
      client: typeof value.client === 'string' ? value.client : '',
      requester: typeof value.requester === 'string' ? value.requester : '',
      requestedAt: typeof value.requestedAt === 'string' ? value.requestedAt : today(),
      neededBy: typeof value.neededBy === 'string' ? value.neededBy : '',
      priority: requisitionPriorities.includes(value.priority as RequisitionPriority)
        ? (value.priority as RequisitionPriority)
        : 'Media',
      status: requisitionStatuses.includes(value.status as RequisitionStatus)
        ? (value.status as RequisitionStatus)
        : 'Borrador',
      items: (value.items as unknown[])
        .filter(isRecord)
        .map((item) => ({
          id: typeof item.id === 'string' ? item.id : crypto.randomUUID(),
          description: typeof item.description === 'string' ? item.description : '',
          unit: units.includes(item.unit as PurchasingUnit)
            ? (item.unit as PurchasingUnit)
            : 'Piezas',
          quantity: typeof item.quantity === 'number' ? item.quantity : 0,
          estimatedUnitPrice:
            typeof item.estimatedUnitPrice === 'number' ? item.estimatedUnitPrice : 0,
        }))
        .filter((item) => item.description.trim()),
      notes: typeof value.notes === 'string' ? value.notes : '',
      createdAt: typeof value.createdAt === 'string' ? value.createdAt : new Date().toISOString(),
    }))
}

export function writeRequisitions(values: Requisition[]) {
  writeArray(REQUISITIONS_STORAGE_KEY, values)
}

export function readPurchaseOrders(): PurchaseOrder[] {
  return readArray(PURCHASE_ORDERS_STORAGE_KEY)
    .filter(isRecord)
    .filter(
      (value) =>
        typeof value.id === 'string' &&
        typeof value.folio === 'string' &&
        typeof value.requisitionId === 'string' &&
        typeof value.supplierId === 'string' &&
        Array.isArray(value.items),
    )
    .map((value) => ({
      id: value.id as string,
      folio: value.folio as string,
      requisitionId: value.requisitionId as string,
      requisitionFolio: typeof value.requisitionFolio === 'string' ? value.requisitionFolio : '',
      projectQuoteId: typeof value.projectQuoteId === 'string' ? value.projectQuoteId : '',
      projectFolio: typeof value.projectFolio === 'string' ? value.projectFolio : '',
      projectName: typeof value.projectName === 'string' ? value.projectName : '',
      client: typeof value.client === 'string' ? value.client : '',
      supplierId: value.supplierId as string,
      supplier: isRecord(value.supplier)
        ? {
            company: typeof value.supplier.company === 'string' ? value.supplier.company : '',
            contact: typeof value.supplier.contact === 'string' ? value.supplier.contact : '',
            phone: typeof value.supplier.phone === 'string' ? value.supplier.phone : '',
            email: typeof value.supplier.email === 'string' ? value.supplier.email : '',
            rfc: typeof value.supplier.rfc === 'string' ? value.supplier.rfc : '',
            address: typeof value.supplier.address === 'string' ? value.supplier.address : '',
            paymentTerms:
              typeof value.supplier.paymentTerms === 'string' ? value.supplier.paymentTerms : '',
          }
        : {
            company: '',
            contact: '',
            phone: '',
            email: '',
            rfc: '',
            address: '',
            paymentTerms: '',
          },
      currency: value.currency === 'USD' ? 'USD' : 'MXN',
      orderDate: typeof value.orderDate === 'string' ? value.orderDate : today(),
      deliveryDate: typeof value.deliveryDate === 'string' ? value.deliveryDate : '',
      taxRate: typeof value.taxRate === 'number' ? value.taxRate : 16,
      items: (value.items as unknown[])
        .filter(isRecord)
        .map((item) => ({
          id: typeof item.id === 'string' ? item.id : crypto.randomUUID(),
          description: typeof item.description === 'string' ? item.description : '',
          unit: units.includes(item.unit as PurchasingUnit)
            ? (item.unit as PurchasingUnit)
            : 'Piezas',
          quantity: typeof item.quantity === 'number' ? item.quantity : 0,
          unitPrice: typeof item.unitPrice === 'number' ? item.unitPrice : 0,
        })),
      subtotal: typeof value.subtotal === 'number' ? value.subtotal : 0,
      tax: typeof value.tax === 'number' ? value.tax : 0,
      total: typeof value.total === 'number' ? value.total : 0,
      status: purchaseOrderStatuses.includes(value.status as PurchaseOrderStatus)
        ? (value.status as PurchaseOrderStatus)
        : 'Borrador',
      notes: typeof value.notes === 'string' ? value.notes : '',
      createdAt: typeof value.createdAt === 'string' ? value.createdAt : new Date().toISOString(),
    }))
}

export function writePurchaseOrders(values: PurchaseOrder[]) {
  writeArray(PURCHASE_ORDERS_STORAGE_KEY, values)
}

export function requisitionEstimatedTotal(requisition: Requisition) {
  return requisition.items.reduce(
    (sum, item) => sum + item.quantity * item.estimatedUnitPrice,
    0,
  )
}

export function calculateOrderTotals(items: PurchaseOrderItem[], taxRate: number) {
  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)
  const tax = subtotal * (taxRate / 100)
  return { subtotal, tax, total: subtotal + tax }
}
