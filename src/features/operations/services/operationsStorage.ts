'use client'

export type OperationProject = {
  id: string
  folio: string
  project: string
  client: string
  owner: string
  contact: string
  phone: string
  email: string
  address: string
  rfc: string
}

export type ProgressItem = {
  id: string
  concept: string
  unit: string
  po: number
  quantity: number
  total: number
  accumulatedPrevious: number
  previousExecution: number
  executed: number
  totalToExecute: number
}

export type ProgressRecord = {
  id: string
  quoteId: string
  folio: string
  date: string
  percent: number
  milestone: string
  notes: string
  items: ProgressItem[]
}

export type DailyReportImage = {
  id: string
  name: string
  dataUrl: string
}

export type DailyReport = {
  id: string
  quoteId: string
  folio: string
  date: string
  projectName: string
  clientInvoice: string
  weather: string
  workers: number
  summary: string
  blockers: string
  author: string
  latitude?: number
  longitude?: number
  locationAccuracy?: number
  images: DailyReportImage[]
}

export type Crew = {
  id: string
  name: string
  foreman: string
  specialty: string
  members: string[]
  active: boolean
}

export type AttendanceStatus = 'Presente' | 'Ausente' | 'Retardo'

export type AttendanceRecord = {
  id: string
  quoteId: string
  folio: string
  crewId?: string
  person: string
  date: string
  status: AttendanceStatus
  checkIn: string
  checkOut: string
}

const QUOTES_STORAGE_KEY = 'nedvi_quotes'
export const PROGRESS_STORAGE_KEY = 'nedvi_site_progress'
export const DAILY_REPORTS_STORAGE_KEY = 'nedvi_daily_reports'
export const CREWS_STORAGE_KEY = 'nedvi_crews'
export const ATTENDANCE_STORAGE_KEY = 'nedvi_attendance'

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

function numberValue(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

function progressPercentFromItems(items: ProgressItem[], fallback = 0) {
  if (!items.length) return Math.max(0, Math.min(100, fallback))

  const totalContract = items.reduce((sum, item) => sum + Math.max(0, item.total), 0)
  if (totalContract <= 0) return Math.max(0, Math.min(100, fallback))

  const totalAccumulated = items.reduce(
    (sum, item) => sum + Math.max(0, item.accumulatedPrevious) + Math.max(0, item.executed),
    0,
  )

  const rawPercent = (totalAccumulated / totalContract) * 100
  return Math.max(0, Math.min(100, Math.round(rawPercent * 100) / 100))
}

export function readOperationProjects(): OperationProject[] {
  return readArray(QUOTES_STORAGE_KEY)
    .filter(isRecord)
    .filter((quote) => quote.convertedToProject === true)
    .filter(
      (quote) =>
        typeof quote.id === 'string' &&
        typeof quote.folio === 'string' &&
        typeof quote.project === 'string' &&
        typeof quote.client === 'string',
    )
    .map((quote) => {
      const customerInfo = isRecord(quote.customerInfo) ? quote.customerInfo : {}

      return {
        id: quote.id as string,
        folio: quote.folio as string,
        project: quote.project as string,
        client: quote.client as string,
        owner: typeof quote.owner === 'string' ? quote.owner : '',
        contact: typeof customerInfo.contact === 'string' ? customerInfo.contact : '',
        phone: typeof customerInfo.phone === 'string' ? customerInfo.phone : '',
        email: typeof customerInfo.email === 'string' ? customerInfo.email : '',
        address: typeof customerInfo.address === 'string' ? customerInfo.address : '',
        rfc: typeof customerInfo.rfc === 'string' ? customerInfo.rfc : '',
      }
    })
}

export function readProgressRecords(): ProgressRecord[] {
  return readArray(PROGRESS_STORAGE_KEY)
    .filter(isRecord)
    .filter(
      (item) =>
        typeof item.id === 'string' &&
        typeof item.quoteId === 'string' &&
        typeof item.folio === 'string' &&
        typeof item.date === 'string' &&
        typeof item.percent === 'number',
    )
    .map((item) => {
      const items: ProgressItem[] = Array.isArray(item.items)
        ? item.items
            .filter(isRecord)
            .filter((row) => typeof row.id === 'string')
            .map((row) => {
              const po = Math.max(0, numberValue(row.po))
              const quantity = Math.max(0, numberValue(row.quantity))
              const total = Math.max(0, numberValue(row.total) || po * quantity)
              const accumulatedPrevious = Math.max(0, numberValue(row.accumulatedPrevious))
              const previousExecution = Math.max(0, numberValue(row.previousExecution))
              const executed = Math.max(0, numberValue(row.executed))

              return {
                id: row.id as string,
                concept: typeof row.concept === 'string' ? row.concept : '',
                unit: typeof row.unit === 'string' ? row.unit : '',
                po,
                quantity,
                total,
                accumulatedPrevious,
                previousExecution,
                executed,
                totalToExecute: Math.max(0, total - accumulatedPrevious - executed),
              }
            })
        : []

      const storedPercent = Math.max(0, Math.min(100, item.percent as number))

      return {
        id: item.id as string,
        quoteId: item.quoteId as string,
        folio: item.folio as string,
        date: item.date as string,
        percent: progressPercentFromItems(items, storedPercent),
        milestone: typeof item.milestone === 'string' ? item.milestone : '',
        notes: typeof item.notes === 'string' ? item.notes : '',
        items,
      }
    })
}

export function writeProgressRecords(records: ProgressRecord[]) {
  for (const record of records) {
    record.percent = progressPercentFromItems(record.items, record.percent)
  }

  writeArray(PROGRESS_STORAGE_KEY, records)
}

export function readDailyReports(): DailyReport[] {
  return readArray(DAILY_REPORTS_STORAGE_KEY)
    .filter(isRecord)
    .filter(
      (item) =>
        typeof item.id === 'string' &&
        typeof item.quoteId === 'string' &&
        typeof item.folio === 'string' &&
        typeof item.date === 'string',
    )
    .map((item) => ({
      id: item.id as string,
      quoteId: item.quoteId as string,
      folio: item.folio as string,
      date: item.date as string,
      projectName: typeof item.projectName === 'string' ? item.projectName : '',
      clientInvoice: typeof item.clientInvoice === 'string' ? item.clientInvoice : '',
      weather: typeof item.weather === 'string' ? item.weather : '',
      workers: typeof item.workers === 'number' ? item.workers : 0,
      summary: typeof item.summary === 'string' ? item.summary : '',
      blockers: typeof item.blockers === 'string' ? item.blockers : '',
      author: typeof item.author === 'string' ? item.author : '',
      latitude: typeof item.latitude === 'number' ? item.latitude : undefined,
      longitude: typeof item.longitude === 'number' ? item.longitude : undefined,
      locationAccuracy: typeof item.locationAccuracy === 'number' ? item.locationAccuracy : undefined,
      images: Array.isArray(item.images)
        ? item.images
            .filter(isRecord)
            .filter(
              (image) =>
                typeof image.id === 'string' &&
                typeof image.name === 'string' &&
                typeof image.dataUrl === 'string' &&
                image.dataUrl.startsWith('data:image/'),
            )
            .map((image) => ({
              id: image.id as string,
              name: image.name as string,
              dataUrl: image.dataUrl as string,
            }))
        : [],
    }))
}

export function writeDailyReports(records: DailyReport[]) {
  writeArray(DAILY_REPORTS_STORAGE_KEY, records)
}

export function readCrews(): Crew[] {
  return readArray(CREWS_STORAGE_KEY)
    .filter(isRecord)
    .filter(
      (item) =>
        typeof item.id === 'string' &&
        typeof item.name === 'string' &&
        typeof item.foreman === 'string',
    )
    .map((item) => ({
      id: item.id as string,
      name: item.name as string,
      foreman: item.foreman as string,
      specialty: typeof item.specialty === 'string' ? item.specialty : '',
      members: Array.isArray(item.members)
        ? item.members.filter((member): member is string => typeof member === 'string')
        : [],
      active: typeof item.active === 'boolean' ? item.active : true,
    }))
}

export function writeCrews(crews: Crew[]) {
  writeArray(CREWS_STORAGE_KEY, crews)
}

export function readAttendance(): AttendanceRecord[] {
  return readArray(ATTENDANCE_STORAGE_KEY)
    .filter(isRecord)
    .filter(
      (item) =>
        typeof item.id === 'string' &&
        typeof item.quoteId === 'string' &&
        typeof item.folio === 'string' &&
        typeof item.person === 'string' &&
        typeof item.date === 'string',
    )
    .map((item) => ({
      id: item.id as string,
      quoteId: item.quoteId as string,
      folio: item.folio as string,
      crewId: typeof item.crewId === 'string' ? item.crewId : undefined,
      person: item.person as string,
      date: item.date as string,
      status:
        item.status === 'Ausente' || item.status === 'Retardo' ? item.status : 'Presente',
      checkIn: typeof item.checkIn === 'string' ? item.checkIn : '',
      checkOut: typeof item.checkOut === 'string' ? item.checkOut : '',
    }))
}

export function writeAttendance(records: AttendanceRecord[]) {
  writeArray(ATTENDANCE_STORAGE_KEY, records)
}
