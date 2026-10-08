'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { Bot, ArrowRight, Search, Sparkles } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { readAccessSession } from '@/features/access/services/accessStorage'
import type { ModulePermission } from '@/config/roles'

const modules: Array<{label:string,href:string,permission:ModulePermission,keywords:string,description:string}> = [
  { label:'Clientes',href:'/crm',permission:'commercial',keywords:'cliente clientes crm empresas registrar',description:'Consulta y registra los clientes de NEDVI.' },
  { label:'Levantamientos',href:'/site-surveys',permission:'commercial',keywords:'levantamiento inspeccion visita croquis',description:'Registra visitas, medidas y archivos adjuntos.' },
  { label:'Cotizaciones',href:'/quotes',permission:'commercial',keywords:'cotizacion presupuesto precio excel',description:'Prepara cotizaciones e importa conceptos desde Excel.' },
  { label:'Proyectos',href:'/projects',permission:'projects',keywords:'proyecto obra avance seguimiento',description:'Consulta proyectos y su avance.' },
  { label:'Documentos',href:'/documents',permission:'projects',keywords:'documentos archivos planos',description:'Accede a documentos de proyecto.' },
  { label:'Órdenes de compra',href:'/purchase-orders',permission:'purchasing',keywords:'orden compra proveedor',description:'Gestiona las órdenes de compra.' },
  { label:'Requisiciones',href:'/requisitions',permission:'purchasing',keywords:'requisiciones materiales solicitud',description:'Consulta solicitudes de materiales.' },
  { label:'Avance de obra',href:'/site-progress',permission:'operations',keywords:'avance obra evidencia fotos',description:'Registra y consulta avances de obra.' },
  { label:'Reportes diarios',href:'/daily-reports',permission:'operations',keywords:'reporte diario bitacora',description:'Consulta y crea reportes diarios.' },
  { label:'Agenda',href:'/agenda',permission:'agenda',keywords:'agenda actividades calendario',description:'Revisa las actividades programadas.' },
]

export default function NedviHelpPage() {
  const [query,setQuery] = useState('')
  const [permissions] = useState<ModulePermission[]>(() => {
    if (typeof window === 'undefined') return []
    return readAccessSession()?.permissions ?? []
  })
  const visible = useMemo(() => modules.filter(item => permissions.includes(item.permission) && (item.label+' '+item.keywords+' '+item.description).toLowerCase().includes(query.trim().toLowerCase())),[permissions,query])
  return <AppShell>
    <div className="mx-auto w-full max-w-5xl space-y-7">
      <header className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 sm:p-8">
        <div className="flex items-center gap-3 text-[#5496CC]"><Bot size={28}/><span className="text-xs font-bold uppercase tracking-[0.2em]">Asistente NEDVI</span></div>
        <h1 className="mt-4 text-3xl font-bold text-[var(--foreground)]">¿En qué módulo necesitas trabajar?</h1>
        <p className="mt-3 text-sm leading-6 text-[var(--muted)]">Busca una función para abrir directamente el apartado correspondiente. Esta primera versión es una guía de navegación; todavía no es un chat con inteligencia artificial.</p>
        <label className="mt-6 flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--background)] px-4"><Search size={18} className="text-[#5496CC]"/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Ej. levantamientos, cotizaciones, proyectos..." className="h-12 w-full bg-transparent text-sm text-[var(--foreground)] outline-none" aria-label="Buscar módulo de NEDVI"/></label>
      </header>
      <section>
        <div className="mb-4 flex items-center gap-2 text-[var(--foreground)]"><Sparkles size={18} className="text-[#5496CC]"/><h2 className="font-semibold">Accesos disponibles para tu usuario</h2></div>
        <div className="grid gap-3 sm:grid-cols-2">{visible.map(item=><Link key={item.href} href={item.href} className="flex items-center justify-between gap-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 transition hover:border-[#5496CC]"><span><span className="block font-semibold text-[var(--foreground)]">{item.label}</span><span className="mt-1 block text-xs leading-5 text-[var(--muted)]">{item.description}</span></span><ArrowRight size={18} className="shrink-0 text-[#5496CC]"/></Link>)}</div>
        {!visible.length?<p className="rounded-xl border border-[var(--border)] p-6 text-sm text-[var(--muted)]">No encontramos un módulo disponible con esa búsqueda.</p>:null}
      </section>
    </div>
  </AppShell>
}
