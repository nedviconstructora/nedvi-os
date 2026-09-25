export const projectStatuses = ['Planning', 'Active', 'At Risk', 'Completed', 'On Hold'] as const
export type ProjectStatus = (typeof projectStatuses)[number]

export const projectTypes = ['Residential', 'Commercial', 'Industrial', 'Infrastructure', 'Renovation'] as const
export type ProjectType = (typeof projectTypes)[number]

export type ProjectTimelineEvent = {
  id: string
  title: string
  description: string
  date: string
  status: 'completed' | 'current' | 'upcoming'
}

export type ProjectPhoto = {
  id: string
  url: string
  alt: string
  label: string
}

export type ProjectDocument = {
  id: string
  name: string
  type: 'PDF' | 'DOCX' | 'XLSX'
  size: string
  updatedAt: string
}

export type ProjectDailyLog = {
  id: string
  date: string
  author: string
  weather: string
  crew: number
  summary: string
  blockers: string
}

export type ProjectTask = {
  id: string
  title: string
  assignee: string
  dueDate: string
  priority: 'Low' | 'Medium' | 'High'
  completed: boolean
}

export type ProjectInspection = {
  id: string
  title: string
  area: string
  dueDate: string
  completed: boolean
  owner: string
}

export type ProjectSafetyIncident = {
  id: string
  title: string
  date: string
  severity: 'Low' | 'Medium' | 'High'
  status: 'Open' | 'Investigating' | 'Closed'
}

export type ProjectProgressPoint = {
  label: string
  planned: number
  actual: number
}

export type Project = {
  id: string
  name: string
  client: string
  clientContact: string
  projectType: ProjectType
  address: string
  latitude: number
  longitude: number
  budget: number
  spent: number
  startDate: string
  estimatedCompletion: string
  progress: number
  manager: string
  assignedEmployees: string[]
  materials: string[]
  equipment: string[]
  status: ProjectStatus
  description: string
  timeline: ProjectTimelineEvent[]
  photos: ProjectPhoto[]
  documents: ProjectDocument[]
  dailyLogs: ProjectDailyLog[]
  tasks: ProjectTask[]
  inspections: ProjectInspection[]
  safetyIncidents: ProjectSafetyIncident[]
  progressHistory: ProjectProgressPoint[]
}

export type ProjectFormValues = Pick<Project, 'name' | 'client' | 'clientContact' | 'projectType' | 'address' | 'latitude' | 'longitude' | 'budget' | 'startDate' | 'estimatedCompletion' | 'manager' | 'status' | 'description'>

export type ProjectSortKey = 'name' | 'client' | 'status' | 'progress' | 'estimatedCompletion'
export type SortDirection = 'asc' | 'desc'
