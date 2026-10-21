import { NextRequest, NextResponse } from 'next/server'
import { checkMailAccess } from '@/lib/mail/checkAccess'
import { inboxDetail } from '@/lib/mail/spacemailImap'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 30

export async function GET(request: NextRequest) {
  const access = await checkMailAccess()
  if (!access.allowed) return NextResponse.json({error:'No tienes acceso a este buzón.'},{status:access.status})
  const raw = request.nextUrl.searchParams.get('uid') || ''
  if (!/^[1-9]\d{0,12}$/.test(raw)) return NextResponse.json({error:'Identificador no válido.'},{status:400})
  try {
    const message = await inboxDetail(Number(raw))
    return NextResponse.json({message},{headers:{'Cache-Control':'no-store, private'}})
  } catch(error) {
    console.warn('NEDVI IMAP detail query failed:',error instanceof Error?error.name:'Unknown error')
    return NextResponse.json({error:'No se pudo abrir el mensaje. Puede haber sido eliminado o superar el tamaño permitido.'},{status:503,headers:{'Cache-Control':'no-store, private'}})
  }
}
