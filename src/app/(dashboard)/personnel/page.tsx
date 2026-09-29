'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import { BriefcaseBusiness, Eye, Plus, Search, Trash2, UserRound, X } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { readOperationProjects } from '@/features/operations/services/operationsStorage'
import {
  HR_EMPLOYEES_STORAGE_KEY,
  type Employee,
  type EmployeeStatus,
  type SystemRole,
  nextEmployeeFolio,
  readEmployees,
  writeEmployees,
} from '@/features/hr/services/hrStorage'

const statuses: EmployeeStatus[] = ['Activo', 'Vacaciones', 'Inactivo']
const roles: SystemRole[] = ['Administrador', 'Marketing', 'Arquitecto', 'Supervisor', 'Cliente', 'Sin acceso']

function money(value: number) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(value)
}

export default function PersonnelPage() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'Todos' | EmployeeStatus>('Todos')
  const [open, setOpen] = useState(false)
  const [viewing, setViewing] = useState<Employee | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)

  const [folio, setFolio] = useState('')
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [position, setPosition] = useState('')
  const [area, setArea] = useState('')
  const [hireDate, setHireDate] = useState('')
  const [monthlySalary, setMonthlySalary] = useState('')
  const [status, setStatus] = useState<EmployeeStatus>('Activo')
  const [rfc, setRfc] = useState('')
  const [curp, setCurp] = useState('')
  const [nss, setNss] = useState('')
  const [emergencyContact, setEmergencyContact] = useState('')
  const [emergencyPhone, setEmergencyPhone] = useState('')
  const [projectIds, setProjectIds] = useState<string[]>([])
  const [vacationDays, setVacationDays] = useState('0')
  const [systemRole, setSystemRole] = useState<SystemRole>('Sin acceso')
  const [notes, setNotes] = useState('')

  const projects = useMemo(() => readOperationProjects(), [employees])

  function load() {
    setEmployees(readEmployees())
  }

  useEffect(() => {
    load()
    const onStorage = (event: StorageEvent) => {
      if (event.key === HR_EMPLOYEES_STORAGE_KEY) load()
    }
    window.addEventListener('storage', onStorage)
    window.addEventListener('focus', load)
    return () => {
      window.removeEventListener('storage', onStorage)
      window.removeEventListener('focus', load)
    }
  }, [])

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    return employees.filter((employee) => {
      const matchesStatus = statusFilter === 'Todos' || employee.status === statusFilter
      const matchesQuery = !query || [employee.folio, employee.fullName, employee.position, employee.area, employee.email, employee.phone, employee.rfc, employee.curp].join(' ').toLowerCase().includes(query)
      return matchesStatus && matchesQuery
    })
  }, [employees, search, statusFilter])

  function resetForm() {
    setEditingId(null)
    setFolio(nextEmployeeFolio(employees))
    setFullName('')
    setPhone('')
    setEmail('')
    setPosition('')
    setArea('')
    setHireDate('')
    setMonthlySalary('')
    setStatus('Activo')
    setRfc('')
    setCurp('')
    setNss('')
    setEmergencyContact('')
    setEmergencyPhone('')
    setProjectIds([])
    setVacationDays('0')
    setSystemRole('Sin acceso')
    setNotes('')
  }

  function openNew() {
    resetForm()
    setOpen(true)
  }

  function openEdit(employee: Employee) {
    setEditingId(employee.id)
    setFolio(employee.folio)
    setFullName(employee.fullName)
    setPhone(employee.phone)
    setEmail(employee.email)
    setPosition(employee.position)
    setArea(employee.area)
    setHireDate(employee.hireDate)
    setMonthlySalary(String(employee.monthlySalary || ''))
    setStatus(employee.status)
    setRfc(employee.rfc)
    setCurp(employee.curp)
    setNss(employee.nss)
    setEmergencyContact(employee.emergencyContact)
    setEmergencyPhone(employee.emergencyPhone)
    setProjectIds(employee.projectIds)
    setVacationDays(String(employee.vacationDays))
    setSystemRole(employee.systemRole)
    setNotes(employee.notes)
    setOpen(true)
  }

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!fullName.trim()) return

    const employee: Employee = {
      id: editingId ?? crypto.randomUUID(),
      folio: folio || nextEmployeeFolio(employees),
      fullName: fullName.trim(),
      phone: phone.trim(),
      email: email.trim(),
      position: position.trim(),
      area: area.trim(),
      hireDate,
      monthlySalary: Number(monthlySalary || 0),
      status,
      rfc: rfc.trim(),
      curp: curp.trim(),
      nss: nss.trim(),
      emergencyContact: emergencyContact.trim(),
      emergencyPhone: emergencyPhone.trim(),
      projectIds,
      vacationDays: Math.max(0, Number(vacationDays || 0)),
      systemRole,
      notes: notes.trim(),
    }

    const next = editingId
      ? employees.map((item) => (item.id === editingId ? employee : item))
      : [employee, ...employees]

    setEmployees(next)
    writeEmployees(next)
    setOpen(false)
    resetForm()
  }

  function remove(employee: Employee) {
    if (!window.confirm(`¿Eliminar el expediente de ${employee.fullName}?`)) return
    const next = employees.filter((item) => item.id !== employee.id)
    setEmployees(next)
    writeEmployees(next)
    if (viewing?.id === employee.id) setViewing(null)
  }

  function toggleProject(projectId: string) {
    setProjectIds((current) => current.includes(projectId) ? current.filter((id) => id !== projectId) : [...current, projectId])
  }

  const activeCount = employees.filter((employee) => employee.status === 'Activo').length
  const vacationCount = employees.filter((employee) => employee.status === 'Vacaciones').length

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-[1600px] space-y-6">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#5496CC]">Recursos Humanos</p>
            <h1 className="mt-2 text-3xl font-bold">Personal</h1>
            <p className="mt-2 text-sm text-[var(--muted)]">Expedientes, puestos, datos laborales, obras asignadas, vacaciones y roles de sistema.</p>
          </div>
          <button onClick={openNew} className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#5496CC] px-4 text-sm font-semibold text-white"><Plus size={16} /> Nuevo empleado</button>
        </header>

        <div className="grid gap-4 sm:grid-cols-3">
          <Metric label="Personal registrado" value={employees.length.toString()} />
          <Metric label="Activos" value={activeCount.toString()} />
          <Metric label="De vacaciones" value={vacationCount.toString()} />
        </div>

        <div className="flex flex-col gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full max-w-xl">
            <Search size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar nombre, puesto, área, RFC o CURP..." className="w-full rounded-xl border border-[var(--border)] bg-transparent py-3 pl-11 pr-4 text-sm outline-none focus:border-[#5496CC]" />
          </div>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as 'Todos' | EmployeeStatus)} className="h-11 rounded-xl border border-[var(--border)] bg-transparent px-4 text-sm">
            <option value="Todos">Todos</option>
            {statuses.map((item) => <option key={item}>{item}</option>)}
          </select>
        </div>

        <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
          {filtered.length === 0 ? (
            <div className="px-6 py-16 text-center"><UserRound className="mx-auto text-[#5496CC]" size={32} /><h2 className="mt-4 text-lg font-bold">No hay personal registrado</h2><p className="mt-2 text-sm text-[var(--muted)]">Agrega el primer expediente de Recursos Humanos.</p></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1080px] text-left text-sm">
                <thead className="border-b border-[var(--border)] bg-[var(--surface-soft)] text-xs uppercase text-[var(--muted)]"><tr><th className="px-5 py-4">Empleado</th><th className="px-5 py-4">Puesto / Área</th><th className="px-5 py-4">Ingreso</th><th className="px-5 py-4">Estado</th><th className="px-5 py-4">Obras</th><th className="px-5 py-4">Rol</th><th className="px-5 py-4 text-right">Acciones</th></tr></thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {filtered.map((employee) => (
                    <tr key={employee.id} className="hover:bg-[var(--surface-soft)]">
                      <td className="px-5 py-4"><p className="font-semibold">{employee.fullName}</p><p className="mt-1 text-xs text-[#5496CC]">{employee.folio}</p></td>
                      <td className="px-5 py-4"><p>{employee.position || 'Sin puesto'}</p><p className="mt-1 text-xs text-[var(--muted)]">{employee.area || 'Sin área'}</p></td>
                      <td className="px-5 py-4">{employee.hireDate || '—'}</td>
                      <td className="px-5 py-4"><StatusBadge status={employee.status} /></td>
                      <td className="px-5 py-4">{employee.projectIds.length}</td>
                      <td className="px-5 py-4">{employee.systemRole}</td>
                      <td className="px-5 py-4"><div className="flex justify-end gap-2"><button onClick={() => setViewing(employee)} className="rounded-lg border border-[var(--border)] p-2 text-[#5496CC]" title="Ver expediente"><Eye size={15} /></button><button onClick={() => openEdit(employee)} className="rounded-lg border border-[var(--border)] px-3 py-2 text-xs font-semibold">Editar</button><button onClick={() => remove(employee)} className="rounded-lg border border-red-500/20 p-2 text-red-500"><Trash2 size={15} /></button></div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {viewing ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-[var(--surface)] p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-wide text-[#5496CC]">Expediente de empleado</p><h2 className="mt-1 text-2xl font-bold">{viewing.fullName}</h2><p className="mt-1 text-sm text-[var(--muted)]">{viewing.folio} · {viewing.position || 'Sin puesto'}</p></div><button onClick={() => setViewing(null)}><X size={19} /></button></div>
            <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Detail label="Estado" value={viewing.status} /><Detail label="Área" value={viewing.area || 'Sin registrar'} /><Detail label="Fecha de ingreso" value={viewing.hireDate || 'Sin registrar'} /><Detail label="Teléfono" value={viewing.phone || 'Sin registrar'} /><Detail label="Correo" value={viewing.email || 'Sin registrar'} /><Detail label="Sueldo mensual" value={money(viewing.monthlySalary)} /><Detail label="RFC" value={viewing.rfc || 'Sin registrar'} /><Detail label="CURP" value={viewing.curp || 'Sin registrar'} /><Detail label="NSS" value={viewing.nss || 'Sin registrar'} /><Detail label="Contacto de emergencia" value={viewing.emergencyContact || 'Sin registrar'} /><Detail label="Tel. emergencia" value={viewing.emergencyPhone || 'Sin registrar'} /><Detail label="Vacaciones disponibles" value={`${viewing.vacationDays} días`} /><Detail label="Rol de sistema" value={viewing.systemRole} />
            </div>
            <div className="mt-5 rounded-xl bg-[var(--surface-soft)] p-4"><p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Obras asignadas</p><div className="mt-3 flex flex-wrap gap-2">{viewing.projectIds.length ? viewing.projectIds.map((id) => { const project = projects.find((item) => item.id === id); return <span key={id} className="rounded-full bg-[#5496CC]/10 px-3 py-1 text-xs font-semibold text-[#5496CC]">{project?.project || id}</span> }) : <span className="text-sm text-[var(--muted)]">Sin obras asignadas.</span>}</div></div>
            <div className="mt-4 rounded-xl bg-[var(--surface-soft)] p-4"><p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Notas</p><p className="mt-2 whitespace-pre-wrap text-sm">{viewing.notes || 'Sin notas.'}</p></div>
          </div>
        </div>
      ) : null}

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="max-h-[94vh] w-full max-w-5xl overflow-y-auto rounded-2xl bg-[var(--surface)] p-6 shadow-2xl">
            <div className="mb-5 flex items-start justify-between"><div><p className="text-xs font-semibold uppercase tracking-wide text-[#5496CC]">Recursos Humanos</p><h2 className="text-xl font-bold">{editingId ? 'Editar empleado' : 'Nuevo empleado'}</h2></div><button onClick={() => setOpen(false)}><X size={18} /></button></div>
            <form onSubmit={save} className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Field label="Folio"><input value={folio} readOnly className="input-base opacity-70" /></Field>
                <Field label="Nombre completo *"><input required value={fullName} onChange={(e) => setFullName(e.target.value)} className="input-base" /></Field>
                <Field label="Estado"><select value={status} onChange={(e) => setStatus(e.target.value as EmployeeStatus)} className="input-base">{statuses.map((item) => <option key={item}>{item}</option>)}</select></Field>
                <Field label="Puesto"><input value={position} onChange={(e) => setPosition(e.target.value)} className="input-base" /></Field>
                <Field label="Área"><input value={area} onChange={(e) => setArea(e.target.value)} className="input-base" /></Field>
                <Field label="Fecha de ingreso"><input type="date" value={hireDate} onChange={(e) => setHireDate(e.target.value)} className="input-base" /></Field>
                <Field label="Teléfono"><input value={phone} onChange={(e) => setPhone(e.target.value)} className="input-base" /></Field>
                <Field label="Correo"><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input-base" /></Field>
                <Field label="Sueldo mensual"><input type="number" min="0" step="0.01" value={monthlySalary} onChange={(e) => setMonthlySalary(e.target.value)} className="input-base" /></Field>
                <Field label="RFC"><input value={rfc} onChange={(e) => setRfc(e.target.value.toUpperCase())} className="input-base" /></Field>
                <Field label="CURP"><input value={curp} onChange={(e) => setCurp(e.target.value.toUpperCase())} className="input-base" /></Field>
                <Field label="NSS"><input value={nss} onChange={(e) => setNss(e.target.value)} className="input-base" /></Field>
                <Field label="Contacto de emergencia"><input value={emergencyContact} onChange={(e) => setEmergencyContact(e.target.value)} className="input-base" /></Field>
                <Field label="Tel. emergencia"><input value={emergencyPhone} onChange={(e) => setEmergencyPhone(e.target.value)} className="input-base" /></Field>
                <Field label="Vacaciones disponibles"><input type="number" min="0" value={vacationDays} onChange={(e) => setVacationDays(e.target.value)} className="input-base" /></Field>
                <Field label="Rol de sistema"><select value={systemRole} onChange={(e) => setSystemRole(e.target.value as SystemRole)} className="input-base">{roles.map((role) => <option key={role}>{role}</option>)}</select></Field>
              </div>

              <div><p className="text-sm font-semibold">Obras asignadas</p><div className="mt-2 grid gap-2 md:grid-cols-2 lg:grid-cols-3">{projects.length ? projects.map((project) => <label key={project.id} className="flex cursor-pointer items-start gap-3 rounded-xl border border-[var(--border)] p-3"><input type="checkbox" checked={projectIds.includes(project.id)} onChange={() => toggleProject(project.id)} className="mt-1" /><span><span className="block text-sm font-semibold">{project.project}</span><span className="text-xs text-[var(--muted)]">{project.client} · {project.folio}</span></span></label>) : <p className="text-sm text-[var(--muted)]">No hay proyectos creados todavía.</p>}</div></div>

              <Field label="Notas"><textarea rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} className="input-base" /></Field>
              <div className="flex justify-end gap-3"><button type="button" onClick={() => setOpen(false)} className="rounded-xl border border-[var(--border)] px-5 py-3 font-semibold">Cancelar</button><button type="submit" className="rounded-xl bg-[#5496CC] px-5 py-3 font-semibold text-white">Guardar empleado</button></div>
            </form>
          </div>
        </div>
      ) : null}

      <style jsx global>{`.input-base{width:100%;border:1px solid var(--border);background:transparent;border-radius:.75rem;padding:.75rem 1rem;outline:none}.input-base:focus{border-color:#5496CC}`}</style>
    </AppShell>
  )
}

function Metric({ label, value }: { label: string; value: string }) { return <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5"><BriefcaseBusiness className="text-[#5496CC]" size={19} /><p className="mt-3 text-2xl font-bold">{value}</p><p className="mt-1 text-sm text-[var(--muted)]">{label}</p></div> }
function Detail({ label, value }: { label: string; value: string }) { return <div className="rounded-xl border border-[var(--border)] p-3"><p className="text-xs text-[var(--muted)]">{label}</p><p className="mt-1 break-words text-sm font-semibold">{value}</p></div> }
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block space-y-2"><span className="text-sm font-semibold">{label}</span>{children}</label> }
