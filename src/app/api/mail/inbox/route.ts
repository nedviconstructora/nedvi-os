import { NextResponse } from 'next/server'
import { checkMailAccess } from '@/lib/mail/checkAccess'
import { inboxList } from '@/lib/mail/spacemailImap'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 30

export async function GET() {
  const access = await checkMailAccess()
  if (!access.allowed) return NextResponse.json({error:'No tienes acceso a este buzón.'},{status:access.status})
  try {
    const messages = await inboxList()
    return NextResponse.json({messages,connected:true,readOnly:true},{headers:{'Cache-Control':'no-store, private'}})
  } catch (error) {
    // Never log authentication credentials, message headers, or body content.
    console.warn('NEDVI IMAP inbox query failed:',error instanceof Error ? error.name : 'Unknown error')
    return NextResponse.json({error:'No fue posible consultar Spacemail. Comprueba las credenciales, el acceso IMAP y la conexión del servidor.',connected:false},{status:503,headers:{'Cache-Control':'no-store, private'}})
  }
}
