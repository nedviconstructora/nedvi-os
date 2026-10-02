import { BookOpen, CloudSun, Users } from 'lucide-react'
import type { ProjectDailyLog } from '@/features/projects/types/project'
import { formatProjectDate } from '@/features/projects/utils/projectUtils'
import { Card, CardHeader } from '@/components/ui/Card'

type DailyLogProps = { logs: ProjectDailyLog[] }

export function DailyLog({ logs }: DailyLogProps) {
  const latestLog = logs[0]
  return <Card className="overflow-hidden"><CardHeader title="Daily logs" description="Latest field updates" action={<BookOpen size={17} className="text-[#7187ff]" />} />{latestLog ? <div className="p-5 sm:p-6"><div className="flex flex-wrap items-center justify-between gap-3"><p className="text-xs font-semibold text-white">{formatProjectDate(latestLog.date)}</p><span className="text-[10px] text-[#646873]">Logged by {latestLog.author}</span></div><div className="mt-5 grid grid-cols-2 gap-3"><div className="flex items-center gap-2 rounded-xl bg-[#17181C] p-3 text-xs text-[#9CA3AF]"><CloudSun size={15} className="text-[#7187ff]" />{latestLog.weather}</div><div className="flex items-center gap-2 rounded-xl bg-[#17181C] p-3 text-xs text-[#9CA3AF]"><Users size={15} className="text-[#7187ff]" />{latestLog.crew} crew members</div></div><p className="mt-5 text-xs leading-6 text-[#d5d7df]">{latestLog.summary}</p><div className="mt-4 rounded-xl border border-amber-400/15 bg-amber-400/[0.06] p-3"><p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-amber-300">Blockers</p><p className="mt-1 text-xs leading-5 text-[#d8c5a1]">{latestLog.blockers}</p></div></div> : <p className="px-5 py-10 text-center text-xs text-[#646873]">No daily logs have been recorded for this project.</p>}</Card>
}
