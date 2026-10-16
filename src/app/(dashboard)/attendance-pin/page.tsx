'use client'

import { useEffect, useRef, useState } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { Camera, Delete, LockKeyhole, ScanFace, ShieldAlert, UsersRound } from 'lucide-react'

export default function AttendancePinPage() {
  const [pin,setPin]=useState('')
  const [cameraOpen,setCameraOpen]=useState(false)
  const [error,setError]=useState('')
  const camera=useRef<HTMLVideoElement>(null)
  useEffect(()=>{
    if(!cameraOpen)return
    let stream:MediaStream|undefined
    let stopped=false
    async function start(){
      try{
        const active=await navigator.mediaDevices.getUserMedia({video:{facingMode:'user'},audio:false})
        if(stopped){active.getTracks().forEach(t=>t.stop());return}
        stream=active
        if(camera.current){camera.current.srcObject=active;await camera.current.play()}
      }catch{if(!stopped)setError('No fue posible abrir la cámara. Verifica el permiso del navegador y la conexión HTTPS.')}
    }
    void start()
    return ()=>{stopped=true;stream?.getTracks().forEach(t=>t.stop())}
  },[cameraOpen])
  const press=(value:string)=>{setError('');setPin(p=>p.length<4?p+value:p)}
  return <AppShell>
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#5496CC]">Operaciones / Obra</p>
        <h1 className="mt-2 text-3xl font-bold text-[var(--foreground)]">Asistencia - PIN</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">Acceso de trabajadores mediante PIN de 4 dígitos y futura validación facial.</p>
      </header>
      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-8">
        <div className="mx-auto max-w-sm space-y-5 text-center">
          <div className="flex items-center justify-center gap-2"><LockKeyhole className="text-[#5496CC]"/><h2 className="text-xl font-bold">Identificación del trabajador</h2></div>
          <p className="text-sm text-[var(--muted)]">Introduce tu PIN personal para iniciar la identificación.</p>
          <div className="flex justify-center gap-3" aria-label={pin.length+' de 4 dígitos escritos'}>
            {[0,1,2,3].map(i=><div key={i} className="flex h-14 w-14 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] text-xl font-bold">{i<pin.length?'●':'—'}</div>)}
          </div>
          <div className="mx-auto grid max-w-[260px] grid-cols-3 gap-2">
            {['1','2','3','4','5','6','7','8','9','Limpiar','0','Borrar'].map(key=><button key={key} type="button" onClick={()=>key==='Limpiar'?setPin(''):key==='Borrar'?setPin(p=>p.slice(0,-1)):press(key)} className="min-h-14 rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] text-base font-semibold transition hover:border-[#5496CC]" aria-label={key}>{key==='Borrar'?<Delete className="mx-auto h-5 w-5"/>:key}</button>)}
          </div>
          <button type="button" disabled={pin.length!==4} onClick={()=>{setError('');setCameraOpen(true)}} className="w-full rounded-xl bg-[#5496CC] px-5 py-3 font-semibold text-white disabled:opacity-40">Continuar a cámara</button>
          {error&&<p role="alert" className="text-sm text-red-500">{error}</p>}
          {cameraOpen&&<div className="space-y-3 rounded-xl border border-[var(--border)] p-3">
            <div className="flex items-center justify-center gap-2 font-semibold"><ScanFace className="text-[#5496CC]"/> Cámara frontal</div>
            <video ref={camera} playsInline muted autoPlay className="aspect-video w-full rounded-lg bg-black object-cover" aria-label="Vista previa de la cámara frontal"/>
            <p className="text-xs text-[var(--muted)]">Vista previa solamente: todavía no se ha vinculado un motor de reconocimiento facial ni se ha validado tu identidad.</p>
            <button type="button" onClick={()=>setCameraOpen(false)} className="w-full rounded-xl border border-[var(--border)] px-4 py-3 font-semibold">Cerrar cámara</button>
          </div>}
        </div>
      </section>
      <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm">
        <ShieldAlert className="mt-0.5 shrink-0 text-amber-500"/>
        <div><strong>Módulo en preparación.</strong> Por seguridad, introducir cualquier PIN no constituye una verificación. No se registra ninguna entrada o salida hasta implementar autenticación segura, alta biométrica autorizada, detección de vida y controles contra suplantación.</div>
      </div>
      <div className="flex items-center gap-2 text-xs text-[var(--muted)]"><UsersRound size={16}/><span>Las checadas actuales de los supervisores permanecen disponibles en Asistencias · Trabajadores.</span><Camera size={15}/></div>
    </div>
  </AppShell>
}
