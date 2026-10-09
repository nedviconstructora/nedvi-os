import {authorizedAps,apsToken,apsError,bucketKey} from '@/lib/aps/server'
export const dynamic='force-dynamic'
export async function POST(request:Request) {
 try {
  await authorizedAps()
  const {objectKey,uploadKey}=await request.json() as {objectKey?:string,uploadKey?:string}
  if(!objectKey || !/^[a-f0-9-]{36}\.dwg$/.test(objectKey) || !uploadKey || uploadKey.length>2000) return Response.json({error:'Carga inválida.'},{status:400})
  const token=(await apsToken('bucket:read data:create data:write data:read viewables:read')).access_token
  const auth={Authorization:'Bearer '+token,'Content-Type':'application/json'}
  const done=await fetch('https://developer.api.autodesk.com/oss/v2/buckets/'+bucketKey+'/objects/'+objectKey+'/signeds3upload',{method:'POST',headers:auth,body:JSON.stringify({uploadKey})})
  if(!done.ok) return Response.json({error:'Autodesk no pudo finalizar la carga.',status:done.status},{status:502})
  const object=await done.json() as {objectId?:string}
  if(!object.objectId) return Response.json({error:'Autodesk no devolvió el ID del plano.'},{status:502})
  const urn=Buffer.from(object.objectId).toString('base64').replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_')
  const job=await fetch('https://developer.api.autodesk.com/modelderivative/v2/designdata/job',{method:'POST',headers:auth,body:JSON.stringify({input:{urn},output:{formats:[{type:'svf2',views:['2d','3d']}]}})})
  if(!job.ok) return Response.json({error:'El archivo se subió pero la conversión no comenzó.',status:job.status},{status:502})
  return Response.json({urn,status:'processing'})
 }catch(error){return apsError(error)}
}