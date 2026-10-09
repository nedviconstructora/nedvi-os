import { createClient } from '@/utils/supabase/server'

export async function authorizedAps() {
 const supabase = await createClient()
 const { data: { user } } = await supabase.auth.getUser()
 if (!user) throw new Error('SESSION')
 const { data: profile } = await supabase.from('profiles').select('role,active,deleted_at').eq('id',user.id).single()
 if (!profile || !profile.active || profile.deleted_at || !['administracion','obra'].includes(profile.role)) throw new Error('FORBIDDEN')
 return user
}
export async function apsToken(scope: string) {
 const id=process.env.APS_CLIENT_ID, secret=process.env.APS_CLIENT_SECRET
 if(!id || !secret) throw new Error('APS_CONFIG')
 const response=await fetch('https://developer.api.autodesk.com/authentication/v2/token',{
  method:'POST',headers:{Authorization:'Basic '+Buffer.from(id+':'+secret).toString('base64'),'Content-Type':'application/x-www-form-urlencoded'},
  body:new URLSearchParams({grant_type:'client_credentials',scope}),cache:'no-store'
 })
 if(!response.ok) throw new Error('APS_AUTH_'+response.status)
 return await response.json() as {access_token:string,expires_in:number}
}
export function apsError(error:unknown) {
 const message=error instanceof Error?error.message:'UNKNOWN'
 const code=message==='SESSION'?401:message==='FORBIDDEN'?403:message==='APS_CONFIG'?503:502
 return Response.json({error:code===401?'Inicia sesión.':code===403?'No autorizado.':code===503?'Faltan las credenciales APS.':'No se completó la operación Autodesk ('+message+').'},{status:code})
}
export const bucketKey='nedvi-cad-studio-2026'
