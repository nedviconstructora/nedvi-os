export const customerStatuses = ['Lead', 'Qualified', 'Proposal', 'Active', 'Inactive'] as const
export type CustomerStatus = (typeof customerStatuses)[number]

export const projectTypes = [
  'Residencial',
  'Comercial',
  'Industrial',
  'Infraestructura',
  'Remodelación',
] as const
export type ProjectType = (typeof projectTypes)[number]

export const leadSources = [
  'Referido',
  'Sitio web',
  'Evento',
  'Redes sociales',
  'Prospección',
] as const
export type LeadSource = (typeof leadSources)[number]

export type CustomerTimelineEvent = {
  id: string
  type: 'call' | 'email' | 'meeting' | 'quote' | 'note'
  title: string
  description: string
  date: string
  author: string
}

export type Customer = {
  id: string
  folio?: string
  company: string
  contact: string
  phone: string
  email: string
  address: string
  rfc: string
  projectType: ProjectType
  leadSource: LeadSource
  status: CustomerStatus
  assignedSalesperson: string
  notes: string
  createdAt: string
  lastContact: string
  timeline: CustomerTimelineEvent[]
}

export type CustomerFormValues = Omit<
  Customer,
  'id' | 'folio' | 'createdAt' | 'lastContact' | 'timeline'
>

export type CustomerSortKey =
  | 'company'
  | 'contact'
  | 'status'
  | 'projectType'
  | 'lastContact'

export type SortDirection = 'asc' | 'desc'
