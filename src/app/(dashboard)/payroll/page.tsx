'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import { Plus, Search, Trash2, Wallet, X } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import {
  HR_EMPLOYEES_STORAGE_KEY,
  HR_PAYROLL_STORAGE_KEY,
  type PayrollRecord,
  nextPayrollFolio,
  readEmployees,
  readPayroll,
  writePayroll,
} from '@/features/hr/services/hrStorage'

function today() {
  return new Date().toISOString().slice(0, 10)
}

function money(value: number) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(value)
}

export default function PayrollPage() {
  const [employees, setEmployees] = useState(readEmployees())
  const [records, setRecords] = useState<PayrollRecord[]>([])
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)

  const [employeeId, setEmployeeId] = useState('')
  const [periodStart, setPeriodStart] = useState(today())
  const [periodEnd, setPeriodEnd] = useState(today())
  const [basePay, setBasePay] = useState('')
  const [overtimePay, setOvertimePay] = useState('0')
  const [bonuses, setBonuses] = useState('0')
  const [deductions, setDeductions] = useState('0')
  const [notes, setNotes] = useState('')

  function load() {
    const currentEmployees = readEmployees()
    const validIds = new Set(currentEmployees.map((employee) => employee.id))
    const currentRecords = readPayroll().filter((record) => validIds.has(record.employeeId))
    setEmployees(currentEmployees)
    setRecords(currentRecords)
    writePayroll(currentRecords)
  }

  useEffect(() => {
    load()
    const onStorage = (event: StorageEvent) => {
      if (event.key === HR_PAYROLL_STORAGE_KEY || event.key === HR_EMPLOYEES_STORAGE_KEY) load()
    }
    window.addEventListener('storage', onStorage)
    window.addEventListener('focus', load)
    return () => {
      window.removeEventListener('storage', onStorage)
      window.removeEventListener('focus', load)
    }
  }, [])

  const employeeById = useMemo(() => new Map(employees.map((employee) => [employee.id, employee])), [employees])

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return records
    return records.filter((record) => {
      const employee = employeeById.get(record.employeeId)
      return [record.folio, employee?.fullName ?? '', employee?.folio ?? '', record.periodStart, record.periodEnd, record.status].join(' ').toLowerCase().includes(query)
    })
  }, [records, search, employeeById])

  const pendingTotal = records.filter((record) => record.status === 'Pendiente').reduce((sum, record) => sum + record.netPay, 0)
  const paidTotal = records.filter((record) => record.status === 'Pagada').reduce((sum, record) => sum + record.netPay, 0)

  const calculatedNet = Math.max(0, Number(basePay || 0) + Number(overtimePay || 0) + Number(bonuses || 0) - Number(deductions || 0))

  function resetForm() {
    setEmployeeId('')
    setPeriodStart(today())
    setPeriodEnd(today())
    setBasePay('')
    setOvertimePay('0')
    setBonuses('0')
    setDeductions('0')
    setNotes('')
  }

  function selectEmployee(id: string) {
    setEmployeeId(id)
    const employee = employees.find((item) => item.id === id)
    setBasePay(employee?.monthlySalary ? String(employee.monthlySalary) : '')
  }

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!employeeId) return

    const record: PayrollRecord = {
      id: crypto.randomUUID(),
      folio: nextPayrollFolio(records),
      employeeId,
      periodStart,
      periodEnd,
      basePay: Number(basePay || 0),
      overtimePay: Number(overtimePay || 0),
      bonuses: Number(bonuses || 0),
      deductions: Number(deductions || 0),
      netPay: calculatedNet,
      status: 'Pendiente',
      notes: notes.trim(),
      createdAt: new Date().toISOString(),
    }

    const next = [record, ...records]
    setRecords(next)
    writePayroll(next)
    setOpen(false)
    resetForm()
  }

  function togglePaid(record: PayrollRecord) {
    const next = records.map((item) => item.id === record.id ? { ...item, status: item.status === 'Pagada' ? 'Pendiente' as const : 'Pagada' as const } : item)
    setRecords(next)
    writePayroll(next)
  }

  function remove(id: string) {
    if (!window.confirm('¿Eliminar este registro de nómina?')) return
    const next = records.filter((record) => record.id !== id)
    setRecords(next)
    writePayroll(next)
  }

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-[1600px] space-y-6">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#5496CC]">Recursos Humanos</p>
            <h1 className="mt-2 text-3xl font-bold">Nómina</h1>
            <p className="mt-2 text-sm text-[var(--muted)]">Control de periodos de pago, percepciones, deducciones y estatus de nómina.</p>
          </div>
          <button onClick={() => setOpen(true)} disabled={!employees.length} className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#5496CC] px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"><Plus size={16} /> Nueva nómina</button>
        </header>

        <div className="grid gap-4 sm:grid-cols-3">
          <Metric label="Registros de nómina" value={records.length.toString()} />
          <Metric label="Pendiente por pagar" value={money(pendingTotal)} />
          <Metric label="Pagado" value={money(paidTotal)} />
        </div>

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4"><div className="relative max-w-xl"><Search size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--muted)]" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar empleado, folio o periodo..." className="w-full rounded-xl border border-[var(--border)] bg-transparent py-3 pl-11 pr-4 text-sm outline-none focus:border-[#5496CC]" /></div></div>

        <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
          {filtered.length === 0 ? (
            <div className="px-6 py-16 text-center"><Wallet className="mx-auto text-[#5496CC]" size={32} /><h2 className="mt-4 text-lg font-bold">Todavía no hay nóminas</h2><p className="mt-2 text-sm text-[var(--muted)]">Registra el primer periodo de pago del personal.</p></div>
          ) : (
            <div className="overflow-x-auto"><table className="w-full min-w-[1100px] text-left text-sm"><thead className="border-b border-[var(--border)] bg-[var(--surface-soft)] text-xs uppercase text-[var(--muted)]"><tr><th className="px-5 py-4">Folio</th><th className="px-5 py-4">Empleado</th><th className="px-5 py-4">Periodo</th><th className="px-5 py-4">Base</th><th className="px-5 py-4">Extras + bonos</th><th className="px-5 py-4">Deducciones</th><th className="px-5 py-4">Neto</th><th className="px-5 py-4">Estado</th><th className="px-5 py-4 text-right">Acciones</th></tr></thead><tbody className="divide-y divide-[var(--border)]">{filtered.map((record) => { const employee = employeeById.get(record.employeeId); return <tr key={record.id} className="hover:bg-[var(--surface-soft)]"><td className="px-5 py-4 font-semibold text-[#5496CC]">{record.folio}</td><td className="px-5 py-4"><p className="font-semibold">{employee?.fullName || 'Empleado'}</p><p className="mt-1 text-xs text-[var(--muted)]">{employee?.position || employee?.folio || ''}</p></td><td className="px-5 py-4">{record.periodStart} → {record.periodEnd}</td><td className="px-5 py-4">{money(record.basePay)}</td><td className="px-5 py-4">{money(record.overtimePay + record.bonuses)}</td><td className="px-5 py-4">{money(record.deductions)}</td><td className="px-5 py-4 font-bold">{money(record.netPay)}</td><td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${record.status === 'Pagada' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}`}>{record.status}</span></td><td className="px-5 py-4"><div className="flex justify-end gap-2"><button onClick={() => togglePaid(record)} className="rounded-lg border border-[var(--border)] px-3 py-2 text-xs font-semibold">{record.status === 'Pagada' ? 'Marcar pendiente' : 'Marcar pagada'}</button><button onClick={() => remove(record.id)} className="rounded-lg border border-red-500/20 p-2 text-red-500"><Trash2 size={15} /></button></div></td></tr> })}</tbody></table></div>
          )}
        </div>
      </div>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"><div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-[var(--surface)] p-6 shadow-2xl"><div className="mb-5 flex items-start justify-between"><div><p className="text-xs font-semibold uppercase tracking-wide text-[#5496CC]">Recursos Humanos</p><h2 className="text-xl font-bold">Nueva nómina</h2></div><button onClick={() => setOpen(false)}><X size={18} /></button></div><form onSubmit={save} className="space-y-4">
          <label className="block space-y-2"><span className="text-sm font-semibold">Empleado *</span><select required value={employeeId} onChange={(e) => selectEmployee(e.target.value)} className="w-full rounded-xl border border-[var(--border)] bg-transparent px-4 py-3"><option value="">Seleccionar empleado</option>{employees.filter((employee) => employee.status !== 'Inactivo').map((employee) => <option key={employee.id} value={employee.id}>{employee.folio} — {employee.fullName}</option>)}</select></label>
          <div className="grid gap-4 sm:grid-cols-2"><label className="space-y-2"><span className="text-sm font-semibold">Inicio del periodo</span><input type="date" required value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} className="w-full rounded-xl border border-[var(--border)] bg-transparent px-4 py-3" /></label><label className="space-y-2"><span className="text-sm font-semibold">Fin del periodo</span><input type="date" required value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} className="w-full rounded-xl border border-[var(--border)] bg-transparent px-4 py-3" /></label></div>
          <div className="grid gap-4 sm:grid-cols-2"><label className="space-y-2"><span className="text-sm font-semibold">Pago base</span><input type="number" min="0" step="0.01" required value={basePay} onChange={(e) => setBasePay(e.target.value)} className="w-full rounded-xl border border-[var(--border)] bg-transparent px-4 py-3" /></label><label className="space-y-2"><span className="text-sm font-semibold">Horas extra ($)</span><input type="number" min="0" step="0.01" value={overtimePay} onChange={(e) => setOvertimePay(e.target.value)} className="w-full rounded-xl border border-[var(--border)] bg-transparent px-4 py-3" /></label></div>
          <div className="grid gap-4 sm:grid-cols-2"><label className="space-y-2"><span className="text-sm font-semibold">Bonos</span><input type="number" min="0" step="0.01" value={bonuses} onChange={(e) => setBonuses(e.target.value)} className="w-full rounded-xl border border-[var(--border)] bg-transparent px-4 py-3" /></label><label className="space-y-2"><span className="text-sm font-semibold">Deducciones</span><input type="number" min="0" step="0.01" value={deductions} onChange={(e) => setDeductions(e.target.value)} className="w-full rounded-xl border border-[var(--border)] bg-transparent px-4 py-3" /></label></div>
          <div className="rounded-2xl bg-[#5496CC]/10 p-4"><p className="text-xs font-semibold uppercase tracking-wide text-[#5496CC]">Neto a pagar</p><p className="mt-1 text-2xl font-bold">{money(calculatedNet)}</p></div>
          <label className="block space-y-2"><span className="text-sm font-semibold">Notas</span><textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full rounded-xl border border-[var(--border)] bg-transparent px-4 py-3" /></label>
          <div className="flex justify-end gap-3"><button type="button" onClick={() => setOpen(false)} className="rounded-xl border border-[var(--border)] px-5 py-3 font-semibold">Cancelar</button><button type="submit" className="rounded-xl bg-[#5496CC] px-5 py-3 font-semibold text-white">Guardar nómina</button></div>
        </form></div></div>
      ) : null}
    </AppShell>
  )
}

function Metric({ label, value }: { label: string; value: string }) { return <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5"><Wallet className="text-[#5496CC]" size={19} /><p className="mt-3 text-2xl font-bold">{value}</p><p className="mt-1 text-sm text-[var(--muted)]">{label}</p></div> }
