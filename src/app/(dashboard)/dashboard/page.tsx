import Link from 'next/link'
import { Plus } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import {
  DashboardStats,
  ProjectsStatusChart,
  QuickActions,
  RecentActivity,
  RecentEmails,
  RevenueChart,
  SystemAlerts,
} from '@/components/dashboard/DashboardWidgets'
import { currentUser } from '@/data/currentUser'
import { DashboardAgendaTasks } from '@/features/agenda/components/DashboardAgendaTasks'

export default function DashboardPage() {
  return (
    <AppShell>
      <div className="mx-auto w-full max-w-[1600px] space-y-8">
        <header className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7187ff]">
              Mi espacio de trabajo
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-white sm:text-4xl">
              Buenos días, {currentUser.firstName}
            </h1>
            <p className="mt-2 text-sm text-[#9CA3AF]">
              Aquí tienes el pulso de NEDVI Constructora
            </p>
          </div>

          <Link
            href="/agenda"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#163DFF] px-4 text-xs font-semibold text-white shadow-[0_10px_25px_rgba(22,61,255,0.2)] transition hover:bg-[#3155ff] hover:shadow-[0_14px_30px_rgba(22,61,255,0.3)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#163DFF]/30"
          >
            <Plus size={16} strokeWidth={2} />
            Nueva actividad
          </Link>
        </header>

        <DashboardStats />

        <div className="grid gap-5 xl:grid-cols-[1.35fr_0.85fr]">
          <RevenueChart />
          <ProjectsStatusChart />
        </div>

        <div className="grid gap-5 lg:grid-cols-3">
          <QuickActions />
          <RecentActivity />
          <DashboardAgendaTasks />
        </div>

        <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
          <RecentEmails />
          <SystemAlerts />
        </div>
      </div>
    </AppShell>
  )
}
