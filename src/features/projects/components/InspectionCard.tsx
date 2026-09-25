import { ClipboardCheck, Clock3 } from 'lucide-react'
import type { ProjectInspection } from '@/features/projects/types/project'
import { formatProjectDate } from '@/features/projects/utils/projectUtils'
import { Card, CardHeader } from '@/components/ui/Card'

type InspectionCardProps = { inspections: ProjectInspection[] }

export function InspectionCard({ inspections }: InspectionCardProps) {
  return <Card className="overflow-hidden"><CardHeader title="Inspection checklist" description={`${inspections.filter((item) => !item.completed).length} inspections pending`} action={<ClipboardCheck size={17} className="text-[#7187ff]" />} /><div className="divide-y divide-white/[0.05] px-5 sm:px-6">{inspections.length ? inspections.map((inspection) => <div className="flex items-start gap-3 py-4" key={inspection.id}><span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border text-[10px] ${inspection.completed ? 'border-emerald-400 bg-emerald-400 text-[#0B0B0D]' : 'border-white/[0.12] text-transparent'}`}>✓</span><div className="min-w-0 flex-1"><p className={`text-xs font-medium ${inspection.completed ? 'text-[#646873] line-through' : 'text-[#d5d7df]'}`}>{inspection.title}</p><p className="mt-1 text-[10px] text-[#646873]">{inspection.area} · {inspection.owner}</p></div><span className="flex shrink-0 items-center gap-1 text-[10px] text-[#646873]"><Clock3 size={12} />{formatProjectDate(inspection.dueDate)}</span></div>) : <p className="py-10 text-center text-xs text-[#646873]">No inspections scheduled.</p>}</div></Card>
}
