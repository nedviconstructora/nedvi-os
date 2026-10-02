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
    <Card className="group relative overflow-hidden p-5 transition duration-300 hover:-translate-y-0.5 hover:border-white/[0.13] sm:p-6">
      <div className="flex items-start justify-between">
        <p className="text-xs font-medium text-[#9CA3AF]">{label}</p>
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#163DFF]/[0.12] text-[#7187ff] transition group-hover:bg-[#163DFF]/20">
          <Icon size={17} strokeWidth={1.8} />
        </span>
      </div>
      <p className="mt-5 text-2xl font-semibold tracking-[-0.04em] text-white sm:text-[1.75rem]">{value}</p>
      <div className="mt-3 flex items-center gap-2 text-[11px]">
        <span className={`inline-flex items-center gap-0.5 font-semibold ${positive ? 'text-emerald-400' : 'text-amber-400'}`}>
          {positive ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
          {change}
        </span>
        <span className="text-[#646873]">{detail}</span>
      </div>
      <div className="absolute -bottom-10 -right-8 h-24 w-24 rounded-full bg-[#163DFF]/[0.04] blur-2xl transition group-hover:bg-[#163DFF]/[0.09]" />
    </Card>
  )
}
