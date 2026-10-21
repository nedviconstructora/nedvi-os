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

export async function inboxDetail(uid:number) {
  return readBodyAndAttachments(uid)
}

/**
 * BODYSTRUCTURE is obtained without fetching MIME bodies (including videos).
 * IMAP RFC3501: each multipart child is addressable by part number.
 */
type BsValue = string | number | null | BsValue[]
type MimePart = {
  part: string
  type: string
  filename: string
  encoding: string
  encodedSize: number
  disposition: string
  category: 'image'|'video'|'pdf'|'document'|'other'
}
const MAX_ATTACHMENT_WIRE = 24 * 1024 * 1024
const MAX_ATTACHMENT_PREVIEW = 18 * 1024 * 1024

function bodyStructureTree(record: ImapRecord[]): BsValue {
  const line = record.map(x=>x.line).find(x=>/\bBODYSTRUCTURE\s*\(/i.test(x))
  if (!line) throw new Error('Spacemail no devolvió la estructura del mensaje.')
  const position=line.search(/\bBODYSTRUCTURE\s*\(/i)
  const input=line.slice(position).replace(/^BODYSTRUCTURE\s*/i,'')
  let index=0
  let nodes=0
  function parse(depth:number):BsValue {
    if (++nodes>20000 || depth>24) throw new Error('Estructura MIME no admitida.')
    while (/\s/.test(input[index]||''))index++
    const char=input[index]
    if (char==='(') {
      index++
      const result:BsValue[]=[]
      while(index<input.length) {
        while(/\s/.test(input[index]||''))index++
        if(input[index]===')'){index++;return result}
        result.push(parse(depth+1))
      }
      throw new Error('Estructura MIME incompleta.')
    }
    if(char==='"'){
      index++
      let out=''
      while(index<input.length){
        const v=input[index++]
        if(v==='"')return out
        if(v==='\\'){if(index<input.length)out+=input[index++]}
        else out+=v
      }
      throw new Error('Nombre MIME sin terminar.')
    }
    const start=index
    while(index<input.length && !/[\s()]/.test(input[index]))index++
    const value=input.slice(start,index)
    if(!value)throw new Error('Valor MIME inesperado.')
    if(value.toUpperCase()==='NIL')return null
    return /^\d+$/.test(value)?Number(value):value
  }
  return parse(0)
}

function pairs(value:BsValue):Record<string,string> {
  const entries=Array.isArray(value)?value:[]
  const result:Record<string,string>={}
  for(let i=0;i+1<entries.length;i+=2) {
    const name=entries[i]
    const val=entries[i+1]
    if(typeof name==='string' && (typeof val==='string'||typeof val==='number'))result[name.toLowerCase()]=String(val)
  }
  return result
}
function mimeName(value:string) {
  let decoded=value
  try { decoded=decodeURIComponent(value.replace(/^utf-8''/i,'')) } catch { /* preserve original */ }
  return words(decoded).replace(/[/\\\u0000-\u001f<>:"|?*]/g,'_').trim().slice(0,160)
}

function mimeCategory(type:string,filename:string):MimePart['category'] {
  const lower=filename.toLowerCase()
  if(/^(image\/(jpeg|png|gif|webp))$/.test(type)||/\.(jpe?g|png|gif|webp)$/.test(lower))return 'image'
  if(/^(video\/(mp4|webm|ogg|quicktime))$/.test(type)||/\.(mp4|webm|ogv|mov)$/.test(lower))return 'video'
  if(type==='application/pdf'||lower.endsWith('.pdf'))return 'pdf'
  if(/\.(docx?|xlsx?|pptx?|txt|csv|dwg|dxf|zip)$/.test(lower)||/^(text\/plain|application\/(zip|msword|vnd\.))/.test(type))return 'document'
  return 'other'
}

function getParts(tree:BsValue):MimePart[] {
  const all:MimePart[]=[]
  function visit(node:BsValue, section:string,depth:number){
    if(!Array.isArray(node)||depth>12||all.length>150)return
    if(Array.isArray(node[0])){
      let n=0
      for(const value of node) {
        if(!Array.isArray(value)||!Array.isArray(value[0]) && typeof value[0]!=='string')break
        visit(value,section?section+'.'+(++n):String(++n),depth+1)
      }
      return
    }
    const primary=String(node[0]||'').toLowerCase()
    const subtype=String(node[1]||'').toLowerCase()
    const type=primary+'/'+subtype
    const params=pairs(node[2]??null)
    const dispositionIndex=primary==='text'?9:primary==='message'&&subtype==='rfc822'?11:8
    const disposition=Array.isArray(node[dispositionIndex])?node[dispositionIndex] as BsValue[]:[]
    const dispParams=pairs(disposition[1]??null)
    const filename=mimeName(dispParams['filename*']||dispParams.filename||params['name*']||params.name||'')
    const name=filename||('adjunto-'+section)
    all.push({
      part:section||'1',type,filename:name,
      encoding:String(node[5]||'7BIT').toUpperCase(),
      encodedSize:typeof node[6]==='number'?node[6]:0,
      disposition:String(disposition[0]||'').toLowerCase(),
      category:mimeCategory(type,filename)
    })
  }
  visit(tree,'',0)
  return all
}
async function partsFor(client:ImapConnection,uid:number):Promise<MimePart[]> {
  const records=await client.command('UID FETCH '+uid+' (UID BODYSTRUCTURE)')
  return getParts(bodyStructureTree(records))
}
function isActualAttachment(part:MimePart){
  return part.disposition==='attachment'||Boolean(part.filename&&!/^adjunto-\d+(?:\.\d+)*$/.test(part.filename) && !(part.type==='text/plain'||part.type==='text/html'))||
    (part.disposition==='inline' && (part.category==='image'||part.category==='video'||part.category==='pdf'))
}
function safeAttachment(part:MimePart) {
  if(part.encodedSize<0||!Number.isSafeInteger(part.encodedSize))throw new Error('Tamaño de adjunto desconocido.')
  if(part.encodedSize>MAX_ATTACHMENT_WIRE)throw new Error('El adjunto supera el límite de visualización (aprox. 18 MB).')
  if(!['BASE64','QUOTED-PRINTABLE','7BIT','8BIT','BINARY'].includes(part.encoding))throw new Error('Codificación de archivo no compatible.')
}
async function fetchPart(client:ImapConnection,uid:number,part:MimePart,maxWire:number):Promise<Buffer> {
  if(part.encodedSize>maxWire)throw new Error('Archivo demasiado grande.')
  const pieces:Buffer[]=[]
  let offset=0
  // Limit IMAP literal transfers to 256 KiB each; no entire email is fetched.
  const chunk=256*1024
  while(offset<part.encodedSize) {
    const requested=Math.min(chunk,part.encodedSize-offset)
    const records=await client.command('UID FETCH '+uid+' (UID BODY.PEEK['+part.part+']<'+offset+'.'+requested+'>)')
    const response=records.find(x=>x.literal)
    if(!response?.literal || response.literal.length===0)break
    pieces.push(response.literal)
    offset+=response.literal.length
    if(response.literal.length<requested)break
  }
  const raw=Buffer.concat(pieces)
  if(!raw.length)throw new Error('Spacemail no devolvió el archivo.')
  return raw
}
function decodeTransfer(raw:Buffer,encoding:string):Buffer {
  if(encoding==='BASE64')return Buffer.from(raw.toString('latin1').replace(/\s/g,''),'base64')
  if(encoding==='QUOTED-PRINTABLE')return qpBytes(raw.toString('latin1'))
  return raw
}
function safeType(part:MimePart):string {
  const ext=part.filename.toLowerCase()
  if(part.category==='pdf')return 'application/pdf'
  if(part.category==='image') {
    if(/\.(jpe?g)$/.test(ext)||part.type==='image/jpeg')return 'image/jpeg'
    if(/\.png$/.test(ext)||part.type==='image/png')return 'image/png'
    if(/\.webp$/.test(ext)||part.type==='image/webp')return 'image/webp'
    return 'image/gif'
  }
  if(part.category==='video'){
    if(/\.mp4$/.test(ext)||part.type==='video/mp4')return 'video/mp4'
    if(/\.webm$/.test(ext)||part.type==='video/webm')return 'video/webm'
    if(/\.ogv$/.test(ext)||part.type==='video/ogg')return 'video/ogg'
    return 'video/quicktime'
  }
  return 'application/octet-stream'
}
export async function readAttachment(uid:number,partName:string) {
  if(!Number.isSafeInteger(uid)||uid<1||!/^[1-9]\d*(?:\.[1-9]\d*){0,10}$/.test(partName))throw new Error('Identificador de adjunto no válido.')
  return useInbox(async client=>{
    const part=(await partsFor(client,uid)).find(p=>p.part===partName && isActualAttachment(p))
    if(!part)throw new Error('El archivo no está disponible.')
    safeAttachment(part)
    const wire=await fetchPart(client,uid,part,MAX_ATTACHMENT_WIRE)
    const buffer=decodeTransfer(wire,part.encoding)
    if(buffer.length>MAX_ATTACHMENT_PREVIEW)throw new Error('El adjunto supera el límite permitido (18 MB).')
    return {data:buffer,type:safeType(part),name:part.filename,category:part.category}
  })
}

export async function readBodyAndAttachments(uid:number) {
  if(!Number.isSafeInteger(uid)||uid<1)throw new Error('Identificador de mensaje no válido.')
  return useInbox(async client=>{
    const records=await client.command('UID FETCH '+uid+' (UID RFC822.SIZE BODY.PEEK[HEADER])')
    const size=Number(records.find(x=>x.line.includes('RFC822.SIZE'))?.line.match(/RFC822\.SIZE (\d+)/)?.[1]||0)
    if(!size)throw new Error('El mensaje no está disponible.')
    const header=records.find(x=>x.literal)?.literal
    if(!header)throw new Error('No se pudo recuperar la cabecera.')
    const map=headers(header.toString('latin1'))
    const sender=fromHeader(map.get('from')||'')
    const parts=await partsFor(client,uid)
    const attachments=parts.filter(isActualAttachment).slice(0,40).map(part=>({
      part:part.part,name:part.filename,type:part.type,category:part.category,size:part.encodedSize,
      available:part.encodedSize>0&&part.encodedSize<=MAX_ATTACHMENT_WIRE
    }))
    let plain=''
    let html=''
    const texts=parts.filter(p=>!isActualAttachment(p)&&/^(text\/plain|text\/html)$/.test(p.type)).slice(0,12)
    for(const item of texts){
      if(item.encodedSize>512*1024)continue
      const raw=await fetchPart(client,uid,item,512*1024)
      const decoded=decodeTransfer(raw,item.encoding)
      const value=charsetDecode(decoded,'utf-8').slice(0,100000)
      if(item.type==='text/plain'&&!plain)plain=value
      if(item.type==='text/html'&&!html)html=value
      if(plain)break
    }
    return {
      uid,from:sender.name,email:sender.email,
      subject:words(map.get('subject')||'(Sin asunto)'),date:map.get('date')||'',
      text:(plain||htmlPlain(html)||'(No hay texto disponible en este correo)').slice(0,100000),
      attachments,previewLimited:size>MAX_MESSAGE_BYTES,size
    }
  })
}
