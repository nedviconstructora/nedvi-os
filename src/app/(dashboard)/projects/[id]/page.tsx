'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { AppShell } from '@/components/layout/AppShell'
import { ProjectDetail } from '@/features/projects/components/ProjectDetail'
import { readProjectByIdFromSupabase } from '@/features/projects/services/projectSupabaseService'
import type { Project } from '@/features/projects/types/project'

export default function ProjectDetailPage() {
  const params = useParams<{ id: string }>()
  const [project, setProject] = useState<Project | null | undefined>(undefined)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    async function loadProject() {
      setError(null)
      try {
        const foundProject = await readProjectByIdFromSupabase(params.id)
        if (active) setProject(foundProject ?? null)
      } catch (loadError) {
        console.error('Error al cargar proyecto desde Supabase:', loadError)
        if (active) {
          setProject(null)
          setError(
            loadError instanceof Error
              ? loadError.message
              : 'No se pudo cargar el proyecto desde Supabase.',
          )
        }
      }
    }

    void loadProject()
    return () => {
      active = false
    }
  }, [params.id])

  if (project === undefined) {
    return (
      <AppShell>
        <div className="mx-auto w-full max-w-[1600px] py-16 text-center text-sm text-[#646873]">
          Cargando proyecto desde Supabase...
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
            El proyecto no existe en Supabase o tu usuario no tiene permiso para consultarlo.
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
