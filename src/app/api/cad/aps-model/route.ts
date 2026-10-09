import {authorizedAps,apsToken,apsError} from '@/lib/aps/server'
export const dynamic='force-dynamic'
export async function GET(request:Request) {
 try {
  await authorizedAps()
  const url=new URL(request.url)
  const urn=url.searchParams.get('urn')
  const token=await apsToken('viewables:read')
  if(url.searchParams.get('mode')==='token') return Response.json({access_token:token.access_token,expires_in:token.expires_in},{headers:{'Cache-Control':'no-store'}})
  if(!urn || !/^[A-Za-z0-9_-]{20,500}$/.test(urn)) return Response.json({error:'Identificador CAD inválido.'},{status:400})
  const result=await fetch('https://developer.api.autodesk.com/modelderivative/v2/designdata/'+encodeURIComponent(urn)+'/manifest',{headers:{Authorization:'Bearer '+token.access_token},cache:'no-store'})
  if(result.status===404) return Response.json({status:'pending'})
  if(!result.ok) return Response.json({error:'No se puede consultar la conversión.',status:result.status},{status:502})
  const manifest=await result.json() as {status?:string,progress?:string,region?:string}
  return Response.json({status:manifest.status,progress:manifest.progress},{headers:{'Cache-Control':'no-store'}})
 }catch(error){return apsError(error)}
}