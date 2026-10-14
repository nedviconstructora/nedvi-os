'use client'

// Dependency-free XLSX writer (ZIP store format), with all cells serialized as plain text.
type Worksheet = { name: string; rows: string[][] }
const encoder = new TextEncoder()
const xmlSafe = (input: string) => input.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g,'')
function columnName(index:number) {
  let name = ''
  for (let n=index+1; n>0; n=Math.floor((n-1)/26)) name=String.fromCharCode(65+(n-1)%26)+name
  return name
}
function sheetXml(rows:string[][]) {
  const body=rows.map((cells,index)=>'<row r="'+(index+1)+'">'+cells.map((cell,col)=>'<c r="'+columnName(col)+(index+1)+'" t="inlineStr"><is><t xml:space="preserve">'+xmlSafe(cell)+'</t></is></c>').join('')+'</row>').join('')
  return '<?xml version="1.0" encoding="UTF-8"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>'+body+'</sheetData></worksheet>'
}
const crcTable = Array.from({length:256},(_,n)=>{
  let v=n
  for (let i=0;i<8;i++) v=v&1?0xEDB88320^(v>>>1):v>>>1
  return v>>>0
})
function crc32(bytes:Uint8Array) {
  let crc=0xffffffff
  for (const value of bytes) crc=crcTable[(crc^value)&255]^(crc>>>8)
  return (crc^0xffffffff)>>>0
}
function zip(files:Array<[string,string]>):Uint8Array {
  const locals:Uint8Array[]=[]
  const centrals:Uint8Array[]=[]
  let offset=0
  for (const [path,xml] of files) {
    const name=encoder.encode(path),data=encoder.encode(xml),crc=crc32(data)
    const local=new Uint8Array(30+name.length+data.length), lv=new DataView(local.buffer)
    lv.setUint32(0,0x04034b50,true);lv.setUint16(4,20,true);lv.setUint32(14,crc,true)
    lv.setUint32(18,data.length,true);lv.setUint32(22,data.length,true);lv.setUint16(26,name.length,true)
    local.set(name,30);local.set(data,30+name.length)
    const central=new Uint8Array(46+name.length),cv=new DataView(central.buffer)
    cv.setUint32(0,0x02014b50,true);cv.setUint16(4,20,true);cv.setUint16(6,20,true)
    cv.setUint32(16,crc,true);cv.setUint32(20,data.length,true);cv.setUint32(24,data.length,true)
    cv.setUint16(28,name.length,true);cv.setUint32(42,offset,true);central.set(name,46)
    locals.push(local);centrals.push(central);offset+=local.length
  }
  const centralSize=centrals.reduce((n,x)=>n+x.length,0)
  const out=new Uint8Array(offset+centralSize+22)
  let pos=0
  for (const part of [...locals,...centrals]) {out.set(part,pos);pos+=part.length}
  const end=new DataView(out.buffer)
  end.setUint32(pos,0x06054b50,true)
  end.setUint16(pos+8,files.length,true);end.setUint16(pos+10,files.length,true)
  end.setUint32(pos+12,centralSize,true);end.setUint32(pos+16,offset,true)
  return out
}
export function downloadClockWorkbook(worksheets:Worksheet[],fileName:string) {
  const files:Array<[string,string]> = [
    ['[Content_Types].xml','<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'+worksheets.map((_,i)=>'<Override PartName="/xl/worksheets/sheet'+(i+1)+'.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>').join('')+'</Types>'],
    ['_rels/.rels','<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'],
    ['xl/workbook.xml','<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>'+worksheets.map((sheet,i)=>'<sheet name="'+xmlSafe(sheet.name)+'" sheetId="'+(i+1)+'" r:id="rId'+(i+1)+'"/>').join('')+'</sheets></workbook>'],
    ['xl/_rels/workbook.xml.rels','<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'+worksheets.map((_,i)=>'<Relationship Id="rId'+(i+1)+'" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet'+(i+1)+'.xml"/>').join('')+'</Relationships>'],
    ...worksheets.map((sheet,i)=>['xl/worksheets/sheet'+(i+1)+'.xml',sheetXml(sheet.rows)] as [string,string]),
  ]
  const data=zip(files)
  const file=new Blob([new Uint8Array(data)],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'})
  const url=URL.createObjectURL(file)
  const link=document.createElement('a')
  link.href=url;link.download=fileName.endsWith('.xlsx')?fileName:fileName+'.xlsx'
  document.body.appendChild(link);link.click();link.remove()
  setTimeout(()=>URL.revokeObjectURL(url),10000)
}
