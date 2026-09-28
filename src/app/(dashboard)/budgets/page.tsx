'use client'

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import {
  Calculator,
  CircleDollarSign,
  Pencil,
  Search,
  WalletCards,
  X,
} from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'

type Currency = 'MXN' | 'USD'

type SavedQuote = {
  id: string
  folio: string
  client: string
  project: string
  total: number
  currency?: string
  owner?: string
  convertedToProject?: boolean
}

type BudgetRecord = {
  quoteId: string
  labor: number
  materials: number
  equipment: number
  subcontractors: number
  others: number
  notes: string
  updatedAt: string
}

type BudgetForm = {
  labor: string
  materials: string
  equipment: string
  subcontractors: string
  others: string
  notes: string
}

const QUOTES_STORAGE_KEY = 'nedvi_quotes'
const BUDGET_STORAGE_KEY = 'nedvi_project_budgets'

function readJsonArray(key: string): unknown[] {
  if (typeof window === 'undefined') return []
  const raw = window.localStorage.getItem(key)
  if (!raw) return []

  try {
    const parsed = JSON.parse(raw) as unknown
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function readProjects(): SavedQuote[] {
  return readJsonArray(QUOTES_STORAGE_KEY)
    .filter(isRecord)
    .filter((quote) => quote.convertedToProject === true)
    .filter(
      (quote) =>
        typeof quote.id === 'string' &&
        typeof quote.folio === 'string' &&
        typeof quote.client === 'string' &&
        typeof quote.project === 'string' &&
        typeof quote.total === 'number',
    )
    .map((quote) => ({
      id: quote.id as string,
      folio: quote.folio as string,
      client: quote.client as string,
      project: quote.project as string,
      total: quote.total as number,
      currency: typeof quote.currency === 'string' ? quote.currency : 'MXN',
      owner: typeof quote.owner === 'string' ? quote.owner : '',
      convertedToProject: true,
    }))
}

function readBudgets(): BudgetRecord[] {
  return readJsonArray(BUDGET_STORAGE_KEY)
    .filter(isRecord)
    .filter((item) => typeof item.quoteId === 'string')
    .map((item) => ({
      quoteId: item.quoteId as string,
      labor: typeof item.labor === 'number' ? item.labor : 0,
      materials: typeof item.materials === 'number' ? item.materials : 0,
      equipment: typeof item.equipment === 'number' ? item.equipment : 0,
      subcontractors:
        typeof item.subcontractors === 'number' ? item.subcontractors : 0,
      others: typeof item.others === 'number' ? item.others : 0,
      notes: typeof item.notes === 'string' ? item.notes : '',
      updatedAt: typeof item.updatedAt === 'string' ? item.updatedAt : '',
    }))
}

function allocated(record?: BudgetRecord) {
  if (!record) return 0
  return (
    record.labor +
    record.materials +
    record.equipment +
    record.subcontractors +
    record.others
  )
}

function money(value: number, currency: Currency) {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

function emptyForm(): BudgetForm {
  return {
    labor: '',
    materials: '',
    equipment: '',
    subcontractors: '',
    others: '',
    notes: '',
  }
}

export default function BudgetsPage() {
  const [projects, setProjects] = useState<SavedQuote[]>([])
  const [budgets, setBudgets] = useState<BudgetRecord[]>([])
  const [search, setSearch] = useState('')
  const [editingProject, setEditingProject] = useState<SavedQuote | null>(null)
  const [form, setForm] = useState<BudgetForm>(emptyForm())

  const loadData = useCallback(() => {
    const currentProjects = readProjects()
    const currentProjectIds = new Set(currentProjects.map((project) => project.id))
    const currentBudgets = readBudgets().filter((budget) =>
      currentProjectIds.has(budget.quoteId),
    )

    setProjects(currentProjects)
    setBudgets(currentBudgets)
    window.localStorage.setItem(BUDGET_STORAGE_KEY, JSON.stringify(currentBudgets))
  }, [])

  useEffect(() => {
    loadData()

    const handleStorage = (event: StorageEvent) => {
      if (
        event.key === QUOTES_STORAGE_KEY ||
        event.key === BUDGET_STORAGE_KEY
      ) {
        loadData()
      }
    }

    window.addEventListener('storage', handleStorage)
    window.addEventListener('focus', loadData)

    return () => {
      window.removeEventListener('storage', handleStorage)
      window.removeEventListener('focus', loadData)
    }
  }, [loadData])

  const budgetByQuoteId = useMemo(
    () => new Map(budgets.map((budget) => [budget.quoteId, budget])),
    [budgets],
  )

  const filteredProjects = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return projects

    return projects.filter((project) =>
      [project.folio, project.project, project.client, project.owner ?? '']
        .join(' ')
        .toLowerCase()
        .includes(query),
    )
  }, [projects, search])

  const totalMXN = projects
    .filter((project) => project.currency !== 'USD')
    .reduce((sum, project) => sum + project.total, 0)
  const totalUSD = projects
    .filter((project) => project.currency === 'USD')
    .reduce((sum, project) => sum + project.total, 0)
  const configured = projects.filter((project) =>
    budgetByQuoteId.has(project.id),
  ).length

  function openBudget(project: SavedQuote) {
    const saved = budgetByQuoteId.get(project.id)
    setEditingProject(project)
    setForm(
      saved
        ? {
            labor: saved.labor ? String(saved.labor) : '',
            materials: saved.materials ? String(saved.materials) : '',
            equipment: saved.equipment ? String(saved.equipment) : '',
            subcontractors: saved.subcontractors
              ? String(saved.subcontractors)
              : '',
            others: saved.others ? String(saved.others) : '',
            notes: saved.notes,
          }
        : emptyForm(),
    )
  }

  function closeBudget() {
    setEditingProject(null)
    setForm(emptyForm())
  }

  function saveBudget(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!editingProject) return

    const nextRecord: BudgetRecord = {
      quoteId: editingProject.id,
      labor: Number(form.labor || 0),
      materials: Number(form.materials || 0),
      equipment: Number(form.equipment || 0),
      subcontractors: Number(form.subcontractors || 0),
      others: Number(form.others || 0),
      notes: form.notes.trim(),
      updatedAt: new Date().toISOString(),
    }

    const nextBudgets = [
      nextRecord,
      ...budgets.filter((budget) => budget.quoteId !== editingProject.id),
    ]

    setBudgets(nextBudgets)
    window.localStorage.setItem(BUDGET_STORAGE_KEY, JSON.stringify(nextBudgets))
    closeBudget()
  }

  const editingCurrency: Currency =
    editingProject?.currency === 'USD' ? 'USD' : 'MXN'
  const formAllocated =
    Number(form.labor || 0) +
    Number(form.materials || 0) +
    Number(form.equipment || 0) +
    Number(form.subcontractors || 0) +
    Number(form.others || 0)

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-[1600px] space-y-6">
        <header>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#5496CC]">
            Proyectos
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-[var(--foreground)]">
            Presupuestos
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">
            Controla el presupuesto aprobado de cada proyecto y distribúyelo por categoría.
          </p>
        </header>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            icon={WalletCards}
            label="Proyectos"
            value={projects.length.toString()}
            detail="Con cotización convertida"
          />
          <MetricCard
            icon={Calculator}
            label="Presupuestos configurados"
            value={configured.toString()}
            detail="Con distribución registrada"
          />
          <MetricCard
            icon={CircleDollarSign}
            label="Aprobado MXN"
            value={money(totalMXN, 'MXN')}
            detail="Total de proyectos en pesos"
          />
          <MetricCard
            icon={CircleDollarSign}
            label="Aprobado USD"
            value={money(totalUSD, 'USD')}
            detail="Total de proyectos en dólares"
          />
        </div>

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm">
          <div className="relative max-w-xl">
            <Search
              size={17}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--muted)]"
            />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por folio, proyecto, cliente o responsable..."
              className="w-full rounded-xl border border-[var(--border)] bg-transparent py-3 pl-11 pr-4 text-sm text-[var(--foreground)] outline-none placeholder:text-[var(--subtle)] focus:border-[#5496CC]"
            />
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
          {filteredProjects.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <WalletCards className="mx-auto text-[#5496CC]" size={32} />
              <h2 className="mt-4 text-lg font-bold text-[var(--foreground)]">
                No hay proyectos para presupuestar
              </h2>
              <p className="mt-2 text-sm text-[var(--muted)]">
                Los proyectos aparecerán aquí cuando una cotización sea convertida a proyecto.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-[1050px] w-full text-left text-sm">
                <thead className="border-b border-[var(--border)] bg-[var(--surface-soft)] text-xs uppercase tracking-wide text-[var(--muted)]">
                  <tr>
                    <th className="px-5 py-4">Folio</th>
                    <th className="px-5 py-4">Proyecto</th>
                    <th className="px-5 py-4">Cliente</th>
                    <th className="px-5 py-4">Aprobado</th>
                    <th className="px-5 py-4">Distribuido</th>
                    <th className="px-5 py-4">Disponible</th>
                    <th className="px-5 py-4">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {filteredProjects.map((project) => {
                    const currency: Currency =
                      project.currency === 'USD' ? 'USD' : 'MXN'
                    const budget = budgetByQuoteId.get(project.id)
                    const used = allocated(budget)
                    const remaining = project.total - used

                    return (
                      <tr key={project.id} className="hover:bg-[var(--surface-soft)]">
                        <td className="px-5 py-4 font-semibold text-[#5496CC]">
                          {project.folio}
                        </td>
                        <td className="px-5 py-4">
                          <p className="font-semibold text-[var(--foreground)]">
                            {project.project}
                          </p>
                          <p className="mt-1 text-xs text-[var(--muted)]">
                            {project.owner || 'Sin responsable'}
                          </p>
                        </td>
                        <td className="px-5 py-4 text-[var(--foreground)]">
                          {project.client}
                        </td>
                        <td className="px-5 py-4 font-semibold text-[var(--foreground)]">
                          {money(project.total, currency)}
                        </td>
                        <td className="px-5 py-4 text-[var(--foreground)]">
                          {money(used, currency)}
                        </td>
                        <td
                          className={`px-5 py-4 font-semibold ${
                            remaining < 0 ? 'text-red-500' : 'text-emerald-500'
                          }`}
                        >
                          {money(remaining, currency)}
                        </td>
                        <td className="px-5 py-4">
                          <button
                            type="button"
                            onClick={() => openBudget(project)}
                            className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] px-3 py-2 text-xs font-semibold text-[var(--foreground)] transition hover:border-[#5496CC] hover:text-[#5496CC]"
                          >
                            <Pencil size={14} />
                            {budget ? 'Editar' : 'Configurar'}
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {editingProject ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4">
          <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-[var(--surface)] p-6 shadow-2xl">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-[#5496CC]">
                  {editingProject.folio}
                </p>
                <h2 className="mt-1 text-xl font-bold text-[var(--foreground)]">
                  Presupuesto · {editingProject.project}
                </h2>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  Aprobado: {money(editingProject.total, editingCurrency)}
                </p>
              </div>
              <button
                type="button"
                onClick={closeBudget}
                className="rounded-lg p-2 text-[var(--muted)] hover:bg-[var(--surface-soft)]"
                aria-label="Cerrar"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={saveBudget} className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                {[
                  ['labor', 'Mano de obra'],
                  ['materials', 'Materiales'],
                  ['equipment', 'Equipo / maquinaria'],
                  ['subcontractors', 'Subcontratos'],
                  ['others', 'Otros'],
                ].map(([key, label]) => (
                  <label key={key} className="space-y-2">
                    <span className="text-sm font-semibold text-[var(--foreground)]">
                      {label}
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form[key as keyof BudgetForm]}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          [key]: event.target.value,
                        }))
                      }
                      placeholder={`0.00 ${editingCurrency}`}
                      className="w-full rounded-xl border border-[var(--border)] bg-transparent px-4 py-3 text-[var(--foreground)] outline-none focus:border-[#5496CC]"
                    />
                  </label>
                ))}
              </div>

              <label className="block space-y-2">
                <span className="text-sm font-semibold text-[var(--foreground)]">
                  Notas
                </span>
                <textarea
                  rows={3}
                  value={form.notes}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, notes: event.target.value }))
                  }
                  placeholder="Observaciones del presupuesto..."
                  className="w-full rounded-xl border border-[var(--border)] bg-transparent px-4 py-3 text-[var(--foreground)] outline-none focus:border-[#5496CC]"
                />
              </label>

              <div className="grid gap-3 rounded-2xl bg-[var(--surface-soft)] p-4 sm:grid-cols-3">
                <div>
                  <p className="text-xs uppercase text-[var(--muted)]">Aprobado</p>
                  <p className="mt-1 font-bold text-[var(--foreground)]">
                    {money(editingProject.total, editingCurrency)}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase text-[var(--muted)]">Distribuido</p>
                  <p className="mt-1 font-bold text-[var(--foreground)]">
                    {money(formAllocated, editingCurrency)}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase text-[var(--muted)]">Disponible</p>
                  <p
                    className={`mt-1 font-bold ${
                      editingProject.total - formAllocated < 0
                        ? 'text-red-500'
                        : 'text-emerald-500'
                    }`}
                  >
                    {money(editingProject.total - formAllocated, editingCurrency)}
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={closeBudget}
                  className="rounded-xl border border-[var(--border)] px-5 py-3 font-semibold text-[var(--foreground)]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-[#5496CC] px-5 py-3 font-semibold text-white"
                >
                  Guardar presupuesto
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
  icon: typeof WalletCards
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
