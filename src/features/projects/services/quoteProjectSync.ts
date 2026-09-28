'use client'

import { readCustomers } from '@/features/crm/services/customerStorage'
import type { Project, ProjectType, ProjectStatus } from '@/features/projects/types/project'

const QUOTE_PROJECTS_STORAGE_KEY = 'nedvi_projects_from_quotes'
const PROJECTS_STORAGE_KEY = 'nedvi-projects'
const PROJECTS_UPDATED_EVENT = 'nedvi-projects-updated'

type QuoteProjectIntake = {
  id: string
  folio: string
  customerId?: string
  client: string
  name: string
  quoteId?: string
  quoteTotal: number
  quoteCurrency?: string
  createdAt: string
  source?: string
}

function isQuoteProjectIntake(value: unknown): value is QuoteProjectIntake {
  if (typeof value !== 'object' || value === null) return false
  const item = value as Partial<QuoteProjectIntake>

  return (
    typeof item.id === 'string' &&
    typeof item.folio === 'string' &&
    typeof item.client === 'string' &&
    typeof item.name === 'string' &&
    typeof item.quoteTotal === 'number' &&
    typeof item.createdAt === 'string'
  )
}

function readStoredProjects(): Project[] {
  const raw = window.localStorage.getItem(PROJECTS_STORAGE_KEY)
  if (!raw) return []

  try {
    const parsed = JSON.parse(raw) as unknown
    return Array.isArray(parsed) ? (parsed as Project[]) : []
  } catch {
    return []
  }
}

export function syncQuoteProjectsIntoProjectStorage() {
  if (typeof window === 'undefined') return 0

  const raw = window.localStorage.getItem(QUOTE_PROJECTS_STORAGE_KEY)
  if (!raw) return 0

  let quoteProjects: QuoteProjectIntake[] = []

  try {
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return 0
    quoteProjects = parsed.filter(isQuoteProjectIntake)
  } catch {
    return 0
  }

  if (!quoteProjects.length) return 0

  const customers = readCustomers()
  const projects = readStoredProjects()
  let changed = false

  for (const intake of quoteProjects) {
    const customer = customers.find(
      (candidate) =>
        candidate.id === intake.customerId || candidate.company === intake.client,
    )

    const existingIndex = projects.findIndex(
      (project) => project.folio === intake.folio || project.id === intake.id,
    )

    const currency = intake.quoteCurrency === 'USD' ? 'USD' : 'MXN'

    if (existingIndex >= 0) {
      const existing = projects[existingIndex]
      const updated: Project = {
        ...existing,
        folio: existing.folio || intake.folio,
        name: existing.name || intake.name,
        clientId: existing.clientId || intake.customerId || customer?.id,
        client: existing.client || intake.client,
        clientContact: existing.clientContact || customer?.contact || '',
        address: existing.address || customer?.address || '',
        budget: existing.budget || intake.quoteTotal,
        manager: existing.manager || customer?.assignedSalesperson || '',
        description:
          existing.description ||
          `Proyecto creado desde la cotización ${intake.folio}. Presupuesto aprobado: ${currency} $${intake.quoteTotal.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}.`,
      }

      if (JSON.stringify(updated) !== JSON.stringify(existing)) {
        projects[existingIndex] = updated
        changed = true
      }
      continue
    }

    const project: Project = {
      id: intake.id,
      folio: intake.folio,
      name: intake.name,
      clientId: intake.customerId || customer?.id,
      client: intake.client,
      clientContact: customer?.contact || '',
      projectType: 'Commercial' as ProjectType,
      address: customer?.address || '',
      latitude: 0,
      longitude: 0,
      budget: intake.quoteTotal,
      spent: 0,
      startDate: intake.createdAt,
      estimatedCompletion: '',
      progress: 0,
      manager: customer?.assignedSalesperson || '',
      assignedEmployees: [],
      materials: [],
      equipment: [],
      status: 'Planning' as ProjectStatus,
      description: `Proyecto creado desde la cotización ${intake.folio}. Presupuesto aprobado: ${currency} $${intake.quoteTotal.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}.`,
      timeline: [],
      photos: [],
      documents: [],
      dailyLogs: [],
      tasks: [],
      inspections: [],
      safetyIncidents: [],
      progressHistory: [],
    }

    projects.unshift(project)
    changed = true
  }

  if (!changed) return 0

  window.localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(projects))
  window.dispatchEvent(new Event(PROJECTS_UPDATED_EVENT))
  return 1
}
