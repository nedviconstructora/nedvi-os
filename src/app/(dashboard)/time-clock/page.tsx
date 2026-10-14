'use client'

import { ChangeEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { Camera, Clock3, LogIn, LogOut, RefreshCw, ShieldCheck, Trash2, MapPin } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'

type ClockEntry = { id:string; userId:string; name:string; type:'entrada'|'salida'; at:string; photoUrl:string|null; latitude:number|null; longitude:number|null; accuracy:number|null }
type Payload = {entries:ClockEntry[]; me:string; canViewAll:boolean; error?:string}

export default function TimeClockPage() {
  const [entries,setEntries] = useState<ClockEntry[]>([])
  const [me,setMe] = useState('')
  const [canViewAll,setCanViewAll] = useState(false)
  const [loading,setLoading] = useState(true)
  const [busy,setBusy] = useState(false)
  const [locationBusy,setLocationBusy] = useState(false)
  const [error,setError] = useState('')
  const [notice,setNotice] = useState('')
  const [photo,setPhoto] = useState<File|null>(null)
  const [preview,setPreview] = useState('')
  const [now,setNow] = useState<Date|null>(null)

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/time-clock',{cache:'no-store'})
      const body = await res.json() as Payload
      if (!res.ok) throw new Error([body.error || 'No fue posible cargar asistencias.', (body as Payload & {code?:string}).code ? 'Código: '+(body as Payload & {code?:string}).code : null].filter(Boolean).join(' '))
      setEntries(body.entries)
      setMe(body.me)
      setCanViewAll(body.canViewAll)
      setError('')
    } catch (err) { setError(err instanceof Error ? err.message : 'Error al cargar asistencias.') }
    finally {setLoading(false)}
  },[])

  useEffect(() => {
    void refresh()
    const interval = window.setInterval(() => {setNow(new Date());void refresh()},30000)
    setNow(new Date())
    return () => window.clearInterval(interval)
  },[refresh])

  useEffect(() => {
    if (!photo) {setPreview('');return}
    const url = URL.createObjectURL(photo)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  },[photo])

  const mine = useMemo(() => entries.filter(x => x.userId === me),[entries,me])
  const current = mine[0]
  const hasEntry = current?.type === 'entrada'
  const nextType = hasEntry ? 'salida' : 'entrada'
  const fmt = (date:string) => new Intl.DateTimeFormat('es-MX',{dateStyle:'medium',timeStyle:'short'}).format(new Date(date))
  const duration = useMemo(() => {
    if (!hasEntry || !now || !current) return null
    const minutes = Math.max(0,Math.floor((now.getTime()-new Date(current.at).getTime())/60000))
    return `${Math.floor(minutes/60)} h ${minutes%60} min`
  },[hasEntry,current,now])

  function choosePhoto(event:ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (!['image/jpeg','image/png','image/webp'].includes(file.type) || file.size > 5*1024*1024) {
      setError('La fotografía debe ser JPG, PNG o WebP y pesar máximo 5 MB.')
      return
    }
    setError('')
    setPhoto(file)
  }

  async function deleteEntry(id:string) {
    if (!canViewAll || busy) return
    const reason = window.prompt('Motivo de la anulación (mínimo 8 caracteres):')
    if (reason === null) return
    if (reason.trim().length < 8) { setError('Escribe un motivo de al menos 8 caracteres.'); return }
    if (!window.confirm('¿Anular esta checada? Solo puede anularse la última checada de cada persona. La acción quedará auditada.')) return
    setBusy(true);setError('');setNotice('')
    try {
      const res = await fetch('/api/time-clock',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,reason:reason.trim()})})
      const data = await res.json() as {error?:string}
      if (!res.ok) throw new Error(data.error || 'No se pudo anular el registro.')
      setNotice('Registro anulado. La auditoría se conserva en Supabase.')
      await refresh()
    } catch (err) {setError(err instanceof Error ? err.message : 'No se pudo anular.')}
    finally {setBusy(false)}
  }

  async function locate(): Promise<GeolocationPosition> {
    if (!navigator.geolocation) throw new Error('Este dispositivo no tiene acceso a ubicación GPS.')
    setLocationBusy(true)
    try {
      return await new Promise<GeolocationPosition>((resolve,reject) =>
        navigator.geolocation.getCurrentPosition(resolve,reject,{enableHighAccuracy:true,timeout:20000,maximumAge:0}))
    } catch {
      throw new Error('Permite el acceso a tu ubicación en el navegador para registrar entrada o salida.')
    } finally {setLocationBusy(false)}
  }

  async function register() {
    if (!photo || busy || loading || error) return
    setBusy(true);setError('');setNotice('')
    try {
      const position = await locate()
      const form = new FormData()
      form.set('latitude',String(position.coords.latitude))
      form.set('longitude',String(position.coords.longitude))
      form.set('accuracy',String(position.coords.accuracy))
      form.set('type',nextType)
      form.set('photo',photo)
      const res = await fetch('/api/time-clock',{method:'POST',body:form})
      const data = await res.json() as {error?:string}
      if (!res.ok) throw new Error(data.error || 'No se pudo guardar el registro.')
      setPhoto(null)
      setNotice(nextType === 'entrada' ? 'Entrada guardada en Supabase. Consultando el historial…' : 'Salida guardada en Supabase. Consultando el historial…')
      await refresh()
    } catch (err) {setError(err instanceof Error ? err.message : 'No se pudo registrar.')}
    finally {setBusy(false)}
  }

  return (
    <AppShell>
      <main className="mx-auto max-w-6xl space-y-6 pb-12 text-[var(--foreground)]">
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#5496CC]">Control de personal</p>
            <h1 className="mt-2 text-3xl font-bold">Checador</h1>
            <p className="mt-1 text-sm text-[var(--muted)]">Entrada y salida con evidencia fotográfica y hora registrada por el servidor.</p>
          </div>
          <button type="button" onClick={() => void refresh()} className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] px-4 py-2 text-sm"><RefreshCw size={16}/>Actualizar</button>
        </header>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <section className="space-y-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
            <div className="flex items-center justify-between gap-2"><h2 className="text-xl font-semibold">Mi jornada</h2>
              <span className={`rounded-full px-3 py-1 text-xs font-bold ${hasEntry ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' : 'bg-slate-500/10 text-[var(--muted)]'}`}>{loading ? 'Cargando' : hasEntry ? 'En turno' : 'Fuera de turno'}</span>
            </div>
            <div className="rounded-xl border border-[var(--border)] p-4">
              <p className="text-xs text-[var(--muted)]">Último registro</p>
              <p className="mt-2 text-lg font-semibold">{current ? `${current.type === 'entrada' ? 'Entrada' : 'Salida'} · ${fmt(current.at)}` : 'Aún no hay registros'}</p>
              {duration && <p className="mt-1 text-sm text-[#5496CC]">Tiempo en turno: {duration}</p>}
            </div>
            <div className="space-y-3">
              <p className="text-sm font-semibold">Fotografía obligatoria para {nextType}</p>
              <div className="flex flex-wrap gap-2">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-[var(--border)] px-4 py-3 text-sm font-semibold"><Camera size={17}/>Tomar foto<input className="sr-only" type="file" accept="image/*" capture="user" onChange={choosePhoto}/></label>
              </div>
              <p className="flex items-center gap-2 text-xs text-[var(--muted)]"><MapPin size={15}/>Al confirmar se solicitará tu ubicación GPS actual. Debes otorgar permiso al navegador.</p>
              {preview && <img src={preview} alt="Vista previa de la evidencia" className="max-h-56 w-full rounded-xl border border-[var(--border)] object-contain" />}
              <div className="grid grid-cols-2 gap-3">
                <button type="button" disabled={!photo || hasEntry || loading || busy || locationBusy} onClick={() => void register()} className="flex items-center justify-center gap-2 rounded-xl bg-[#317FC1] px-3 py-3 font-bold text-white disabled:cursor-not-allowed disabled:opacity-40"><LogIn size={19}/>{busy && !hasEntry ? 'Guardando...' : 'Checar entrada'}</button>
                <button type="button" disabled={!photo || !hasEntry || loading || busy || locationBusy} onClick={() => void register()} className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-3 py-3 font-bold text-white disabled:cursor-not-allowed disabled:opacity-40"><LogOut size={19}/>{busy && hasEntry ? 'Guardando...' : 'Checar salida'}</button>
              </div>
              <p className="text-xs text-[var(--muted)]">{locationBusy ? 'Obteniendo tu ubicación…' : hasEntry ? 'Tu entrada está activa. Adjunta una foto para habilitar Checar salida.' : 'Adjunta una fotografía para habilitar Checar entrada. Primero debe registrarse una entrada para poder salir.'}</p>
              <p className="flex items-start gap-2 text-xs text-[var(--muted)]"><ShieldCheck size={16} className="shrink-0"/>La hora la asigna el servidor. Los trabajadores no pueden editar registros. Solo Administración puede consultar todas las asistencias.</p>
              {error && <p role="alert" className="rounded-xl bg-red-500/10 p-3 text-sm text-red-500">{error}</p>}
              {notice && <p role="status" className="rounded-xl bg-emerald-500/10 p-3 text-sm text-emerald-600">{notice}</p>}
            </div>
          </section>
          <section className="space-y-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
            <div className="flex items-center gap-2"><Clock3 size={20} className="text-[#5496CC]"/><h2 className="text-xl font-semibold">{canViewAll ? 'Historial del personal' : 'Mis registros'}</h2></div>
            <p className="text-sm text-[var(--muted)]">Registros recientes sincronizados con Supabase. Fotografía disponible mediante enlace privado temporal.</p>
            <div className="max-h-[480px] space-y-3 overflow-y-auto">
              {!entries.length && <p className="rounded-xl border border-[var(--border)] p-4 text-sm text-[var(--muted)]">Todavía no existen registros.</p>}
              {entries.map(item => <div key={item.id} className="flex items-center justify-between gap-3 rounded-xl border border-[var(--border)] p-3">
                <div className="min-w-0"><p className="truncate text-sm font-semibold">{item.name}</p><p className="text-xs text-[var(--muted)]">{item.type==='entrada'?'Entrada':'Salida'} · {fmt(item.at)}</p>{item.latitude != null && item.longitude != null && <a className="inline-flex items-center gap-1 text-xs text-[#5496CC] underline" href={`https://www.google.com/maps?q=${item.latitude},${item.longitude}`} target="_blank" rel="noreferrer"><MapPin size={13}/>Ver ubicación GPS (±{Math.round(item.accuracy ?? 0)} m)</a>}</div>
                <div className="flex shrink-0 items-center gap-2">
                  {item.photoUrl ? <a href={item.photoUrl} target="_blank" rel="noreferrer" className="text-sm font-semibold text-[#5496CC] underline">Ver foto</a> : <span className="text-xs text-[var(--muted)]">Sin foto</span>}
                  {canViewAll && entries.find(x => x.userId === item.userId)?.id === item.id && <button type="button" disabled={busy} onClick={() => void deleteEntry(item.id)} aria-label="Anular registro" title="Anular checada (Administración)" className="rounded-lg border border-red-400/30 p-2 text-red-500 hover:bg-red-500/10 disabled:opacity-40"><Trash2 size={16}/></button>}
                </div>
              </div>)}
            </div>
          </section>
        </div>
      </main>
    </AppShell>
  )
}
