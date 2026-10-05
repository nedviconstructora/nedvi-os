import type { Project, ProjectStatus } from '@/features/projects/types/project'

export function formatProjectDate(value: string): string {
  if (!value) return 'Sin fecha'
  const date = new Date(`${value}T12:00:00`)
  if (Number.isNaN(date.getTime())) return 'Sin fecha'

  return new Intl.DateTimeFormat('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
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
