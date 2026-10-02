export const dashboardStats = {
  activeProjects: 0,
  activeClients: 0,
  pendingQuotes: 0,
  monthlyIncome: 0,
  monthlyExpenses: 0,
  monthlyProfit: 0,
}

export const revenueData: Array<{
  month: string
  income: number
  expenses: number
}> = []

export const projectStatuses: Array<{
  label: string
  count: number
  color: string
}> = []

export const activities: Array<{
  initials: string
  color: string
  text: string
  time: string
}> = []

export const tasks: Array<{
  title: string
  project: string
  date: string
  urgent: boolean
}> = []

export const emails: Array<{
  sender: string
  subject: string
  time: string
  unread: boolean
}> = []

export const alerts: Array<{
  title: string
  description: string
  level: 'urgent' | 'warning' | 'info'
}> = []
