'use client'

import { readCustomers } from '@/features/crm/services/customerStorage'
import type { Project, ProjectType, ProjectStatus } from '@/features/projects/types/project'

const QUOTE_PROJECTS_STORAGE_KEY = 'nedvi_projects_from_quotes'
const QUOTES_STORAGE_KEY = 'nedvi_quotes'
const PROJECTS_STORAGE_KEY = 'nedvi-projects'
const PROJECTS_UPDATED_EVENT = 'nedvi-projects-updated'

const LEGACY_DEMO_PROJECT_IDS = new Set([
  'torre-litoral',
  'plaza-alameda',
  'centro-logistico-oriente',
  'hotel-central-reforma',
  'campus-metropolitano',
])

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

type ConvertedQuote = {
  id: string
  folio: string
  customerId?: string
  client: string
  project: string
  total: number
  currency?: string
  createdAt: string
  convertedToProject?: boolean
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

function isConvertedQuote(value: unknown): value is ConvertedQuote {
  if (typeof value !== 'object' || value === null) return false
  const quote = value as Partial<ConvertedQuote>

  return (
    quote.convertedToProject === true &&
    typeof quote.id === 'string' &&
    typeof quote.folio === 'string' &&
    typeof quote.client === 'string' &&
    typeof quote.project === 'string' &&
    typeof quote.total === 'number' &&
    typeof quote.createdAt === 'string'
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

function removeLegacyDemoProjects(projects: Project[]) {
  return projects.filter((project) => !LEGACY_DEMO_PROJECT_IDS.has(project.id))
}

function readProjectIntakeQueue(): QuoteProjectIntake[] {
  const raw = window.localStorage.getItem(QUOTE_PROJECTS_STORAGE_KEY)
  if (!raw) return []

  try {
    const parsed = JSON.parse(raw) as unknown
    return Array.isArray(parsed) ? parsed.filter(isQuoteProjectIntake) : []
  } catch {
    return []
  }
}

function readConvertedQuotes(): QuoteProjectIntake[] {
  const raw = window.localStorage.getItem(QUOTES_STORAGE_KEY)
  if (!raw) return []

  try {
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []

    return parsed
      .filter(isConvertedQuote)
      .map((quote) => ({
        id: `quote-project-${quote.id}`,
        folio: quote.folio,
        customerId: quote.customerId,
        client: quote.client,
        name: quote.project,
        quoteId: quote.id,
        quoteTotal: quote.total,
        quoteCurrency: quote.currency,
        createdAt: quote.createdAt,
        source: 'Cotización aprobada',
      }))
  } catch {
    return []
  }
}

function readAllQuoteProjectIntakes() {
  const queued = readProjectIntakeQueue()
  const recovered = readConvertedQuotes()
  const byFolio = new Map<string, QuoteProjectIntake>()

  for (const intake of recovered) byFolio.set(intake.folio, intake)
  for (const intake of queued) byFolio.set(intake.folio, intake)

  return Array.from(byFolio.values())
}

export function syncQuoteProjectsIntoProjectStorage() {
  if (typeof window === 'undefined') return 0

  const storedProjects = readStoredProjects()
  const projects = removeLegacyDemoProjects(storedProjects)
  let changed = projects.length !== storedProjects.length

  const quoteProjects = readAllQuoteProjectIntakes()

  if (quoteProjects.length) {
    const customers = readCustomers()

    for (const intake of quoteProjects) {
      const customer = customers.find(
        (candidate) =>
          candidate.id === intake.customerId || candidate.company === intake.client,
      )

      const existingIndex = projects.findIndex(
        (project) => project.folio === intake.folio || project.id === intake.id,
      )

      const currency = intake.quoteCurrency === 'USD' ? 'USD' : 'MXN'
      const description = `Proyecto creado desde la cotización ${intake.folio}. Presupuesto aprobado: ${currency} $${intake.quoteTotal.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}.`

      if (existingIndex >= 0) {
        const existing = projects[existingIndex]
        const updated: Project = {
          ...existing,
          folio: existing.folio || intake.folio,
          name: intake.name || existing.name,
          clientId: existing.clientId || intake.customerId || customer?.id,
          client: intake.client || existing.client,
          clientContact: existing.clientContact || customer?.contact || '',
          address: existing.address || customer?.address || '',
          budget: intake.quoteTotal || existing.budget,
          manager: existing.manager || customer?.assignedSalesperson || '',
          description: existing.description || description,
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
        description,
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
  }

  if (!changed) return 0

  window.localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(projects))
  window.dispatchEvent(new Event(PROJECTS_UPDATED_EVENT))
  return quoteProjects.length
}
