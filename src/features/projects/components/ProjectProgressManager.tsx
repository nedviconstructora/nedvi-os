'use client'

import { useState } from 'react'
import { Gauge, Save } from 'lucide-react'
import { Card, CardHeader } from '@/components/ui/Card'
import { readProjects, writeProjects } from '@/features/projects/services/projectStorage'
import type { Project } from '@/features/projects/types/project'

export function ProjectProgressManager({ project }: { project: Project }) {
  const [progress, setProgress] = useState(project.progress)
  const [saved, setSaved] = useState(false)

  function saveProgress() {
    const safeProgress = Math.max(0, Math.min(100, Math.round(progress)))
    const projects = readProjects()
    const next = projects.map((item) =>
      item.id === project.id ? { ...item, progress: safeProgress } : item,
    )
    writeProjects(next)
    setProgress(safeProgress)
    setSaved(true)
    window.setTimeout(() => setSaved(false), 1800)
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader
        title="Avance publicado del proyecto"
        description="Este porcentaje es el que verá el cliente en su portal."
        action={<Gauge size={17} className="text-[#7187ff]" />}
      />
      <div className="p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <label className="flex-1">
            <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#646873]">
              Avance general
            </span>
            <div className="mt-3 flex items-center gap-4">
              <input
                type="range"
                min="0"
                max="100"
                step="1"
                value={progress}
                onChange={(event) => setProgress(Number(event.target.value))}
                className="w-full accent-[#7BAEE3]"
              />
              <input
                type="number"
                min="0"
                max="100"
                value={progress}
                onChange={(event) => setProgress(Number(event.target.value))}
                className="h-10 w-20 rounded-xl border border-white/[0.09] bg-white/[0.03] px-3 text-center text-sm font-semibold text-white outline-none focus:border-[#7BAEE3]"
              />
              <span className="text-sm font-semibold text-[#9CA3AF]">%</span>
            </div>
          </label>
          <button
            type="button"
            onClick={saveProgress}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#7BAEE3] px-4 text-xs font-bold text-[#0f1720] transition hover:opacity-90"
          >
            <Save size={14} />
            {saved ? 'Guardado' : 'Guardar avance'}
          </button>
        </div>
        <p className="mt-3 text-[11px] text-[#646873]">
          El cambio se reflejará en el portal del cliente al abrir o actualizar la página.
        </p>
      </div>
    </Card>
  )
}
