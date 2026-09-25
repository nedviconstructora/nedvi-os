import Link from 'next/link'
import { ArrowLeft, FolderPlus } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { ProjectForm } from '@/features/projects/components/ProjectForm'

export default function NewProjectPage() {
  return <AppShell><div className="mx-auto w-full max-w-4xl space-y-7"><header><Link href="/projects" className="inline-flex items-center gap-2 text-xs font-medium text-[#9CA3AF] transition hover:text-white"><ArrowLeft size={14} /> Back to projects</Link><div className="mt-6 flex items-start gap-4"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#163DFF]/[0.14] text-[#8296ff]"><FolderPlus size={20} /></span><div><p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7187ff]">Projects / New record</p><h1 className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-white">Create project</h1><p className="mt-2 text-sm text-[#9CA3AF]">Set up the project context your delivery team needs from day one.</p></div></div></header><div className="rounded-2xl border border-white/[0.07] bg-[#20232A] p-5 shadow-[0_16px_50px_rgba(0,0,0,0.16)] sm:p-8"><ProjectForm mode="create" /></div></div></AppShell>
}
