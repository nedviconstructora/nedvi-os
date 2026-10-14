'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Maximize, Play, Volume2 } from 'lucide-react'

const videoSource = process.env.NEXT_PUBLIC_PRESENTATION_VIDEO_URL || '/videos/nedvi-os-presentacion.mp4'
const PRESENTATION_END = new Date('2026-10-16T00:00:00-07:00').getTime()

export default function PresentationPage() {
  const router = useRouter()
  const videoRef = useRef<HTMLVideoElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const redirectTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [started, setStarted] = useState(false)
  const [finished, setFinished] = useState(false)
  const [error, setError] = useState('')
  const [localVideo, setLocalVideo] = useState<string | null>(null)

  useEffect(() => {
    if (Date.now() >= PRESENTATION_END) { router.replace('/login'); return }
    return () => { if (redirectTimer.current) clearTimeout(redirectTimer.current) }
  }, [router])

  function chooseVideo(file?: File) {
    if (!file) return
    if (file.type !== 'video/mp4' && !file.name.toLowerCase().endsWith('.mp4')) {
      setError('Selecciona un archivo de video MP4.')
      return
    }
    if (localVideo) URL.revokeObjectURL(localVideo)
    setLocalVideo(URL.createObjectURL(file))
    setError('')
  }

  async function start() {
    if (!videoRef.current) return
    setError('')
    try {
      await videoRef.current.play() // User gesture permits playback with sound
      setStarted(true)
      if (stageRef.current?.requestFullscreen) {
        await stageRef.current.requestFullscreen().catch(() => {})
      }
    } catch {
      setError('No se pudo reproducir el video. Verifica que el archivo MP4 esté disponible y vuelve a intentarlo.')
    }
  }

  function finish() {
    setFinished(true)
    redirectTimer.current = setTimeout(() => {
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {})
      router.replace('/login')
    }, 2500)
  }

  return (
    <main ref={stageRef} className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#061227] text-white">
      <video
        ref={videoRef}
        className={`absolute inset-0 h-full w-full object-contain transition-opacity duration-700 ${started && !finished ? 'opacity-100' : 'opacity-0'}`}
        src={localVideo || videoSource}
        playsInline
        preload="metadata"
        onEnded={finish}
        onError={() => setError('No se encontró el video de presentación. Configura NEXT_PUBLIC_PRESENTATION_VIDEO_URL o agrega el MP4 a public/videos/nedvi-os-presentacion.mp4.')}
        aria-label="Presentación oficial de NEDVI OS"
      />
      {!started && <div className="relative z-10 mx-5 flex max-w-xl flex-col items-center gap-7 rounded-3xl border border-blue-400/20 bg-[#102a4a]/80 p-10 text-center shadow-2xl backdrop-blur-xl">
        <img src="/icon.png" alt="NEDVI OS" className="h-24 w-24 object-contain" />
        <h1 className="text-4xl font-bold tracking-tight">NEDVI <span className="text-[#7BAEE3]">OS</span></h1>
        <p className="text-lg text-blue-100">Todo tu negocio. Un solo sistema.</p>
        <label className="cursor-pointer rounded-xl border border-blue-300/40 px-5 py-3 text-sm text-blue-100 hover:bg-white/10">Seleccionar el MP4 de la presentación<input type="file" accept="video/mp4,.mp4" className="sr-only" onChange={(e) => chooseVideo(e.target.files?.[0])}/></label>
        {localVideo && <p className="text-sm text-green-200">Video cargado desde tu computadora. No se subirá a internet.</p>}
        <button type="button" onClick={start} className="flex items-center gap-3 rounded-xl bg-[#277be7] px-7 py-4 font-semibold hover:bg-[#388ded]"><Play size={22} /> Iniciar presentación</button>
        <p className="flex items-center gap-2 text-sm text-blue-200"><Volume2 size={16} /><Maximize size={16}/> Video con audio y pantalla completa</p>
        {error && <p role="alert" className="text-sm text-red-200">{error}</p>}
        <button type="button" onClick={() => router.push('/login')} className="flex items-center gap-2 text-sm text-blue-200 hover:text-white"><ArrowLeft size={16}/> Omitir presentación e iniciar sesión</button>
      </div>}
      {finished && <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#061227] text-center animate-pulse">
        <img src="/icon.png" alt="NEDVI OS" className="h-28 w-28 object-contain"/>
        <h2 className="mt-6 text-5xl font-bold">NEDVI OS</h2>
        <p className="mt-3 text-xl text-[#9bd2ff]">Todo tu negocio. Un solo sistema.</p>
      </div>}
      {started && !finished && <button type="button" onClick={finish} className="absolute bottom-6 right-6 z-10 rounded-lg bg-black/50 px-4 py-2 text-sm text-white/90 hover:bg-black/70">Ir a inicio de sesión</button>}
    </main>
  )
}
