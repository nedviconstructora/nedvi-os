'use client'

import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Camera, Download, Ruler } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader } from '@/components/ui/Card'
import { distanceBetween, startMeasurement, supportsAR, type Point3 } from '@/services/medidor/webxr'
import { CameraFallback } from '@/features/medidor/CameraFallback'

type Measurement = { id: string; label: string; value: number; unit: 'm' | 'm²'; method: string }
const inputClass = 'mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 text-[var(--foreground)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500'
const format = (value: number) => value.toLocaleString('es-MX', { maximumFractionDigits: 2, minimumFractionDigits: 2 })

export function Medidor() {
  const [supported, setSupported] = useState<boolean | null>(null)
  const [busy, setBusy] = useState(false)
  const [active, setActive] = useState(false)
  const [targetReady, setTargetReady] = useState(false)
  const [hasStart, setHasStart] = useState(false)
  const [result, setResult] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [records, setRecords] = useState<Measurement[]>([])
  const [label, setLabel] = useState('')
  const [length, setLength] = useState('')
  const [width, setWidth] = useState('')
  const overlay = useRef<HTMLDivElement>(null)
  const target = useRef<{ point: Point3; at: number } | null>(null)
  const first = useRef<Point3 | null>(null)
  const stop = useRef<(() => Promise<void>) | null>(null)
  const mounted = useRef(true)
  const ready = useRef(false)

  useEffect(() => {
    mounted.current = true
    void supportsAR().then(value => { if (mounted.current) setSupported(value) }).catch(() => { if (mounted.current) setSupported(false) })
    return () => { mounted.current = false; void stop.current?.().catch(() => undefined) }
  }, [])

  function addRecord(value: number, unit: Measurement['unit'], method: string) {
    setRecords(current => [...current, { id: crypto.randomUUID(), label: label.trim() || `Medición ${current.length + 1}`, value, unit, method }])
  }

  async function start() {
    if (!overlay.current || busy) return
    setBusy(true); setError(''); setResult(null); first.current = null; setHasStart(false)
    try {
      const end = await startMeasurement(overlay.current, point => {
        target.current = point ? { point, at: performance.now() } : null
        if (ready.current !== Boolean(point)) {
          ready.current = Boolean(point)
          if (mounted.current) setTargetReady(Boolean(point))
        }
      }, () => {
        stop.current = null; first.current = null
        if (mounted.current) { setActive(false); setHasStart(false) }
      })
      if (!mounted.current) { await end(); return }
      stop.current = end; setActive(true)
    } catch (cause) {
      if (mounted.current) setError(cause instanceof DOMException && cause.name === 'NotAllowedError'
        ? 'Se canceló o denegó el permiso de cámara/AR. Permítelo en el navegador y vuelve a intentar.'
        : 'No se pudo iniciar la medición AR. Abre NEDVI OS en un navegador compatible, permite la cámara o usa captura manual.')
    } finally { if (mounted.current) setBusy(false) }
  }

  function markPoint() {
    const current = target.current
    if (!current || performance.now() - current.at > 250) return
    if (!first.current) { first.current = current.point; setHasStart(true); setResult(null); return }
    const distance = distanceBetween(first.current, current.point)
    if (!Number.isFinite(distance) || distance < 0.01) return
    addRecord(distance, 'm', 'Cámara AR · aproximada'); setResult(distance)
    first.current = null; setHasStart(false)
  }

  function manual(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const a = Number(length), b = Number(width)
    if (!Number.isFinite(a) || a <= 0 || (width !== '' && (!Number.isFinite(b) || b <= 0)) || !Number.isFinite(a * (width === '' ? 1 : b))) return
    addRecord(width === '' ? a : a * b, width === '' ? 'm' : 'm²', 'Captura manual')
    setLength(''); setWidth('')
  }

  function exportRecords() {
    const cell = (value: string) => `"${(/^[=+\-@\t\r]/.test(value) ? "'" : '') + value.replaceAll('"', '""')}"`
    const csv = '\uFEFF' + ['Nombre,Valor,Unidad,Método', ...records.map(record => [cell(record.label), record.value.toFixed(4), record.unit, cell(record.method)].join(','))].join('\r\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a'); link.href = url; link.download = 'NEDVI-Medidor.csv'; link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 text-[var(--foreground)]">
      <header><div className="flex items-center gap-3"><Ruler aria-hidden="true" /><h1 className="text-2xl font-semibold">Medidor</h1></div><p className="mt-2 text-sm text-[var(--muted)]">Mediciones de apoyo para levantamientos y obra.</p></header>
      <Card className="p-5 space-y-4">
        <h2 className="font-semibold">Medir con cámara</h2>
        <p className="text-sm">Apunta al primer extremo, marca el punto y mueve el teléfono hacia el segundo extremo. Mueve la cámara lentamente para detectar la superficie.</p>
        <p role="status" className="text-sm text-[var(--muted)]">{supported === null ? 'Comprobando compatibilidad…' : supported ? 'Dispositivo con soporte AR detectado. Al iniciar se comprobará la detección de superficies.' : 'La medición AR no está disponible en este dispositivo o navegador. Puedes utilizar la cámara normal con una referencia o registrar medidas manualmente.'}</p>
        <p className="text-sm text-[var(--muted)]">Las medidas por cámara son aproximadas: verifica con cinta o láser antes de cortar, comprar materiales o ejecutar obra.</p>
        <label className="block text-sm">Nombre de la medición (opcional)<input className={inputClass} maxLength={100} value={label} onChange={event => setLabel(event.target.value)} placeholder="Ej. Ancho de puerta" /></label>
        <Button disabled={!supported || busy || active} onClick={() => void start()}><Camera size={18} className="mr-2" />{busy ? 'Iniciando…' : 'Abrir medidor AR'}</Button>
        {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      </Card>
      <Card className="space-y-4 p-5">
        <CameraFallback onMeasure={value => addRecord(value, 'm', 'Foto con escala · aproximada')} />
      </Card>
      <Card>
        <CardHeader title="Captura manual y superficie" description="Introduce medidas tomadas con cinta o láser. El área corresponde a un rectángulo." />
        <form onSubmit={manual} className="grid gap-4 p-5 sm:grid-cols-2">
          <label className="text-sm">Largo / distancia (m)<input type="number" inputMode="decimal" min="0.001" step="any" required className={inputClass} value={length} onChange={event => setLength(event.target.value)} /></label>
          <label className="text-sm">Ancho (m, opcional para calcular m²)<input type="number" inputMode="decimal" min="0.001" step="any" className={inputClass} value={width} onChange={event => setWidth(event.target.value)} /></label>
          <Button type="submit">Agregar {width ? 'superficie' : 'distancia'}</Button>
        </form>
      </Card>
      <Card>
        <CardHeader title="Mediciones de esta sesión" description="Se conservan mientras permanezcas en este módulo. Exporta antes de salir; no se sincronizan con proyectos." />
        <div className="space-y-4 p-5">
          {records.length ? <ul className="divide-y divide-[var(--border)]">{records.map(record => <li key={record.id} className="flex flex-wrap items-center justify-between gap-3 py-3"><div className="min-w-0 break-words"><p>{record.label}</p><p className="text-xs text-[var(--muted)]">{record.method}</p></div><strong>{format(record.value)} {record.unit}</strong></li>)}</ul> : <p className="text-sm text-[var(--muted)]">Aún no hay mediciones. Usa la cámara o agrega una medida manual.</p>}
          <Button disabled={!records.length} onClick={exportRecords}><Download size={18} className="mr-2" />Exportar CSV</Button>
        </div>
      </Card>
      <div ref={overlay} style={{ display: active || busy ? 'block' : 'none' }}>
        {active && <div className="fixed inset-0 text-white" style={{ zIndex: 2147483647, background: 'transparent' }}>
          <div className="absolute inset-x-4 top-6 rounded-xl bg-black/80 p-4 text-center" role="status"><p>{hasStart ? 'Punto inicial marcado. Apunta al segundo extremo.' : 'Apunta al primer extremo.'}</p><p>{targetReady ? 'Superficie detectada' : 'Buscando superficie… mueve lentamente el teléfono'}</p>{result !== null && <strong className="text-2xl">{format(result)} m · aproximados</strong>}</div>
          <div aria-hidden="true" className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-4" style={{ width: 28, height: 28, borderColor: targetReady ? '#4ade80' : 'white' }} />
          <div className="absolute inset-x-4 bottom-8 flex flex-wrap justify-center gap-3 rounded-xl bg-black/80 p-4">
            <Button disabled={!targetReady} onClick={markPoint}>{hasStart ? 'Marcar segundo punto' : 'Marcar primer punto'}</Button>
            <Button onClick={() => { first.current = null; setHasStart(false); setResult(null) }}>Reiniciar puntos</Button>
            <Button onClick={() => void stop.current?.().catch(() => setError('No se pudo cerrar la cámara. Usa el botón de salida del navegador.'))}>Cerrar cámara</Button>
          </div>
        </div>}
      </div>
    </div>
  )
}
