const { test } = require('node:test')
const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const vm = require('node:vm')
const ts = require('typescript')
const { NextResponse } = require('next/server')

const id = 'adced97c-949f-4ebc-be41-060c23354846'
const source = ts.transpileModule(readFileSync('src/app/api/time-clock/photo/route.ts','utf8'), {
  compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020},
}).outputText

function route({ role='administracion', signedError=null, entry={user_id:'other-admin',photo_path:'other-admin/photo.jpg'}, authenticated=true }={}) {
  const calls=[]
  const query={
    select(){return this},
    eq(column,value){calls.push([column,value]);return this},
    is(column,value){calls.push([column,value]);return this},
    async maybeSingle(){return {data:entry,error:null}},
  }
  const context={
    user:{id:'viewer'},profile:{role},isAdmin:role==='administracion',isAccountant:role==='contabilidad',
    admin:{from(table){assert.equal(table,'time_clock_entries');return query},storage:{from(bucket){
      assert.equal(bucket,'nedvi-time-clock')
      return {async createSignedUrl(path,ttl){calls.push(['sign',path,ttl]);return {data:signedError?null:{signedUrl:'https://example.supabase.co/fresh-photo'},error:signedError}}}
    }}},
  }
  const exports={}
  vm.runInNewContext(source,{exports,require(name){
    if(name==='next/server')return {NextResponse}
    if(name==='@/features/time-clock/services/server')return {getTimeClockContext:async()=>authenticated?context:null}
    throw new Error(name)
  },URL,console:{error(){}}})
  return {get:()=>exports.GET(new Request('https://nedvi.test/api/time-clock/photo?id='+id)),GET:exports.GET,calls}
}

for(const role of ['administracion','obra','supervisor','contabilidad']) {
  test(`${role} can open another employee's photo with a fresh private link`,async()=>{
    const r=route({role});const response=await r.get()
    assert.equal(response.status,307)
    assert.equal(response.headers.get('location'),'https://example.supabase.co/fresh-photo')
    assert.equal(response.headers.get('cache-control'),'private, no-store')
    assert.ok(r.calls.some(c=>c[0]==='id'&&c[1]===id))
    assert.ok(r.calls.some(c=>c[0]==='deleted_at'&&c[1]===null))
    assert.ok(r.calls.some(c=>c[0]==='sign'&&c[1]==='other-admin/photo.jpg'&&c[2]===60))
  })
}
test('anonymous request never reaches privileged data or storage',async()=>{
  const r=route({authenticated:false});assert.equal((await r.get()).status,401);assert.equal(r.calls.length,0)
})
test('unknown or voided entry never signs a photo',async()=>{
  const r=route({entry:null});assert.equal((await r.get()).status,404);assert.ok(!r.calls.some(c=>c[0]==='sign'))
})
test('unprivileged user cannot read another employee photo',async()=>{
  const r=route({role:'cliente'});assert.equal((await r.get()).status,403);assert.ok(!r.calls.some(c=>c[0]==='sign'))
})
test('malformed record ID is rejected before database access',async()=>{
  const r=route();assert.equal((await r.GET(new Request('https://nedvi.test/api/time-clock/photo?id=../secret'))).status,400);assert.equal(r.calls.length,0)
})
test('temporary storage failure is retryable and never cached',async()=>{
  const r=route({signedError:new Error('Storage unavailable')});const response=await r.get()
  assert.equal(response.status,503);assert.equal(response.headers.get('cache-control'),'private, no-store')
})
test('opening the same photo again signs it again instead of reusing an expired link',async()=>{
  const r=route();await r.get();await r.get();assert.equal(r.calls.filter(c=>c[0]==='sign').length,2)
})
