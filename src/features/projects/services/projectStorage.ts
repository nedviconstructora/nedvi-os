import { getProjects } from '@/features/projects/services/projectService'
import type {
  Project,
  ProjectFormValues,
  ProjectStatus,
  ProjectType,
} from '@/features/projects/types/project'

export const PROJECTS_STORAGE_KEY = 'nedvi-projects'
export const PROJECTS_UPDATED_EVENT = 'nedvi-projects-updated'

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

export function readProjects(): Project[] {
  const fallback = cloneSeedProjects()

  if (typeof window === 'undefined') return fallback

  const stored = window.localStorage.getItem(PROJECTS_STORAGE_KEY)

  if (!stored) {
    writeProjects(fallback)
    return fallback
  }

  try {
    const parsed = JSON.parse(stored) as unknown

    if (!Array.isArray(parsed)) {
      writeProjects(fallback)
      return fallback
    }

    const validProjects = parsed.filter(isProject)

    if (validProjects.length !== parsed.length) {
      writeProjects(validProjects.length ? validProjects : fallback)
    }

    return validProjects.length ? validProjects : fallback
  } catch (error) {
    console.error('Error al cargar los proyectos:', error)
    writeProjects(fallback)
    return fallback
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
