'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { ArrowLeft, Edit3 } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { ProjectForm } from '@/features/projects/components/ProjectForm'
import { readProjectByIdFromSupabase } from '@/features/projects/services/projectSupabaseService'
import type { Project } from '@/features/projects/types/project'

export default function EditProjectPage() {
  const params = useParams<{ id: string }>()
  const projectId = params.id
  const [project, setProject] = useState<Project | null | undefined>(undefined)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    async function loadProject() {
      setError(null)

      try {
        const nextProject = await readProjectByIdFromSupabase(projectId)
        if (active) setProject(nextProject ?? null)
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
  }, [projectId])

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-4xl space-y-7">
        {error ? (
          <div className="rounded-2xl border border-red-400/20 bg-red-400/[0.06] px-5 py-4 text-xs text-red-200">
            {error}
          </div>
        ) : null}

        {project === undefined ? (
          <div className="rounded-2xl border border-white/[0.07] bg-[#20232A] p-8 text-sm text-[#9CA3AF]">
            Cargando proyecto desde Supabase...
          </div>
        ) : project === null ? (
          <div className="rounded-2xl border border-red-400/20 bg-red-400/[0.06] p-8">
            <h1 className="text-xl font-semibold text-white">Proyecto no encontrado</h1>
            <p className="mt-2 text-sm text-[#9CA3AF]">
              El proyecto no existe en Supabase o tu usuario no tiene permiso para consultarlo.
            </p>
            <Link href="/projects" className="mt-5 inline-flex items-center gap-2 text-xs font-semibold text-[#7187ff] transition hover:text-white">
              <ArrowLeft size={14} /> Volver a proyectos
            </Link>
          </div>
        ) : (
          <>
            <header>
              <Link href={`/projects/${project.id}`} className="inline-flex items-center gap-2 text-xs font-medium text-[#9CA3AF] transition hover:text-white">
                <ArrowLeft size={14} /> Volver al proyecto
              </Link>
              <div className="mt-6 flex items-start gap-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#163DFF]/[0.14] text-[#8296ff]">
                  <Edit3 size={19} />
                </span>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7187ff]">Proyectos / Editar</p>
                  <h1 className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-white">Editar {project.name}</h1>
                  <p className="mt-2 text-sm text-[#9CA3AF]">Actualiza cliente, alcance, calendario, responsables y estado directamente en Supabase.</p>
                </div>
              </div>
            </header>
            <div className="rounded-2xl border border-white/[0.07] bg-[#20232A] p-5 shadow-[0_16px_50px_rgba(0,0,0,0.16)] sm:p-8">
              <ProjectForm mode="edit" projectId={project.id} initialValues={project} />
            </div>
          </>
        )}
      </div>
    </AppShell>
  )
}
