import Link from 'next/link'
import { ArrowLeft, Edit3 } from 'lucide-react'
import { notFound } from 'next/navigation'
import { AppShell } from '@/components/layout/AppShell'
import { ProjectForm } from '@/features/projects/components/ProjectForm'
import { getProjectById } from '@/features/projects/services/projectService'

type EditProjectPageProps = { params: Promise<{ id: string }> }

export default async function EditProjectPage({ params }: EditProjectPageProps) {
  const { id } = await params
  const project = getProjectById(id)
  if (!project) notFound()
  return <AppShell><div className="mx-auto w-full max-w-4xl space-y-7"><header><Link href={`/projects/${project.id}`} className="inline-flex items-center gap-2 text-xs font-medium text-[#9CA3AF] transition hover:text-white"><ArrowLeft size={14} /> Back to project</Link><div className="mt-6 flex items-start gap-4"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#163DFF]/[0.14] text-[#8296ff]"><Edit3 size={19} /></span><div><p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7187ff]">Projects / Edit record</p><h1 className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-white">Edit {project.name}</h1><p className="mt-2 text-sm text-[#9CA3AF]">Keep scope, schedule, ownership, and delivery context current.</p></div></div></header><div className="rounded-2xl border border-white/[0.07] bg-[#20232A] p-5 shadow-[0_16px_50px_rgba(0,0,0,0.16)] sm:p-8"><ProjectForm mode="edit" initialValues={project} /></div></div></AppShell>
}
