'use client'

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Download,
  FileArchive,
  FileText,
  FileUp,
  FolderOpen,
  Search,
  Trash2,
  X,
} from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'

type SavedProject = {
  id: string
  folio: string
  client: string
  project: string
  convertedToProject?: boolean
}

type DocumentCategory =
  | 'Contrato'
  | 'Plano'
  | 'Cotización'
  | 'Presupuesto'
  | 'Factura'
  | 'Permiso'
  | 'Otro'

type ProjectDocument = {
  id: string
  quoteId: string
  folio: string
  project: string
  client: string
  name: string
  category: DocumentCategory
  version: string
  notes: string
  fileName: string
  fileType: string
  fileSize: number
  uploadedAt: string
  file: Blob
}

const QUOTES_STORAGE_KEY = 'nedvi_quotes'
const DB_NAME = 'nedvi-os-documents'
const DB_VERSION = 1
const STORE_NAME = 'project-documents'

const categories: DocumentCategory[] = [
  'Contrato',
  'Plano',
  'Cotización',
  'Presupuesto',
  'Factura',
  'Permiso',
  'Otro',
]

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function readProjects(): SavedProject[] {
  if (typeof window === 'undefined') return []
  const raw = window.localStorage.getItem(QUOTES_STORAGE_KEY)
  if (!raw) return []

  try {
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []

    return parsed
      .filter(isRecord)
      .filter((quote) => quote.convertedToProject === true)
      .filter(
        (quote) =>
          typeof quote.id === 'string' &&
          typeof quote.folio === 'string' &&
          typeof quote.client === 'string' &&
          typeof quote.project === 'string',
      )
      .map((quote) => ({
        id: quote.id as string,
        folio: quote.folio as string,
        client: quote.client as string,
        project: quote.project as string,
        convertedToProject: true,
      }))
  } catch {
    return []
  }
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' })
        store.createIndex('quoteId', 'quoteId', { unique: false })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function getDocuments(): Promise<ProjectDocument[]> {
  const db = await openDatabase()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly')
    const request = transaction.objectStore(STORE_NAME).getAll()

    request.onsuccess = () => resolve(request.result as ProjectDocument[])
    request.onerror = () => reject(request.error)
    transaction.oncomplete = () => db.close()
  })
}

async function saveDocument(document: ProjectDocument) {
  const db = await openDatabase()

  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite')
    transaction.objectStore(STORE_NAME).put(document)
    transaction.oncomplete = () => {
      db.close()
      resolve()
    }
    transaction.onerror = () => {
      db.close()
      reject(transaction.error)
    }
  })
}

async function removeDocument(id: string) {
  const db = await openDatabase()

  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite')
    transaction.objectStore(STORE_NAME).delete(id)
    transaction.oncomplete = () => {
      db.close()
      resolve()
    }
    transaction.onerror = () => {
      db.close()
      reject(transaction.error)
    }
  })
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return new Intl.DateTimeFormat('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

export default function DocumentsPage() {
  const [projects, setProjects] = useState<SavedProject[]>([])
  const [documents, setDocuments] = useState<ProjectDocument[]>([])
  const [search, setSearch] = useState('')
  const [projectFilter, setProjectFilter] = useState('Todos')
  const [open, setOpen] = useState(false)
  const [projectId, setProjectId] = useState('')
  const [name, setName] = useState('')
  const [category, setCategory] = useState<DocumentCategory>('Contrato')
  const [version, setVersion] = useState('1.0')
  const [notes, setNotes] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const loadData = useCallback(async () => {
    const currentProjects = readProjects()
    const currentIds = new Set(currentProjects.map((project) => project.id))
    let storedDocuments: ProjectDocument[] = []

    try {
      storedDocuments = await getDocuments()
    } catch (error) {
      console.error('No se pudieron cargar los documentos:', error)
    }

    const orphaned = storedDocuments.filter(
      (document) => !currentIds.has(document.quoteId),
    )

    if (orphaned.length) {
      await Promise.all(orphaned.map((document) => removeDocument(document.id)))
      storedDocuments = storedDocuments.filter((document) =>
        currentIds.has(document.quoteId),
      )
    }

    setProjects(currentProjects)
    setDocuments(
      storedDocuments.sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt)),
    )
  }, [])

  useEffect(() => {
    void loadData()

    const handleStorage = (event: StorageEvent) => {
      if (event.key === QUOTES_STORAGE_KEY) void loadData()
    }

    const handleFocus = () => void loadData()
    window.addEventListener('storage', handleStorage)
    window.addEventListener('focus', handleFocus)

    return () => {
      window.removeEventListener('storage', handleStorage)
      window.removeEventListener('focus', handleFocus)
    }
  }, [loadData])

  const filteredDocuments = useMemo(() => {
    const query = search.trim().toLowerCase()

    return documents.filter((document) => {
      const matchesProject =
        projectFilter === 'Todos' || document.quoteId === projectFilter
      const matchesQuery =
        !query ||
        [
          document.name,
          document.fileName,
          document.folio,
          document.project,
          document.client,
          document.category,
        ]
          .join(' ')
          .toLowerCase()
          .includes(query)

      return matchesProject && matchesQuery
    })
  }, [documents, projectFilter, search])

  const projectsWithDocuments = new Set(documents.map((document) => document.quoteId)).size
  const totalSize = documents.reduce((sum, document) => sum + document.fileSize, 0)

  function resetForm() {
    setProjectId('')
    setName('')
    setCategory('Contrato')
    setVersion('1.0')
    setNotes('')
    setFile(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function closeForm() {
    setOpen(false)
    resetForm()
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const project = projects.find((item) => item.id === projectId)

    if (!project || !file) {
      alert('Selecciona un proyecto y un archivo.')
      return
    }

    setSaving(true)

    try {
      const document: ProjectDocument = {
        id: crypto.randomUUID(),
        quoteId: project.id,
        folio: project.folio,
        project: project.project,
        client: project.client,
        name: name.trim() || file.name,
        category,
        version: version.trim() || '1.0',
        notes: notes.trim(),
        fileName: file.name,
        fileType: file.type || 'application/octet-stream',
        fileSize: file.size,
        uploadedAt: new Date().toISOString(),
        file,
      }

      await saveDocument(document)
      closeForm()
      await loadData()
    } catch (error) {
      console.error('No se pudo guardar el documento:', error)
      alert('No se pudo guardar el documento en este navegador.')
    } finally {
      setSaving(false)
    }
  }

  function downloadDocument(document: ProjectDocument) {
    const url = URL.createObjectURL(document.file)
    const anchor = window.document.createElement('a')
    anchor.href = url
    anchor.download = document.fileName
    window.document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    URL.revokeObjectURL(url)
  }

  async function deleteDocument(document: ProjectDocument) {
    if (!window.confirm(`¿Eliminar el documento “${document.name}”?`)) return
    await removeDocument(document.id)
    await loadData()
  }

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-[1600px] space-y-6">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#5496CC]">
              Proyectos
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-[var(--foreground)]">
              Documentos
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">
              Centraliza contratos, planos, presupuestos, permisos y archivos de cada proyecto.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setOpen(true)}
            disabled={projects.length === 0}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#5496CC] px-5 text-sm font-semibold text-white transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <FileUp size={17} />
            Subir documento
          </button>
        </header>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            icon={FileText}
            label="Documentos"
            value={documents.length.toString()}
            detail="Archivos almacenados"
          />
          <MetricCard
            icon={FolderOpen}
            label="Proyectos con archivos"
            value={projectsWithDocuments.toString()}
            detail={`De ${projects.length} proyectos`}
          />
          <MetricCard
            icon={FileArchive}
            label="Espacio utilizado"
            value={formatSize(totalSize)}
            detail="Guardado en este navegador"
          />
          <MetricCard
            icon={FileUp}
            label="Proyectos disponibles"
            value={projects.length.toString()}
            detail="Creados desde cotizaciones"
          />
        </div>

        <div className="grid gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm md:grid-cols-[1fr_300px]">
          <div className="relative">
            <Search
              size={17}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--muted)]"
            />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar documento, proyecto, folio o cliente..."
              className="w-full rounded-xl border border-[var(--border)] bg-transparent py-3 pl-11 pr-4 text-sm text-[var(--foreground)] outline-none placeholder:text-[var(--subtle)] focus:border-[#5496CC]"
            />
          </div>
          <select
            value={projectFilter}
            onChange={(event) => setProjectFilter(event.target.value)}
            className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--foreground)] outline-none focus:border-[#5496CC]"
          >
            <option value="Todos">Todos los proyectos</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.folio} · {project.project}
              </option>
            ))}
          </select>
        </div>

        <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
          {filteredDocuments.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <FileArchive className="mx-auto text-[#5496CC]" size={34} />
              <h2 className="mt-4 text-lg font-bold text-[var(--foreground)]">
                {documents.length === 0
                  ? 'Todavía no hay documentos'
                  : 'No encontramos documentos'}
              </h2>
              <p className="mt-2 text-sm text-[var(--muted)]">
                {projects.length === 0
                  ? 'Primero crea un proyecto desde una cotización aprobada.'
                  : 'Sube el primer archivo y asígnalo al proyecto correspondiente.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-[1100px] w-full text-left text-sm">
                <thead className="border-b border-[var(--border)] bg-[var(--surface-soft)] text-xs uppercase tracking-wide text-[var(--muted)]">
                  <tr>
                    <th className="px-5 py-4">Documento</th>
                    <th className="px-5 py-4">Proyecto</th>
                    <th className="px-5 py-4">Categoría</th>
                    <th className="px-5 py-4">Versión</th>
                    <th className="px-5 py-4">Tamaño</th>
                    <th className="px-5 py-4">Fecha</th>
                    <th className="px-5 py-4">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {filteredDocuments.map((document) => (
                    <tr key={document.id} className="hover:bg-[var(--surface-soft)]">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#5496CC]/10 text-[#5496CC]">
                            <FileText size={17} />
                          </span>
                          <div className="min-w-0">
                            <p className="max-w-[260px] truncate font-semibold text-[var(--foreground)]">
                              {document.name}
                            </p>
                            <p className="mt-1 max-w-[260px] truncate text-xs text-[var(--muted)]">
                              {document.fileName}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <p className="font-medium text-[var(--foreground)]">
                          {document.project}
                        </p>
                        <p className="mt-1 text-xs text-[#5496CC]">{document.folio}</p>
                      </td>
                      <td className="px-5 py-4 text-[var(--foreground)]">
                        {document.category}
                      </td>
                      <td className="px-5 py-4 text-[var(--foreground)]">
                        {document.version}
                      </td>
                      <td className="px-5 py-4 text-[var(--muted)]">
                        {formatSize(document.fileSize)}
                      </td>
                      <td className="px-5 py-4 text-[var(--muted)]">
                        {formatDate(document.uploadedAt)}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => downloadDocument(document)}
                            className="rounded-lg border border-[var(--border)] p-2 text-[var(--foreground)] transition hover:border-[#5496CC] hover:text-[#5496CC]"
                            aria-label={`Descargar ${document.name}`}
                          >
                            <Download size={15} />
                          </button>
                          <button
                            type="button"
                            onClick={() => void deleteDocument(document)}
                            className="rounded-lg border border-red-500/25 p-2 text-red-500 transition hover:bg-red-500/10"
                            aria-label={`Eliminar ${document.name}`}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4">
          <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-[var(--surface)] p-6 shadow-2xl">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-[var(--foreground)]">
                  Subir documento
                </h2>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  El archivo quedará asociado al proyecto seleccionado.
                </p>
              </div>
              <button
                type="button"
                onClick={closeForm}
                className="rounded-lg p-2 text-[var(--muted)] hover:bg-[var(--surface-soft)]"
                aria-label="Cerrar"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-5">
              <label className="block space-y-2">
                <span className="text-sm font-semibold text-[var(--foreground)]">
                  Proyecto *
                </span>
                <select
                  required
                  value={projectId}
                  onChange={(event) => setProjectId(event.target.value)}
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-[var(--foreground)] outline-none focus:border-[#5496CC]"
                >
                  <option value="">Seleccionar proyecto</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.folio} · {project.project} · {project.client}
                    </option>
                  ))}
                </select>
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm font-semibold text-[var(--foreground)]">
                    Nombre del documento
                  </span>
                  <input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Ej. Contrato firmado"
                    className="w-full rounded-xl border border-[var(--border)] bg-transparent px-4 py-3 text-[var(--foreground)] outline-none focus:border-[#5496CC]"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-semibold text-[var(--foreground)]">
                    Categoría
                  </span>
                  <select
                    value={category}
                    onChange={(event) =>
                      setCategory(event.target.value as DocumentCategory)
                    }
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-[var(--foreground)] outline-none focus:border-[#5496CC]"
                  >
                    {categories.map((item) => (
                      <option key={item}>{item}</option>
                    ))}
                  </select>
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-semibold text-[var(--foreground)]">
                    Versión
                  </span>
                  <input
                    value={version}
                    onChange={(event) => setVersion(event.target.value)}
                    placeholder="1.0"
                    className="w-full rounded-xl border border-[var(--border)] bg-transparent px-4 py-3 text-[var(--foreground)] outline-none focus:border-[#5496CC]"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-semibold text-[var(--foreground)]">
                    Archivo *
                  </span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    required
                    onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                    className="block w-full rounded-xl border border-[var(--border)] bg-transparent px-3 py-2.5 text-sm text-[var(--foreground)] file:mr-3 file:rounded-lg file:border-0 file:bg-[#5496CC]/10 file:px-3 file:py-2 file:font-semibold file:text-[#5496CC]"
                  />
                </label>
              </div>

              <label className="block space-y-2">
                <span className="text-sm font-semibold text-[var(--foreground)]">
                  Notas
                </span>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Descripción, observaciones o detalles del archivo..."
                  className="w-full rounded-xl border border-[var(--border)] bg-transparent px-4 py-3 text-[var(--foreground)] outline-none focus:border-[#5496CC]"
                />
              </label>

              <p className="rounded-xl bg-[var(--surface-soft)] px-4 py-3 text-xs text-[var(--muted)]">
                Los archivos se guardan localmente en este navegador durante esta etapa de NEDVI OS.
              </p>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={closeForm}
                  className="rounded-xl border border-[var(--border)] px-5 py-3 font-semibold text-[var(--foreground)]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-[#5496CC] px-5 py-3 font-semibold text-white disabled:opacity-60"
                >
                  {saving ? 'Guardando...' : 'Guardar documento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </AppShell>
  )
}

type MetricCardProps = {
  icon: typeof FileText
  label: string
  value: string
  detail: string
}

function MetricCard({ icon: Icon, label, value, detail }: MetricCardProps) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#5496CC]/10 text-[#5496CC]">
        <Icon size={19} />
      </span>
      <p className="mt-4 break-words text-2xl font-bold text-[var(--foreground)]">
        {value}
      </p>
      <p className="mt-1 text-sm font-semibold text-[var(--foreground)]">{label}</p>
      <p className="mt-1 text-xs text-[var(--muted)]">{detail}</p>
    </div>
  )
}
