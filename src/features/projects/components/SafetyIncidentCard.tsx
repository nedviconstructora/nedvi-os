import { ShieldAlert } from 'lucide-react'
import type { ProjectSafetyIncident } from '@/features/projects/types/project'
import { formatProjectDate } from '@/features/projects/utils/projectUtils'
import { Card, CardHeader } from '@/components/ui/Card'

type SafetyIncidentCardProps = { incidents: ProjectSafetyIncident[] }
const severityStyles = { Low: 'text-sky-300 bg-sky-400/[0.1]', Medium: 'text-amber-300 bg-amber-400/[0.1]', High: 'text-red-300 bg-red-400/[0.1]' }

export function SafetyIncidentCard({ incidents }: SafetyIncidentCardProps) {
  return <Card className="overflow-hidden"><CardHeader title="Safety incidents" description={`${incidents.length} recorded incidents`} action={<ShieldAlert size={17} className="text-amber-300" />} />{incidents.length ? <div className="divide-y divide-white/[0.05] px-5 sm:px-6">{incidents.map((incident) => <div className="flex items-start gap-3 py-4" key={incident.id}><span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-400/[0.1] text-amber-300"><ShieldAlert size={15} /></span><div className="min-w-0 flex-1"><p className="text-xs font-medium text-[#d5d7df]">{incident.title}</p><p className="mt-1 text-[10px] text-[#646873]">{formatProjectDate(incident.date)} · {incident.status}</p></div><span className={`rounded-md px-2 py-1 text-[10px] font-semibold ${severityStyles[incident.severity]}`}>{incident.severity}</span></div>)}</div> : <div className="flex items-center gap-3 p-6 text-xs text-emerald-300"><span className="h-2 w-2 rounded-full bg-emerald-400" />No incidents recorded for this project.</div>}</Card>
}
