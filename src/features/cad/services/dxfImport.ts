export type CadSegment = {a:{x:number;y:number};b:{x:number;y:number}}
export function parseDxfLines(text:string): {segments:CadSegment[]; ignored:number} {
 const tokens=text.replace(/\r\n?/g,'\n').split('\n')
 if(tokens.length>800000) throw Error('DXF demasiado grande.')
 let section='', inside=false, ignored=0
 const raw:CadSegment[]=[]
 const read=(pairs:Array<[number,string]>,code:number)=>pairs.find(p=>p[0]===code)?.[1]
 for(let i=0;i+1<tokens.length;){
  const code=Number(tokens[i++].trim()),value=tokens[i++].trim()
  if(code!==0)continue
  if(value==='SECTION'){if(i+1<tokens.length && tokens[i]?.trim()==='2'){section=tokens[i+1].trim();i+=2}continue}
  if(value==='ENDSEC'){section='';inside=false;continue}
  if(section!=='ENTITIES')continue
  if(value==='EOF')break
  const pairs:Array<[number,string]>=[]
  while(i+1<tokens.length && tokens[i].trim()!=='0'){pairs.push([Number(tokens[i].trim()),tokens[i+1].trim()]);i+=2}
  const num=(code:number)=>Number(read(pairs,code))
  const valid=(...numbers:number[])=>numbers.every(Number.isFinite)
  if(value==='LINE'){
    const x1=num(10),y1=num(20),x2=num(11),y2=num(21)
    if(valid(x1,y1,x2,y2))raw.push({a:{x:x1,y:y1},b:{x:x2,y:y2}})
    else ignored++
  } else if(value==='LWPOLYLINE'){
    const vertices:{x:number;y:number}[]=[];let current: {x:number;y:number}|null=null
    for(const [c,v] of pairs){if(c===10){if(current)vertices.push(current);current={x:Number(v),y:NaN}}else if(c===20 && current)current.y=Number(v)}
    if(current)vertices.push(current)
    for(let j=1;j<vertices.length;j++) if(valid(vertices[j-1].x,vertices[j-1].y,vertices[j].x,vertices[j].y))raw.push({a:vertices[j-1],b:vertices[j]})
    const closed=(Number(read(pairs,70)??0)&1)!==0
    if(closed&&vertices.length>2)raw.push({a:vertices[vertices.length-1],b:vertices[0]})
    if(pairs.some(([c,v])=>c===42&&Number(v)!==0))ignored++
  } else if(value!=='ENDSEC') ignored++
  if(raw.length>2000)throw Error('Este editor admite hasta 2000 segmentos. Simplifica el DXF antes de importarlo.')
 }
 if(!raw.length)throw Error('No se encontraron líneas LINE o LWPOLYLINE compatibles.')
 const xs=raw.flatMap(s=>[s.a.x,s.b.x]),ys=raw.flatMap(s=>[s.a.y,s.b.y])
 const minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys)
 const scale=Math.min(1100/Math.max(1,maxX-minX),650/Math.max(1,maxY-minY))
 return {segments:raw.map(s=>({a:{x:50+(s.a.x-minX)*scale,y:700-(s.a.y-minY)*scale},b:{x:50+(s.b.x-minX)*scale,y:700-(s.b.y-minY)*scale}})),ignored}
}
