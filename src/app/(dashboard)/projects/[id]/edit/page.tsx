'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { ArrowLeft, Edit3 } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { ProjectForm } from '@/features/projects/components/ProjectForm'
import { readProjectById } from '@/features/projects/services/projectStorage'
import type { Project } from '@/features/projects/types/project'

export default function EditProjectPage() {
  const params = useParams<{ id: string }>()
  const [project, setProject] = useState<Project | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    setProject(readProjectById(params.id) ?? null)
    setLoaded(true)
  }, [params.id])

  if (!loaded) {
    return (
      <AppShell>
        <div className="mx-auto w-full max-w-4xl py-16 text-center text-sm text-[#646873]">
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
      <div className="mx-auto w-full max-w-4xl space-y-7">
        <header>
          <Link
            href={`/projects/${project.id}`}
            className="inline-flex items-center gap-2 text-xs font-medium text-[#9CA3AF] transition hover:text-white"
          >
            <ArrowLeft size={14} />
            Volver al proyecto
          </Link>

          <div className="mt-6 flex items-start gap-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#163DFF]/[0.14] text-[#8296ff]">
              <Edit3 size={19} />
            </span>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7187ff]">
                Proyectos / Editar
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-white">
                Editar {project.name}
              </h1>
              <p className="mt-2 text-sm text-[#9CA3AF]">
                Actualiza cliente, alcance, calendario, responsables y estado del proyecto.
              </p>
            </div>
          </div>
        </header>

        <div className="rounded-2xl border border-white/[0.07] bg-[#20232A] p-5 shadow-[0_16px_50px_rgba(0,0,0,0.16)] sm:p-8">
          <ProjectForm
            mode="edit"
            projectId={project.id}
            initialValues={project}
          />
        </div>
      </div>
    </AppShell>
  )
}
