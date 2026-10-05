import { Camera, Maximize2 } from 'lucide-react'
import type { ProjectPhoto } from '@/features/projects/types/project'
import { Card, CardHeader } from '@/components/ui/Card'

type PhotoGalleryProps = { photos: ProjectPhoto[] }

export function PhotoGallery({ photos }: PhotoGalleryProps) {
  return <Card className="overflow-hidden"><CardHeader title="Galería de fotos" description={`${photos.length} fotos de obra`} action={<Camera size={17} className="text-[#7187ff]" />} />{photos.length ? <div className="grid grid-cols-2 gap-3 p-5 sm:grid-cols-4 sm:p-6">{photos.map((photo) => <div className="group relative aspect-[4/3] overflow-hidden rounded-xl border border-white/[0.07] bg-[#17181C]" key={photo.id}><div className="absolute inset-0 bg-cover bg-center transition duration-500 group-hover:scale-105" style={{ backgroundImage: `url(${photo.url})` }} role="img" aria-label={photo.alt} /><div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/0 to-black/0" /><span className="absolute bottom-3 left-3 right-3 truncate text-[10px] font-medium text-white">{photo.label}</span><button type="button" className="absolute right-2 top-2 rounded-lg bg-black/40 p-1.5 text-white opacity-0 backdrop-blur-sm transition group-hover:opacity-100 focus-visible:opacity-100" aria-label={`Abrir ${photo.label}`}><Maximize2 size={13} /></button></div>)}</div> : <p className="px-5 py-10 text-center text-xs text-[#646873]">Todavía no hay fotos registradas.</p>}</Card>
}
