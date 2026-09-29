'use client'

export type EmployeeStatus = 'Activo' | 'Inactivo' | 'Vacaciones'
export type SystemRole = 'Administrador' | 'Marketing' | 'Arquitecto' | 'Supervisor' | 'Cliente' | 'Sin acceso'

export type Employee = {
  id: string
  folio: string
  fullName: string
  phone: string
  email: string
  position: string
  area: string
  hireDate: string
  monthlySalary: number
  status: EmployeeStatus
  rfc: string
  curp: string
  nss: string
  emergencyContact: string
  emergencyPhone: string
  projectIds: string[]
  vacationDays: number
  systemRole: SystemRole
  notes: string
}

export type HrAttendanceStatus = 'Presente' | 'Retardo' | 'Ausente' | 'Vacaciones' | 'Incapacidad'

export type HrAttendanceRecord = {
  id: string
  employeeId: string
  date: string
  status: HrAttendanceStatus
  checkIn: string
  checkOut: string
  overtimeHours: number
  notes: string
}

export type PayrollStatus = 'Pendiente' | 'Pagada'

export type PayrollRecord = {
  id: string
  folio: string
  employeeId: string
  periodStart: string
  periodEnd: string
  basePay: number
  overtimePay: number
  bonuses: number
  deductions: number
  netPay: number
  status: PayrollStatus
  notes: string
  createdAt: string
}

export const HR_EMPLOYEES_STORAGE_KEY = 'nedvi_hr_employees'
export const HR_ATTENDANCE_STORAGE_KEY = 'nedvi_hr_attendance'
export const HR_PAYROLL_STORAGE_KEY = 'nedvi_hr_payroll'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function readArray(key: string): unknown[] {
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

function writeArray<T>(key: string, values: T[]) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(key, JSON.stringify(values))
}

function employeeFolioNumber(value: string) {
  const match = value.match(/EMP-\d{4}-(\d{4,})$/)
  return match ? Number(match[1]) : 0
}

export function nextEmployeeFolio(employees: Employee[]) {
  const year = new Date().getFullYear()
  const next = Math.max(0, ...employees.map((employee) => employeeFolioNumber(employee.folio))) + 1
  return `EMP-${year}-${String(next).padStart(4, '0')}`
}

function payrollFolioNumber(value: string) {
  const match = value.match(/NOM-\d{4}-(\d{4,})$/)
  return match ? Number(match[1]) : 0
}

export function nextPayrollFolio(records: PayrollRecord[]) {
  const year = new Date().getFullYear()
  const next = Math.max(0, ...records.map((record) => payrollFolioNumber(record.folio))) + 1
  return `NOM-${year}-${String(next).padStart(4, '0')}`
}

export function readEmployees(): Employee[] {
  return readArray(HR_EMPLOYEES_STORAGE_KEY)
    .filter(isRecord)
    .filter(
      (item) =>
        typeof item.id === 'string' &&
        typeof item.folio === 'string' &&
        typeof item.fullName === 'string',
    )
    .map((item) => ({
      id: item.id as string,
      folio: item.folio as string,
      fullName: item.fullName as string,
      phone: typeof item.phone === 'string' ? item.phone : '',
      email: typeof item.email === 'string' ? item.email : '',
      position: typeof item.position === 'string' ? item.position : '',
      area: typeof item.area === 'string' ? item.area : '',
      hireDate: typeof item.hireDate === 'string' ? item.hireDate : '',
      monthlySalary: typeof item.monthlySalary === 'number' ? item.monthlySalary : 0,
      status:
        item.status === 'Inactivo' || item.status === 'Vacaciones' ? item.status : 'Activo',
      rfc: typeof item.rfc === 'string' ? item.rfc : '',
      curp: typeof item.curp === 'string' ? item.curp : '',
      nss: typeof item.nss === 'string' ? item.nss : '',
      emergencyContact: typeof item.emergencyContact === 'string' ? item.emergencyContact : '',
      emergencyPhone: typeof item.emergencyPhone === 'string' ? item.emergencyPhone : '',
      projectIds: Array.isArray(item.projectIds)
        ? item.projectIds.filter((projectId): projectId is string => typeof projectId === 'string')
        : [],
      vacationDays: typeof item.vacationDays === 'number' ? item.vacationDays : 0,
      systemRole:
        item.systemRole === 'Administrador' ||
        item.systemRole === 'Marketing' ||
        item.systemRole === 'Arquitecto' ||
        item.systemRole === 'Supervisor' ||
        item.systemRole === 'Cliente'
          ? item.systemRole
          : 'Sin acceso',
      notes: typeof item.notes === 'string' ? item.notes : '',
    }))
}

export function writeEmployees(employees: Employee[]) {
  writeArray(HR_EMPLOYEES_STORAGE_KEY, employees)
}

export function readHrAttendance(): HrAttendanceRecord[] {
  return readArray(HR_ATTENDANCE_STORAGE_KEY)
    .filter(isRecord)
    .filter(
      (item) =>
        typeof item.id === 'string' &&
        typeof item.employeeId === 'string' &&
        typeof item.date === 'string',
    )
    .map((item) => ({
      id: item.id as string,
      employeeId: item.employeeId as string,
      date: item.date as string,
      status:
        item.status === 'Retardo' ||
        item.status === 'Ausente' ||
        item.status === 'Vacaciones' ||
        item.status === 'Incapacidad'
          ? item.status
          : 'Presente',
      checkIn: typeof item.checkIn === 'string' ? item.checkIn : '',
      checkOut: typeof item.checkOut === 'string' ? item.checkOut : '',
      overtimeHours: typeof item.overtimeHours === 'number' ? item.overtimeHours : 0,
      notes: typeof item.notes === 'string' ? item.notes : '',
    }))
}

export function writeHrAttendance(records: HrAttendanceRecord[]) {
  writeArray(HR_ATTENDANCE_STORAGE_KEY, records)
}

export function readPayroll(): PayrollRecord[] {
  return readArray(HR_PAYROLL_STORAGE_KEY)
    .filter(isRecord)
    .filter(
      (item) =>
        typeof item.id === 'string' &&
        typeof item.folio === 'string' &&
        typeof item.employeeId === 'string' &&
        typeof item.periodStart === 'string' &&
        typeof item.periodEnd === 'string',
    )
    .map((item) => ({
      id: item.id as string,
      folio: item.folio as string,
      employeeId: item.employeeId as string,
      periodStart: item.periodStart as string,
      periodEnd: item.periodEnd as string,
      basePay: typeof item.basePay === 'number' ? item.basePay : 0,
      overtimePay: typeof item.overtimePay === 'number' ? item.overtimePay : 0,
      bonuses: typeof item.bonuses === 'number' ? item.bonuses : 0,
      deductions: typeof item.deductions === 'number' ? item.deductions : 0,
      netPay: typeof item.netPay === 'number' ? item.netPay : 0,
      status: item.status === 'Pagada' ? 'Pagada' : 'Pendiente',
      notes: typeof item.notes === 'string' ? item.notes : '',
      createdAt: typeof item.createdAt === 'string' ? item.createdAt : '',
    }))
}

export function writePayroll(records: PayrollRecord[]) {
  writeArray(HR_PAYROLL_STORAGE_KEY, records)
}
