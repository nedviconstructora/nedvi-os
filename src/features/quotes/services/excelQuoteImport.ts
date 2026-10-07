export type ImportedQuoteRow = {
  id: string
  description: string
  unit: string
  quantity: number
  unitPrice: number
  sourceRow: number
}

type CellValue = string | number

function normalizeText(value: unknown) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function toNumber(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  const raw = String(value ?? '').trim()
  if (!raw) return 0

  const cleaned = raw
    .replace(/\s/g, '')
    .replace(/[$€£]/g, '')
    .replace(/mxn|usd/gi, '')

  const comma = cleaned.lastIndexOf(',')
  const dot = cleaned.lastIndexOf('.')
  let normalized = cleaned

  if (comma > dot) {
    normalized = cleaned.replace(/\./g, '').replace(',', '.')
  } else {
    normalized = cleaned.replace(/,/g, '')
  }

  const number = Number(normalized.replace(/[^0-9.-]/g, ''))
  return Number.isFinite(number) ? number : 0
}

function unitFromValue(value: unknown) {
  const normalized = normalizeText(value).replace(/\s/g, '')

  if (['km', 'kilometro', 'kilometros'].includes(normalized)) return 'Kilómetros'
  if (['m2', 'mt2', 'm²', 'metrocuadrado', 'metroscuadrados'].includes(normalized)) return 'Metros Cuadrados'
  if (['m3', 'mt3', 'm³', 'metrocubico', 'metroscubicos'].includes(normalized)) return 'Metros Cúbicos'
  if (['ml', 'm', 'metrolineal', 'metroslineales'].includes(normalized)) return 'Metros Lineales'
  if (['l', 'lt', 'lts', 'litro', 'litros'].includes(normalized)) return 'Litros'
  if (['lote', 'lotes'].includes(normalized)) return 'Lotes'
  if (['salida', 'salidas'].includes(normalized)) return 'Salidas'
  if (['conjunto', 'conjuntos'].includes(normalized)) return 'Conjuntos'
  if (['galon', 'galones', 'gal', 'gals'].includes(normalized)) return 'Galones'
  if (['circuito', 'circuitos', 'cto', 'ctos'].includes(normalized)) return 'Circuitos'
  if (['pza', 'pzas', 'pz', 'pieza', 'piezas', 'unidad', 'unidades', 'und'].includes(normalized)) return 'Piezas'

  return value ? 'Otros' : 'Piezas'
}

function parseCsvLine(line: string) {
  const result: string[] = []
  let current = ''
  let quoted = false

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index]

    if (char === '"') {
      if (quoted && line[index + 1] === '"') {
        current += '"'
        index += 1
      } else {
        quoted = !quoted
      }
      continue
    }

    if ((char === ',' || char === ';' || char === '\t') && !quoted) {
      result.push(current)
      current = ''
      continue
    }

    current += char
  }

  result.push(current)
  return result
}

function parseCsv(text: string): CellValue[][] {
  return text
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .map(parseCsvLine)
    .filter((row) => row.some((cell) => cell.trim()))
}

function findEndOfCentralDirectory(bytes: Uint8Array) {
  for (let index = bytes.length - 22; index >= Math.max(0, bytes.length - 65557); index -= 1) {
    if (
      bytes[index] === 0x50 &&
      bytes[index + 1] === 0x4b &&
      bytes[index + 2] === 0x05 &&
      bytes[index + 3] === 0x06
    ) {
      return index
    }
  }
  return -1
}

async function unzipEntries(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer)
  const view = new DataView(buffer)
  const eocd = findEndOfCentralDirectory(bytes)

  if (eocd < 0) throw new Error('El archivo Excel no tiene un formato ZIP/XLSX válido.')

  const entries = view.getUint16(eocd + 10, true)
  let offset = view.getUint32(eocd + 16, true)
  const decoder = new TextDecoder()
  const files = new Map<string, Uint8Array>()

  for (let index = 0; index < entries; index += 1) {
    if (view.getUint32(offset, true) !== 0x02014b50) break

    const method = view.getUint16(offset + 10, true)
    const compressedSize = view.getUint32(offset + 20, true)
    const fileNameLength = view.getUint16(offset + 28, true)
    const extraLength = view.getUint16(offset + 30, true)
    const commentLength = view.getUint16(offset + 32, true)
    const localOffset = view.getUint32(offset + 42, true)
    const fileName = decoder.decode(bytes.slice(offset + 46, offset + 46 + fileNameLength))

    if (view.getUint32(localOffset, true) !== 0x04034b50) {
      offset += 46 + fileNameLength + extraLength + commentLength
      continue
    }

    const localNameLength = view.getUint16(localOffset + 26, true)
    const localExtraLength = view.getUint16(localOffset + 28, true)
    const dataOffset = localOffset + 30 + localNameLength + localExtraLength
    const compressed = bytes.slice(dataOffset, dataOffset + compressedSize)

    if (method === 0) {
      files.set(fileName, compressed)
    } else if (method === 8) {
      if (typeof DecompressionStream === 'undefined') {
        throw new Error('Este navegador no puede descomprimir archivos XLSX.')
      }

      const stream = new Blob([compressed]).stream().pipeThrough(
        new DecompressionStream('deflate-raw'),
      )
      const decompressed = new Uint8Array(await new Response(stream).arrayBuffer())
      files.set(fileName, decompressed)
    }

    offset += 46 + fileNameLength + extraLength + commentLength
  }

  return files
}

function xmlFromBytes(bytes?: Uint8Array) {
  if (!bytes) return null
  const text = new TextDecoder().decode(bytes)
  return new DOMParser().parseFromString(text, 'application/xml')
}

function cellColumnIndex(reference: string) {
  const letters = reference.match(/[A-Z]+/i)?.[0]?.toUpperCase() ?? 'A'
  let index = 0

  for (const letter of letters) {
    index = index * 26 + (letter.charCodeAt(0) - 64)
  }

  return index - 1
}

async function parseXlsx(buffer: ArrayBuffer): Promise<CellValue[][]> {
  const files = await unzipEntries(buffer)
  const workbook = xmlFromBytes(files.get('xl/workbook.xml'))
  const rels = xmlFromBytes(files.get('xl/_rels/workbook.xml.rels'))

  if (!workbook || !rels) {
    throw new Error('No pudimos encontrar las hojas del archivo XLSX.')
  }

  const firstSheet = workbook.getElementsByTagName('sheet')[0]
  if (!firstSheet) throw new Error('El archivo Excel no contiene hojas.')

  const relationshipId =
    firstSheet.getAttribute('r:id') ||
    firstSheet.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id')

  const relationship = Array.from(rels.getElementsByTagName('Relationship')).find(
    (item) => item.getAttribute('Id') === relationshipId,
  )

  const target = relationship?.getAttribute('Target') ?? 'worksheets/sheet1.xml'
  const sheetPath = target.startsWith('/') 
    ? target.slice(1)
    : target.startsWith('xl/')
      ? target
      : `xl/${target.replace(/^\.\//, '')}`

  const sheet = xmlFromBytes(files.get(sheetPath))
  if (!sheet) throw new Error('No pudimos leer la primera hoja del Excel.')

  const sharedDoc = xmlFromBytes(files.get('xl/sharedStrings.xml'))
  const sharedStrings = sharedDoc
    ? Array.from(sharedDoc.getElementsByTagName('si')).map((item) =>
        Array.from(item.getElementsByTagName('t'))
          .map((node) => node.textContent ?? '')
          .join(''),
      )
    : []

  const rows: CellValue[][] = []

  for (const rowNode of Array.from(sheet.getElementsByTagName('row'))) {
    const row: CellValue[] = []

    for (const cell of Array.from(rowNode.getElementsByTagName('c'))) {
      const reference = cell.getAttribute('r') ?? 'A1'
      const column = cellColumnIndex(reference)
      const type = cell.getAttribute('t')
      const rawValue = cell.getElementsByTagName('v')[0]?.textContent ?? ''

      let value: CellValue = rawValue

      if (type === 's') {
        value = sharedStrings[Number(rawValue)] ?? ''
      } else if (type === 'inlineStr') {
        value = Array.from(cell.getElementsByTagName('t'))
          .map((node) => node.textContent ?? '')
          .join('')
      } else if (type === 'b') {
        value = rawValue === '1' ? 'Sí' : 'No'
      } else if (rawValue !== '' && Number.isFinite(Number(rawValue))) {
        value = Number(rawValue)
      }

      row[column] = value
    }

    rows.push(row.map((value) => value ?? ''))
  }

  return rows.filter((row) => row.some((value) => String(value).trim()))
}

const HEADER_ALIASES = {
  description: ['concepto', 'descripcion', 'partida', 'alcance', 'concepto descripcion', 'descripcion concepto'],
  unit: ['unidad', 'um', 'u m', 'unidad medida', 'unidad de medida'],
  quantity: ['cantidad', 'cant', 'qty', 'volumen'],
  unitPrice: ['precio unitario', 'precio', 'p u', 'pu', 'costo unitario', 'precio por unidad'],
  amount: ['importe', 'total', 'monto'],
} as const

type HeaderKey = keyof typeof HEADER_ALIASES

function headerMatch(value: unknown, key: HeaderKey) {
  const normalized = normalizeText(value)
  return HEADER_ALIASES[key].some((alias) => normalized === alias || normalized.includes(alias))
}

function detectHeader(rows: CellValue[][]) {
  let bestRow = -1
  let bestScore = 0

  for (let rowIndex = 0; rowIndex < Math.min(rows.length, 25); rowIndex += 1) {
    const row = rows[rowIndex]
    let score = 0

    for (const value of row) {
      if (headerMatch(value, 'description')) score += 3
      else if (headerMatch(value, 'unit')) score += 1
      else if (headerMatch(value, 'quantity')) score += 2
      else if (headerMatch(value, 'unitPrice')) score += 2
      else if (headerMatch(value, 'amount')) score += 1
    }

    if (score > bestScore) {
      bestScore = score
      bestRow = rowIndex
    }
  }

  if (bestRow < 0 || bestScore < 4) {
    throw new Error('No pudimos identificar los encabezados del Excel. Usa columnas como Concepto, Unidad, Cantidad y Precio Unitario.')
  }

  const header = rows[bestRow]
  const indices: Partial<Record<HeaderKey, number>> = {}

  header.forEach((value, index) => {
    for (const key of Object.keys(HEADER_ALIASES) as HeaderKey[]) {
      if (indices[key] === undefined && headerMatch(value, key)) {
        indices[key] = index
      }
    }
  })

  if (indices.description === undefined || indices.quantity === undefined) {
    throw new Error('El Excel necesita por lo menos las columnas Concepto/Descripción y Cantidad.')
  }

  if (indices.unitPrice === undefined && indices.amount === undefined) {
    throw new Error('El Excel necesita Precio Unitario o Importe.')
  }

  return { rowIndex: bestRow, indices }
}

function rowsToConcepts(rows: CellValue[][]) {
  const { rowIndex, indices } = detectHeader(rows)
  const imported: ImportedQuoteRow[] = []

  for (let index = rowIndex + 1; index < rows.length; index += 1) {
    const row = rows[index]
    const description = String(row[indices.description!] ?? '').trim()
    const quantity = toNumber(row[indices.quantity!] ?? 0)

    if (!description || quantity <= 0) continue

    let unitPrice =
      indices.unitPrice !== undefined
        ? toNumber(row[indices.unitPrice] ?? 0)
        : 0

    if (unitPrice <= 0 && indices.amount !== undefined) {
      const amount = toNumber(row[indices.amount] ?? 0)
      if (amount >= 0 && quantity > 0) unitPrice = amount / quantity
    }

    if (unitPrice < 0) continue

    imported.push({
      id: crypto.randomUUID(),
      description,
      unit: unitFromValue(indices.unit !== undefined ? row[indices.unit] : ''),
      quantity,
      unitPrice,
      sourceRow: index + 1,
    })
  }

  if (!imported.length) {
    throw new Error('No encontramos conceptos válidos para importar.')
  }

  return imported
}

export async function readQuoteSpreadsheet(file: File) {
  const extension = file.name.toLowerCase().split('.').pop()

  if (extension === 'csv' || file.type.includes('csv')) {
    const text = await file.text()
    return rowsToConcepts(parseCsv(text))
  }

  if (extension === 'xlsx') {
    return rowsToConcepts(await parseXlsx(await file.arrayBuffer()))
  }

  throw new Error('Usa un archivo .xlsx o .csv. Los archivos .xls antiguos deben guardarse primero como .xlsx.')
}

export function downloadQuoteTemplate() {
  const rows = [
    ['Concepto', 'Unidad', 'Cantidad', 'Precio Unitario', 'Importe'],
    ['Suministro de concreto', 'm3', '20', '2500', '50000'],
    ['Acero de refuerzo', 'Piezas', '10', '1250', '12500'],
  ]

  const csv = rows
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\r\n')

  const blob = new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = 'Plantilla_NEDVI_Cotizacion.csv'
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}
