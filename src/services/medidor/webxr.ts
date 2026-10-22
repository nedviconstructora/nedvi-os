export type Point3 = { x: number; y: number; z: number }
type Space = EventTarget
type HitSource = { cancel(): void }
type Frame = {
  getHitTestResults(source: HitSource): Array<{ getPose(space: Space): { transform: { position: Point3 } } | null }>
}
type Session = EventTarget & {
  visibilityState: string
  requestReferenceSpace(kind: string): Promise<Space>
  requestHitTestSource(options: { space: Space }): Promise<HitSource>
  updateRenderState(options: { baseLayer: Layer }): void
  requestAnimationFrame(callback: (time: number, frame: Frame) => void): number
  end(): Promise<void>
}
type Layer = { framebuffer: WebGLFramebuffer }
type XRContext = WebGLRenderingContext & { makeXRCompatible(): Promise<void> }
type XR = {
  isSessionSupported(mode: string): Promise<boolean>
  requestSession(mode: string, options: { requiredFeatures: string[]; domOverlay: { root: HTMLElement } }): Promise<Session>
}
function xrSystem(): XR | undefined {
  return (navigator as Navigator & { xr?: XR }).xr
}
export async function supportsAR(): Promise<boolean> {
  return window.isSecureContext && Boolean(await xrSystem()?.isSessionSupported('immersive-ar'))
}
export function distanceBetween(a: Point3, b: Point3): number {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z)
}
export async function startMeasurement(
  root: HTMLElement,
  onTarget: (point: Point3 | null) => void,
  onEnd: () => void,
): Promise<() => Promise<void>> {
  const xr = xrSystem()
  if (!xr) throw new Error('Este navegador no ofrece medición AR. Usa la captura manual.')
  const session = await xr.requestSession('immersive-ar', {
    requiredFeatures: ['hit-test', 'dom-overlay'], domOverlay: { root },
  })
  let source: HitSource | undefined
  let ended = false
  let gl: XRContext | null = null
  const cleanup = () => {
    if (ended) return
    ended = true
    source?.cancel()
    gl?.getExtension('WEBGL_lose_context')?.loseContext()
    onTarget(null)
    onEnd()
  }
  session.addEventListener('end', cleanup, { once: true })
  session.addEventListener('visibilitychange', () => onTarget(null))
  try {
    const canvas = document.createElement('canvas')
    gl = canvas.getContext('webgl', { alpha: true }) as XRContext | null
    if (!gl) throw new Error('No se pudo iniciar el visor en este dispositivo.')
    await gl.makeXRCompatible()
    const LayerConstructor = (window as unknown as { XRWebGLLayer: new (session: Session, gl: WebGLRenderingContext) => Layer }).XRWebGLLayer
    const layer = new LayerConstructor(session, gl)
    session.updateRenderState({ baseLayer: layer })
    const reference = await session.requestReferenceSpace('local')
    const viewer = await session.requestReferenceSpace('viewer')
    source = await session.requestHitTestSource({ space: viewer })
    if (ended) { source.cancel(); throw new Error('La sesión de cámara terminó. Intenta de nuevo.') }
    // A reference-space reset invalidates previously selected coordinates.
    reference.addEventListener('reset', () => { void session.end().catch(cleanup) })
    const frame = (_time: number, current: Frame) => {
      if (ended || !gl || !source) return
      gl.bindFramebuffer(gl.FRAMEBUFFER, layer.framebuffer)
      gl.clearColor(0, 0, 0, 0)
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
      const pose = session.visibilityState === 'visible' ? current.getHitTestResults(source)[0]?.getPose(reference) : null
      const p = pose?.transform.position
      onTarget(p ? { x: p.x, y: p.y, z: p.z } : null)
      session.requestAnimationFrame(frame)
    }
    session.requestAnimationFrame(frame)
    return async () => { if (!ended) await session.end() }
  } catch (error) {
    await session.end().catch(() => undefined)
    cleanup()
    throw error
  }
}
