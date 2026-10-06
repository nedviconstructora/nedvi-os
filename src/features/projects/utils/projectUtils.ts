import type { Project, ProjectStatus, ProjectType } from '@/features/projects/types/project'

export function formatProjectDate(value: string): string {
  if (!value) return 'Sin registrar'

  const normalizedValue = value.includes('T') ? value : `${value}T12:00:00`
  const date = new Date(normalizedValue)
  if (Number.isNaN(date.getTime())) return 'Sin registrar'

  return new Intl.DateTimeFormat('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value)
}

export function getProjectInitials(project: Pick<Project, 'name'>): string {
  return project.name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase()
}

export function getProjectStatusLabel(status: ProjectStatus): string {
  const labels: Record<ProjectStatus, string> = {
    Planning: 'Planeación',
    Active: 'Activo',
    'At Risk': 'En riesgo',
    Completed: 'Completado',
    'On Hold': 'En pausa',
  }

  return labels[status]
}

export function getBudgetUsage(project: Pick<Project, 'budget' | 'spent'>): number {
  if (!project.budget) return 0
  return Math.round((project.spent / project.budget) * 100)
}

export function getProjectTypeLabel(type: ProjectType): string {
  const labels: Record<ProjectType, string> = {
    Residential: 'Residencial',
    Commercial: 'Comercial',
    Industrial: 'Industrial',
    Infrastructure: 'Infraestructura',
    Renovation: 'Remodelación',
  }

  return labels[type]
}
