import { FileSpreadsheet, FileText, FolderOpen } from 'lucide-react'
import type { ProjectDocument } from '@/features/projects/types/project'
import { formatProjectDate } from '@/features/projects/utils/projectUtils'
import { Card, CardHeader } from '@/components/ui/Card'

type ProjectDocumentsProps = { documents: ProjectDocument[] }

const icons = { PDF: FileText, DOCX: FileText, XLSX: FileSpreadsheet }

export function ProjectDocuments({ documents }: ProjectDocumentsProps) {
  return <Card className="overflow-hidden"><CardHeader title="Documents" description={`${documents.length} project files`} action={<FolderOpen size={17} className="text-[#7187ff]" />} /><div className="divide-y divide-white/[0.05] px-5 sm:px-6">{documents.length ? documents.map((document) => { const Icon = icons[document.type]; return <button type="button" className="flex w-full items-center gap-3 py-4 text-left transition hover:bg-white/[0.02]" key={document.id}><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#163DFF]/[0.1] text-[#7187ff]"><Icon size={16} /></span><span className="min-w-0 flex-1"><span className="block truncate text-xs font-medium text-[#d5d7df]">{document.name}</span><span className="mt-1 block text-[10px] text-[#646873]">{document.type} · {document.size} · Updated {formatProjectDate(document.updatedAt)}</span></span></button> }) : <p className="py-10 text-center text-xs text-[#646873]">No documents have been uploaded.</p>}</div></Card>
}
