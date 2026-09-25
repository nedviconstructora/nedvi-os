import { TrendingUp } from 'lucide-react'
import type { ProjectProgressPoint } from '@/features/projects/types/project'
import { Card, CardHeader } from '@/components/ui/Card'

type ProgressHistoryProps = { history: ProjectProgressPoint[] }

export function ProgressHistory({ history }: ProgressHistoryProps) {
  return <Card className="overflow-hidden"><CardHeader title="Progress history" description="Planned versus actual delivery" action={<TrendingUp size={17} className="text-[#7187ff]" />} /><div className="p-5 sm:p-6"><div className="flex h-44 items-end justify-between gap-3 border-b border-white/[0.06] pb-0">{history.map((point) => <div className="flex h-full flex-1 flex-col items-center justify-end gap-2" key={point.label}><div className="flex h-full items-end gap-1"><span className="w-2 rounded-t bg-white/[0.15]" style={{ height: `${point.planned}%` }} /><span className="w-2 rounded-t bg-[#163DFF]" style={{ height: `${point.actual}%` }} /></div><span className="pb-2 text-[10px] text-[#646873]">{point.label}</span></div>)}</div><div className="mt-4 flex items-center justify-end gap-4 text-[10px] text-[#646873]"><span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-white/[0.15]" /> Planned</span><span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-[#163DFF]" /> Actual</span></div></div></Card>
}
