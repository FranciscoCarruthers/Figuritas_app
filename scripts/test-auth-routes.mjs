import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import ts from 'typescript'

const require = createRequire(import.meta.url)
const root = process.cwd()
const savedEnv = { ...process.env }
const privateEmail = 'private-recovery@example.com'
const secret = 'test-service-role-key'
const calls = []
let lookupError = false
let providerError = false
let transportError = false

// Execute the actual route handlers and server helpers. Only the Supabase SDK
// boundary is replaced, so tests never read .env.local or contact real users.
function fakeClient(url, key, options) {
  assert.equal(url, 'https://auth-tests.example.com')
  assert.equal(options.auth.persistSession, false)
  assert.equal(options.auth.autoRefreshToken, false)
  calls.push({ type: 'client', key })
  let username
  return {
    from(table) {
      assert.equal(key, secret)
      assert.equal(table, 'profiles')
      return {
        select() { return this },
        eq(field, value) { assert.equal(field, 'username'); username = value; return this },
        async maybeSingle() {
          return { data: username === 'known' || username === 'legacy' ? { user_id: username } : null,
            error: lookupError ? new Error(`database detail ${privateEmail} ${secret}`) : null }
        },
      }
    },
    auth: {
      admin: {
        async getUserById(id) {
          return { data: { user: { email: id === 'legacy' ? 'legacy@figuritas.local' : privateEmail } }, error: null }
        },
      },
      async signInWithPassword({ email, password }) {
        assert.equal(key, 'test-anon-key', 'Password verification must not use service_role')
        calls.push({ type: 'login', email })
        if (transportError) throw new Error(`${privateEmail} ${secret}`)
        const valid = !providerError && password === 'correct-password' && [privateEmail, 'legacy@figuritas.local'].includes(email)
        return valid
          ? { data: { session: { access_token: 'test-access-token', refresh_token: 'test-refresh-token', user: { email } } }, error: null }
          : { data: { session: null }, error: new Error(`invalid credentials for ${email}`) }
      },
      async resetPasswordForEmail(email, options) {
        calls.push({ type: 'reset', email, redirectTo: options.redirectTo })
        if (transportError) throw new Error(`${privateEmail} ${secret}`)
        return { error: providerError ? new Error(`delivery details for ${email}`) : null }
      },
    },
  }
}

const modules = new Map()
function load(file) {
  const absolute = path.resolve(root, file)
  if (modules.has(absolute)) return modules.get(absolute).exports
  const loadedModule = { exports: {} }
  modules.set(absolute, loadedModule)
  const source = ts.transpileModule(fs.readFileSync(absolute, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText
  const localRequire = id => {
    if (id === 'server-only') return {}
    if (id === '@supabase/supabase-js') return { createClient: fakeClient }
    if (id.startsWith('@/')) return load(`src/${id.slice(2)}.ts`)
    return require(id)
  }
  new Function('require', 'module', 'exports', source)(localRequire, loadedModule, loadedModule.exports)
  return loadedModule.exports
}

async function request(handler, body, raw = false) {
  const response = await handler(new Request('https://app.example.com/api/auth/test', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: raw ? body : JSON.stringify(body),
  }))
  const text = await response.text()
  assert.equal(response.headers.get('cache-control'), 'no-store')
  assert.ok(!text.includes(privateEmail), 'Do not expose a recovery email')
  assert.ok(!text.includes(secret), 'Do not expose privileged credentials or provider errors')
  return { status: response.status, body: JSON.parse(text) }
}

try {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://auth-tests.example.com'
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
  process.env.SUPABASE_SERVICE_ROLE_KEY = secret
  const login = load('src/app/api/auth/login/route.ts').POST
  const reset = load('src/app/api/auth/password-reset/route.ts').POST
  const denied = await request(login, { identifier: 'known', password: 'wrong-password' })
  assert.equal(denied.status, 401)
  for (const identifier of ['unknown', 'legacy', privateEmail]) {
    assert.deepEqual(await request(login, { identifier, password: 'wrong-password' }), denied)
  }
  for (const body of [null, {}, { identifier: 'known' }, { identifier: {}, password: [] }]) {
    assert.deepEqual(await request(login, body), denied)
  }
  assert.deepEqual(await request(login, '{bad json', true), denied)
  for (const identifier of [' KNOWN ', privateEmail.toUpperCase(), 'legacy']) {
    assert.deepEqual(await request(login, { identifier, password: 'correct-password' }), {
      status: 200, body: { access_token: 'test-access-token', refresh_token: 'test-refresh-token' },
    })
  }
  lookupError = true
  assert.equal((await request(login, { identifier: 'known', password: 'correct-password' })).status, 503)
  lookupError = false
  transportError = true
  assert.equal((await request(login, { identifier: 'known', password: 'correct-password' })).status, 503)
  transportError = false
  const accepted = { status: 200, body: { ok: true } }
  for (const identifier of ['known', 'unknown', 'legacy', privateEmail, 'missing@example.com', '!', '']) {
    assert.deepEqual(await request(reset, { identifier }), accepted)
  }
  assert.ok(calls.some(call => call.type === 'reset' && call.email === privateEmail && call.redirectTo === 'https://app.example.com/login?reset=1'))
  assert.ok(!calls.some(call => call.type === 'reset' && call.email.endsWith('@figuritas.local')))
  assert.deepEqual(await request(reset, null), accepted)
  assert.deepEqual(await request(reset, '{bad json', true), accepted)
  lookupError = true
  assert.deepEqual(await request(reset, { identifier: 'known' }), accepted)
  lookupError = false
  providerError = true
  assert.deepEqual(await request(reset, { identifier: 'known' }), accepted)
  providerError = false
  transportError = true
  assert.deepEqual(await request(reset, { identifier: 'known' }), accepted)
  transportError = false
  delete process.env.SUPABASE_SERVICE_ROLE_KEY
  assert.equal((await request(login, { identifier: 'legacy', password: 'correct-password' })).status, 200)
  assert.equal((await request(login, { identifier: privateEmail, password: 'correct-password' })).status, 200)
  assert.deepEqual(await request(reset, { identifier: 'legacy' }), accepted)
  delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  assert.equal((await request(login, { identifier: 'legacy', password: 'correct-password' })).status, 503)
  assert.ok(!fs.existsSync('src/app/api/auth/resolve-login/route.ts'), 'The unauthenticated email lookup must stay removed')
  console.log('Auth route privacy tests passed: login, legacy accounts, neutral recovery, malformed requests and backend failures.')
} finally {
  for (const name of ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY']) {
    if (savedEnv[name] === undefined) delete process.env[name]
    else process.env[name] = savedEnv[name]
  }
}
