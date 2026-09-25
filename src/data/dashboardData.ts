export const dashboardStats = {
  activeProjects: 24,
  activeClients: 142,
  pendingQuotes: 18,
  monthlyIncome: 284650,
  monthlyExpenses: 176420,
  monthlyProfit: 108230,
}

export const revenueData = [
  { month: 'Ene', income: 176, expenses: 108 },
  { month: 'Feb', income: 214, expenses: 124 },
  { month: 'Mar', income: 198, expenses: 119 },
  { month: 'Abr', income: 236, expenses: 142 },
  { month: 'May', income: 248, expenses: 151 },
  { month: 'Jun', income: 285, expenses: 176 },
]

export const projectStatuses = [
  {
    label: 'En progreso',
    count: 12,
    color: '#163DFF',
  },
  {
    label: 'Planificación',
    count: 6,
    color: '#7287ff',
  },
  {
    label: 'En revisión',                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   
    count: 4,
    color: '#38bdf8',
  },
  {
    label: 'Completados',
    count: 2,
    color: '#34d399',
  },
]

export const activities = [
  {
    initials: 'AR',
    color: 'bg-[#3b4265] text-[#b9c2ff]',
    text: 'Ana Ruiz aprobó la cotización de Reforma Hotel Central',
    time: 'Hace 18 min',
  },
  {
    initials: 'JM',
    color: 'bg-[#3a504d] text-[#9de3c2]',
    text: 'Javier Moreno añadió 24 fotos a Torre Litoral',
    time: 'Hace 1 h',
  },
  {
    initials: 'LC',
    color: 'bg-[#5a463a] text-[#f4c5a4]',
    text: 'Lucía Castillo creó el proyecto Residencial Norte',
    time: 'Hace 2 h',
  },
  {
    initials: 'MG',
    color: 'bg-[#2c3346] text-[#b7c2ff]',
    text: 'Miguel García actualizó el presupuesto de Plaza Alameda',
    time: 'Ayer, 17:42',
  },
]

export const tasks = [
  {
    title: 'Revisar planos estructurales',
    project: 'Torre Litoral',
    date: 'Hoy, 14:00',
    urgent: true,
  },
  {
    title: 'Enviar propuesta comercial',
    project: 'Residencial Norte',
    date: 'Mañana, 09:30',
    urgent: false,
  },
  {
    title: 'Visita de obra con cliente',
    project: 'Plaza Alameda',
    date: 'Jue, 26 Jun',
    urgent: false,
  },
]

export const emails = [
  {
    sender: 'Carlos Méndez',
    subject: 'Cambios en el alcance del proyecto',
    time: '09:42',
    unread: true,
  },
  {
    sender: 'Proveedora Atlas',
    subject: 'Confirmación de entrega #AT-1842',
    time: 'Ayer',
    unread: true,
  },
  {
    sender: 'Laura Castillo',
    subject: 'Documentos para Residencial Norte',
    time: 'Ayer',
    unread: false,
  },
]
export const alerts = [
  {
    title: 'Cotización pendiente de seguimiento',
    description: 'Hay una cotización sin actualización desde hace 3 días.',
    level: 'warning',
  },
  {
    title: 'Proyecto próximo a vencer',
    description: 'Torre Litoral tiene una actividad programada para hoy.',
    level: 'urgent',
  },
  {
    title: 'Documentación pendiente',
    description: 'Residencial Norte tiene documentos por revisar.',
    level: 'info',
  },
]