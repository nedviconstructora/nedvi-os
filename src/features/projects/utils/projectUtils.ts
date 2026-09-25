import type { Project, ProjectStatus } from '@/features/projects/types/project'

export function formatProjectDate(value: string): string {
  return new Intl.DateTimeFormat('en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(`${value}T12:00:00`))
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
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
    Planning: 'Planning',
    Active: 'Active',
    'At Risk': 'At risk',
    Completed: 'Completed',
    'On Hold': 'On hold',
  }

  return labels[status]
}

export function getBudgetUsage(project: Pick<Project, 'budget' | 'spent'>): number {
  if (!project.budget) return 0
  return Math.round((project.spent / project.budget) * 100)
}
