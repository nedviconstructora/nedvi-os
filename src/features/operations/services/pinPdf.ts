type Worker = {name:string;pin:string|null;needsReset:boolean}
const ascii=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^\x20-\x7e]/g,'?')
const esc=(s:string)=>ascii(s).replace(/[\\()]/g,'\\$&')
export function viewCrewPinPdf(crewName:string,workers:Worker[]){
  const lines=['NEDVI OS - LISTA DE PIN DE TRABAJADORES','Documento confidencial - entregar PIN individualmente','Cuadrilla: '+crewName,'',...workers.map((w,i)=>String(i+1).padStart(3,'0')+'   '+w.name+'    PIN: '+(w.pin||'PENDIENTE DE RESTABLECER'))]
  const pages:string[][]=[]
  for(let i=0;i<lines.length;i+=43)pages.push(lines.slice(i,i+43))
  const objects:string[]=['','']
  const pageIds:number[]=[]
  objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>')
  for(let p=0;p<pages.length;p++){
    const pageId=objects.length+1
    const streamId=pageId+1
    pageIds.push(pageId)
    const cmds=['BT','/F1 10 Tf','48 792 Td','14 TL',...pages[p].map((line,i)=>'('+esc(line)+') Tj'+(i<pages[p].length-1?' T*':'')),'ET'].join('\n')
    objects.push('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 842] /Resources << /Font << /F1 3 0 R >> >> /Contents '+streamId+' 0 R >>')
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
  const blob=new Blob([pdf],{type:'application/pdf'})
  const url=URL.createObjectURL(blob)
  const tab=window.open(url,'_blank','noopener,noreferrer');if(!tab){window.location.href=url}setTimeout(()=>URL.revokeObjectURL(url),300000)
}
