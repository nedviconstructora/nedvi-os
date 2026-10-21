import type { LucideIcon } from 'lucide-react'
import { ArrowDownRight, ArrowUpRight } from 'lucide-react'
import { Card } from '@/components/ui/Card'

type StatCardProps = {
  label: string
  value: string
  change: string
  detail: string
  icon: LucideIcon
  positive?: boolean
}

export function StatCard({
  label,
  value,
  change,
  detail,
  icon: Icon,
  positive = true,
}: StatCardProps) {
  return (
    <Card className="group relative flex min-h-[138px] flex-col overflow-hidden p-3.5 transition duration-300 hover:-translate-y-0.5 hover:border-[#1F6FEB]/25 hover:shadow-[0_18px_42px_rgba(31,111,235,0.10)] sm:min-h-0 sm:p-6">
      <div className="flex min-w-0 items-start justify-between gap-2">
        <p className="min-w-0 text-[11px] font-medium leading-4 text-[var(--muted)] sm:text-xs">{label}</p>
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#1F6FEB]/10 text-[#1F6FEB] transition group-hover:bg-[#1F6FEB]/16 sm:h-9 sm:w-9 sm:rounded-xl">
          <Icon size={17} strokeWidth={1.8} />
        </span>
      </div>
      <p className="mt-auto pt-3 text-[1.55rem] font-semibold leading-none tracking-[-0.04em] text-[var(--foreground)] sm:mt-5 sm:pt-0 sm:text-[1.75rem]">{value}</p>
      <div className="mt-2 flex min-w-0 items-center gap-1 text-[10px] leading-[1.25] sm:mt-3 sm:gap-2 sm:text-[11px]">
        <span className={`hidden items-center gap-0.5 font-semibold sm:inline-flex ${positive ? 'text-emerald-400' : 'text-amber-400'}`}>
          {positive ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
          {change}
        </span>
        <span className="min-w-0 break-words text-[var(--subtle)]">{detail}</span>
      </div>
      <div className="absolute -bottom-10 -right-8 h-24 w-24 rounded-full bg-[#1F6FEB]/[0.05] blur-2xl transition group-hover:bg-[#1F6FEB]/[0.10]" />
    </Card>
  )
}
