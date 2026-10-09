import {authorizedAps,apsToken,apsError,bucketKey} from '@/lib/aps/server'
export const dynamic='force-dynamic'
export async function POST(request:Request) {
 try {
  await authorizedAps()
  const body=await request.json() as {filename?:string,size?:number}
  if(!body.filename?.toLowerCase().endsWith('.dwg') || !Number.isFinite(body.size) || !body.size || body.size>20*1024*1024) return Response.json({error:'Solo archivos DWG de hasta 20 MB.'},{status:400})
  const token=(await apsToken('bucket:create bucket:read data:create data:write data:read viewables:read')).access_token
  const headers={Authorization:'Bearer '+token,'Content-Type':'application/json'}
  const bucket=await fetch('https://developer.api.autodesk.com/oss/v2/buckets',{method:'POST',headers,body:JSON.stringify({bucketKey,policyKey:'transient'})})
  if(!bucket.ok && bucket.status!==409) return Response.json({error:'No fue posible crear el almacenamiento APS.',status:bucket.status},{status:502})
  const objectKey=crypto.randomUUID()+'.dwg'
  const resp=await fetch('https://developer.api.autodesk.com/oss/v2/buckets/'+bucketKey+'/objects/'+objectKey+'/signeds3upload?parts=1&firstPart=1',{headers:{Authorization:'Bearer '+token}})
  if(!resp.ok) return Response.json({error:'Autodesk no generó una URL de carga.',status:resp.status},{status:502})
  const signed=await resp.json() as {urls?:string[],uploadKey?:string}
  if(!signed.urls?.[0] || !signed.uploadKey) return Response.json({error:'Respuesta de carga incompleta.'},{status:502})
  return Response.json({uploadUrl:signed.urls[0],uploadKey:signed.uploadKey,objectKey})
 }catch(error){return apsError(error)}
}