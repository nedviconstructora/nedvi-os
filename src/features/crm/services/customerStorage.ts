import type {
  Customer,
  CustomerFormValues,
  CustomerStatus,
  LeadSource,
  ProjectType,
} from '@/features/crm/types/customer'
import { getCustomers } from '@/features/crm/services/customerService'

export const CRM_STORAGE_KEY = 'nedvi-crm-customers'
export const CRM_UPDATED_EVENT = 'nedvi-crm-updated'

const CUSTOMER_FOLIO_PREFIX = 'NEDVI-CLI-'

const customerStatuses: CustomerStatus[] = [
  'Lead',
  'Qualified',
  'Proposal',
  'Active',
  'Inactive',
]

const projectTypes: ProjectType[] = [
  'Residencial',
  'Comercial',
  'Industrial',
  'Infraestructura',
  'Remodelación',
]

const leadSources: LeadSource[] = [
  'Referido',
  'Sitio web',
  'Evento',
  'Redes sociales',
  'Prospección',
]

function formatCustomerFolio(number: number) {
  return `${CUSTOMER_FOLIO_PREFIX}${String(number).padStart(4, '0')}`
}

function getFolioNumber(folio?: string): number | null {
  if (!folio) return null

  const match = folio.match(/^NEDVI-CLI-(\d{4,})$/)
  if (!match) return null

  const value = Number(match[1])
  return Number.isFinite(value) ? value : null
}

function cloneSeedCustomers(): Customer[] {
  return getCustomers().map((customer, index) => ({
    ...customer,
    folio: formatCustomerFolio(index + 1),
    timeline: customer.timeline.map((event) => ({ ...event })),
  }))
}

function isCustomer(value: unknown): value is Customer {
  if (typeof value !== 'object' || value === null) return false

  const customer = value as Partial<Customer>

  return (
    typeof customer.id === 'string' &&
    typeof customer.company === 'string' &&
    typeof customer.contact === 'string' &&
    typeof customer.phone === 'string' &&
    typeof customer.email === 'string' &&
    typeof customer.address === 'string' &&
    typeof customer.rfc === 'string' &&
    projectTypes.includes(customer.projectType as ProjectType) &&
    leadSources.includes(customer.leadSource as LeadSource) &&
    customerStatuses.includes(customer.status as CustomerStatus) &&
    typeof customer.assignedSalesperson === 'string' &&
    typeof customer.notes === 'string' &&
    typeof customer.createdAt === 'string' &&
    typeof customer.lastContact === 'string' &&
    Array.isArray(customer.timeline)
  )
}

function normalizeCustomerFolios(
  customers: Customer[],
  seedCustomers: Customer[]
): Customer[] {
  const seedFoliosById = new Map(
    seedCustomers.map((customer) => [customer.id, customer.folio as string])
  )

  const reservedNumbers = new Set(
    seedCustomers
      .map((customer) => getFolioNumber(customer.folio))
      .filter((value): value is number => value !== null)
  )

  const assignedNumbers = new Set<number>(reservedNumbers)

  for (const customer of customers) {
    if (seedFoliosById.has(customer.id)) continue

    const folioNumber = getFolioNumber(customer.folio)
    if (folioNumber !== null && !assignedNumbers.has(folioNumber)) {
      assignedNumbers.add(folioNumber)
    }
  }

  let nextNumber = Math.max(0, ...assignedNumbers) + 1

  return customers.map((customer) => {
    const seedFolio = seedFoliosById.get(customer.id)

    if (seedFolio) {
      return { ...customer, folio: seedFolio }
    }

    const existingNumber = getFolioNumber(customer.folio)

    if (existingNumber !== null && existingNumber > seedCustomers.length) {
      return customer
    }

    while (assignedNumbers.has(nextNumber)) {
      nextNumber += 1
    }

    const folio = formatCustomerFolio(nextNumber)
    assignedNumbers.add(nextNumber)
    nextNumber += 1

    return { ...customer, folio }
  })
}

function getNextCustomerFolio(customers: Customer[]) {
  const highestNumber = customers.reduce((highest, customer) => {
    const folioNumber = getFolioNumber(customer.folio)
    return folioNumber === null ? highest : Math.max(highest, folioNumber)
  }, 0)

  return formatCustomerFolio(highestNumber + 1)
}

function notifyCustomerChange() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new Event(CRM_UPDATED_EVENT))
}

export function writeCustomers(customers: Customer[]) {
  if (typeof window === 'undefined') return

  window.localStorage.setItem(CRM_STORAGE_KEY, JSON.stringify(customers))
  notifyCustomerChange()
}

export function readCustomers(): Customer[] {
  const fallback = cloneSeedCustomers()

  if (typeof window === 'undefined') return fallback

  const stored = window.localStorage.getItem(CRM_STORAGE_KEY)

  if (!stored) {
    writeCustomers(fallback)
    return fallback
  }

  try {
    const parsed = JSON.parse(stored) as unknown

    if (!Array.isArray(parsed)) {
      writeCustomers(fallback)
      return fallback
    }

    const validCustomers = parsed.filter(isCustomer)

    if (!validCustomers.length) {
      writeCustomers(fallback)
      return fallback
    }

    const normalizedCustomers = normalizeCustomerFolios(validCustomers, fallback)

    if (
      validCustomers.length !== parsed.length ||
      JSON.stringify(normalizedCustomers) !== JSON.stringify(validCustomers)
    ) {
      writeCustomers(normalizedCustomers)
    }

    return normalizedCustomers
  } catch (error) {
    console.error('Error al cargar los clientes del CRM:', error)
    writeCustomers(fallback)
    return fallback
  }
}

export function readCustomerById(id: string): Customer | undefined {
  return readCustomers().find((customer) => customer.id === id)
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

function slugify(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function createCustomer(values: CustomerFormValues): Customer {
  const customers = readCustomers()
  const date = today()
  const baseId = slugify(values.company) || 'cliente'

  const customer: Customer = {
    id: `${baseId}-${Date.now()}`,
    folio: getNextCustomerFolio(customers),
    ...values,
    createdAt: date,
    lastContact: date,
    timeline: [],
  }

  writeCustomers([customer, ...customers])
  return customer
}

export function updateCustomer(
  id: string,
  values: CustomerFormValues
): Customer | undefined {
  const customers = readCustomers()
  let updatedCustomer: Customer | undefined

  const updatedCustomers = customers.map((customer) => {
    if (customer.id !== id) return customer

    updatedCustomer = {
      ...customer,
      ...values,
      lastContact: today(),
    }

    return updatedCustomer
  })

  if (!updatedCustomer) return undefined

  writeCustomers(updatedCustomers)
  return updatedCustomer
}
