'use client'

import { useEffect, useRef, useState, type ChangeEvent, type MouseEvent } from 'react'
import { Camera, Check, ImagePlus, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/Button'

type Mark = { x: number; y: number }
type Props = { onMeasure: (distanceMetres: number) => void }
const steps = [
  'Marca el primer extremo de la referencia.',
  'Marca el segundo extremo de la referencia.',
  'Marca el primer extremo de la distancia que deseas medir.',
  'Marca el segundo extremo de la distancia que deseas medir.',
]
const inputClass = 'mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 text-[var(--foreground)]'

function pixelDistance(a: Mark, b: Mark, width: number, height: number) {
  return Math.hypot((a.x - b.x) * width, (a.y - b.y) * height)
}

function cameraError(cause: unknown) {
  if (cause instanceof DOMException) {
    if (cause.name === 'NotAllowedError' || cause.name === 'PermissionDeniedError') {
      return 'La cámara está bloqueada. Permite el acceso a la cámara para este sitio en los ajustes del navegador y vuelve a intentarlo.'
    }
    if (cause.name === 'NotFoundError' || cause.name === 'OverconstrainedError') {
      return 'No se encontró una cámara disponible. Prueba con Tomar o elegir foto.'
    }
    if (cause.name === 'NotReadableError') return 'La cámara está ocupada por otra aplicación. Ciérrala e inténtalo de nuevo.'
  }
  return 'No se pudo iniciar la cámara. Prueba con Tomar o elegir foto o abre NEDVI OS directamente en Safari/Chrome.'
}

/** Camera preview is independent of WebXR. Image measurements require a known planar scale. */
export function CameraFallback({ onMeasure }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const photoUrlRef = useRef<string | null>(null)
  const mountedRef = useRef(true)
  const [cameraOpen, setCameraOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [photoUrl, setPhotoUrl] = useState('')
  const [photoSize, setPhotoSize] = useState({ width: 0, height: 0 })
  const [points, setPoints] = useState<Mark[]>([])
  const [referenceMetres, setReferenceMetres] = useState('')
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      streamRef.current?.getTracks().forEach(track => track.stop())
      if (photoUrlRef.current) URL.revokeObjectURL(photoUrlRef.current)
    }
  }, [])

  function stopCamera() {
    streamRef.current?.getTracks().forEach(track => track.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
    setCameraOpen(false)
  }

  function applyPhoto(file: Blob) {
    if (photoUrlRef.current) URL.revokeObjectURL(photoUrlRef.current)
    const url = URL.createObjectURL(file)
    photoUrlRef.current = url
    setPhotoUrl(url)
    setPhotoSize({ width: 0, height: 0 })
    setPoints([])
    setSaved(false)
    setError('')
  }

  async function openCamera() {
    if (busy) return
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setError('El navegador no permite cámara en vivo aquí. Entra desde la dirección HTTPS de NEDVI OS o usa Tomar o elegir foto.')
      return
    }
    setError('')
    setBusy(true)
    try {
      stopCamera()
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: { ideal: 'environment' } },
      })
      if (!mountedRef.current) {
        stream.getTracks().forEach(track => track.stop())
        return
      }
      streamRef.current = stream
      const video = videoRef.current
      if (!video) throw new Error('Video no disponible')
      video.srcObject = stream
      setCameraOpen(true)
      await video.play()
    } catch (cause) {
      stopCamera()
      if (mountedRef.current) setError(cameraError(cause))
    } finally {
      if (mountedRef.current) setBusy(false)
    }
  }

  function capture() {
    const video = videoRef.current
    if (!video?.videoWidth || !video.videoHeight) {
      setError('La cámara todavía está iniciando. Espera a ver la imagen y vuelve a intentar.')
      return
    }
    const canvas = document.createElement('canvas')
    const scale = Math.min(1, 1600 / Math.max(video.videoWidth, video.videoHeight))
    canvas.width = Math.round(video.videoWidth * scale)
    canvas.height = Math.round(video.videoHeight * scale)
    const context = canvas.getContext('2d')
    if (!context) { setError('No se pudo capturar la foto. Usa Tomar o elegir foto.'); return }
    context.drawImage(video, 0, 0, canvas.width, canvas.height)
    canvas.toBlob(blob => {
      if (!mountedRef.current) return
      if (!blob) { setError('No se pudo guardar la captura. Prueba de nuevo.'); return }
      stopCamera()
      applyPhoto(blob)
    }, 'image/jpeg', 0.9)
  }

  function choosePhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) { setError('Selecciona una imagen válida.'); return }
    stopCamera()
    applyPhoto(file)
  }

  function mark(event: MouseEvent<HTMLButtonElement>) {
    if (points.length >= 4 || !photoSize.width) return
    const bounds = event.currentTarget.getBoundingClientRect()
    const x = (event.clientX - bounds.left) / bounds.width
    const y = (event.clientY - bounds.top) / bounds.height
    if (x < 0 || x > 1 || y < 0 || y > 1) return
    setPoints(current => [...current, { x, y }])
    setSaved(false)
  }

  const referenceLength = Number(referenceMetres.replace(',', '.'))
  const validReference = referenceMetres.trim() !== '' && Number.isFinite(referenceLength) && referenceLength > 0
  const referencePixels = points.length >= 2 ? pixelDistance(points[0], points[1], photoSize.width, photoSize.height) : 0
  const targetPixels = points.length === 4 ? pixelDistance(points[2], points[3], photoSize.width, photoSize.height) : 0
  const estimate = validReference && referencePixels >= 5 && targetPixels >= 5
    ? (targetPixels / referencePixels) * referenceLength
    : null

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-semibold">Cámara normal · medición con foto</h3>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Funciona sin realidad aumentada. Fotografía una superficie junto a una referencia de longitud conocida,
          por ejemplo una cinta métrica. Ambos segmentos deben estar en el mismo plano y a una profundidad similar.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" disabled={busy} onClick={() => void openCamera()}>
          <Camera size={18} className="mr-2" />{busy ? 'Abriendo…' : 'Abrir cámara normal'}
        </Button>
        <label className="inline-flex min-h-14 cursor-pointer items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface)] px-5 text-sm font-semibold">
          <ImagePlus size={18} className="mr-2" />Tomar o elegir foto
          <input className="sr-only" type="file" accept="image/*" capture="environment" onChange={choosePhoto} />
        </label>
        {cameraOpen && <Button type="button" onClick={stopCamera}>Cerrar cámara</Button>}
      </div>
      {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      <video ref={videoRef} autoPlay playsInline muted
        className={cameraOpen ? 'block max-h-[65vh] w-full rounded-xl bg-black object-contain' : 'hidden'} />
      {cameraOpen && <Button type="button" onClick={capture}>Capturar imagen</Button>}
      {photoUrl && (
        <div className="space-y-3">
          <p className="text-sm font-medium">{points.length < 4 ? steps[points.length] : 'Puntos completos. Comprueba la escala.'}</p>
          <div className="relative w-full overflow-hidden rounded-xl border border-[var(--border)] bg-black">
            {/* Click coordinates are relative to the full, uncropped image displayed below. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photoUrl} alt="Fotografía para calibrar la medición" className="block h-auto w-full"
              onLoad={event => setPhotoSize({ width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight })} />
            <button type="button" onClick={mark} disabled={points.length >= 4 || !photoSize.width}
              aria-label={points.length < 4 ? steps[points.length] : 'Puntos completos'}
              className="absolute inset-0 z-10 cursor-crosshair disabled:cursor-default" />
            {points.map((point, index) => (
              <span key={index} aria-hidden="true" className="pointer-events-none absolute z-20 flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white bg-[#1f6feb] text-xs font-bold text-white shadow-lg"
                style={{ left: String(point.x * 100) + '%', top: String(point.y * 100) + '%' }}>{index + 1}</span>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={() => { setPoints([]); setSaved(false) }}><RotateCcw size={16} className="mr-2" />Reiniciar puntos</Button>
            <a href={photoUrl} download="NEDVI-Medidor-foto.jpg" className="inline-flex min-h-14 items-center rounded-xl border border-[var(--border)] px-5 text-sm font-semibold">Guardar foto</a>
          </div>
          <label className="block text-sm">Longitud real de la referencia (metros)
            <input className={inputClass} type="number" inputMode="decimal" min="0.001" step="any"
              placeholder="Ej. 0.5" value={referenceMetres}
              onChange={event => { setReferenceMetres(event.target.value); setSaved(false) }} />
          </label>
          {points.length >= 2 && referencePixels < 5 && <p role="alert" className="text-sm text-amber-600">Los puntos de referencia están demasiado juntos. Reinícialos y selecciónalos con mayor separación.</p>}
          {estimate !== null && (
            <div className="space-y-2 rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] p-4">
              <p className="text-sm">Distancia estimada a partir de la fotografía</p>
              <strong className="text-2xl">{estimate.toLocaleString('es-MX', { maximumFractionDigits: 2 })} m</strong>
              <div><Button type="button" disabled={saved} onClick={() => { onMeasure(estimate); setSaved(true) }}>
                <Check size={16} className="mr-2" />{saved ? 'Agregada a la lista' : 'Agregar medición'}
              </Button></div>
            </div>
          )}
          <p className="text-xs text-[var(--muted)]">
            Estimación 2D basada en escala, sin corrección de perspectiva ni profundidad. No es una medición topográfica
            ni apta para dimensionamiento de obra: verifica siempre con cinta, distanciómetro o equipo de precisión.
            La foto permanece en este dispositivo y no se envía al servidor.
          </p>
        </div>
      )}
    </div>
  )
}
