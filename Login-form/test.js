'use strict';
// End-to-end smoke test: node test.js
const os = require('node:os'), path = require('node:path'), fs = require('node:fs'), assert = require('node:assert/strict');
process.env.DB_PATH = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'nexa-')), 'test.db');
process.env.NODE_ENV = 'test';
const { server } = require('./server.js');

(async () => {
  await new Promise(r => server.listen(0, r));
  const base = `http://127.0.0.1:${server.address().port}`;
  let cookie = '';
  const call = async (method, url, body, extra = {}) => {
    const r = await fetch(base + url, { method, headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}), ...extra }, body: body ? JSON.stringify(body) : undefined });
    const sc = r.headers.get('set-cookie'); if (sc) cookie = sc.split(';')[0].endsWith('=') ? '' : sc.split(';')[0];
    return { status: r.status, data: await r.json().catch(() => ({})), headers: r.headers, raw: sc };
  };
  const ok = (n) => console.log('  ✓', n);

  let r = await call('GET', '/'); assert.equal(r.status, 200); ok('serves index.html');
  r = await call('GET', '/../server.js'); assert.notEqual(r.status, 200); ok('blocks path traversal');
  r = await call('GET', '/api/me'); assert.equal(r.status, 401); ok('/api/me unauthenticated -> 401');
  r = await call('POST', '/api/register', { username: 'ab', email: 'x', password: '123' }); assert.equal(r.status, 400); ok('rejects invalid registration');
  r = await call('POST', '/api/register', { username: 'Reyyan', email: 'reyyan@example.com', password: 'Str0ng!pass' }); assert.equal(r.status, 201); assert.ok(!JSON.stringify(r.data).includes('hash')); ok('registers user (no hash leaked)');
  r = await call('POST', '/api/register', { username: 'reyyan', email: 'other@example.com', password: 'Str0ng!pass' }); assert.equal(r.status, 409); ok('duplicate username (case-insensitive) -> 409');
  r = await call('POST', '/api/login', { username: 'Reyyan', password: 'wrong' }); assert.equal(r.status, 401); ok('wrong password -> 401');
  r = await call('POST', '/api/login', { username: 'nobody', password: 'x12345' }); assert.equal(r.status, 401); ok('unknown user -> 401');
  r = await call('POST', '/api/login', { username: 'reyyan@example.com', password: 'Str0ng!pass', remember: true });
  assert.equal(r.status, 200); assert.match(r.raw, /HttpOnly/); assert.match(r.raw, /SameSite=Lax/); assert.equal(r.data.redirectUrl, 'https://reyyanabbas.vercel.app'); ok('login by email, HttpOnly cookie, redirect URL');
  r = await call('GET', '/api/me'); assert.equal(r.status, 200); assert.equal(r.data.user.username, 'Reyyan'); ok('/api/me with session');
  r = await call('POST', '/api/logout'); assert.equal(r.status, 200); r = await call('GET', '/api/me'); assert.equal(r.status, 401); ok('logout invalidates session');

  // password reset (capture link from console)
  let link = ''; const orig = console.log; console.log = (...a) => { const s = a.join(' '); if (s.startsWith('[reset]')) link = s.split('-> ')[1]; };
  r = await call('POST', '/api/forgot', { email: 'reyyan@example.com' }); console.log = orig;
  assert.equal(r.status, 200); assert.ok(link.includes('?reset=')); ok('forgot password issues link');
  r = await call('POST', '/api/forgot', { email: 'ghost@example.com' }); assert.equal(r.status, 200); ok('unknown email gets identical response');
  const token = new URL(link).searchParams.get('reset');
  r = await call('POST', '/api/reset', { token: 'bad', password: 'NewPass123' }); assert.equal(r.status, 400); ok('bad reset token rejected');
  r = await call('POST', '/api/reset', { token, password: 'NewPass123' }); assert.equal(r.status, 200); ok('reset password');
  r = await call('POST', '/api/reset', { token, password: 'Another123' }); assert.equal(r.status, 400); ok('reset token is single-use');
  r = await call('POST', '/api/login', { username: 'reyyan', password: 'Str0ng!pass' }); assert.equal(r.status, 401); ok('old password no longer works');
  r = await call('POST', '/api/login', { username: 'reyyan', password: 'NewPass123' }); assert.equal(r.status, 200); ok('new password works');

  // CORS / CSRF
  r = await call('GET', '/api/config', null, { Origin: 'https://reyyanabbas.vercel.app' });
  assert.equal(r.headers.get('access-control-allow-origin'), 'https://reyyanabbas.vercel.app'); assert.equal(r.headers.get('access-control-allow-credentials'), 'true'); ok('CORS allows the Vercel site with credentials');
  r = await call('GET', '/api/config', null, { Origin: 'https://evil.example' }); assert.equal(r.headers.get('access-control-allow-origin'), null); ok('CORS denies other origins');
  r = await call('POST', '/api/login', { username: 'reyyan', password: 'NewPass123' }, { Origin: 'https://evil.example' }); assert.equal(r.status, 403); ok('cross-site POST from unknown origin blocked');

  // rate limit
  let limited = false; for (let i = 0; i < 15; i++) { r = await call('POST', '/api/login', { username: 'reyyan', password: 'bad' + i }); if (r.status === 429) { limited = true; break; } }
  assert.ok(limited); ok('login rate limiting kicks in');

  console.log('\nAll tests passed.'); server.close(); process.exit(0);
})().catch(e => { console.error('FAILED:', e); process.exit(1); });
