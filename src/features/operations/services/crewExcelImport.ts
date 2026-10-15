export type ImportedWorker = {
  full_name: string
  social_security_number: string
  position: string
  salary: number | null
  salary_period: string
  work_hours: string
  entry_time: string
  exit_time: string
  entry_supervisor: string
  curp: string
  rfc: string
}

const columns: Record<string, keyof ImportedWorker> = {
  'nombre completo': 'full_name',
  'nombre': 'full_name',
  'numero de seguro social': 'social_security_number',
  'nss': 'social_security_number',
  'puesto': 'position',
  'salario': 'salary',
  'periodicidad salarial': 'salary_period',
  'periodo de pago': 'salary_period',
  'horas de trabajo': 'work_hours',
  'hora de trabajo': 'work_hours',
  'hora de entrada': 'entry_time',
  'hora de salida': 'exit_time',
  'supervisor de entradas': 'entry_supervisor',
  'quien es el supervisor de entradas': 'entry_supervisor',
  'curp': 'curp',
  'rfc': 'rfc',
}
const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ')

async function zipEntries(file: File): Promise<Map<string, Uint8Array>> {
  const data = new Uint8Array(await file.arrayBuffer())
  const view = new DataView(data.buffer)
  let end = -1
  for (let i = data.length - 22; i >= Math.max(0, data.length - 65557); i--) {
    if (view.getUint32(i, true) === 0x06054b50) { end = i; break }
  }
  if (end < 0) throw new Error('El archivo no es un Excel .xlsx válido.')
  const count = view.getUint16(end + 10, true)
  let pos = view.getUint32(end + 16, true)
  const entries = new Map<string, Uint8Array>()
  for (let i = 0; i < count; i++) {
    if (view.getUint32(pos, true) !== 0x02014b50) throw new Error('Estructura ZIP incorrecta.')
    const method = view.getUint16(pos + 10, true)
    const size = view.getUint32(pos + 20, true)
    const nameSize = view.getUint16(pos + 28, true)
    const extraSize = view.getUint16(pos + 30, true)
    const commentSize = view.getUint16(pos + 32, true)
    const offset = view.getUint32(pos + 42, true)
    const name = new TextDecoder().decode(data.slice(pos + 46, pos + 46 + nameSize))
    pos += 46 + nameSize + extraSize + commentSize
    if (!['xl/sharedStrings.xml', 'xl/worksheets/sheet1.xml'].includes(name)) continue
    if (view.getUint32(offset, true) !== 0x04034b50) throw new Error('Cabecera ZIP incorrecta.')
    const start = offset + 30 + view.getUint16(offset + 26, true) + view.getUint16(offset + 28, true)
    const bytes = data.slice(start, start + size)
    if (method === 0) entries.set(name, bytes)
    else if (method === 8) {
      const stream = new Blob([Uint8Array.from(bytes)]).stream().pipeThrough(new DecompressionStream('deflate-raw'))
      entries.set(name, new Uint8Array(await new Response(stream).arrayBuffer()))
    } else throw new Error('Compresión Excel no compatible.')
  }
  return entries
}

function rowsFromXml(xmlText: string, strings: string[]): string[][] {
  const xml = new DOMParser().parseFromString(xmlText, 'application/xml')
  if (xml.querySelector('parsererror')) throw new Error('El contenido del Excel es inválido.')
  const rows: string[][] = []
  for (const row of Array.from(xml.getElementsByTagName('row'))) {
    const cells: string[] = []
    for (const cell of Array.from(row.getElementsByTagName('c'))) {
      const ref = cell.getAttribute('r') || ''
      const col = ref.match(/^[A-Z]+/)?.[0] || 'A'
      let index = 0
      for (const ch of col) index = index * 26 + ch.charCodeAt(0) - 64
      index--
      const raw = cell.getElementsByTagName('v')[0]?.textContent || ''
      const inline = cell.getElementsByTagName('is')[0]
      const text = cell.getAttribute('t') === 's' ? (strings[Number(raw)] || '') :
        inline ? Array.from(inline.getElementsByTagName('t')).map((t) => t.textContent || '').join('') : raw
      cells[index] = text
    }
    rows.push(cells)
  }
  return rows
}

function parseCsv(source: string): string[][] {
  const rows: string[][] = []
  let row: string[] = [], value = '', quoted = false
  for (let i = 0; i < source.length; i++) {
    const char = source[i]
    if (char === '"') {
      if (quoted && source[i + 1] === '"') { value += '"'; i++ }
      else quoted = !quoted
    } else if (char === ',' && !quoted) { row.push(value); value = '' }
    else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && source[i + 1] === '\n') i++
      row.push(value); rows.push(row); row = []; value = ''
    } else value += char
  }
  row.push(value)
  if (row.some(Boolean)) rows.push(row)
  return rows
}

export async function parseCrewExcel(file: File): Promise<{ workers: ImportedWorker[]; warnings: string[] }> {
  if (file.size > 8_000_000) throw new Error('El archivo supera el límite de 8 MB.')
  const filename = file.name.toLowerCase()
  let rows: string[][]
  if (filename.endsWith('.csv')) rows = parseCsv((await file.text()).replace(/^\uFEFF/, ''))
  else if (filename.endsWith('.xlsx')) {
    const files = await zipEntries(file)
    const sheet = files.get('xl/worksheets/sheet1.xml')
    if (!sheet) throw new Error('No se encontró la primera hoja del Excel.')
    const shared = files.get('xl/sharedStrings.xml')
    let strings: string[] = []
    if (shared) {
      const xml = new DOMParser().parseFromString(new TextDecoder().decode(shared), 'application/xml')
      strings = Array.from(xml.getElementsByTagName('si')).map(si =>
        Array.from(si.getElementsByTagName('t')).map(t => t.textContent || '').join(''))
    }
    rows = rowsFromXml(new TextDecoder().decode(sheet), strings)
  } else throw new Error('Selecciona un archivo .xlsx o .csv.')
  const headers = rows[0]?.map(h => columns[normalize(String(h || ''))])
  if (!headers?.includes('full_name')) throw new Error('Falta la columna obligatoria "Nombre completo".')
  const warnings: string[] = [], workers: ImportedWorker[] = []
  const seen = new Set<string>()
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i]
    if (!row?.some(value => String(value || '').trim())) continue
    const record: Record<string, string> = {}
    headers.forEach((key, index) => { if (key) record[key] = String(row[index] ?? '').trim() })
    if (!record.full_name) { warnings.push('Fila ' + (i + 1) + ': nombre vacío, omitida.'); continue }
    const identifier = normalize(record.curp || record.social_security_number || record.full_name)
    if (seen.has(identifier)) { warnings.push('Fila ' + (i + 1) + ': posible duplicado, omitida.'); continue }
    seen.add(identifier)
    const salaryText = (record.salary || '').replace(/[$,\s]/g, '')
    const salary = salaryText ? Number(salaryText) : null
    if (salary !== null && (!Number.isFinite(salary) || salary < 0)) {
      warnings.push('Fila ' + (i + 1) + ': salario inválido, se dejó vacío.')
    }
    workers.push({
      full_name: record.full_name,
      social_security_number: record.social_security_number || '',
      position: record.position || '',
      salary: salary !== null && Number.isFinite(salary) && salary >= 0 ? salary : null,
      salary_period: record.salary_period || '',
      work_hours: record.work_hours || '',
      entry_time: record.entry_time || '',
      exit_time: record.exit_time || '',
      entry_supervisor: record.entry_supervisor || '',
      curp: record.curp || '',
      rfc: record.rfc || '',
    })
  }
  if (!workers.length) throw new Error('No se encontraron integrantes válidos.')
  return { workers, warnings }
}
