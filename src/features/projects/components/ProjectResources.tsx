import { Boxes, HardHat } from 'lucide-react'
import type { Project } from '@/features/projects/types/project'
import { Card, CardHeader } from '@/components/ui/Card'

type ProjectResourcesProps = { materials: Project['materials']; equipment: Project['equipment'] }

export function ProjectResources({ materials, equipment }: ProjectResourcesProps) {
  return <Card className="overflow-hidden"><CardHeader title="Recursos de obra" description="Materiales y equipo asignados al proyecto" action={<Boxes size={17} className="text-[#7187ff]" />} /><div className="grid gap-6 p-5 sm:grid-cols-2 sm:p-6"><ResourceGroup title="Materiales" icon={Boxes} items={materials} /><ResourceGroup title="Equipo" icon={HardHat} items={equipment} /></div></Card>
}

type ResourceGroupProps = { title: string; icon: typeof Boxes; items: string[] }
function ResourceGroup({ title, icon: Icon, items }: ResourceGroupProps) { return <div><h3 className="flex items-center gap-2 text-xs font-semibold text-[#d5d7df]"><Icon size={14} className="text-[#7187ff]" />{title}</h3>{items.length ? <ul className="mt-3 space-y-2">{items.map((item) => <li className="flex items-center gap-2 text-xs text-[#9CA3AF]" key={item}><span className="h-1.5 w-1.5 rounded-full bg-white/[0.25]" />{item}</li>)}</ul> : <p className="mt-3 text-xs text-[#646873]">Sin registros.</p>}</div> }
