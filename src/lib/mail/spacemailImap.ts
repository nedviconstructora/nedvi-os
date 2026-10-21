import tls from 'node:tls'
import { once } from 'node:events'

export type InboxMessage = {
  uid: number
  from: string
  email: string
  subject: string
  date: string
  unread: boolean
  size: number
}

type ImapRecord = { line: string; literal?: Buffer }
const HOST = 'mail.spacemail.com'
const PORT = 993
const LIMIT = 30
const MAX_MESSAGE_BYTES = 2 * 1024 * 1024

class ImapConnection {
  private socket: tls.TLSSocket
  private queue = Buffer.alloc(0)
  private wake: (() => void) | undefined
  private problem: Error | null = null
  private serial = 0

  constructor(socket: tls.TLSSocket) {
    this.socket = socket
    socket.setTimeout(16000, () => socket.destroy(new Error('IMAP_TIMEOUT')))
    socket.on('data', data => {
      this.queue = Buffer.concat([this.queue, data])
      if (this.queue.length > MAX_MESSAGE_BYTES + 1048576) socket.destroy(new Error('IMAP_RESPONSE_TOO_LARGE'))
      this.wake?.()
      this.wake = undefined
    })
    socket.on('error', error => { this.problem = error; this.wake?.(); this.wake = undefined })
    socket.on('close', () => { this.problem ??= new Error('IMAP_CLOSED'); this.wake?.(); this.wake = undefined })
  }

  private async ready() {
    if (this.problem) throw new Error('No se pudo mantener la conexión con Spacemail.')
    await new Promise<void>(resolve => { this.wake = resolve })
    if (this.problem) throw new Error('No se pudo mantener la conexión con Spacemail.')
  }

  async line(): Promise<string> {
    while (true) {
      const pos = this.queue.indexOf('\r\n')
      if (pos >= 0) {
        const line = this.queue.subarray(0, pos).toString('latin1')
        this.queue = this.queue.subarray(pos + 2)
        if (line.length > 400000) throw new Error('Respuesta IMAP demasiado larga.')
        return line
      }
      await this.ready()
    }
  }

  private async bytes(size: number): Promise<Buffer> {
    if (!Number.isSafeInteger(size) || size < 0 || size > MAX_MESSAGE_BYTES + 65536) throw new Error('Mensaje demasiado grande para vista previa.')
    while (this.queue.length < size) await this.ready()
    const result = Buffer.from(this.queue.subarray(0,size))
    this.queue = this.queue.subarray(size)
    return result
  }

  async greeting() {
    const line = await this.line()
    if (!/^\* (OK|PREAUTH) /i.test(line)) throw new Error('Spacemail no respondió al saludo IMAP.')
  }

  async command(command: string): Promise<ImapRecord[]> {
    const tag = 'A' + String(++this.serial).padStart(4,'0')
    this.socket.write(tag + ' ' + command + '\r\n')
    const output: ImapRecord[] = []
    for (let count = 0; count < 1200; count++) {
      const line = await this.line()
      if (line.startsWith(tag + ' ')) {
        if (!line.startsWith(tag + ' OK')) throw new Error('Spacemail rechazó una operación IMAP.')
        return output
      }
      if (/^\* BYE\b/i.test(line)) throw new Error('Spacemail cerró la sesión.')
      const match = line.match(/\{(\d+)\}$/)
      output.push({line, literal: match ? await this.bytes(Number(match[1])) : undefined})
    }
    throw new Error('Demasiadas respuestas IMAP.')
  }

  async close() {
    try { await this.command('LOGOUT') } catch { /* best effort */ }
    this.socket.destroy()
  }
}

function imapQuoted(value: string) {
  if (/[\r\n\u0000]/.test(value)) throw new Error('Credencial no válida.')
  return '"' + value.replace(/\\/g,'\\\\').replace(/"/g,'\\"') + '"'
}

async function useInbox<T>(callback: (client: ImapConnection) => Promise<T>): Promise<T> {
  const user = process.env.SPACEMAIL_USER?.trim()
  const password = process.env.SPACEMAIL_PASSWORD
  if (!user || !password) throw new Error('Faltan las credenciales del buzón en Vercel.')
  if (user.toLowerCase() !== 'pedrog@nedviconstructora.com') throw new Error('La cuenta configurada no corresponde al buzón autorizado.')
  const socket = tls.connect({host:HOST, port:PORT, servername:HOST, rejectUnauthorized:true})
  socket.setTimeout(16000, () => socket.destroy(new Error('IMAP_TIMEOUT')))
  const client = new ImapConnection(socket)
  try {
    await Promise.race([
      once(socket,'secureConnect'),
      once(socket,'error').then(() => {throw new Error('No se pudo conectar a Spacemail.')})
    ])
    if (!socket.authorized) throw new Error('Certificado TLS no válido.')
    await client.greeting()
    await client.command('LOGIN ' + imapQuoted(user) + ' ' + imapQuoted(password))
    // EXAMINE opens the mailbox read-only. BODY.PEEK never sets the \Seen flag.
    await client.command('EXAMINE INBOX')
    return await callback(client)
  } finally {
    await client.close()
  }
}

function charsetDecode(bytes: Buffer, charset = 'utf-8'): string {
  try { return new TextDecoder(charset).decode(bytes) } catch { return bytes.toString('utf8') }
}

function qDecode(text: string): Buffer {
  const value = text.replace(/_/g,' ').replace(/=([0-9A-F]{2})/gi,(_m,h:string)=>String.fromCharCode(parseInt(h,16)))
  return Buffer.from(value,'latin1')
}

function words(text: string): string {
  return text.replace(/=\?([^?]+)\?([BQ])\?([^?]*)\?=/gi, (_m, charset:string,encoding:string, data:string) => {
    try {
      const bytes = encoding.toUpperCase() === 'B' ? Buffer.from(data, 'base64') : qDecode(data)
      return charsetDecode(bytes,charset)
    } catch { return '' }
  }).replace(/([^\S\r\n]+)(?==\?)/g,' ')
}

function headers(raw: string) {
  const result = new Map<string,string>()
  for (const line of raw.replace(/\r\n[ \t]+/g,' ').replace(/\n[ \t]+/g,' ').split(/\r?\n/)) {
    const sep = line.indexOf(':')
    if (sep > 0) result.set(line.slice(0,sep).trim().toLowerCase(),line.slice(sep+1).trim())
  }
  return result
}

function fromHeader(value: string): {name:string;email:string} {
  const match = value.match(/<([^<>@\s]+@[^<>\s]+)>/) || value.match(/([^\s<>]+@[^\s<>]+)/)
  const email = match?.[1] ?? ''
  const label = words(value.replace(/<[^>]*>/g,'').replace(/^["']|["']$/g,'').trim())
  return {name: label || email || 'Remitente desconocido',email}
}

function parsedList(records: ImapRecord[]): InboxMessage[] {
  const result: InboxMessage[] = []
  for (const record of records) {
    const uid = Number(record.line.match(/\bUID (\d+)/i)?.[1])
    if (!uid || !record.literal) continue
    const map = headers(record.literal.toString('latin1'))
    const sender = fromHeader(map.get('from') || '')
    const flags = record.line.match(/\bFLAGS \(([^)]*)\)/i)?.[1] || ''
    const size = Number(record.line.match(/\bRFC822\.SIZE (\d+)/i)?.[1] || '0')
    result.push({
      uid,
      from: sender.name.slice(0,180),
      email: sender.email.slice(0,200),
      subject: words(map.get('subject') || '(Sin asunto)').slice(0,250),
      date: map.get('date') || '',
      unread: !/\\Seen/i.test(flags),
      size
    })
  }
  return result
}

export async function inboxList(): Promise<InboxMessage[]> {
  return useInbox(async client => {
    const records = await client.command('UID SEARCH ALL')
    const ids = records.filter(r=>r.line.startsWith('* SEARCH ')).flatMap(r=>r.line.slice(9).trim().split(/\s+/).map(Number)).filter(n=>n>0&&Number.isSafeInteger(n))
    const last = ids.slice(-LIMIT)
    if (!last.length) return []
    const fetched = await client.command('UID FETCH ' + last.join(',') + ' (UID FLAGS RFC822.SIZE BODY.PEEK[HEADER.FIELDS (FROM SUBJECT DATE)])')
    const messages = parsedList(fetched)
    return messages.sort((a,b)=>b.uid-a.uid)
  })
}

function qpBytes(source: string) {
  const normalized = source.replace(/=\r?\n/g,'').replace(/=([a-f0-9]{2})/gi,(_m,h:string)=>String.fromCharCode(parseInt(h,16)))
  return Buffer.from(normalized,'latin1')
}

function mimeText(source: Buffer, depth=0): {plain:string;html:string;attachments:string[]} {
  if (depth > 8) return {plain:'',html:'',attachments:[]}
  const offset = source.indexOf(Buffer.from('\r\n\r\n'))
  const fallback = source.indexOf(Buffer.from('\n\n'))
  const end = offset >= 0 ? offset : fallback
  if (end < 0) return {plain:'',html:'',attachments:[]}
  const skip = offset >= 0 ? 4 : 2
  const map = headers(source.subarray(0,end).toString('latin1'))
  const contentType = map.get('content-type') || 'text/plain'
  const disposition = map.get('content-disposition') || ''
  const fn = disposition.match(/filename\*?=(?:"([^"]+)"|([^;\s]+))/i) || contentType.match(/name\*?=(?:"([^"]+)"|([^;\s]+))/i)
  const filename = fn ? words((fn[1] || fn[2] || '').slice(0,160)) : ''
  if (/attachment/i.test(disposition) || (filename && !/^text\/(plain|html)/i.test(contentType))) {
    return {plain:'',html:'',attachments:filename?[filename]:['Archivo adjunto']}
  }
  const body = source.subarray(end+skip)
  if (/multipart\//i.test(contentType)) {
    const boundary = contentType.match(/boundary\s*=\s*(?:"([^"]+)"|([^;\s]+))/i)?.[1] || contentType.match(/boundary\s*=\s*(?:"([^"]+)"|([^;\s]+))/i)?.[2]
    if (!boundary || boundary.length > 180) return {plain:'',html:'',attachments:[]}
    const sections = body.toString('latin1').split('--'+boundary).slice(1)
    const parts: {plain:string;html:string;attachments:string[]}[] = []
    for (const section of sections) {
      if (section.startsWith('--')) break
      const cleaned = section.replace(/^\r?\n/,'').replace(/\r?\n$/,'')
      parts.push(mimeText(Buffer.from(cleaned,'latin1'),depth+1))
    }
    return {plain:parts.map(p=>p.plain).filter(Boolean).join('\n\n'),html:parts.map(p=>p.html).filter(Boolean).join('\n\n'),attachments:parts.flatMap(p=>p.attachments)}
  }
  const transfer = map.get('content-transfer-encoding') || ''
  const data = /base64/i.test(transfer) ? Buffer.from(body.toString('latin1').replace(/\s/g,''),'base64')
    : /quoted-printable/i.test(transfer) ? qpBytes(body.toString('latin1')) : body
  const charset = contentType.match(/charset\s*=\s*(?:"([^"]+)"|([^;\s]+))/i)
  const content = charsetDecode(data,charset?.[1] || charset?.[2] || 'utf-8').slice(0,120000)
  if (/text\/plain/i.test(contentType)) return {plain:content,html:'',attachments:[]}
  if (/text\/html/i.test(contentType)) return {plain:'',html:content,attachments:[]}
  return {plain:'',html:'',attachments:[]}
}

function htmlPlain(html: string) {
  return html.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,'').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'')
    .replace(/<(br|\/p|\/div|\/li|\/tr)\b[^>]*>/gi,'\n').replace(/<[^>]+>/g,'')
    .replace(/&nbsp;/gi,' ').replace(/&lt;/gi,'<').replace(/&gt;/gi,'>').replace(/&amp;/gi,'&')
    .replace(/&#(\d+);/g,(_m,n:string)=>String.fromCodePoint(Math.min(Number(n),0x10ffff)))
    .replace(/\n{4,}/g,'\n\n').trim()
}

export async function inboxDetail(uid: number) {
  if (!Number.isSafeInteger(uid) || uid<1) throw new Error('Identificador de mensaje no válido.')
  return useInbox(async client => {
    const met = await client.command('UID FETCH ' + uid + ' (UID RFC822.SIZE)')
    const size = Number(met.find(r=>r.line.includes('RFC822.SIZE'))?.line.match(/RFC822\.SIZE (\d+)/)?.[1] || 0)
    if (!size) throw new Error('El mensaje no está disponible.')
    if (size > MAX_MESSAGE_BYTES) throw new Error('El mensaje excede el tamaño permitido de vista previa (2 MB).')
    const fetched = await client.command('UID FETCH ' + uid + ' (UID BODY.PEEK[])')
    const raw = fetched.find(r=>r.literal)?.literal
    if (!raw) throw new Error('El contenido del mensaje no está disponible.')
    const meta = headers(raw.subarray(0,raw.indexOf(Buffer.from('\r\n\r\n'))).toString('latin1'))
    const sender = fromHeader(meta.get('from') || '')
    const body = mimeText(raw)
    return {
      uid, from:sender.name,email:sender.email,
      subject:words(meta.get('subject') || '(Sin asunto)'),
      date:meta.get('date') || '',
      text:(body.plain || htmlPlain(body.html) || '(Sin texto legible)').slice(0,100000),
      attachments:body.attachments.slice(0,30),
    }
  })
}
