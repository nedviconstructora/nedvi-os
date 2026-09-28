'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import { AppShell } from '@/components/layout/AppShell'

type QuoteStatus = 'Borrador' | 'Enviada' | 'Aprobada' | 'Rechazada' | 'Vencida'

type Quote = {
  id: string
  folio: string
  client: string
  project: string
  createdAt: string
  validUntil: string
  subtotal: number
  tax: number
  total: number
  status: QuoteStatus
  owner: string
}

const STORAGE_KEY = 'nedvi_quotes'
const SEQUENCE_KEY = 'nedvi_quotes_sequence'

function currency(value: number) {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
  }).format(value)
}

function nextFolio() {
  const year = new Date().getFullYear()
  const raw = localStorage.getItem(SEQUENCE_KEY)
  let sequence = 1

  if (raw) {
    try {
      const saved = JSON.parse(raw) as { year: number; sequence: number }
      sequence = saved.year === year ? saved.sequence + 1 : 1
    } catch {
      sequence = 1
    }
  }

  localStorage.setItem(SEQUENCE_KEY, JSON.stringify({ year, sequence }))
  return `NV-${year}-${String(sequence).padStart(4, '0')}`
}

export default function QuotesPage() {
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [client, setClient] = useState('')
  const [project, setProject] = useState('')
  const [validUntil, setValidUntil] = useState('')
  const [subtotal, setSubtotal] = useState('')
  const [taxRate, setTaxRate] = useState('16')
  const [owner, setOwner] = useState('')

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return

    try {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) setQuotes(parsed)
    } catch {
      console.warn('No se pudieron cargar las cotizaciones guardadas.')
    }
  }, [])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(quotes))
  }, [quotes])

  const filtered = useMemo(() => {
    const value = search.trim().toLowerCase()

    return quotes.filter((quote) =>
      [quote.folio, quote.client, quote.project, quote.owner]
        .join(' ')
        .toLowerCase()
        .includes(value),
    )
  }, [quotes, search])

  function saveQuote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!client.trim() || !project.trim()) {
      alert('Cliente y proyecto son obligatorios.')
      return
    }

    const subtotalValue = Number(subtotal || 0)
    const taxValue = subtotalValue * (Number(taxRate || 0) / 100)

    const quote: Quote = {
      id: crypto.randomUUID(),
      folio: nextFolio(),
      client: client.trim(),
      project: project.trim(),
      createdAt: new Date().toISOString().slice(0, 10),
      validUntil,
      subtotal: subtotalValue,
      tax: taxValue,
      total: subtotalValue + taxValue,
      status: 'Borrador',
      owner: owner.trim(),
    }

    setQuotes((current) => [quote, ...current])
    setClient('')
    setProject('')
    setValidUntil('')
    setSubtotal('')
    setTaxRate('16')
    setOwner('')
    setOpen(false)
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm text-slate-500 dark:text-slate-400">Comercial y Ventas</p>
            <h1 className="text-3xl font-bold tracking-tight">Cotizaciones</h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Cada nueva cotización genera automáticamente un folio NV-AÑO-####.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setOpen(true)}
            className="rounded-xl bg-[#7BAEE3] px-5 py-3 font-semibold text-slate-950 transition hover:brightness-95"
          >
            + Nueva cotización
          </button>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por folio, cliente, proyecto o responsable..."
            className="w-full rounded-xl border border-slate-200 bg-transparent px-4 py-3 outline-none focus:border-[#7BAEE3] dark:border-slate-700"
          />
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-100 text-left text-xs uppercase text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3">Folio</th>
                  <th className="px-4 py-3">Cliente</th>
                  <th className="px-4 py-3">Proyecto</th>
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3">Total</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3">Responsable</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-slate-500">
                      Todavía no hay cotizaciones.
                    </td>
                  </tr>
                ) : (
                  filtered.map((quote) => (
                    <tr key={quote.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="px-4 py-4 font-semibold text-[#5B93C9]">{quote.folio}</td>
                      <td className="px-4 py-4">{quote.client}</td>
                      <td className="px-4 py-4">{quote.project}</td>
                      <td className="px-4 py-4">{quote.createdAt}</td>
                      <td className="px-4 py-4 font-semibold">{currency(quote.total)}</td>
                      <td className="px-4 py-4">{quote.status}</td>
                      <td className="px-4 py-4">{quote.owner || 'Sin asignar'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {open && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900">
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold">Nueva cotización</h2>
                  <p className="mt-1 text-xs text-slate-500">El folio se asignará al guardar.</p>
                </div>

                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="text-sm text-slate-500"
                >
                  Cerrar
                </button>
              </div>

              <form onSubmit={saveQuote} className="grid gap-4 md:grid-cols-2">
                <input
                  value={client}
                  onChange={(event) => setClient(event.target.value)}
                  placeholder="Cliente *"
                  className="rounded-xl border border-slate-200 bg-transparent px-4 py-3 dark:border-slate-700"
                />

                <input
                  value={project}
                  onChange={(event) => setProject(event.target.value)}
                  placeholder="Proyecto / servicio *"
                  className="rounded-xl border border-slate-200 bg-transparent px-4 py-3 dark:border-slate-700"
                />

                <input
                  type="date"
                  value={validUntil}
                  onChange={(event) => setValidUntil(event.target.value)}
                  className="rounded-xl border border-slate-200 bg-transparent px-4 py-3 dark:border-slate-700"
                />

                <input
                  value={owner}
                  onChange={(event) => setOwner(event.target.value)}
                  placeholder="Responsable"
                  className="rounded-xl border border-slate-200 bg-transparent px-4 py-3 dark:border-slate-700"
                />

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={subtotal}
                  onChange={(event) => setSubtotal(event.target.value)}
                  placeholder="Subtotal"
                  className="rounded-xl border border-slate-200 bg-transparent px-4 py-3 dark:border-slate-700"
                />

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={taxRate}
                  onChange={(event) => setTaxRate(event.target.value)}
                  placeholder="IVA %"
                  className="rounded-xl border border-slate-200 bg-transparent px-4 py-3 dark:border-slate-700"
                />

                <div className="flex justify-end gap-3 pt-2 md:col-span-2">
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="rounded-xl border border-slate-200 px-5 py-3 font-semibold dark:border-slate-700"
                  >
                    Cancelar
                  </button>

                  <button
                    type="submit"
                    className="rounded-xl bg-[#7BAEE3] px-5 py-3 font-semibold text-slate-950"
                  >
                    Crear cotización
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  )
}
