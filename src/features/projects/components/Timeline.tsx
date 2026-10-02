import { Check, Circle, Clock3 } from 'lucide-react'
import type { ProjectTimelineEvent } from '@/features/projects/types/project'
import { formatProjectDate } from '@/features/projects/utils/projectUtils'

type TimelineProps = { events: ProjectTimelineEvent[] }

export function Timeline({ events }: TimelineProps) {
  return <div className="space-y-6">{events.map((event, index) => { const Icon = event.status === 'completed' ? Check : event.status === 'current' ? Circle : Clock3; return <div className="relative flex gap-3" key={event.id}>{index < events.length - 1 ? <span className="absolute left-[15px] top-9 h-[calc(100%+8px)] w-px bg-white/[0.08]" aria-hidden="true" /> : null}<span className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${event.status === 'completed' ? 'border-emerald-400/20 bg-emerald-400/[0.1] text-emerald-300' : event.status === 'current' ? 'border-[#163DFF]/40 bg-[#163DFF]/[0.14] text-[#8296ff]' : 'border-white/[0.08] bg-white/[0.04] text-[#646873]'}`}><Icon size={14} strokeWidth={2} /></span><div className="min-w-0 flex-1"><div className="flex flex-col justify-between gap-1 sm:flex-row sm:gap-4"><h3 className="text-xs font-semibold text-[#d5d7df]">{event.title}</h3><time className="shrink-0 text-[10px] text-[#646873]">{formatProjectDate(event.date)}</time></div><p className="mt-1 text-xs leading-5 text-[#9CA3AF]">{event.description}</p></div></div> })}</div>
}
