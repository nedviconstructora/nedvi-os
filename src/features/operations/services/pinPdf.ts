type Worker={name:string;pin:string|null;needsReset:boolean}
type Project={name:string;folio:string|null;client_name:string|null;client_contact:string|null;address:string|null;manager:string|null;project_type:string|null}
type Context={foreman:string;specialty:string;project:Project|null}
const normalize=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^\x20-\x7e]/g,'?')
const escapePdf=(s:string)=>normalize(s).replace(/[\\()]/g,'\\$&')
const value=(s:string|null|undefined)=>s?.trim()||'No registrado'
const enc=new TextEncoder()
const bytes=(s:string)=>enc.encode(s)
const concat=(parts:Uint8Array[])=>{const out=new Uint8Array(parts.reduce((n,p)=>n+p.length,0));let o=0;for(const p of parts){out.set(p,o);o+=p.length}return out}
export async function createCrewPinPdfUrl(crewName:string,workers:Worker[],ctx:Context):Promise<string>{
  let logo:Uint8Array|null=null
  try{
    const response=await fetch('/icon.png',{cache:'force-cache'})
    if(response.ok){
      const image=await createImageBitmap(await response.blob())
      const canvas=document.createElement('canvas');canvas.width=128;canvas.height=128
      const context=canvas.getContext('2d')
      if(context){
        context.fillStyle='#fff';context.fillRect(0,0,128,128)
        context.drawImage(image,0,0,128,128)
        const binary=atob(canvas.toDataURL('image/jpeg',.88).split(',')[1])
        logo=Uint8Array.from(binary,c=>c.charCodeAt(0))
      }
      image.close()
    }
  }catch{/* Keep the typographic brand if its image is unavailable. */}
  const objects:Uint8Array[]=[bytes(''),bytes(''),bytes('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'),bytes('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>')]
  let logoId=0
  if(logo){
    logoId=objects.length+1
    objects.push(concat([bytes('<< /Type /XObject /Subtype /Image /Width 128 /Height 128 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length '+logo.length+' >>\nstream\n'),logo,bytes('\nendstream')]))
  }
  const pageIds:number[]=[]
  const pageCount=Math.max(1,Math.ceil(workers.length/23))
  const issued=new Intl.DateTimeFormat('es-MX',{day:'2-digit',month:'2-digit',year:'numeric',timeZone:'America/Tijuana'}).format(new Date())
  for(let page=0;page<pageCount;page++){
    const commands:string[]=[]
    const color=(hex:string)=>{const x=hex.match(/\w\w/g)!.map(a=>(parseInt(a,16)/255).toFixed(3));commands.push(x.join(' ')+' rg')}
    const box=(x:number,y:number,w:number,h:number)=>commands.push(x+' '+y+' '+w+' '+h+' re f')
    const text=(x:number,y:number,s:string,size=10,bold=false,max=93)=>commands.push('BT /F'+(bold?'2':'1')+' '+size+' Tf '+x+' '+y+' Td ('+escapePdf(s).slice(0,max)+') Tj ET')
    color('102944');box(0,741,612,101)
    color('5EAFEC');box(0,737,612,4)
    if(logoId){color('FFFFFF');box(37,764,60,60);commands.push('q 50 0 0 50 42 769 cm /Logo Do Q')}
    color('FFFFFF');text(logoId?111:41,799,'NEDVI',22,true)
    text(logoId?112:42,783,'CONSTRUCTORA  /  NEDVI OS',9,true)
    text(375,800,'CREDENCIALES DEL PERSONAL',10,true)
    text(420,783,'USO CONFIDENCIAL',8,true)
    color('F0F5FA');box(34,535,544,187)
    color('142F50');text(46,701,'INFORMACION DEL PROYECTO',11,true)
    color('5F748B');text(46,677,'PROYECTO',8,true)
    color('142F50');text(46,660,value(ctx.project?.name),12,true,66)
    color('5F748B');text(46,640,'FOLIO',8,true);text(298,640,'CLIENTE',8,true)
    color('142F50');text(46,624,value(ctx.project?.folio),10,true,30);text(298,624,value(ctx.project?.client_name),10,true,45)
    color('5F748B');text(46,602,'CONTACTO',8,true);text(298,602,'RESPONSABLE DE PROYECTO',8,true)
    color('142F50');text(46,586,value(ctx.project?.client_contact),9,false,45);text(298,586,value(ctx.project?.manager),9,false,42)
    color('5F748B');text(46,566,'UBICACION',8,true)
    color('142F50');text(46,550,value(ctx.project?.address),9,false,91)
    color('E3EFF9');box(34,473,544,51)
    color('142F50');text(46,504,'CUADRILLA: '+value(crewName),11,true,65)
    text(46,486,'Supervisor: '+value(ctx.foreman)+'    |    Especialidad: '+value(ctx.specialty),9,false,100)
    color('5B728B');text(35,456,'TRABAJADORES: '+workers.length+'    |    EMISION: '+issued,9,true)
    color('142F50');box(34,420,544,25)
    color('FFFFFF');text(45,428,'NO.',9,true);text(88,428,'NOMBRE DEL TRABAJADOR',9,true);text(438,428,'PIN / ESTADO',9,true)
    const rows=workers.slice(page*23,(page+1)*23)
    rows.forEach((w,i)=>{
      const y=400-i*15
      if(i%2===0){color('F2F6FA');box(34,y-5,544,15)}
      color('263C56');text(45,y,String(page*23+i+1).padStart(3,'0'),9)
      text(88,y,w.name,9,false,54)
      color(w.pin?'183F68':'9A6117');text(438,y,w.pin||'PENDIENTE',9,Boolean(w.pin),21)
    })
    color('E1E8F0');box(34,45,544,1)
    color('5D7187');text(35,32,'Solo personal autorizado. Los PIN deben protegerse contra consultas no autorizadas.',7)
    text(506,32,'Pag. '+(page+1)+' / '+pageCount,8,true)
    const stream=bytes(commands.join('\n')+'\n')
    const pageId=objects.length+1,streamId=pageId+1;pageIds.push(pageId)
    objects.push(bytes('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 842] /Resources << /Font << /F1 3 0 R /F2 4 0 R >>'+(logoId?' /XObject << /Logo '+logoId+' 0 R >>':'')+' >> /Contents '+streamId+' 0 R >>'))
    objects.push(concat([bytes('<< /Length '+stream.length+' >>\nstream\n'),stream,bytes('endstream')]))
  }
  objects[0]=bytes('<< /Type /Catalog /Pages 2 0 R >>')
  objects[1]=bytes('<< /Type /Pages /Kids ['+pageIds.map(i=>i+' 0 R').join(' ')+'] /Count '+pageIds.length+' >>')
  const chunks:Uint8Array[]=[bytes('%PDF-1.4\n')];let total=chunks[0].length;const offsets=[0]
  objects.forEach((obj,i)=>{const start=bytes((i+1)+' 0 obj\n'),end=bytes('\nendobj\n');offsets.push(total);chunks.push(start,obj,end);total+=start.length+obj.length+end.length})
  chunks.push(bytes('xref\n0 '+(objects.length+1)+'\n0000000000 65535 f \n'+offsets.slice(1).map(o=>String(o).padStart(10,'0')+' 00000 n \n').join('')+'trailer\n<< /Size '+(objects.length+1)+' /Root 1 0 R >>\nstartxref\n'+total+'\n%%EOF'))
  return URL.createObjectURL(new Blob(chunks as BlobPart[],{type:'application/pdf'}))
}
