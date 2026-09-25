'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import {
  ArrowUpRight,
  BriefcaseBusiness,
  CalendarClock,
  Check,
  ChevronRight,
  CircleDollarSign,
  FilePlus2,
  FolderPlus,
  Mail,
  MoreHorizontal,
  Send,
  TriangleAlert,
  Upload,
  UsersRound,
} from 'lucide-react'
import { ChartCard } from '@/components/dashboard/ChartCard'
import { StatCard } from '@/components/dashboard/StatCard'
import { Card, CardHeader } from '@/components/ui/Card'
import {
  activities,
  alerts,
  dashboardStats,
  emails,
  projectStatuses,
  revenueData,
  tasks,
} from '@/data/dashboardData' 

export function DashboardStats() {
    const monthlyProfit =
    dashboardStats.monthlyIncome - dashboardStats.monthlyExpenses
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
      <StatCard
        label="Proyectos activos"
        value={dashboardStats.activeProjects.toString()}
        change="12.5%"
        detail="vs. mes anterior"
        icon={BriefcaseBusiness}
      />

      <StatCard
        label="Clientes activos"
        value={dashboardStats.activeClients.toString()}
        change="8.7%"
        detail="vs. mes anterior"
        icon={UsersRound}
      />

      <StatCard
        label="Cotizaciones pendientes"
        value={dashboardStats.pendingQuotes.toString()}
        change="4.2%"
        detail="vs. mes anterior"
        icon={FilePlus2}
        positive={false}
      />

      <StatCard
        label="Ingresos del mes"
        value={`$${dashboardStats.monthlyIncome.toLocaleString('es-MX')}`}
        change="16.4%"
        detail="vs. mes anterior"
        icon={CircleDollarSign}
      />

      <StatCard
        label="Gastos del mes"
        value={`$${dashboardStats.monthlyExpenses.toLocaleString('es-MX')}`}
        change="6.8%"
        detail="vs. mes anterior"
        icon={CircleDollarSign}
        positive={false}
      />

      <StatCard
        label="Utilidad del mes"
        value={`$${monthlyProfit.toLocaleString('es-MX')}`}
        change="21.3%"
        detail="vs. mes anterior"
        icon={CircleDollarSign}
      />
    </div>
  )
}

export function RevenueChart() {
  return (
    <ChartCard
      title="Ingresos por mes"
      description="Facturación reconocida durante 2025"
      action={<button type="button" className="text-xs font-medium text-[#9CA3AF] transition hover:text-white">Ver reporte</button>}
      className="min-h-[360px]"
    >
      <div className="flex h-[245px] gap-4">
        <div className="flex flex-col justify-between pb-6 pt-1 text-[10px] text-[#646873]">
          <span>$300k</span><span>$200k</span><span>$100k</span><span>$0</span>
        </div>
        <div className="relative flex flex-1 flex-col">
          <div className="absolute inset-x-0 top-0 h-px bg-white/[0.06]" />
          <div className="absolute inset-x-0 top-1/3 h-px bg-white/[0.06]" />
          <div className="absolute inset-x-0 top-2/3 h-px bg-white/[0.06]" />
          <div className="absolute inset-x-0 bottom-6 h-px bg-white/[0.06]" />
          <div className="relative flex h-full items-end justify-around gap-2 px-1 sm:gap-4">
            {revenueData.map((item) => (
              <div className="group flex h-full flex-1 flex-col items-center justify-end gap-2" key={item.month}>
                <span className="pointer-events-none rounded-md bg-[#0B0B0D] px-2 py-1 text-[10px] font-semibold text-white opacity-0 shadow-lg transition group-hover:-translate-y-1 group-hover:opacity-100">

                </span>
                <div className="relative flex h-[calc(100%-34px)] w-full max-w-10 items-end">
                  <div className="w-full rounded-t-lg bg-gradient-to-t from-[#163DFF] to-[#7890ff] transition duration-300 group-hover:brightness-125" style={{ height: `${(item.income / 300) * 100}%` }} />
                </div>
                <span className="text-[10px] text-[#646873]">{item.month}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </ChartCard>
  )
}

export function ProjectsStatusChart() {
  const totalProjects = projectStatuses.reduce(
    (total, status) => total + status.count,
    0
  )
  let currentPercent = 0

const projectGradient = `conic-gradient(${projectStatuses
  .map((status) => {
  const percent =
    totalProjects > 0
      ? (status.count / totalProjects) * 100
      : 0

  const start = currentPercent
  currentPercent += percent

  return `${status.color} ${start}% ${currentPercent}%`
})
  })
  .join(', ')})`

  return (
    <ChartCard
      title="Proyectos por estado"
      description={`Distribución de los ${totalProjects} proyectos`}
      className="min-h-[360px]"
    >
      <div className="flex flex-col items-center gap-7 sm:flex-row sm:justify-center sm:gap-8">
        <div
          className="relative flex h-40 w-40 shrink-0 items-center justify-center rounded-full"
          style={{ background: projectGradient }}
        >
          <div className="flex h-28 w-28 flex-col items-center justify-center rounded-full bg-[#20232A]">
            <span className="text-2xl font-semibold tracking-[-0.05em] text-white">
              {totalProjects}
            </span>

            <span className="text-[10px] text-[#646873]">
              proyectos
            </span>
          </div>
        </div>

        <div className="w-full space-y-3 sm:w-auto sm:min-w-40">
          {projectStatuses.map((status) => (
            <div
              className="flex items-center justify-between gap-5 text-xs"
              key={status.label}
            >
              <span className="flex items-center gap-2 text-[#9CA3AF]">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: status.color }}
                />
                {status.label}
              </span>

              <span className="font-semibold text-white">
                {status.count}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-8 flex items-center justify-between border-t border-white/[0.06] pt-4 text-xs">
        <span className="text-[#646873]">
          Ritmo de ejecución
        </span>

        <span className="flex items-center gap-1 font-semibold text-emerald-400">
          <ArrowUpRight size={14} />
          9.3%
        </span>
      </div>
    </ChartCard>
  )
}

export function QuickActions() {
  const actions = [
    { label: 'Nueva cotización', icon: FilePlus2, href: '/quotes' },
    { label: 'Nuevo proyecto', icon: FolderPlus, href: '/projects' },
    { label: 'Nuevo cliente', icon: UsersRound, href: '/crm' },
    { label: 'Subir fotos', icon: Upload, href: '/projects' },
  ]

  return (
    <Card className="overflow-hidden">
      <CardHeader
        title="Acciones rápidas"
        description="Accede a tus tareas más frecuentes"
      />

      <div className="grid grid-cols-2 gap-3 p-5 sm:p-6">
        {actions.map(({ label, icon: Icon, href }) => (
          <Link
            href={href}
            key={label}
            className="group flex min-h-24 flex-col items-start justify-between rounded-xl border border-white/[0.07] bg-[#17181C] p-4 text-left transition hover:-translate-y-0.5 hover:border-[#163DFF]/50 hover:bg-[#163DFF]/[0.08]"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#163DFF]/[0.12] text-[#7187ff] transition group-hover:bg-[#163DFF]/20">
              <Icon size={16} strokeWidth={1.8} />
            </span>

            <span className="text-xs font-medium text-[#d5d7df]">
              {label}
            </span>
          </Link>
        ))}
      </div>
    </Card>
  )
}

export function RecentActivity() {
  return (
    <Card className="overflow-hidden">
      <CardHeader title="Actividad reciente" description="Últimas acciones del equipo" action={<button type="button" className="text-[#646873] transition hover:text-white" aria-label="More activity options"><MoreHorizontal size={18} /></button>} />
      <div className="divide-y divide-white/[0.05] px-5 sm:px-6">
        {activities.map((activity) => (
          <div className="flex gap-3 py-4" key={`${activity.initials}-${activity.time}`}>
            <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${activity.color}`}>{activity.initials}</span>
            <div className="min-w-0"><p className="text-xs leading-5 text-[#d5d7df]">{activity.text}</p><p className="mt-1 text-[10px] text-[#646873]">{activity.time}</p></div>
          </div>
        ))}
      </div>
      <button type="button" className="flex w-full items-center justify-center gap-1 border-t border-white/[0.06] py-3 text-xs font-medium text-[#9CA3AF] transition hover:bg-white/[0.03] hover:text-white">Ver toda la actividad <ChevronRight size={14} /></button>
    </Card>
  )
}

export function UpcomingTasks() {
  const [completedTasks, setCompletedTasks] = useState<string[]>([])
  const router = useRouter()

  const toggleTask = (title: string) => {
    setCompletedTasks((current) =>
      current.includes(title)
        ? current.filter((task) => task !== title)
        : [...current, title]
    )
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader
        title="Próximas tareas"
        description="Lo que requiere tu atención"
        action={
          <CalendarClock
            size={17}
            className="text-[#7187ff]"
          />
        }
      />

      <div className="space-y-1 px-5 py-3 sm:px-6">
        {tasks.map((task) => {
          const completed = completedTasks.includes(task.title)

          return (
            <div
              key={task.title}
              className={`flex gap-3 rounded-xl py-3 transition ${
                completed ? 'opacity-50' : ''
              }`}
            >
              <button
                type="button"
                onClick={() => toggleTask(task.title)}
                className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition ${
                  completed
                    ? 'border-[#163DFF] bg-[#163DFF] text-white'
                    : 'border-white/[0.12] text-transparent hover:border-[#163DFF] hover:bg-[#163DFF] hover:text-white'
                }`}
              >
                <Check size={12} strokeWidth={2.5} />
              </button>

              <div className="min-w-0 flex-1">
                <p
                  className={`truncate text-xs font-medium ${
                    completed
                      ? 'text-[#646873] line-through'
                      : 'text-[#d5d7df]'
                  }`}
                >
                  {task.title}
                </p>

                <p className="mt-1 truncate text-[10px] text-[#646873]">
                  {task.project}
                </p>
              </div>

              <span
                className={`shrink-0 text-[10px] ${
                  completed
                    ? 'text-[#646873]'
                    : task.urgent
                      ? 'font-semibold text-amber-400'
                      : 'text-[#646873]'
                }`}
              >
                {task.date}
              </span>
            </div>
          )
        })}
      </div>

      <button
       type="button"
       onClick={() => router.push('/agenda')}
       className="flex w-full items-center justify-center gap-1 border-t border-white/[0.06] py-3 text-xs font-medium text-[#9CA3AF] transition hover:bg-white/[0.03] hover:text-white"
>
  Ver agenda
  <ChevronRight size={14} />
</button>
    </Card>
  )
}

  export function SystemAlerts() {
    
  return (
    <Card className="overflow-hidden">
      <CardHeader
        title="Alertas"
        description="Situaciones que requieren atención"
        action={
          <TriangleAlert
            size={17}
            className="text-amber-400"
          />
        }
      />

      <div className="space-y-3 px-5 py-4 sm:px-6">
        {alerts.map((alert) => (
          <div
            key={alert.title}
            className="flex gap-3 rounded-xl border border-white/[0.06] bg-[#17181C] p-4"
          >
            <span
              className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                alert.level === 'urgent'
                  ? 'bg-red-500/10 text-red-400'
                  : alert.level === 'warning'
                    ? 'bg-amber-500/10 text-amber-400'
                    : 'bg-[#163DFF]/10 text-[#7187ff]'
              }`}
            >
              <TriangleAlert size={15} strokeWidth={1.8} />
            </span>

            <div className="min-w-0">
              <p className="text-xs font-semibold text-white">
                {alert.title}
              </p>

              <p className="mt-1 text-[10px] leading-4 text-[#646873]">
                {alert.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}
export function RecentEmails() {
  return (
    <Card className="overflow-hidden">
      <CardHeader
        title="Correos recientes"
        description="Conversaciones pendientes"
        action={<Mail size={17} className="text-[#7187ff]" />}
      />

      <div className="divide-y divide-white/[0.05] px-5 sm:px-6">
        {emails.map((email) => (
          <button
            type="button"
            className="flex w-full items-start gap-3 py-4 text-left"
            key={email.subject}
          >
            <span
              className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                email.unread
                  ? 'bg-[#163DFF]/[0.14] text-[#8296ff]'
                  : 'bg-white/[0.05] text-[#646873]'
              }`}
            >
              <Mail size={15} strokeWidth={1.8} />
            </span>

            <span className="min-w-0 flex-1">
              <span
                className={`block truncate text-xs ${
                  email.unread
                    ? 'font-semibold text-white'
                    : 'font-medium text-[#9CA3AF]'
                }`}
              >
                {email.sender}
              </span>

              <span className="mt-1 block truncate text-[10px] text-[#646873]">
                {email.subject}
              </span>
            </span>

            <span className="shrink-0 text-[10px] text-[#646873]">
              {email.time}
            </span>
          </button>
        ))}
      </div>

      <button
        type="button"
        className="flex w-full items-center justify-center gap-1 border-t border-white/[0.06] py-3 text-xs font-medium text-[#9CA3AF] transition hover:bg-white/[0.03] hover:text-white"
      >
        Abrir bandeja
        <Send size={13} />
      </button>
    </Card>
  )
}