const test = require('node:test')
const assert = require('node:assert/strict')
const ts = require('typescript')
const fs = require('node:fs')
const vm = require('node:vm')

function setup({ supported = true, failHit = false } = {}) {
  let callback, cancelled = false, released = false, ended = false, requested
  const reference = new EventTarget()
  const session = Object.assign(new EventTarget(), {
    visibilityState: 'visible',
    requestReferenceSpace: async () => reference,
    requestHitTestSource: async () => { if (failHit) throw new Error('unsupported'); return { cancel() { cancelled = true } } },
    updateRenderState() {},
    requestAnimationFrame(cb) { callback = cb; return 1 },
    async end() { ended = true; this.dispatchEvent(new Event('end')) },
  })
  const gl = { async makeXRCompatible() {}, bindFramebuffer() {}, clearColor() {}, clear() {}, getExtension() { return { loseContext() { released = true } } } }
  const context = { exports: {}, navigator: supported ? { xr: { isSessionSupported: async () => true, async requestSession(mode, options) { requested = { mode, options }; return session } } } : {}, window: { isSecureContext: true, XRWebGLLayer: class {} }, document: { createElement: () => ({ getContext: () => gl }) } }
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/services/medidor/webxr.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, context)
  return { api: context.exports, session, reference, frame(point) { callback(0, { getHitTestResults: () => point ? [{ getPose: () => ({ transform: { position: point } }) }] : [] }) }, state: () => ({ cancelled, released, ended, requested }) }
}
test('distance uses real 3D coordinates in meters', () => {
  const { api } = setup()
  assert.equal(api.distanceBetween({ x: 0, y: 0, z: 0 }, { x: 3, y: 4, z: 12 }), 13)
})
test('unsupported device reports false', async () => {
  assert.equal(await setup({ supported: false }).api.supportsAR(), false)
})
test('AR loses targets when surface or visibility is lost and releases resources', async () => {
  const mock = setup(); let target; let ends = 0
  const close = await mock.api.startMeasurement({}, point => { target = point }, () => { ends++ })
  assert.equal(mock.state().requested.mode, 'immersive-ar')
  assert.ok(mock.state().requested.options.requiredFeatures.includes('hit-test'))
  mock.frame({ x: 1, y: 2, z: 3 }); assert.equal(target.z, 3)
  mock.frame(null); assert.equal(target, null)
  mock.session.visibilityState = 'hidden'; mock.frame({ x: 1, y: 2, z: 3 }); assert.equal(target, null)
  await close(); await close()
  assert.equal(ends, 1); assert.equal(mock.state().cancelled, true); assert.equal(mock.state().released, true)
})
test('setup failure closes camera and reports failure', async () => {
  const mock = setup({ failHit: true })
  await assert.rejects(mock.api.startMeasurement({}, () => {}, () => {}), /unsupported/)
  assert.equal(mock.state().ended, true); assert.equal(mock.state().released, true)
})
test('reference space reset closes the session', async () => {
  const mock = setup()
  await mock.api.startMeasurement({}, () => {}, () => {})
  mock.reference.dispatchEvent(new Event('reset'))
  assert.equal(mock.state().ended, true)
})
