import Link from 'next/link'
import { ArrowLeft, CalendarDays, Edit3, UsersRound } from 'lucide-react'
import { Card, CardHeader } from '@/components/ui/Card'
import { BudgetCard } from '@/features/projects/components/BudgetCard'
import { DailyLog } from '@/features/projects/components/DailyLog'
import { InspectionCard } from '@/features/projects/components/InspectionCard'
import { PhotoGallery } from '@/features/projects/components/PhotoGallery'
import { ProgressBar } from '@/features/projects/components/ProgressBar'
import { ProgressHistory } from '@/features/projects/components/ProgressHistory'
import { ProjectDocuments } from '@/features/projects/components/ProjectDocuments'
import { ProjectMap } from '@/features/projects/components/ProjectMap'
import { ProjectResources } from '@/features/projects/components/ProjectResources'
import { ProjectStatusBadge } from '@/features/projects/components/ProjectStatusBadge'
import { SafetyIncidentCard } from '@/features/projects/components/SafetyIncidentCard'
import { TaskList } from '@/features/projects/components/TaskList'
import { Timeline } from '@/features/projects/components/Timeline'
import type { Project } from '@/features/projects/types/project'
import {
  formatProjectDate,
  getProjectInitials,
} from '@/features/projects/utils/projectUtils'

type ProjectDetailProps = {
  project: Project
}

export function ProjectDetail({ project }: ProjectDetailProps) {
  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-7">
      <header className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
        <div>
          <Link
            href="/projects"
            className="inline-flex items-center gap-2 text-xs font-medium text-[#9CA3AF] transition hover:text-white"
          >
            <ArrowLeft size={14} />
            Volver a proyectos
          </Link>

          <div className="mt-6 flex items-start gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#163DFF]/[0.14] text-sm font-semibold text-[#9aabff]">
              {getProjectInitials(project)}
            </span>

            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-3xl font-semibold tracking-[-0.05em] text-white">
                  {project.name}
                </h1>
                <ProjectStatusBadge status={project.status} />
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-[#9CA3AF]">
                {project.clientId ? (
                  <Link
                    href={`/crm/${project.clientId}`}
                    className="font-medium text-[#91a2ff] transition hover:text-white"
                  >
                    {project.client}
                  </Link>
                ) : (
                  <span>{project.client}</span>
                )}
                <span>·</span>
                <span>{project.projectType}</span>
              </div>

              {project.clientContact ? (
                <p className="mt-1 text-xs text-[#646873]">
                  Contacto: {project.clientContact}
                </p>
              ) : null}
            </div>
          </div>
        </div>

        <Link
          href={`/projects/${project.id}/edit`}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-white/[0.09] px-4 text-xs font-semibold text-[#d5d7df] transition hover:bg-white/[0.06] hover:text-white"
        >
          <Edit3 size={14} />
          Editar proyecto
        </Link>
      </header>

      <Card className="p-5 sm:p-6">
        <div className="grid gap-6 md:grid-cols-4">
          <div className="md:col-span-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#646873]">
                Avance actual
              </span>
              <span className="text-2xl font-semibold tracking-[-0.04em] text-white">
                {project.progress}%
              </span>
            </div>
            <div className="mt-4">
              <ProgressBar value={project.progress} showLabel={false} />
            </div>
            <p className="mt-3 text-xs leading-5 text-[#9CA3AF]">
              {project.description || 'Sin descripción registrada.'}
            </p>
          </div>

          <SummaryItem
            icon={UsersRound}
            label="Responsable"
            value={project.manager || 'Sin asignar'}
          />
          <SummaryItem
            icon={CalendarDays}
            label="Terminación estimada"
            value={
              project.estimatedCompletion
                ? formatProjectDate(project.estimatedCompletion)
                : 'Sin fecha'
            }
          />
        </div>
      </Card>

      <div className="grid gap-5 xl:grid-cols-2">
        <BudgetCard project={project} />
        <ProjectMap project={project} />
      </div>

      <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <Card className="overflow-hidden">
          <CardHeader
            title="Cronología del proyecto"
            description="Hitos y plan de ejecución"
          />
          <div className="p-5 sm:p-6">
            <Timeline events={project.timeline} />
          </div>
        </Card>
        <ProgressHistory history={project.progressHistory} />
      </div>

      <PhotoGallery photos={project.photos} />

      <div className="grid gap-5 xl:grid-cols-2">
        <ProjectResources
          materials={project.materials}
          equipment={project.equipment}
        />
        <ProjectDocuments documents={project.documents} />
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <DailyLog logs={project.dailyLogs} />
        <TaskList tasks={project.tasks} />
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <InspectionCard inspections={project.inspections} />
        <SafetyIncidentCard incidents={project.safetyIncidents} />
      </div>
    </div>
  )
}

type SummaryItemProps = {
  icon: typeof UsersRound
  label: string
  value: string
}

function SummaryItem({ icon: Icon, label, value }: SummaryItemProps) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/[0.05] text-[#7187ff]">
        <Icon size={17} />
      </span>
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#646873]">
          {label}
        </p>
        <p className="mt-1 text-xs font-medium text-[#d5d7df]">{value}</p>
      </div>
    </div>
  )
}
