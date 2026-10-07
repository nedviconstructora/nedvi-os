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
    <Card className="group relative overflow-hidden p-5 transition duration-300 hover:-translate-y-0.5 hover:border-[#1F6FEB]/25 hover:shadow-[0_18px_42px_rgba(31,111,235,0.10)] sm:p-6">
      <div className="flex items-start justify-between">
        <p className="text-xs font-medium text-[var(--muted)]">{label}</p>
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#1F6FEB]/10 text-[#1F6FEB] transition group-hover:bg-[#1F6FEB]/16">
          <Icon size={17} strokeWidth={1.8} />
        </span>
      </div>
      <p className="mt-5 text-2xl font-semibold tracking-[-0.04em] text-[var(--foreground)] sm:text-[1.75rem]">{value}</p>
      <div className="mt-3 flex items-center gap-2 text-[11px]">
        <span className={`inline-flex items-center gap-0.5 font-semibold ${positive ? 'text-emerald-400' : 'text-amber-400'}`}>
          {positive ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
          {change}
        </span>
        <span className="text-[var(--subtle)]">{detail}</span>
      </div>
      <div className="absolute -bottom-10 -right-8 h-24 w-24 rounded-full bg-[#1F6FEB]/[0.05] blur-2xl transition group-hover:bg-[#1F6FEB]/[0.10]" />
    </Card>
  )
}
