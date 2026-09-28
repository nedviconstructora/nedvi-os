import { getProjects } from '@/features/projects/services/projectService'
import type {
  Project,
  ProjectFormValues,
  ProjectStatus,
  ProjectType,
} from '@/features/projects/types/project'

export const PROJECTS_STORAGE_KEY = 'nedvi-projects'
export const PROJECTS_UPDATED_EVENT = 'nedvi-projects-updated'
const QUOTE_PROJECTS_STORAGE_KEY = 'nedvi_projects_from_quotes'

const validStatuses: ProjectStatus[] = [
  'Planning',
  'Active',
  'At Risk',
  'Completed',
  'On Hold',
]

const validTypes: ProjectType[] = [
  'Residential',
  'Commercial',
  'Industrial',
  'Infrastructure',
  'Renovation',
]

function cloneSeedProjects(): Project[] {
  return JSON.parse(JSON.stringify(getProjects())) as Project[]
}

function isProject(value: unknown): value is Project {
  if (typeof value !== 'object' || value === null) return false

  const project = value as Partial<Project>

  return (
    typeof project.id === 'string' &&
    (typeof project.folio === 'undefined' || typeof project.folio === 'string') &&
    typeof project.name === 'string' &&
    (typeof project.clientId === 'undefined' || typeof project.clientId === 'string') &&
    typeof project.client === 'string' &&
    typeof project.clientContact === 'string' &&
    validTypes.includes(project.projectType as ProjectType) &&
    typeof project.address === 'string' &&
    typeof project.latitude === 'number' &&
    typeof project.longitude === 'number' &&
    typeof project.budget === 'number' &&
    typeof project.spent === 'number' &&
    typeof project.startDate === 'string' &&
    typeof project.estimatedCompletion === 'string' &&
    typeof project.progress === 'number' &&
    typeof project.manager === 'string' &&
    validStatuses.includes(project.status as ProjectStatus) &&
    typeof project.description === 'string' &&
    Array.isArray(project.assignedEmployees) &&
    Array.isArray(project.materials) &&
    Array.isArray(project.equipment) &&
    Array.isArray(project.timeline) &&
    Array.isArray(project.photos) &&
    Array.isArray(project.documents) &&
    Array.isArray(project.dailyLogs) &&
    Array.isArray(project.tasks) &&
    Array.isArray(project.inspections) &&
    Array.isArray(project.safetyIncidents) &&
    Array.isArray(project.progressHistory)
  )
}

function notifyProjectsChange() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new Event(PROJECTS_UPDATED_EVENT))
}

export function writeProjects(projects: Project[]) {
  if (typeof window === 'undefined') return

  window.localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(projects))
  notifyProjectsChange()
}

type QuoteProjectIntake = {
  id: string
  folio: string
  customerId?: string
  client: string
  name: string
  quoteTotal: number
  createdAt: string
}

function readQuoteProjects(): Project[] {
  if (typeof window === 'undefined') return []

  const raw = window.localStorage.getItem(QUOTE_PROJECTS_STORAGE_KEY)
  if (!raw) return []

  try {
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []

    return parsed
      .filter((item): item is QuoteProjectIntake => {
        if (typeof item !== 'object' || item === null) return false
        const value = item as Partial<QuoteProjectIntake>
        return (
          typeof value.id === 'string' &&
          typeof value.folio === 'string' &&
          typeof value.client === 'string' &&
          typeof value.name === 'string' &&
          typeof value.quoteTotal === 'number' &&
          typeof value.createdAt === 'string'
        )
      })
      .map((item) => ({
        id: item.id,
        folio: item.folio,
        name: item.name,
        clientId: item.customerId,
        client: item.client,
        clientContact: '',
        projectType: 'Commercial' as ProjectType,
        address: '',
        latitude: 0,
        longitude: 0,
        budget: item.quoteTotal,
        spent: 0,
        startDate: item.createdAt,
        estimatedCompletion: '',
        progress: 0,
        manager: '',
        assignedEmployees: [],
        materials: [],
        equipment: [],
        status: 'Planning' as ProjectStatus,
        description: `Proyecto creado desde la cotización ${item.folio}.`,
        timeline: [],
        photos: [],
        documents: [],
        dailyLogs: [],
        tasks: [],
        inspections: [],
        safetyIncidents: [],
        progressHistory: [],
      }))
  } catch (error) {
    console.error('Error al cargar proyectos creados desde cotizaciones:', error)
    return []
  }
}

function mergeQuoteProjects(projects: Project[]) {
  const quoteProjects = readQuoteProjects()
  if (!quoteProjects.length) return projects

  const knownIds = new Set(projects.map((project) => project.id))
  const missing = quoteProjects.filter((project) => !knownIds.has(project.id))
  return missing.length ? [...missing, ...projects] : projects
}

export function readProjects(): Project[] {
  const fallback = cloneSeedProjects()

  if (typeof window === 'undefined') return fallback

  const stored = window.localStorage.getItem(PROJECTS_STORAGE_KEY)

  if (!stored) {
    const initial = mergeQuoteProjects(fallback)
    writeProjects(initial)
    return initial
  }

  try {
    const parsed = JSON.parse(stored) as unknown

    if (!Array.isArray(parsed)) {
      const initial = mergeQuoteProjects(fallback)
      writeProjects(initial)
      return initial
    }

    const validProjects = parsed.filter(isProject)
    const baseProjects = validProjects.length ? validProjects : fallback
    const mergedProjects = mergeQuoteProjects(baseProjects)

    if (
      validProjects.length !== parsed.length ||
      mergedProjects.length !== baseProjects.length
    ) {
      writeProjects(mergedProjects)
    }

    return mergedProjects
  } catch (error) {
    console.error('Error al cargar los proyectos:', error)
    const initial = mergeQuoteProjects(fallback)
    writeProjects(initial)
    return initial
  }
}

export function readProjectById(id: string): Project | undefined {
  return readProjects().find((project) => project.id === id)
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

export function createProject(values: ProjectFormValues): Project {
  const projects = readProjects()
  const baseId = slugify(values.name) || 'proyecto'

  const project: Project = {
    id: `${baseId}-${Date.now()}`,
    ...values,
    spent: 0,
    progress: 0,
    assignedEmployees: [],
    materials: [],
    equipment: [],
    timeline: [],
    photos: [],
    documents: [],
    dailyLogs: [],
    tasks: [],
    inspections: [],
    safetyIncidents: [],
    progressHistory: [],
  }

  writeProjects([project, ...projects])
  return project
}

export function updateProject(
  id: string,
  values: ProjectFormValues
): Project | undefined {
  const projects = readProjects()
  let updatedProject: Project | undefined

  const updatedProjects = projects.map((project) => {
    if (project.id !== id) return project

    updatedProject = {
      ...project,
      ...values,
    }

    return updatedProject
  })

  if (!updatedProject) return undefined

  writeProjects(updatedProjects)
  return updatedProject
}
