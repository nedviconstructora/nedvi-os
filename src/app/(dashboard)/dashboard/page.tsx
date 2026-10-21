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
import { DashboardGreeting } from '@/components/dashboard/DashboardGreeting'
import { DashboardAgendaTasks } from '@/features/agenda/components/DashboardAgendaTasks'

export default function DashboardPage() {
  return (
    <AppShell>
      <div className="nedvi-mobile-dashboard mx-auto w-full max-w-[1600px] space-y-4 sm:space-y-8">
        <header className="nedvi-dashboard-hero flex flex-col justify-between gap-4 rounded-[22px] p-4 sm:flex-row sm:items-end sm:rounded-3xl sm:p-6">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#1F6FEB]">
              Mi espacio de trabajo
            </p>
            <DashboardGreeting />
            <p className="mt-2 text-sm text-[var(--muted)]">
              Aquí tienes el pulso de NEDVI Constructora
            </p>
          </div>

          <Link
            href="/agenda"
            className="nedvi-dashboard-new-activity inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl sm:h-11 sm:w-auto bg-[linear-gradient(90deg,#1677E8,#2796FF)] px-4 text-xs font-semibold text-white shadow-[0_10px_25px_rgba(22,119,232,0.22)] transition hover:brightness-105 hover:shadow-[0_14px_30px_rgba(22,119,232,0.28)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#1F6FEB]/25"
          >
            <Plus size={16} strokeWidth={2} />
            Nueva actividad
          </Link>
        </header>

        <DashboardStats />

        <div className="grid min-w-0 gap-4 sm:gap-5 xl:grid-cols-[1.35fr_0.85fr]">
          <RevenueChart />
          <ProjectsStatusChart />
        </div>

        <div className="grid min-w-0 gap-4 sm:gap-5 lg:grid-cols-3">
          <QuickActions />
          <RecentActivity />
          <DashboardAgendaTasks />
        </div>

        <div className="grid min-w-0 gap-4 sm:gap-5 xl:grid-cols-[1.1fr_0.9fr]">
          <RecentEmails />
          <SystemAlerts />
        </div>
      </div>
    </AppShell>
  )
}
