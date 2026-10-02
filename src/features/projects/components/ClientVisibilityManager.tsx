'use client'

import { useMemo, useState } from 'react'
import { Eye, EyeOff, UsersRound } from 'lucide-react'
import { Card, CardHeader } from '@/components/ui/Card'
import { readProjects, writeProjects } from '@/features/projects/services/projectStorage'
import type { Project } from '@/features/projects/types/project'

type Kind = 'timeline' | 'photos' | 'documents' | 'dailyLogs' | 'tasks'
type Row = { id: string; label: string; visible: boolean }

export function ClientVisibilityManager({ project }: { project: Project }) {
  const [current, setCurrent] = useState(project)
  const groups = useMemo(() => ([
    { key: 'timeline' as Kind, title: 'Hitos', rows: current.timeline.map(x => ({ id: x.id, label: x.title, visible: x.visibleToClient === true })) },
    { key: 'photos' as Kind, title: 'Fotografías', rows: current.photos.map(x => ({ id: x.id, label: x.label, visible: x.visibleToClient === true })) },
    { key: 'documents' as Kind, title: 'Documentos', rows: current.documents.map(x => ({ id: x.id, label: x.name, visible: x.visibleToClient === true })) },
    { key: 'dailyLogs' as Kind, title: 'Reportes diarios', rows: current.dailyLogs.map(x => ({ id: x.id, label: `${x.date} · ${x.summary || 'Reporte de obra'}`, visible: x.visibleToClient === true })) },
    { key: 'tasks' as Kind, title: 'Próximas actividades', rows: current.tasks.map(x => ({ id: x.id, label: `${x.title}${x.dueDate ? ` · ${x.dueDate}` : ''}`, visible: x.visibleToClient === true })) },
  ]), [current])

  function toggle(kind: Kind, row: Row) {
    const next = { ...current, [kind]: current[kind].map((item) => item.id === row.id ? { ...item, visibleToClient: !row.visible } : item) } as Project
    const all = readProjects().map(p => p.id === current.id ? next : p)
    writeProjects(all)
    setCurrent(next)
  }

  return <Card className="overflow-hidden">
    <CardHeader title="Visibilidad en portal del cliente" description="Publica únicamente la información autorizada. Los elementos nuevos permanecen internos hasta que los marques como visibles." action={<UsersRound size={17} className="text-[#7187ff]" />} />
    <div className="grid gap-4 p-5 sm:p-6 xl:grid-cols-2">
      {groups.map(group => <section key={group.key} className="rounded-xl border border-white/[0.07] bg-white/[0.015] p-4">
        <div className="mb-3 flex items-center justify-between"><h3 className="text-xs font-semibold text-white">{group.title}</h3><span className="text-[10px] text-[#646873]">{group.rows.filter(r => r.visible).length}/{group.rows.length} visibles</span></div>
        <div className="space-y-2">{group.rows.length ? group.rows.map(row => <button key={row.id} type="button" onClick={() => toggle(group.key, row)} className="flex w-full items-center justify-between gap-3 rounded-lg border border-white/[0.06] px-3 py-2 text-left transition hover:bg-white/[0.04]">
          <span className="min-w-0 truncate text-[11px] text-[#d5d7df]">{row.label}</span><span className={`flex shrink-0 items-center gap-1 text-[10px] font-semibold ${row.visible ? 'text-emerald-400' : 'text-[#646873]'}`}>{row.visible ? <Eye size={13}/> : <EyeOff size={13}/>} {row.visible ? 'Visible' : 'Interno'}</span>
        </button>) : <p className="py-3 text-center text-[11px] text-[#646873]">Sin elementos todavía.</p>}</div>
      </section>)}
    </div>
  </Card>
}
