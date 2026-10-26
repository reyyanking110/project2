'use strict';
// node test.js  -> runs the suite twice: against a local SQLite file, and against a mock of Turso's HTTPS API.
const os = require('node:os'), path = require('node:path'), fs = require('node:fs'), http = require('node:http'), assert = require('node:assert/strict');
const mode = process.argv[2];
if (!mode) {
  const { spawnSync } = require('node:child_process');
  let failed = false;
  for (const m of ['local', 'turso-mock']) {
    console.log(`\n=== ${m} ===`);
    const r = spawnSync(process.execPath, ['--disable-warning=ExperimentalWarning', __filename, m], { stdio: 'inherit' });
    if (r.status !== 0) failed = true;
  }
  process.exit(failed ? 1 : 0);
}

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'nexa-'));
process.env.DB_PATH = path.join(tmp, 'test.db');
delete process.env.TURSO_URL; delete process.env.TURSO_TOKEN;

function startMockTurso() { // speaks the same /v2/pipeline JSON protocol as Turso's HTTP API
  const { DatabaseSync } = require('node:sqlite');
  const db = new DatabaseSync(path.join(tmp, 'mock-turso.db'));
  const dec = a => a.type === 'null' ? null : a.type === 'integer' ? Number(a.value) : a.value;
  const enc = v => v === null ? { type: 'null' } : typeof v === 'number' ? { type: 'integer', value: String(v) } : { type: 'text', value: String(v) };
  return new Promise(resolve => {
    const s = http.createServer((req, res) => {
      let b = ''; req.on('data', c => b += c); req.on('end', () => {
        if (req.url !== '/v2/pipeline' || req.headers.authorization !== 'Bearer test-token') { res.statusCode = 401; return res.end('unauthorized'); }
        const results = JSON.parse(b).requests.map(r => {
          if (r.type === 'close') return { type: 'ok', response: { type: 'close' } };
          try {
            const st = db.prepare(r.stmt.sql), args = r.stmt.args.map(dec);
            let rows = [], last = null;
            if (/^\s*(select|pragma)|\breturning\b/i.test(r.stmt.sql)) rows = st.all(...args);
            else last = Number(st.run(...args).lastInsertRowid);
            const cols = rows[0] ? Object.keys(rows[0]) : [];
            return { type: 'ok', response: { type: 'execute', result: { cols: cols.map(name => ({ name })), rows: rows.map(row => cols.map(c => enc(row[c]))), last_insert_rowid: last == null ? null : String(last) } } };
          } catch (e) { return { type: 'error', error: { message: e.message } }; }
        });
        res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify({ baton: null, results }));
      });
    }).listen(0, () => resolve(s));
  });
}

(async () => {
  if (mode === 'turso-mock') {
    const mock = await startMockTurso();
    process.env.TURSO_URL = `http://127.0.0.1:${mock.address().port}`; process.env.TURSO_TOKEN = 'test-token';
  }
  const { server } = require('./dev-server.js');
  await new Promise(r => server.listen(0, r));
  const base = `http://127.0.0.1:${server.address().port}`;
  let cookie = '';
  const call = async (method, url, body, extra = {}) => {
    const r = await fetch(base + url, { method, headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}), ...extra }, body: body ? JSON.stringify(body) : undefined });
    const sc = r.headers.get('set-cookie'); if (sc) cookie = sc.split(';')[0].endsWith('=') ? '' : sc.split(';')[0];
    return { status: r.status, data: await r.json().catch(() => ({})), headers: r.headers, raw: sc };
  };
  const ok = n => console.log('  ✓', n);

  let r = await call('GET', '/'); assert.equal(r.status, 200); ok('serves index.html');
  r = await call('GET', '/api/me'); assert.equal(r.status, 401); ok('/api/me signed out -> 401');
  r = await call('GET', '/api/register'); assert.equal(r.status, 405); ok('wrong HTTP method -> 405');
  r = await call('POST', '/api/register', { username: 'ab', email: 'x', password: '123' }); assert.equal(r.status, 400); ok('rejects invalid registration');
  r = await call('POST', '/api/register', { username: 'Reyyan', email: 'reyyan@example.com', password: 'Str0ng!pass' }); assert.equal(r.status, 201); assert.ok(!JSON.stringify(r.data).includes('hash')); assert.equal(r.data.user.username, 'Reyyan'); ok('registers user (no hash leaked)');
  r = await call('POST', '/api/register', { username: 'reyyan', email: 'other@example.com', password: 'Str0ng!pass' }); assert.equal(r.status, 409); ok('duplicate username (case-insensitive) -> 409');
  r = await call('POST', '/api/login', { username: 'Reyyan', password: 'wrong' }); assert.equal(r.status, 401); ok('wrong password -> 401');
  r = await call('POST', '/api/login', { username: 'nobody', password: 'x12345' }); assert.equal(r.status, 401); ok('unknown user -> 401');
  r = await call('POST', '/api/login', { username: 'reyyan@example.com', password: 'Str0ng!pass', remember: true });
  assert.equal(r.status, 200); assert.match(r.raw, /HttpOnly/); assert.match(r.raw, /Max-Age=2592000/); assert.equal(r.data.redirectUrl, 'https://reyyanabbas.vercel.app'); ok('login by email, HttpOnly cookie, 30-day remember, redirect URL');
  r = await call('GET', '/api/me'); assert.equal(r.status, 200); assert.equal(r.data.user.username, 'Reyyan'); ok('/api/me with session');
  r = await call('POST', '/api/logout'); assert.equal(r.status, 200); r = await call('GET', '/api/me'); assert.equal(r.status, 401); ok('logout ends the session');

  let link = ''; const orig = console.log; console.log = (...a) => { const s = a.join(' '); if (s.startsWith('[reset]')) link = s.split('-> ')[1]; };
  r = await call('POST', '/api/forgot', { email: 'reyyan@example.com' }); console.log = orig;
  assert.equal(r.status, 200); assert.ok(link.includes('?reset=')); ok('forgot password creates a link');
  r = await call('POST', '/api/forgot', { email: 'ghost@example.com' }); assert.equal(r.status, 200); ok('unknown email gets the same answer');
  const token = new URL(link).searchParams.get('reset');
  r = await call('POST', '/api/reset', { token: 'bad', password: 'NewPass123' }); assert.equal(r.status, 400); ok('bad reset token rejected');
  r = await call('POST', '/api/reset', { token, password: 'NewPass123' }); assert.equal(r.status, 200); ok('password reset works');
  r = await call('POST', '/api/reset', { token, password: 'Another123' }); assert.equal(r.status, 400); ok('reset link is single-use');
  r = await call('POST', '/api/login', { username: 'reyyan', password: 'Str0ng!pass' }); assert.equal(r.status, 401); ok('old password rejected');
  r = await call('POST', '/api/login', { username: 'reyyan', password: 'NewPass123' }); assert.equal(r.status, 200); ok('new password accepted');

  r = await call('GET', '/api/config', null, { Origin: 'https://reyyanabbas.vercel.app' });
  assert.equal(r.headers.get('access-control-allow-origin'), 'https://reyyanabbas.vercel.app'); assert.equal(r.headers.get('access-control-allow-credentials'), 'true'); ok('CORS allows your site');
  r = await call('GET', '/api/config', null, { Origin: 'https://evil.example' }); assert.equal(r.headers.get('access-control-allow-origin'), null); ok('CORS denies other sites');
  r = await call('POST', '/api/login', { username: 'reyyan', password: 'NewPass123' }, { Origin: 'https://evil.example' }); assert.equal(r.status, 403); ok('cross-site POST blocked');

  let limited = false; for (let i = 0; i < 15; i++) { r = await call('POST', '/api/login', { username: 'reyyan', password: 'bad' + i }); if (r.status === 429) { limited = true; break; } }
  assert.ok(limited); ok('login rate limit works (stored in DB)');
  console.log('  All passed.'); process.exit(0);
})().catch(e => { console.error('FAILED:', e); process.exit(1); });
