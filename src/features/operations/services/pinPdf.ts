type Worker = {name:string;pin:string|null;needsReset:boolean}
const ascii=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^\x20-\x7e]/g,'?')
const esc=(s:string)=>ascii(s).replace(/[\\()]/g,'\\$&')
type Project = {name:string;folio:string|null;client_name:string|null;client_contact:string|null;address:string|null;manager:string|null;project_type:string|null}
type Context = {foreman:string;specialty:string;project:Project|null}
const val=(s:string|null|undefined)=>s?.trim()||'No registrado'
export async function createCrewPinPdfUrl(crewName:string,workers:Worker[],ctx:Context){
  let logoJpeg=''
  try {const response=await fetch('/icon.png');const bitmap=await createImageBitmap(await response.blob());const canvas=document.createElement('canvas');canvas.width=100;canvas.height=100;const c=canvas.getContext('2d');if(c){c.fillStyle='#fff';c.fillRect(0,0,100,100);c.drawImage(bitmap,0,0,100,100);const binary=atob(canvas.toDataURL('image/jpeg',0.85).split(',')[1]);logoJpeg=binary}bitmap.close()}catch{}

  const lines=['NEDVI CONSTRUCTORA  /  NEDVI OS','CONTROL DE CREDENCIALES DE PERSONAL','Documento confidencial - uso exclusivo de administracion','', 'PROYECTO: '+val(ctx.project?.name),'FOLIO: '+val(ctx.project?.folio),'CLIENTE: '+val(ctx.project?.client_name),'CONTACTO: '+val(ctx.project?.client_contact),'DIRECCION: '+val(ctx.project?.address),'RESPONSABLE DEL PROYECTO: '+val(ctx.project?.manager),'', 'CUADRILLA: '+crewName,'SUPERVISOR: '+val(ctx.foreman),'ESPECIALIDAD: '+val(ctx.specialty),'TRABAJADORES: '+workers.length,'FECHA DE EMISION: '+new Date().toLocaleDateString('es-MX'),'','No.   TRABAJADOR                                    PIN / ESTADO','-----------------------------------------------------------------------',...workers.map((w,i)=>String(i+1).padStart(3,'0')+'   '+w.name.padEnd(45,' ').slice(0,45)+'   '+(w.pin||'PENDIENTE'))]
  const pages:string[][]=[]
  for(let i=0;i<lines.length;i+=38)pages.push(lines.slice(i,i+38))
  const objects:string[]=['','']
  const pageIds:number[]=[]
  objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>')
  if(logoJpeg)objects.push('<< /Type /XObject /Subtype /Image /Width 100 /Height 100 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length '+logoJpeg.length+' >>\nstream\n'+logoJpeg+'\nendstream')
  for(let p=0;p<pages.length;p++){
    const pageId=objects.length+1
    const streamId=pageId+1
    pageIds.push(pageId)
    const cmds=[...(logoJpeg?['q 50 0 0 50 510 779 cm /Logo Do Q']:[]),'BT','/F1 10 Tf','48 792 Td','14 TL',...pages[p].map((line,i)=>'('+esc(line)+') Tj'+(i<pages[p].length-1?' T*':'')),'ET'].join('\n')
    objects.push('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 842] /Resources << /Font << /F1 3 0 R >>'+(logoJpeg?' /XObject << /Logo 4 0 R >>':'')+' >> /Contents '+streamId+' 0 R >>')
    objects.push('<< /Length '+cmds.length+' >>\nstream\n'+cmds+'\nendstream')
  }
  objects[0]='<< /Type /Catalog /Pages 2 0 R >>'
  objects[1]='<< /Type /Pages /Kids ['+pageIds.map(i=>i+' 0 R').join(' ')+'] /Count '+pageIds.length+' >>'
  let pdf='%PDF-1.4\n'
  const offsets=[0]
  for(let i=0;i<objects.length;i++){offsets.push(pdf.length);pdf+=(i+1)+' 0 obj\n'+objects[i]+'\nendobj\n'}
  const start=pdf.length
  pdf+='xref\n0 '+(objects.length+1)+'\n0000000000 65535 f \n'
  for(const offset of offsets.slice(1))pdf+=String(offset).padStart(10,'0')+' 00000 n \n'
  pdf+='trailer\n<< /Size '+(objects.length+1)+' /Root 1 0 R >>\nstartxref\n'+start+'\n%%EOF'
  const bytes=new Uint8Array(pdf.length);for(let i=0;i<pdf.length;i++)bytes[i]=pdf.charCodeAt(i)&255
  const blob=new Blob([bytes],{type:'application/pdf'})
  return URL.createObjectURL(blob)
}
