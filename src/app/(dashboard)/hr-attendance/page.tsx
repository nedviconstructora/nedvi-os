'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import { CalendarDays, Plus, Search, Trash2, X } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import {
  HR_ATTENDANCE_STORAGE_KEY,
  HR_EMPLOYEES_STORAGE_KEY,
  type HrAttendanceRecord,
  type HrAttendanceStatus,
  readEmployees,
  readHrAttendance,
  writeHrAttendance,
} from '@/features/hr/services/hrStorage'

const attendanceStatuses: HrAttendanceStatus[] = ['Presente', 'Retardo', 'Ausente', 'Vacaciones', 'Incapacidad']

function today() {
  return new Date().toISOString().slice(0, 10)
}

export default function HrAttendancePage() {
  const [employees, setEmployees] = useState(readEmployees())
  const [records, setRecords] = useState<HrAttendanceRecord[]>([])
  const [search, setSearch] = useState('')
  const [dateFilter, setDateFilter] = useState(today())
  const [open, setOpen] = useState(false)

  const [employeeId, setEmployeeId] = useState('')
  const [date, setDate] = useState(today())
  const [status, setStatus] = useState<HrAttendanceStatus>('Presente')
  const [checkIn, setCheckIn] = useState('')
  const [checkOut, setCheckOut] = useState('')
  const [overtimeHours, setOvertimeHours] = useState('0')
  const [notes, setNotes] = useState('')

  function load() {
    const currentEmployees = readEmployees()
    const validIds = new Set(currentEmployees.map((employee) => employee.id))
    const currentRecords = readHrAttendance().filter((record) => validIds.has(record.employeeId))
    setEmployees(currentEmployees)
    setRecords(currentRecords)
    writeHrAttendance(currentRecords)
  }

  useEffect(() => {
    load()
    const onStorage = (event: StorageEvent) => {
      if (event.key === HR_ATTENDANCE_STORAGE_KEY || event.key === HR_EMPLOYEES_STORAGE_KEY) load()
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
    return records
      .filter((record) => !dateFilter || record.date === dateFilter)
      .filter((record) => {
        if (!query) return true
        const employee = employeeById.get(record.employeeId)
        return [employee?.fullName ?? '', employee?.folio ?? '', employee?.position ?? '', record.status, record.notes].join(' ').toLowerCase().includes(query)
      })
      .sort((a, b) => b.date.localeCompare(a.date))
  }, [records, dateFilter, search, employeeById])

  const todayRecords = records.filter((record) => record.date === today())
  const presentToday = todayRecords.filter((record) => record.status === 'Presente' || record.status === 'Retardo').length
  const absentToday = todayRecords.filter((record) => record.status === 'Ausente').length

  function resetForm() {
    setEmployeeId('')
    setDate(today())
    setStatus('Presente')
    setCheckIn('')
    setCheckOut('')
    setOvertimeHours('0')
    setNotes('')
  }

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!employeeId) return

    const record: HrAttendanceRecord = {
      id: crypto.randomUUID(),
      employeeId,
      date,
      status,
      checkIn,
      checkOut,
      overtimeHours: Math.max(0, Number(overtimeHours || 0)),
      notes: notes.trim(),
    }

    const withoutDuplicate = records.filter((item) => !(item.employeeId === employeeId && item.date === date))
    const next = [record, ...withoutDuplicate]
    setRecords(next)
    writeHrAttendance(next)
    setOpen(false)
    resetForm()
  }

  function remove(id: string) {
    if (!window.confirm('¿Eliminar este registro de asistencia?')) return
    const next = records.filter((record) => record.id !== id)
    setRecords(next)
    writeHrAttendance(next)
  }

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-[1600px] space-y-6">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#5496CC]">Recursos Humanos</p>
            <h1 className="mt-2 text-3xl font-bold">Asistencias</h1>
            <p className="mt-2 text-sm text-[var(--muted)]">Control de asistencia del personal, entradas, salidas, incidencias y horas extra.</p>
          </div>
          <button onClick={() => setOpen(true)} disabled={!employees.length} className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#5496CC] px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"><Plus size={16} /> Registrar asistencia</button>
        </header>

        <div className="grid gap-4 sm:grid-cols-3">
          <Metric label="Registros de hoy" value={todayRecords.length.toString()} />
          <Metric label="Presentes / retardos" value={presentToday.toString()} />
          <Metric label="Ausentes" value={absentToday.toString()} />
        </div>

        <div className="grid gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 lg:grid-cols-[1fr_auto]">
          <div className="relative max-w-xl"><Search size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--muted)]" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar empleado, puesto o estado..." className="w-full rounded-xl border border-[var(--border)] bg-transparent py-3 pl-11 pr-4 text-sm outline-none focus:border-[#5496CC]" /></div>
          <input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="h-11 rounded-xl border border-[var(--border)] bg-transparent px-4 text-sm" />
        </div>

        <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
          {filtered.length === 0 ? (
            <div className="px-6 py-16 text-center"><CalendarDays className="mx-auto text-[#5496CC]" size={32} /><h2 className="mt-4 text-lg font-bold">Sin asistencias registradas</h2><p className="mt-2 text-sm text-[var(--muted)]">Selecciona otra fecha o registra la asistencia del personal.</p></div>
          ) : (
            <div className="overflow-x-auto"><table className="w-full min-w-[1000px] text-left text-sm"><thead className="border-b border-[var(--border)] bg-[var(--surface-soft)] text-xs uppercase text-[var(--muted)]"><tr><th className="px-5 py-4">Empleado</th><th className="px-5 py-4">Fecha</th><th className="px-5 py-4">Estado</th><th className="px-5 py-4">Entrada</th><th className="px-5 py-4">Salida</th><th className="px-5 py-4">Horas extra</th><th className="px-5 py-4">Notas</th><th className="px-5 py-4"></th></tr></thead><tbody className="divide-y divide-[var(--border)]">{filtered.map((record) => { const employee = employeeById.get(record.employeeId); return <tr key={record.id} className="hover:bg-[var(--surface-soft)]"><td className="px-5 py-4"><p className="font-semibold">{employee?.fullName || 'Empleado'}</p><p className="mt-1 text-xs text-[var(--muted)]">{employee?.position || employee?.folio || ''}</p></td><td className="px-5 py-4">{record.date}</td><td className="px-5 py-4"><AttendanceBadge status={record.status} /></td><td className="px-5 py-4">{record.checkIn || '—'}</td><td className="px-5 py-4">{record.checkOut || '—'}</td><td className="px-5 py-4">{record.overtimeHours}</td><td className="max-w-xs px-5 py-4 text-[var(--muted)]">{record.notes || '—'}</td><td className="px-5 py-4 text-right"><button onClick={() => remove(record.id)} className="rounded-lg p-2 text-red-500 hover:bg-red-500/10"><Trash2 size={15} /></button></td></tr> })}</tbody></table></div>
          )}
        </div>
      </div>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"><div className="w-full max-w-3xl rounded-2xl bg-[var(--surface)] p-6 shadow-2xl"><div className="mb-5 flex items-start justify-between"><div><p className="text-xs font-semibold uppercase tracking-wide text-[#5496CC]">Recursos Humanos</p><h2 className="text-xl font-bold">Registrar asistencia</h2></div><button onClick={() => setOpen(false)}><X size={18} /></button></div><form onSubmit={save} className="space-y-4">
          <label className="block space-y-2"><span className="text-sm font-semibold">Empleado *</span><select required value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} className="w-full rounded-xl border border-[var(--border)] bg-transparent px-4 py-3"><option value="">Seleccionar empleado</option>{employees.filter((employee) => employee.status !== 'Inactivo').map((employee) => <option key={employee.id} value={employee.id}>{employee.folio} — {employee.fullName}</option>)}</select></label>
          <div className="grid gap-4 sm:grid-cols-2"><label className="space-y-2"><span className="text-sm font-semibold">Fecha</span><input type="date" required value={date} onChange={(e) => setDate(e.target.value)} className="w-full rounded-xl border border-[var(--border)] bg-transparent px-4 py-3" /></label><label className="space-y-2"><span className="text-sm font-semibold">Estado</span><select value={status} onChange={(e) => setStatus(e.target.value as HrAttendanceStatus)} className="w-full rounded-xl border border-[var(--border)] bg-transparent px-4 py-3">{attendanceStatuses.map((item) => <option key={item}>{item}</option>)}</select></label></div>
          <div className="grid gap-4 sm:grid-cols-3"><label className="space-y-2"><span className="text-sm font-semibold">Entrada</span><input type="time" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} className="w-full rounded-xl border border-[var(--border)] bg-transparent px-4 py-3" /></label><label className="space-y-2"><span className="text-sm font-semibold">Salida</span><input type="time" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} className="w-full rounded-xl border border-[var(--border)] bg-transparent px-4 py-3" /></label><label className="space-y-2"><span className="text-sm font-semibold">Horas extra</span><input type="number" min="0" step="0.5" value={overtimeHours} onChange={(e) => setOvertimeHours(e.target.value)} className="w-full rounded-xl border border-[var(--border)] bg-transparent px-4 py-3" /></label></div>
          <label className="block space-y-2"><span className="text-sm font-semibold">Notas / incidencia</span><textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full rounded-xl border border-[var(--border)] bg-transparent px-4 py-3" /></label>
          <div className="flex justify-end gap-3"><button type="button" onClick={() => setOpen(false)} className="rounded-xl border border-[var(--border)] px-5 py-3 font-semibold">Cancelar</button><button type="submit" className="rounded-xl bg-[#5496CC] px-5 py-3 font-semibold text-white">Guardar asistencia</button></div>
        </form></div></div>
      ) : null}
    </AppShell>
  )
}

function Metric({ label, value }: { label: string; value: string }) { return <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5"><CalendarDays className="text-[#5496CC]" size={19} /><p className="mt-3 text-2xl font-bold">{value}</p><p className="mt-1 text-sm text-[var(--muted)]">{label}</p></div> }
function AttendanceBadge({ status }: { status: HrAttendanceStatus }) { const classes = status === 'Presente' ? 'bg-emerald-500/10 text-emerald-500' : status === 'Retardo' ? 'bg-amber-500/10 text-amber-500' : status === 'Ausente' ? 'bg-red-500/10 text-red-500' : 'bg-[#5496CC]/10 text-[#5496CC]'; return <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${classes}`}>{status}</span> }
