import 'server-only'
import { createSign } from 'node:crypto'
import { createClient as createAdminClient } from '@supabase/supabase-js'

const REPORTS_FOLDER_ID = '1_1qjMhRyrhMIX7_U_LtjOcMVgvlEGxMA'
const GOOGLE_FOLDER_MIME = 'application/vnd.google-apps.folder'
const MAX_ITEMS = 2500
const MAX_DEPTH = 9
const MONTHS = [
  'enero','febrero','marzo','abril','mayo','junio',
  'julio','agosto','septiembre','octubre','noviembre','diciembre',
]
type DriveFile = {
  id: string
  name: string
  mimeType: string
  webViewLink?: string
  modifiedTime?: string
  size?: string
}
type DriveResponse = {
  nextPageToken?: string
  incompleteSearch?: boolean
  files?: DriveFile[]
}
type IndexedReport = {
  file_id: string
  name: string
  mime_type: string
  web_view_link: string
  folder_path: string
  staff_name: string | null
  report_year: number | null
  report_month: number | null
  modified_time: string | null
  size_bytes: number | null
  last_seen_at: string
  indexed_at: string
  source_folder_id: string
}

export function driveReportsConfigured() {
  return Boolean(
    process.env.GOOGLE_DRIVE_CLIENT_EMAIL &&
    process.env.GOOGLE_DRIVE_PRIVATE_KEY &&
    process.env.SUPABASE_SERVICE_ROLE_KEY &&
    process.env.NEXT_PUBLIC_SUPABASE_URL
  )
}

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Missing private Supabase configuration')
  return createAdminClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false }
  })
}

function base64url(data: object) {
  return Buffer.from(JSON.stringify(data)).toString('base64url')
}

async function googleToken() {
  const email = process.env.GOOGLE_DRIVE_CLIENT_EMAIL
  const privateKey = process.env.GOOGLE_DRIVE_PRIVATE_KEY?.replace(/\\n/g, '\n')
  if (!email || !privateKey) throw new Error('Google service account not configured')

  const now = Math.floor(Date.now() / 1000)
  const payload = base64url({ iss: email,
    scope: 'https://www.googleapis.com/auth/drive.metadata.readonly',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now, exp: now + 3000,
  })
  const encoded = base64url({ alg: 'RS256', typ: 'JWT' }) + '.' + payload
  const signer = createSign('RSA-SHA256')
  signer.update(encoded)
  signer.end()
  const signed = encoded + '.' + signer.sign(privateKey).toString('base64url')
  const form = new URLSearchParams({
    grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
    assertion: signed,
  })
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', body: form,
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    cache: 'no-store', signal: AbortSignal.timeout(15000),
  })
  if (!response.ok) throw new Error('Google OAuth token request failed: ' + response.status)
  const body = await response.json() as { access_token?: string }
  if (!body.access_token) throw new Error('Google OAuth token unavailable')
  return body.access_token
}

async function listChildren(token: string, folderId: string): Promise<DriveFile[]> {
  const files: DriveFile[] = []
  let pageToken: string | undefined
  do {
    const params = new URLSearchParams({
      q: "'" + folderId.replace(/'/g, "\\'") + "' in parents and trashed = false",
      fields: 'nextPageToken,incompleteSearch,files(id,name,mimeType,webViewLink,modifiedTime,size)',
      pageSize: '1000',
      supportsAllDrives: 'true',
      includeItemsFromAllDrives: 'true',
    })
    if (pageToken) params.set('pageToken', pageToken)
    const response = await fetch('https://www.googleapis.com/drive/v3/files?' + params.toString(), {
      headers: { Authorization: 'Bearer ' + token },
      cache: 'no-store', signal: AbortSignal.timeout(20000),
    })
    if (!response.ok) throw new Error('Google Drive listing failed: ' + response.status)
    const result = await response.json() as DriveResponse
    if (result.incompleteSearch) throw new Error('Incomplete Google Drive search')
    files.push(...(result.files ?? []))
    if (files.length > MAX_ITEMS) throw new Error('Drive folder is above the configured safety limit')
    pageToken = result.nextPageToken
  } while (pageToken)
  return files
}

function detailsFromPath(parts: string[]) {
  let reportYear: number | null = null
  let reportMonth: number | null = null
  let staffName: string | null = null
  let monthPosition = -1
  for (let i = 0; i < parts.length; i++) {
    if (/^20\d{2}$/.test(parts[i])) reportYear = Number(parts[i])
    const month = MONTHS.indexOf(parts[i].trim().toLowerCase())
    if (month !== -1) {
      reportMonth = month + 1
      monthPosition = i
    }
  }
  if (monthPosition !== -1 && parts.length > monthPosition + 1) {
    const value = parts[monthPosition + 1]
    const normalized = value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    if (normalized.includes('pedro')) staffName = 'Pedro García'
    else if (normalized.includes('cristian') || normalized.includes('crisitan')) staffName = 'Cristian Medina'
    else staffName = value
  }
  return { reportYear, reportMonth, staffName }
}

let activeSync: Promise<{ indexed: number; checkedAt: string; warning: string | null }> | null = null

async function performSync() {
  if (!driveReportsConfigured()) throw new Error('Drive integration not configured')
  const token = await googleToken()
  const stamp = new Date().toISOString()
  const queue = [{ id: REPORTS_FOLDER_ID, path: ['REPORTES'], depth: 0 }]
  const visited = new Set<string>()
  const indexed: IndexedReport[] = []

  while (queue.length) {
    const folder = queue.shift()!
    if (visited.has(folder.id)) continue
    visited.add(folder.id)
    if (folder.depth > MAX_DEPTH) throw new Error('Unexpected Drive folder depth')
    const children = await listChildren(token, folder.id)
    for (const file of children) {
      if (file.mimeType === GOOGLE_FOLDER_MIME) {
        queue.push({ id: file.id, path: [...folder.path, file.name], depth: folder.depth + 1 })
      } else {
        const { reportYear, reportMonth, staffName } = detailsFromPath(folder.path)
        indexed.push({
          file_id: file.id, name: file.name, mime_type: file.mimeType,
          web_view_link: file.webViewLink || 'https://drive.google.com/open?id=' + encodeURIComponent(file.id),
          folder_path: folder.path.join(' / '), staff_name: staffName,
          report_year: reportYear, report_month: reportMonth,
          modified_time: file.modifiedTime ?? null,
          size_bytes: file.size ? Number(file.size) : null,
          last_seen_at: stamp, indexed_at: stamp,
          source_folder_id: REPORTS_FOLDER_ID,
        })
        if (indexed.length > MAX_ITEMS) throw new Error('Report index is above the configured safety limit')
      }
    }
  }

  const admin = adminClient()
  // Preserve the existing index if the Google account unexpectedly sees an empty tree.
  if (!indexed.length) {
    const { count } = await admin.from('drive_report_files')
      .select('file_id', { count: 'exact', head: true })
      .eq('source_folder_id', REPORTS_FOLDER_ID)
    if ((count ?? 0) > 0) throw new Error('Google Drive returned an empty tree; retained prior index')
  }
  // Detect a partially visible tree before changing the index. Shared folders may
  // remain listable while their documents are hidden from the service account.
  const { data: existing, error: existingError } = await admin.from('drive_report_files')
    .select('file_id,staff_name')
    .eq('source_folder_id', REPORTS_FOLDER_ID)
    .limit(MAX_ITEMS)
  if (existingError) throw existingError
  const seenIds = new Set(indexed.map(report => report.file_id))
  const missing = (existing ?? []).filter(report => !seenIds.has(report.file_id))
  const missingStaff = [...new Set(missing.map(report => report.staff_name || 'sin responsable'))]
  const warning = missing.length > 0
    ? `No se pudieron confirmar ${missing.length} archivos existentes en Google Drive (responsables: ${missingStaff.join(', ')}). Se conservaron en el índice para evitar perder reportes. Revisa los permisos de carpetas y documentos.`
    : null

  for (let offset = 0; offset < indexed.length; offset += 200) {
    const { error } = await admin.from('drive_report_files')
      .upsert(indexed.slice(offset, offset + 200), { onConflict: 'file_id' })
    if (error) throw error
  }
  // Never delete indexed files merely because Google did not return them this
  // time. An absent item can mean missing permission rather than deletion.
  return { indexed: indexed.length, checkedAt: stamp, warning }
}

export async function syncDriveReportIndex() {
  if (!activeSync) {
    activeSync = performSync().finally(() => { activeSync = null })
  }
  return activeSync
}
