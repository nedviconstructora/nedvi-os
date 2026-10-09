'use client'

import { useEffect, useRef, useState } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { Download, RotateCcw, Save, Trash2, Undo2 } from 'lucide-react'

type Point = { x: number; y: number }
type Shape = { id: string; kind: 'line' | 'rectangle'; a: Point; b: Point }
type Tool = 'select' | 'line' | 'rectangle'
const STORAGE_KEY = 'nedvi-cad-studio-draft-v1'
const WIDTH = 1200
const HEIGHT = 750

function validShape(value: unknown): value is Shape {
  if (!value || typeof value !== 'object') return false
  const item = value as Partial<Shape>
  return typeof item.id === 'string' && (item.kind === 'line' || item.kind === 'rectangle') &&
    !!item.a && !!item.b && [item.a.x,item.a.y,item.b.x,item.b.y].every(v => typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 50000)
}


type DetectedCad = { name: string; format: 'DWG' | 'DXF'; details: string }

async function inspectCadFile(file: File): Promise<DetectedCad> {
  if (file.size > 40 * 1024 * 1024) throw new Error('El archivo supera el límite de inspección de 40 MB.')
  const header = new Uint8Array(await file.slice(0, 32).arrayBuffer())
  const ascii = Array.from(header).map(byte => String.fromCharCode(byte)).join('')
  const extension = file.name.split('.').pop()?.toLowerCase()
  if (ascii.startsWith('AC10') && /^AC10[0-9]{2}/.test(ascii.slice(0, 6))) {
    return { name: file.name, format: 'DWG', details: 'Archivo DWG identificado por su cabecera AutoCAD. Para visualizar o modificar su contenido falta conectar el servicio de conversión Autodesk APS.' }
  }
  if (ascii.startsWith('AutoCAD Binary DXF')) {
    return { name: file.name, format: 'DXF', details: 'DXF binario identificado. Esta versión todavía no interpreta DXF binarios.' }
  }
  const text = await file.slice(0, Math.min(file.size, 65536)).text()
  const normalized = text.replace(/\r\n?/g, '\n')
  if (/^\s*0\s*\nSECTION\s*\n\s*2\s*\n(?:HEADER|TABLES|BLOCKS|ENTITIES|OBJECTS)/i.test(normalized)) {
    return { name: file.name, format: 'DXF', details: 'DXF ASCII reconocido. La lectura y edición de sus entidades se añadirá en una siguiente fase.' }
  }
  if (extension === 'dwg' || extension === 'dxf') throw new Error('La extensión es CAD, pero el contenido no tiene una cabecera DWG o DXF reconocible.')
  throw new Error('Selecciona un archivo CAD válido con extensión .dwg o .dxf.')
}

export default function CadStudioPage() {
  const [shapes, setShapes] = useState<Shape[]>([])
  const [tool, setTool] = useState<Tool>('line')
  const [selected, setSelected] = useState<string | null>(null)
  const [start, setStart] = useState<Point | null>(null)
  const [cursor, setCursor] = useState<Point | null>(null)
  const [history, setHistory] = useState<Shape[][]>([])
  const [ready, setReady] = useState(false)
  const [message, setMessage] = useState('')
  const [cadFile, setCadFile] = useState<DetectedCad | null>(null)
  const [inspecting, setInspecting] = useState(false)
  const [checkingAps, setCheckingAps] = useState(false)
  const [apsStatus, setApsStatus] = useState('Conexión Autodesk sin comprobar.')
  const svgRef = useRef<SVGSVGElement | null>(null)

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed: unknown = JSON.parse(saved)
        if (Array.isArray(parsed)) setShapes(parsed.filter(validShape).slice(0, 2000))
      }
    } catch { /* Ignore invalid local drafts. */ }
    setReady(true)
  }, [])

  useEffect(() => {
    if (ready) localStorage.setItem(STORAGE_KEY, JSON.stringify(shapes))
  }, [ready, shapes])

  function commit(next: Shape[]) {
    setHistory(previous => [...previous.slice(-29), shapes])
    setShapes(next)
    setMessage('Borrador actualizado en este dispositivo.')
  }

  function point(event: React.PointerEvent<SVGSVGElement>): Point {
    const svg = svgRef.current
    if (!svg) return { x: 0, y: 0 }
    const p = svg.createSVGPoint()
    p.x = event.clientX
    p.y = event.clientY
    const transformed = svg.getScreenCTM()?.inverse()
    if (!transformed) return { x: 0, y: 0 }
    const target = p.matrixTransform(transformed)
    return { x: Math.max(0, Math.min(WIDTH, Math.round(target.x / 10) * 10)), y: Math.max(0, Math.min(HEIGHT, Math.round(target.y / 10) * 10)) }
  }

  function pointerDown(event: React.PointerEvent<SVGSVGElement>) {
    if (tool === 'select') { setSelected(null); return }
    const p = point(event)
    setStart(p)
    setCursor(p)
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function pointerUp(event: React.PointerEvent<SVGSVGElement>) {
    if (!start || tool === 'select') return
    const end = point(event)
    if (end.x !== start.x || end.y !== start.y) {
      commit([...shapes, { id: crypto.randomUUID(), kind: tool, a: start, b: end }])
    }
    setStart(null)
    setCursor(null)
  }

  function svgMarkup() {
    const shapeTags = shapes.map(shape => shape.kind === 'line'
      ? `<line x1="${shape.a.x}" y1="${shape.a.y}" x2="${shape.b.x}" y2="${shape.b.y}" stroke="#2563eb" stroke-width="2"/>`
      : `<rect x="${Math.min(shape.a.x,shape.b.x)}" y="${Math.min(shape.a.y,shape.b.y)}" width="${Math.abs(shape.a.x-shape.b.x)}" height="${Math.abs(shape.a.y-shape.b.y)}" fill="none" stroke="#2563eb" stroke-width="2"/>`).join('')
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}"><rect width="100%" height="100%" fill="white"/>${shapeTags}</svg>`
  }

  function download(filename: string, text: string, mime: string) {
    const url = URL.createObjectURL(new Blob([text], { type: mime }))
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = filename
    anchor.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  const button = 'rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--surface-soft)]'
  return <AppShell>
    <div className="mx-auto max-w-[1500px] space-y-5 p-2 sm:p-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-[#5496CC]">Gestión de Proyectos</p>
        <h1 className="mt-2 text-3xl font-bold text-[var(--foreground)]">NEDVI CAD Studio</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">Editor de bocetos técnicos 2D · Primera versión. No es un editor DWG/DXF ni sustituye planos CAD certificados.</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {(['select','line','rectangle'] as Tool[]).map(item => <button key={item} onClick={() => {setTool(item);setStart(null)}} className={button + (tool === item ? ' !bg-[#7BAEE3] !text-slate-950' : '')}>{item === 'select' ? 'Seleccionar' : item === 'line' ? 'Línea' : 'Rectángulo'}</button>)}
        <button className={button} disabled={!selected} onClick={() => {commit(shapes.filter(s => s.id !== selected));setSelected(null)}}><Trash2 size={14} className="mr-1 inline"/>Borrar selección</button>
        <button className={button} disabled={!history.length} onClick={() => {const last=history[history.length-1];setHistory(h=>h.slice(0,-1));setShapes(last)}}><Undo2 size={14} className="mr-1 inline"/>Deshacer</button>
        <button className={button} onClick={() => {setMessage('Borrador guardado únicamente en este navegador de Windows.');localStorage.setItem(STORAGE_KEY,JSON.stringify(shapes))}}><Save size={14} className="mr-1 inline"/>Guardar borrador</button>
        <button className={button} onClick={() => download('nedvi-plano.svg', svgMarkup(), 'image/svg+xml')}><Download size={14} className="mr-1 inline"/>Exportar SVG</button>
        <button className={button} onClick={() => download('nedvi-plano.json', JSON.stringify({format:'nedvi-cad-v1',shapes},null,2), 'application/json')}>Exportar proyecto</button>
        <button className={button} disabled={checkingAps} onClick={async () => {
          setCheckingAps(true)
          try {
            const response = await fetch('/api/cad/aps-status', { cache: 'no-store' })
            const data = await response.json() as { connected?: boolean; error?: string }
            setApsStatus(data.connected ? 'Autodesk APS conectado y autenticado correctamente.' : (data.error ?? 'No se pudo conectar con Autodesk.'))
          } catch { setApsStatus('No se pudo consultar la conexión con Autodesk.') }
          finally { setCheckingAps(false) }
        }}>{checkingAps ? 'Comprobando APS...' : 'Probar conexión Autodesk'}</button>
        <label className={button + ' cursor-pointer'}>{inspecting ? 'Analizando archivo...' : 'Detectar DWG / DXF'}
          <input type="file" accept=".dwg,.dxf" disabled={inspecting} className="hidden" onChange={async event => {
            const file = event.target.files?.[0]
            event.target.value = ''
            if (!file) return
            setInspecting(true)
            setCadFile(null)
            try {
              const detected = await inspectCadFile(file)
              setCadFile(detected)
              setMessage(detected.details)
            } catch (error) {
              setMessage(error instanceof Error ? error.message : 'Archivo CAD no reconocido.')
            } finally {
              setInspecting(false)
            }
          }}/>
        </label>
        <label className={button + ' cursor-pointer'}>Importar proyecto JSON<input type="file" accept=".json,application/json" className="hidden" onChange={async e => {const file=e.target.files?.[0];e.target.value='';if(!file)return;try{if(file.size>2000000)throw Error('Archivo demasiado grande');const data=JSON.parse(await file.text()) as {format?:string;shapes?:unknown};if(data.format!=='nedvi-cad-v1'||!Array.isArray(data.shapes)||data.shapes.length>2000||!data.shapes.every(validShape))throw Error('Formato inválido');commit(data.shapes);setMessage('Proyecto importado correctamente.')}catch{setMessage('No se pudo importar: utiliza un proyecto JSON válido de NEDVI CAD.') }}}/></label>
        <button className={button} onClick={() => {if(window.confirm('¿Vaciar el boceto actual?')){commit([]);setSelected(null)}}}><RotateCcw size={14} className="mr-1 inline"/>Limpiar</button>
      </div>
      <p role="status" className="text-sm text-[var(--muted)]">{apsStatus}</p>
      {cadFile ? <div className="rounded-xl border border-[#5496CC]/30 bg-[#5496CC]/10 p-4 text-sm text-[var(--foreground)]">
        <p className="font-semibold">Archivo detectado: {cadFile.format} · {cadFile.name}</p>
        <p className="mt-1 text-xs text-[var(--muted)]">{cadFile.details}</p>
        <p className="mt-2 text-xs text-[var(--muted)]">El archivo no se convierte ni modifica. El boceto actual permanece intacto.</p>
      </div> : null}
      <div className="overflow-auto rounded-2xl border border-[var(--border)] bg-white p-2 shadow-sm">
        <svg ref={svgRef} viewBox="0 0 1200 750" className="min-w-[650px] w-full touch-none select-none" style={{backgroundImage:'linear-gradient(#e8eef5 1px, transparent 1px), linear-gradient(90deg,#e8eef5 1px, transparent 1px)',backgroundSize:'25px 25px'}} onPointerDown={pointerDown} onPointerMove={e => {if(start)setCursor(point(e))}} onPointerUp={pointerUp} onPointerCancel={()=>{setStart(null);setCursor(null)}} aria-label="Lienzo de dibujo CAD">
          {shapes.map(shape => shape.kind==='line'
            ? <line key={shape.id} x1={shape.a.x} y1={shape.a.y} x2={shape.b.x} y2={shape.b.y} stroke={selected===shape.id?'#f59e0b':'#2563eb'} strokeWidth={selected===shape.id?5:3} onPointerDown={e=>{if(tool==='select'){e.stopPropagation();setSelected(shape.id)}}}/>
            : <rect key={shape.id} x={Math.min(shape.a.x,shape.b.x)} y={Math.min(shape.a.y,shape.b.y)} width={Math.abs(shape.a.x-shape.b.x)} height={Math.abs(shape.a.y-shape.b.y)} fill="transparent" stroke={selected===shape.id?'#f59e0b':'#2563eb'} strokeWidth={selected===shape.id?5:3} onPointerDown={e=>{if(tool==='select'){e.stopPropagation();setSelected(shape.id)}}}/>)}
          {start && cursor && (tool==='line'?<line x1={start.x} y1={start.y} x2={cursor.x} y2={cursor.y} stroke="#f59e0b" strokeWidth="2" strokeDasharray="7 5"/>:<rect x={Math.min(start.x,cursor.x)} y={Math.min(start.y,cursor.y)} width={Math.abs(cursor.x-start.x)} height={Math.abs(cursor.y-start.y)} fill="none" stroke="#f59e0b" strokeWidth="2" strokeDasharray="7 5"/>)}
        </svg>
      </div>
      <div className="flex flex-wrap justify-between gap-3 text-xs text-[var(--muted)]">
        <span>{shapes.length} elementos · Cuadrícula con ajuste de 10 unidades · Dibuja arrastrando el cursor</span>
        <span role="status">{message || 'Los bocetos se conservan localmente en este navegador, no en Supabase.'}</span>
      </div>
    </div>
  </AppShell>
}
