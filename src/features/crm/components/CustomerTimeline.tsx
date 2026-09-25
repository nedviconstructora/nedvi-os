import { CalendarDays, FileText, Mail, MessageCircle, Phone } from 'lucide-react'
import type { CustomerTimelineEvent } from '@/features/crm/types/customer'
import { formatCustomerDate } from '@/features/crm/utils/customerUtils'

type CustomerTimelineProps = {
  events: CustomerTimelineEvent[]
}

const eventIcons = {
  call: Phone,
  email: Mail,
  meeting: CalendarDays,
  quote: FileText,
  note: MessageCircle,
}

export function CustomerTimeline({ events }: CustomerTimelineProps) {
  return (
    <div className="space-y-6">
      {events.map((event, index) => {
        const Icon = eventIcons[event.type]
        return (
          <div className="relative flex gap-3" key={event.id}>
            {index < events.length - 1 ? <span className="absolute left-[15px] top-9 h-[calc(100%+8px)] w-px bg-white/[0.08]" aria-hidden="true" /> : null}
            <span className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/[0.08] bg-[#20232A] text-[#7187ff]"><Icon size={14} strokeWidth={1.8} /></span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-col justify-between gap-1 sm:flex-row sm:gap-4"><h3 className="text-xs font-semibold text-[#d5d7df]">{event.title}</h3><time className="shrink-0 text-[10px] text-[#646873]">{formatCustomerDate(event.date)}</time></div>
              <p className="mt-1 text-xs leading-5 text-[#9CA3AF]">{event.description}</p>
              <p className="mt-2 text-[10px] text-[#646873]">By {event.author}</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
