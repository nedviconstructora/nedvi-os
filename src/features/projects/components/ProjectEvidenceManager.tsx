'use client'

import { ChangeEvent, FormEvent, useRef, useState } from 'react'
import { Camera, Eye, EyeOff, Pencil, Plus, Trash2, Upload, X } from 'lucide-react'
import { Card, CardHeader } from '@/components/ui/Card'
import { readProjectById, writeProjects, readProjects } from '@/features/projects/services/projectStorage'
import type { Project, ProjectPhoto } from '@/features/projects/types/project'

type Props = {
  project: Project
}

type EvidenceDraft = {
  title: string
  description: string
  date: string
  stage: string
  visibleToClient: boolean
  imageUrl: string
}

const emptyDraft = (): EvidenceDraft => ({
  title: '',
  description: '',
  date: new Date().toISOString().slice(0, 10),
  stage: '',
  visibleToClient: false,
  imageUrl: '',
})

export function ProjectEvidenceManager({ project }: Props) {
  const [current, setCurrent] = useState(project)
  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState<EvidenceDraft>(emptyDraft)
  const fileRef = useRef<HTMLInputElement>(null)
  const cameraRef = useRef<HTMLInputElement>(null)

  function persist(photos: ProjectPhoto[]) {
    const projects = readProjects()
    const nextProjects = projects.map((item) =>
      item.id === current.id ? { ...item, photos } : item,
    )
    writeProjects(nextProjects)
    setCurrent(readProjectById(current.id) ?? { ...current, photos })
  }

  function startCreate() {
    setEditingId(null)
    setDraft(emptyDraft())
    setOpen(true)
  }

  function startEdit(photo: ProjectPhoto) {
    setEditingId(photo.id)
    setDraft({
      title: photo.label,
      description: photo.description ?? '',
      date: photo.date ?? new Date().toISOString().slice(0, 10),
      stage: photo.stage ?? '',
      visibleToClient: photo.visibleToClient === true,
      imageUrl: photo.url,
    })
    setOpen(true)
  }

  function closeForm() {
    setOpen(false)
    setEditingId(null)
    setDraft(emptyDraft())
  }

  function handleImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) return

    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setDraft((value) => ({ ...value, imageUrl: reader.result as string }))
      }
    }
    reader.readAsDataURL(file)
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    if (!draft.title.trim() || !draft.imageUrl) return

    if (editingId) {
      persist(
        current.photos.map((photo) =>
          photo.id === editingId
            ? {
                ...photo,
                label: draft.title.trim(),
                alt: draft.description.trim() || draft.title.trim(),
                description: draft.description.trim(),
                date: draft.date,
                stage: draft.stage.trim(),
                visibleToClient: draft.visibleToClient,
                url: draft.imageUrl,
              }
            : photo,
        ),
      )
    } else {
      const photo: ProjectPhoto = {
        id: crypto.randomUUID(),
        url: draft.imageUrl,
        alt: draft.description.trim() || draft.title.trim(),
        label: draft.title.trim(),
        description: draft.description.trim(),
        date: draft.date,
        stage: draft.stage.trim(),
        visibleToClient: draft.visibleToClient,
      }
      persist([photo, ...current.photos])
    }

    closeForm()
  }

  function remove(photo: ProjectPhoto) {
    if (!window.confirm(`¿Eliminar la evidencia “${photo.label}”?`)) return
    persist(current.photos.filter((item) => item.id !== photo.id))
  }

  function toggleVisibility(photo: ProjectPhoto) {
    persist(
      current.photos.map((item) =>
        item.id === photo.id
          ? { ...item, visibleToClient: item.visibleToClient !== true }
          : item,
      ),
    )
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader
        title="Evidencias de obra"
        description={`${current.photos.length} evidencias · ${current.photos.filter((item) => item.visibleToClient === true).length} visibles para cliente`}
        action={
          <button
            type="button"
            onClick={startCreate}
            className="inline-flex h-9 items-center gap-2 rounded-xl bg-[#163DFF] px-3 text-xs font-semibold text-white transition hover:bg-[#3155ff]"
          >
            <Plus size={14} /> Nueva evidencia
          </button>
        }
      />

      {open ? (
        <form onSubmit={submit} className="border-t border-white/[0.07] p-5 sm:p-6">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-white">
                {editingId ? 'Editar evidencia' : 'Nueva evidencia'}
              </p>
              <p className="mt-1 text-xs text-[#9CA3AF]">
                Registra una fotografía de avance y decide si el cliente puede verla.
              </p>
            </div>
            <button type="button" onClick={closeForm} className="rounded-lg p-2 text-[#9CA3AF] hover:bg-white/[0.06] hover:text-white">
              <X size={16} />
            </button>
          </div>

          <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
            <div>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImage} />
              <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleImage} />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="relative flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-2xl border border-dashed border-white/[0.14] bg-white/[0.025] text-[#9CA3AF] transition hover:border-[#7187ff]/60 hover:text-white"
              >
                {draft.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={draft.imageUrl} alt="Vista previa" className="absolute inset-0 h-full w-full object-cover" />
                ) : (
                  <span className="flex flex-col items-center gap-2 text-xs"><Upload size={22} /> Seleccionar fotografía</span>
                )}
              </button>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => cameraRef.current?.click()}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#5496CC] px-3 text-xs font-semibold text-white"
                >
                  <Camera size={15} /> Tomar foto
                </button>
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/[0.12] px-3 text-xs font-semibold text-white"
                >
                  <Upload size={15} /> Galería
                </button>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Título" className="sm:col-span-2">
                <input required value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} className="h-11 w-full rounded-xl border border-white/[0.09] bg-[#17181C] px-3 text-sm text-white outline-none transition placeholder:text-[#646873] focus:border-[#7187ff]/60" placeholder="Ej. Avance de estructura" />
              </Field>
              <Field label="Fecha">
                <input type="date" required value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} className="h-11 w-full rounded-xl border border-white/[0.09] bg-[#17181C] px-3 text-sm text-white outline-none transition placeholder:text-[#646873] focus:border-[#7187ff]/60" />
              </Field>
              <Field label="Etapa de obra">
                <input value={draft.stage} onChange={(e) => setDraft({ ...draft, stage: e.target.value })} className="h-11 w-full rounded-xl border border-white/[0.09] bg-[#17181C] px-3 text-sm text-white outline-none transition placeholder:text-[#646873] focus:border-[#7187ff]/60" placeholder="Ej. Cimentación" />
              </Field>
              <Field label="Descripción" className="sm:col-span-2">
                <textarea value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} className="min-h-24 w-full resize-y rounded-xl border border-white/[0.09] bg-[#17181C] px-3 py-3 text-sm text-white outline-none transition placeholder:text-[#646873] focus:border-[#7187ff]/60" placeholder="Describe brevemente el avance mostrado." />
              </Field>
              <label className="sm:col-span-2 flex cursor-pointer items-center justify-between rounded-xl border border-white/[0.08] bg-white/[0.025] px-4 py-3">
                <span>
                  <span className="block text-xs font-semibold text-white">Visible para cliente</span>
                  <span className="mt-1 block text-[11px] text-[#9CA3AF]">Si está apagado, la evidencia será interna para NEDVI.</span>
                </span>
                <input type="checkbox" checked={draft.visibleToClient} onChange={(e) => setDraft({ ...draft, visibleToClient: e.target.checked })} className="h-4 w-4 accent-[#163DFF]" />
              </label>
            </div>
          </div>

          <div className="mt-5 flex justify-end gap-3">
            <button type="button" onClick={closeForm} className="h-10 rounded-xl border border-white/[0.09] px-4 text-xs font-semibold text-[#d5d7df] hover:bg-white/[0.05]">Cancelar</button>
            <button type="submit" disabled={!draft.title.trim() || !draft.imageUrl} className="h-10 rounded-xl bg-[#163DFF] px-5 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40">Guardar evidencia</button>
          </div>
        </form>
      ) : null}

      <div className="grid gap-4 border-t border-white/[0.07] p-5 sm:grid-cols-2 sm:p-6 xl:grid-cols-3">
        {current.photos.length === 0 ? (
          <div className="col-span-full rounded-2xl border border-dashed border-white/[0.1] px-6 py-12 text-center">
            <Camera className="mx-auto text-[#7187ff]" size={24} />
            <p className="mt-3 text-sm font-semibold text-white">Todavía no hay evidencias</p>
            <p className="mt-1 text-xs text-[#9CA3AF]">Agrega la primera fotografía de avance de este proyecto.</p>
          </div>
        ) : current.photos.map((photo) => (
          <article key={photo.id} className="overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.025]">
            <div className="relative aspect-[4/3] bg-[#17181C]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo.url} alt={photo.alt} className="h-full w-full object-cover" />
              <span className={`absolute left-3 top-3 rounded-full px-2.5 py-1 text-[10px] font-semibold ${photo.visibleToClient === true ? 'bg-emerald-500/90 text-white' : 'bg-black/70 text-[#d5d7df]'}`}>
                {photo.visibleToClient === true ? 'Visible para cliente' : 'Solo NEDVI'}
              </span>
            </div>
            <div className="p-4">
              <p className="text-sm font-semibold text-white">{photo.label}</p>
              <p className="mt-1 text-[11px] text-[#9CA3AF]">{[photo.stage, photo.date].filter(Boolean).join(' · ') || 'Sin etapa ni fecha'}</p>
              {photo.description ? <p className="mt-3 line-clamp-2 text-xs leading-5 text-[#9CA3AF]">{photo.description}</p> : null}
              <div className="mt-4 flex gap-2">
                <Action title={photo.visibleToClient === true ? 'Ocultar al cliente' : 'Mostrar al cliente'} onClick={() => toggleVisibility(photo)} icon={photo.visibleToClient === true ? EyeOff : Eye} />
                <Action title="Editar" onClick={() => startEdit(photo)} icon={Pencil} />
                <Action title="Eliminar" onClick={() => remove(photo)} icon={Trash2} danger />
              </div>
            </div>
          </article>
        ))}
      </div>
    </Card>
  )
}

function Field({ label, children, className = '' }: { label: string; children: React.ReactNode; className?: string }) {
  return <label className={className}><span className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.12em] text-[#646873]">{label}</span>{children}</label>
}

function Action({ title, onClick, icon: Icon, danger = false }: { title: string; onClick: () => void; icon: typeof Eye; danger?: boolean }) {
  return <button type="button" title={title} onClick={onClick} className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.08] transition hover:bg-white/[0.06] ${danger ? 'text-red-400' : 'text-[#9CA3AF] hover:text-white'}`}><Icon size={14} /></button>
}
