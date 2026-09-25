import type { Customer } from '@/features/crm/types/customer'

export function formatCustomerDate(value: string): string {
  return new Intl.DateTimeFormat('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(`${value}T12:00:00`))
}

export function getCustomerInitials(customer: Pick<Customer, 'company'>): string {
  return customer.company
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase()
}

export function getCustomerStatusLabel(status: Customer['status']): string {
  const labels: Record<Customer['status'], string> = {
    Lead: 'Lead',
    Qualified: 'Calificado',
    Proposal: 'Propuesta',
    Active: 'Activo',
    Inactive: 'Inactivo',
  }

  return labels[status]
}
