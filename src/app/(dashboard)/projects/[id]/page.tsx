'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { ProjectDetail } from '@/features/projects/components/ProjectDetail'
import {
  deleteProjectFromSupabase,
  getProjectByIdFromSupabase,
} from '@/features/projects/services/projectSupabase'
import type { Project } from '@/features/projects/types/project'

export default function ProjectDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const projectId = params.id
  const [project, setProject] = useState<Project | null | undefined>(undefined)
  const [error, setError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    let active = true

    async function loadProject() {
      setError(null)

      try {
        const nextProject = await getProjectByIdFromSupabase(projectId)
        if (active) setProject(nextProject ?? null)
      } catch (loadError) {
        console.error('Error al cargar proyecto desde Supabase:', loadError)
        if (active) {
          setProject(null)
          setError(loadError instanceof Error ? loadError.message : 'No se pudo cargar el proyecto desde Supabase.')
        }
      }
    }

    void loadProject()
    return () => { active = false }
  }, [projectId])

  async function handleDelete() {
    if (!project || deleting) return

    const confirmed = window.confirm('¿Eliminar el proyecto ' + project.name + '? Esta acción lo quitará de Supabase.')
    if (!confirmed) return

    setDeleting(true)
    setError(null)

    try {
      await deleteProjectFromSupabase(project.id)
      router.push('/projects')
      router.refresh()
    } catch (deleteError) {
      console.error('Error al eliminar proyecto:', deleteError)
      setError(deleteError instanceof Error ? deleteError.message : 'No se pudo eliminar el proyecto.')
      setDeleting(false)
    }
  }

  return <AppShell>
    {error ? <div className="mx-auto mb-5 w-full max-w-[1600px] rounded-2xl border border-red-400/20 bg-red-400/[0.06] px-5 py-4 text-xs text-red-200">{error}</div> : null}

    {project === undefined ? (
      <div className="mx-auto w-full max-w-[1600px] rounded-2xl border border-white/[0.07] bg-[#20232A] p-8 text-sm text-[#9CA3AF]">Cargando proyecto desde Supabase...</div>
    ) : project === null ? (
      <div className="mx-auto w-full max-w-[1600px] rounded-2xl border border-red-400/20 bg-red-400/[0.06] p-8">
        <h1 className="text-xl font-semibold text-white">Proyecto no encontrado</h1>
        <p className="mt-2 text-sm text-[#9CA3AF]">El registro no existe o tu usuario no tiene permiso para consultarlo.</p>
        <Link href="/projects" className="mt-5 inline-flex items-center gap-2 text-xs font-semibold text-[#7187ff] transition hover:text-white"><ArrowLeft size={14} /> Volver a proyectos</Link>
      </div>
    ) : (
      <ProjectDetail project={project} onDelete={() => void handleDelete()} deleting={deleting} />
    )}
  </AppShell>
}
