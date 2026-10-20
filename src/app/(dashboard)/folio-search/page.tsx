'use client'

import Link from 'next/link'
import { FormEvent, useCallback, useEffect, useState } from 'react'
import { Search, RefreshCw, Building2, FileText, HardHat, Activity, FolderOpen } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { createClient } from '@/lib/supabase/client'
import { getCustomersFromSupabase } from '@/features/crm/services/customerSupabase'
import type { Customer } from '@/features/crm/types/customer'

type QuoteSummary = { id: string; folio: string; project: string; status: string; total: number; created_at: string }
type ProjectSummary = { id: string; folio: string | null; name: string; status: string; progress: number; budget: number }
type ProgressSummary = { id: string; project_id: string; progress: number; note: string; created_at: string }
type DocumentSummary = { id: string; project_id: string; title: string; file_name: string | null }

export default function FolioSearchPage() {
  const [query, setQuery] = useState('')
  const [searched, setSearched] = useState('')
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [quotes, setQuotes] = useState<QuoteSummary[]>([])
  const [projects, setProjects] = useState<ProjectSummary[]>([])
  const [progress, setProgress] = useState<ProgressSummary[]>([])
  const [documents, setDocuments] = useState<DocumentSummary[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [loaded, setLoaded] = useState(false)

  const search = useCallback(async (raw: string) => {
    const term = raw.trim().toUpperCase()
    setSearched(term)
    setCustomer(null)
    setQuotes([])
    setProjects([])
    setProgress([])
    setDocuments([])
    setLoaded(false)
    setError('')
    if (!term) return
    setBusy(true)
    try {
      const supabase = createClient()
      // Customer search uses the existing RLS-protected customer service.
      const customers = await getCustomersFromSupabase()
      const found = customers.find((item) => (item.folio ?? '').toUpperCase() === term)
        ?? customers.find((item) => term.startsWith((item.folio ?? '').toUpperCase() + '-'))
      if (!found) {
        setLoaded(true)
        return
      }
      const [quoteResponse, projectResponse] = await Promise.all([
        supabase.from('quotes').select('id,folio,project,status,total,created_at').eq('customer_id', found.id).order('created_at', { ascending: false }),
        supabase.from('projects').select('id,folio,name,status,progress,budget').eq('customer_id', found.id).order('created_at', { ascending: false }),
      ])
      if (quoteResponse.error) throw quoteResponse.error
      if (projectResponse.error) throw projectResponse.error
      const nextProjects = (projectResponse.data ?? []) as ProjectSummary[]
      const ids = nextProjects.map((item) => item.id)
      let nextProgress: ProgressSummary[] = []
      let nextDocuments: DocumentSummary[] = []
      if (ids.length) {
        const [progressResponse, documentResponse] = await Promise.all([
          supabase.from('project_progress_updates').select('id,project_id,progress,note,created_at').in('project_id', ids).order('created_at', { ascending: false }).limit(30),
          supabase.from('project_documents').select('id,project_id,title,file_name').in('project_id', ids).limit(30),
        ])
        if (progressResponse.error) throw progressResponse.error
        if (documentResponse.error) throw documentResponse.error
        nextProgress = progressResponse.data ?? []
        nextDocuments = documentResponse.data ?? []
      }
      setCustomer(found)
      setQuotes((quoteResponse.data ?? []) as QuoteSummary[])
      setProjects(nextProjects)
      setProgress(nextProgress)
      setDocuments(nextDocuments)
      setLoaded(true)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo consultar el expediente.')
    } finally {
      setBusy(false)
    }
  }, [])

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void search(query)
  }

  useEffect(() => {
    const onFocus = () => { if (searched) void search(searched) }
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [searched, search])

  const panel = 'rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm'
  const link = 'text-sm font-semibold text-[#5496CC] hover:underline'

  return <AppShell>
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-[#5496CC]">Expediente unificado</p>
        <h1 className="mt-2 text-3xl font-bold">Buscar folio</h1>
        <div className="mt-3 inline-flex max-w-3xl rounded-xl border border-sky-200/55 bg-sky-200/70 px-4 py-3 shadow-sm backdrop-blur-md dark:border-sky-200/55 dark:bg-sky-200/75">
          <p className="text-sm font-medium leading-relaxed text-[#102e47]">Consulta toda la información vinculada a un cliente desde su folio NV-0001 o un folio relacionado.</p>
        </div>
      </div>
      <form onSubmit={onSubmit} className={panel + ' flex flex-col gap-3 sm:flex-row'}>
        <input aria-label="Número de folio" value={query} onChange={event => setQuery(event.target.value)}
          placeholder="Ejemplo: NV-0001 o NV-0001-C01"
          className="nedvi-folio-search-input min-w-0 flex-1 rounded-xl border border-[#9dc6e6] bg-[#e9f5ff]/85 p-3 text-sm font-medium text-[#102e47] placeholder:text-[#4c708c] shadow-inner outline-none backdrop-blur-xl focus:border-[#5496CC] focus:ring-2 focus:ring-[#5496CC]/30" />
        <button disabled={busy || !query.trim()} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#5496CC] px-6 py-3 font-semibold text-white disabled:opacity-50">
          {busy ? <RefreshCw className="animate-spin" size={18} /> : <Search size={18} />} Buscar folio
        </button>
      </form>
      {error && <div role="alert" className="rounded-xl border border-red-400/30 p-4 text-sm text-red-500">{error}</div>}
      {loaded && !customer && <div className={panel}>No encontramos ese folio o no tienes permisos para consultar sus datos.</div>}
      {customer && <>
        <div className={panel}>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div><p className="text-xs font-semibold uppercase text-[#5496CC]">Folio principal</p>
              <h2 className="mt-1 text-3xl font-bold text-[#5496CC]">{customer.folio}</h2>
              <p className="mt-2 text-xl font-semibold">{customer.company}</p>
              <p className="mt-1 text-sm text-[var(--muted)]">{customer.contact} · {customer.phone} · {customer.email}</p>
            </div>
            <Link className={link} href={`/crm/${customer.id}`}>Ver ficha completa →</Link>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            { label: 'Cliente', count: 1, Icon: Building2 },
            { label: 'Cotizaciones', count: quotes.length, Icon: FileText },
            { label: 'Proyectos', count: projects.length, Icon: HardHat },
            { label: 'Avances', count: progress.length, Icon: Activity },
          ].map(({label,count,Icon}) => <div key={label} className={panel}><Icon size={19} className="text-[#5496CC]" /><p className="mt-2 text-sm text-[var(--muted)]">{label}</p><p className="mt-1 text-2xl font-bold">{count}</p></div>)}
        </div>
        <div className="grid gap-5 lg:grid-cols-2">
          <section className={panel}><h3 className="mb-4 text-lg font-bold">Cotizaciones</h3>
            {quotes.length ? quotes.map(item => <div key={item.id} className="border-t border-[var(--border)] py-3">
              <p className="font-semibold text-[#5496CC]">{item.folio}</p><p className="text-sm">{item.project}</p>
              <p className="text-xs text-[var(--muted)]">{item.status} · {new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN'}).format(item.total)}</p>
            </div>) : <p className="text-sm text-[var(--muted)]">Sin cotizaciones registradas.</p>}
            <Link href="/quotes" className={link}>Abrir cotizaciones →</Link>
          </section>
          <section className={panel}><h3 className="mb-4 text-lg font-bold">Proyectos</h3>
            {projects.length ? projects.map(item => <div key={item.id} className="border-t border-[var(--border)] py-3">
              <p className="font-semibold text-[#5496CC]">{item.folio}</p><p className="text-sm">{item.name}</p>
              <p className="mb-2 text-xs text-[var(--muted)]">{item.status} · {item.progress}% completado</p>
              <Link href={`/projects/${item.id}`} className={link}>Abrir proyecto →</Link>
            </div>) : <p className="text-sm text-[var(--muted)]">Sin proyectos registrados.</p>}
          </section>
          <section className={panel}><h3 className="mb-4 text-lg font-bold">Avances de obra</h3>
            {progress.length ? progress.map(item => <div key={item.id} className="border-t border-[var(--border)] py-3">
              <p className="text-sm font-semibold">{item.progress}% · {new Date(item.created_at).toLocaleDateString('es-MX')}</p>
              <p className="text-sm text-[var(--muted)]">{item.note || 'Sin observaciones'}</p>
              <Link href={`/projects/${item.project_id}`} className={link}>Ver proyecto →</Link>
            </div>) : <p className="text-sm text-[var(--muted)]">Sin reportes de avance registrados.</p>}
          </section>
          <section className={panel}><h3 className="mb-4 flex items-center gap-2 text-lg font-bold"><FolderOpen size={20}/> Documentos</h3>
            {documents.length ? documents.map(item => <div key={item.id} className="border-t border-[var(--border)] py-3">
              <p className="text-sm font-semibold">{item.title || item.file_name || 'Documento'}</p>
              <Link href={`/projects/${item.project_id}`} className={link}>Abrir expediente del proyecto →</Link>
            </div>) : <p className="text-sm text-[var(--muted)]">Sin documentos de proyectos registrados.</p>}
          </section>
        </div>
        <p className="text-xs text-[var(--muted)]">Datos consultados directamente desde Supabase. Solo se muestran registros permitidos para tu sesión. Vuelve a buscar para actualizar.</p>
      </>}
    </div>
  </AppShell>
}
