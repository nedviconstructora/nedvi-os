import { NextRequest, NextResponse } from 'next/server'
import { checkMailAccess } from '@/lib/mail/checkAccess'
import { readAttachment } from '@/lib/mail/spacemailImap'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const privateHeaders = {
  'Cache-Control': 'private, no-store, max-age=0',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'SAMEORIGIN',
}

export async function GET(request:NextRequest) {
  const access=await checkMailAccess()
  if(!access.allowed) return NextResponse.json({error:'No tienes acceso al buzón.'},{status:access.status,headers:privateHeaders})
  const uidRaw=request.nextUrl.searchParams.get('uid')||''
  const part=request.nextUrl.searchParams.get('part')||''
  if(!/^[1-9]\d{0,12}$/.test(uidRaw)||!/^[1-9]\d*(?:\.[1-9]\d*){0,10}$/.test(part)) {
    return NextResponse.json({error:'Identificador de archivo no válido.'},{status:400,headers:privateHeaders})
  }
  try {
    const attachment=await readAttachment(Number(uidRaw),part)
    const bytes=attachment.data
    const inline=(attachment.category==='image'||attachment.category==='video'||attachment.category==='pdf') && request.nextUrl.searchParams.get('download')!=='1'
    // Never serve HTML, scripts, SVG, or arbitrary binary data as a browsable page.
    const mime=inline?attachment.type:'application/octet-stream'
    const safeName=attachment.name.replace(/[\r\n"\\]/g,'_').slice(0,160)
    const headers:Record<string,string>={
      ...privateHeaders,
      'Content-Type':mime,
      'Content-Disposition':(inline?'inline':'attachment')+'; filename="'+safeName+'"; filename*=UTF-8\'\''+encodeURIComponent(attachment.name),
      'Accept-Ranges':'bytes',
    }
    let start=0
    let end=bytes.length-1
    let partial=false
    const requested=request.headers.get('range')
    if(requested) {
      const match=/^bytes=(\d*)-(\d*)$/.exec(requested)
      if(!match || (!match[1]&&!match[2])) {
        return new Response(null,{status:416,headers:{...privateHeaders,'Content-Range':'bytes */'+bytes.length}})
      }
      if(match[1]) {
        start=Number(match[1])
        end=match[2]?Math.min(Number(match[2]),bytes.length-1):bytes.length-1
      } else {
        const suffix=Number(match[2])
        start=Math.max(0,bytes.length-suffix)
        end=bytes.length-1
      }
      if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start>=bytes.length||start>end) {
        return new Response(null,{status:416,headers:{...privateHeaders,'Content-Range':'bytes */'+bytes.length}})
      }
      partial=true
      headers['Content-Range']='bytes '+start+'-'+end+'/'+bytes.length
    }
    const length=end-start+1
    headers['Content-Length']=String(length)
    // Streaming responses avoid Vercel's ordinary 4.5 MB response body limit.
    let cursor=start
    const stream=new ReadableStream<Uint8Array>({
      pull(controller) {
        if(cursor>end) { controller.close(); return }
        const next=Math.min(cursor+64*1024,end+1)
        controller.enqueue(Uint8Array.from(bytes.subarray(cursor,next)))
        cursor=next
      },
      cancel() { cursor=bytes.length }
    })
    return new Response(stream,{status:partial?206:200,headers})
  } catch(error) {
    const code=error instanceof Error&&/límite|grande|tamaño|18 MB|compatible/i.test(error.message)?413:404
    // Do not leak IMAP protocol state, message content or credentials.
    return NextResponse.json({error:code===413?'Este archivo es demasiado grande para la vista integrada; ábrelo desde Spacemail.':'No fue posible recuperar este adjunto de Spacemail.'},{status:code,headers:privateHeaders})
  }
}
