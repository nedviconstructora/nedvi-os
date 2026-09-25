'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { AppShell } from '@/components/layout/AppShell'
import { ProjectDetail } from '@/features/projects/components/ProjectDetail'
import { readProjectById } from '@/features/projects/services/projectStorage'
import type { Project } from '@/features/projects/types/project'

export default function ProjectDetailPage() {
  const params = useParams<{ id: string }>()
  const [project, setProject] = useState<Project | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const foundProject = readProjectById(params.id)
    setProject(foundProject ?? null)
    setLoaded(true)
  }, [params.id])

  if (!loaded) {
    return (
      <AppShell>
        <div className="mx-auto w-full max-w-[1600px] py-16 text-center text-sm text-[#646873]">
          Cargando proyecto...
        </div>
      </AppShell>
    )
  }

  if (!project) {
    return (
      <AppShell>
        <div className="mx-auto w-full max-w-xl py-20 text-center">
          <h1 className="text-2xl font-semibold text-white">Proyecto no encontrado</h1>
          <p className="mt-3 text-sm text-[#646873]">
            El proyecto pudo haber sido eliminado o no existe en este dispositivo.
          </p>
          <Link
            href="/projects"
            className="mt-6 inline-flex h-10 items-center rounded-xl bg-[#163DFF] px-4 text-xs font-semibold text-white transition hover:bg-[#3155ff]"
          >
            Volver a proyectos
          </Link>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <ProjectDetail project={project} />
    </AppShell>
  )
}
