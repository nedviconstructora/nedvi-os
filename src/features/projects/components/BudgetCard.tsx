import { CircleDollarSign, TrendingDown, TrendingUp } from 'lucide-react'
import type { Project } from '@/features/projects/types/project'
import { formatCurrency, getBudgetUsage } from '@/features/projects/utils/projectUtils'
import { Card, CardHeader } from '@/components/ui/Card'

type BudgetCardProps = { project: Pick<Project, 'budget' | 'spent'> }

export function BudgetCard({ project }: BudgetCardProps) {
  const usage = getBudgetUsage(project)
  const remaining = project.budget - project.spent
  const isHealthy = usage <= 80
  return <Card className="overflow-hidden"><CardHeader title="Budget control" description="Committed spend against approved budget" action={<CircleDollarSign size={17} className="text-[#7187ff]" />} /><div className="p-5 sm:p-6"><div className="flex items-end justify-between gap-4"><div><p className="text-2xl font-semibold tracking-[-0.04em] text-white">{formatCurrency(project.spent)}</p><p className="mt-1 text-xs text-[#646873]">of {formatCurrency(project.budget)}</p></div><span className={`flex items-center gap-1 text-xs font-semibold ${isHealthy ? 'text-emerald-400' : 'text-amber-400'}`}>{isHealthy ? <TrendingDown size={14} /> : <TrendingUp size={14} />}{usage}% used</span></div><div className="mt-5 h-2 overflow-hidden rounded-full bg-white/[0.08]"><div className={`h-full rounded-full ${isHealthy ? 'bg-[#163DFF]' : 'bg-amber-400'}`} style={{ width: `${Math.min(100, usage)}%` }} /></div><div className="mt-5 flex items-center justify-between border-t border-white/[0.06] pt-4 text-xs"><span className="text-[#646873]">Remaining</span><span className="font-semibold text-[#d5d7df]">{formatCurrency(remaining)}</span></div></div></Card>
}
