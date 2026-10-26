'use strict';
/**
 * NEXA GRID auth server — zero dependencies.
 * Node >= 22.5 (built-in node:sqlite), scrypt password hashing, DB-backed sessions.
 */
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { DatabaseSync } = require('node:sqlite');

// ---------- tiny .env loader ----------
try {
  for (const line of fs.readFileSync(path.join(__dirname, '.env'), 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
} catch (_) {}

const PORT = Number(process.env.PORT) || 3000;
const PROD = process.env.NODE_ENV === 'production';
const REDIRECT_URL = process.env.REDIRECT_URL || 'https://reyyanabbas.vercel.app';
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'https://reyyanabbas.vercel.app')
  .split(',').map(s => s.trim()).filter(Boolean);
const SAMESITE = (process.env.COOKIE_SAMESITE || 'lax').toLowerCase() === 'none' ? 'None' : 'Lax';
const PUBLIC_URL = (process.env.PUBLIC_URL || `http://localhost:${PORT}`).replace(/\/$/, '');
const RESET_WEBHOOK_URL = process.env.RESET_WEBHOOK_URL || '';
const DB_PATH = path.resolve(process.env.DB_PATH || path.join(__dirname, 'data', 'app.db'));
const PUBLIC_DIR = path.join(__dirname, 'public');
const COOKIE = 'nexa_sid';
const SESSION_TTL = 24 * 3600e3;            // 1 day
const SESSION_TTL_REMEMBER = 30 * 24 * 3600e3; // 30 days
const RESET_TTL = 3600e3;                   // 1 hour

// ---------- database ----------
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
const db = new DatabaseSync(DB_PATH);
db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE COLLATE NOCASE,
    email TEXT NOT NULL UNIQUE COLLATE NOCASE,
    password_hash TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    last_login_at INTEGER
  );
  CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS resets (
    token_hash TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at INTEGER NOT NULL
  );
`);
const q = {
  userByName: db.prepare('SELECT * FROM users WHERE username = ? OR email = ?'),
  userById: db.prepare('SELECT id, username, email, created_at, last_login_at FROM users WHERE id = ?'),
  userByEmail: db.prepare('SELECT * FROM users WHERE email = ?'),
  insertUser: db.prepare('INSERT INTO users (username, email, password_hash, created_at) VALUES (?, ?, ?, ?)'),
  touchLogin: db.prepare('UPDATE users SET last_login_at = ? WHERE id = ?'),
  setPassword: db.prepare('UPDATE users SET password_hash = ? WHERE id = ?'),
  insSession: db.prepare('INSERT INTO sessions (token_hash, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)'),
  getSession: db.prepare('SELECT * FROM sessions WHERE token_hash = ?'),
  delSession: db.prepare('DELETE FROM sessions WHERE token_hash = ?'),
  delUserSessions: db.prepare('DELETE FROM sessions WHERE user_id = ?'),
  insReset: db.prepare('INSERT INTO resets (token_hash, user_id, expires_at) VALUES (?, ?, ?)'),
  getReset: db.prepare('SELECT * FROM resets WHERE token_hash = ?'),
  delReset: db.prepare('DELETE FROM resets WHERE token_hash = ?'),
  delUserResets: db.prepare('DELETE FROM resets WHERE user_id = ?'),
  gc1: db.prepare('DELETE FROM sessions WHERE expires_at < ?'),
  gc2: db.prepare('DELETE FROM resets WHERE expires_at < ?'),
};
setInterval(() => { const n = Date.now(); q.gc1.run(n); q.gc2.run(n); }, 3600e3).unref();

// ---------- crypto helpers ----------
const sha256 = s => crypto.createHash('sha256').update(s).digest('hex');
function hashPassword(pw) {
  const salt = crypto.randomBytes(16);
  const key = crypto.scryptSync(pw, salt, 64, { N: 16384, r: 8, p: 1 });
  return `scrypt$${salt.toString('hex')}$${key.toString('hex')}`;
}
function verifyPassword(pw, stored) {
  const [alg, saltHex, keyHex] = String(stored).split('$');
  if (alg !== 'scrypt') return false;
  const key = crypto.scryptSync(pw, Buffer.from(saltHex, 'hex'), 64, { N: 16384, r: 8, p: 1 });
  const expected = Buffer.from(keyHex, 'hex');
  return key.length === expected.length && crypto.timingSafeEqual(key, expected);
}
const DUMMY_HASH = hashPassword('dummy-password-for-timing');

// ---------- http helpers ----------
class HttpError extends Error { constructor(status, message) { super(message); this.status = status; } }

function clientIp(req) {
  const xff = req.headers['x-forwarded-for'];
  return (xff ? String(xff).split(',')[0].trim() : req.socket.remoteAddress) || 'unknown';
}
function parseCookies(req) {
  const out = {};
  for (const part of String(req.headers.cookie || '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}
function setCookie(res, value, maxAgeSec) {
  const secure = PROD || SAMESITE === 'None';
  res.setHeader('Set-Cookie',
    `${COOKIE}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=${SAMESITE}; Max-Age=${maxAgeSec}` +
    (secure ? '; Secure' : ''));
}
function send(res, status, body, headers = {}) {
  const isObj = body !== null && typeof body === 'object';
  const payload = isObj ? JSON.stringify(body) : (body || '');
  res.writeHead(status, {
    'Content-Type': isObj ? 'application/json; charset=utf-8' : 'text/plain; charset=utf-8',
    'Cache-Control': 'no-store',
    ...headers,
  });
  res.end(payload);
}
function readJson(req) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on('data', c => {
      size += c.length;
      if (size > 10 * 1024) { reject(new HttpError(413, 'Request too large')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => {
      if (!chunks.length) return resolve({});
      try { const v = JSON.parse(Buffer.concat(chunks).toString('utf8')); resolve(v && typeof v === 'object' ? v : {}); }
      catch { reject(new HttpError(400, 'Invalid JSON')); }
    });
    req.on('error', reject);
  });
}

// ---------- rate limiting (in-memory, per IP + bucket) ----------
const hits = new Map();
function rateLimit(req, bucket, max, windowMs) {
  const key = `${bucket}:${clientIp(req)}`;
  const now = Date.now();
  const rec = hits.get(key);
  if (!rec || rec.reset < now) { hits.set(key, { count: 1, reset: now + windowMs }); return; }
  if (++rec.count > max) throw new HttpError(429, 'Too many attempts. Please wait a few minutes and try again.');
}
setInterval(() => { const n = Date.now(); for (const [k, v] of hits) if (v.reset < n) hits.delete(k); }, 600e3).unref();

// ---------- validation ----------
const USERNAME_RE = /^[A-Za-z0-9_.-]{3,24}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const str = v => (typeof v === 'string' ? v : '');
function validPassword(pw) {
  if (pw.length < 6) throw new HttpError(400, 'Password must be at least 6 characters.');
  if (pw.length > 128) throw new HttpError(400, 'Password is too long.');
}

// ---------- sessions ----------
function createSession(res, userId, remember) {
  const token = crypto.randomBytes(32).toString('base64url');
  const ttl = remember ? SESSION_TTL_REMEMBER : SESSION_TTL;
  q.insSession.run(sha256(token), userId, Date.now() + ttl, Date.now());
  setCookie(res, token, Math.floor(ttl / 1000));
}
function currentUser(req) {
  const token = parseCookies(req)[COOKIE];
  if (!token) return null;
  const s = q.getSession.get(sha256(token));
  if (!s) return null;
  if (s.expires_at < Date.now()) { q.delSession.run(s.token_hash); return null; }
  return q.userById.get(s.user_id) || null;
}
const publicUser = u => ({ id: u.id, username: u.username, email: u.email, createdAt: u.created_at, lastLoginAt: u.last_login_at });

// ---------- password reset delivery ----------
async function deliverReset(user, link) {
  console.log(`[reset] ${user.email} -> ${link}`);
  if (!RESET_WEBHOOK_URL) return;
  try {
    await fetch(RESET_WEBHOOK_URL, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'password_reset', to: user.email, username: user.username, link, expiresInMinutes: RESET_TTL / 60000 }),
    });
  } catch (e) { console.error('[reset] webhook failed:', e.message); }
}

// ---------- API routes ----------
const routes = {
  'GET /api/config': async () => ({ status: 200, body: { redirectUrl: REDIRECT_URL } }),

  'GET /api/me': async (req) => {
    const user = currentUser(req);
    return user ? { status: 200, body: { user: publicUser(user) } } : { status: 401, body: { error: 'Not signed in.' } };
  },

  'POST /api/register': async (req, res) => {
    rateLimit(req, 'register', 10, 15 * 60e3);
    const b = await readJson(req);
    const username = str(b.username).trim(), email = str(b.email).trim().toLowerCase(), password = str(b.password);
    if (!USERNAME_RE.test(username)) throw new HttpError(400, 'Username must be 3–24 characters (letters, numbers, _ . -).');
    if (!EMAIL_RE.test(email) || email.length > 254) throw new HttpError(400, 'Please enter a valid email address.');
    validPassword(password);
    if (q.userByName.get(username, email)) throw new HttpError(409, 'That username or email is already registered.');
    let id;
    try { id = Number(q.insertUser.run(username, email, hashPassword(password), Date.now()).lastInsertRowid); }
    catch (e) { if (/UNIQUE/.test(e.message)) throw new HttpError(409, 'That username or email is already registered.'); throw e; }
    return { status: 201, body: { user: publicUser(q.userById.get(id)) } };
  },

  'POST /api/login': async (req, res) => {
    rateLimit(req, 'login', 10, 15 * 60e3);
    const b = await readJson(req);
    const id = str(b.username).trim(), password = str(b.password);
    if (!id || !password) throw new HttpError(400, 'Username and password are required.');
    const row = q.userByName.get(id, id.toLowerCase());
    const ok = verifyPassword(password, row ? row.password_hash : DUMMY_HASH); // constant-ish time
    if (!row || !ok) throw new HttpError(401, 'Invalid username or password.');
    q.touchLogin.run(Date.now(), row.id);
    createSession(res, row.id, !!b.remember);
    return { status: 200, body: { user: publicUser(q.userById.get(row.id)), redirectUrl: REDIRECT_URL } };
  },

  'POST /api/logout': async (req, res) => {
    const token = parseCookies(req)[COOKIE];
    if (token) q.delSession.run(sha256(token));
    setCookie(res, '', 0);
    return { status: 200, body: { ok: true } };
  },

  'POST /api/forgot': async (req) => {
    rateLimit(req, 'forgot', 5, 15 * 60e3);
    const b = await readJson(req);
    const email = str(b.email).trim().toLowerCase();
    if (!EMAIL_RE.test(email)) throw new HttpError(400, 'Please enter a valid email address.');
    const user = q.userByEmail.get(email);
    if (user) {
      q.delUserResets.run(user.id);
      const token = crypto.randomBytes(32).toString('base64url');
      q.insReset.run(sha256(token), user.id, Date.now() + RESET_TTL);
      await deliverReset(user, `${PUBLIC_URL}/?reset=${token}`);
    }
    // Same response either way so emails can't be enumerated.
    return { status: 200, body: { ok: true, message: 'If that email is registered, a reset link has been sent.' } };
  },

  'POST /api/reset': async (req) => {
    rateLimit(req, 'reset', 10, 15 * 60e3);
    const b = await readJson(req);
    const token = str(b.token), password = str(b.password);
    validPassword(password);
    const r = token ? q.getReset.get(sha256(token)) : null;
    if (!r || r.expires_at < Date.now()) throw new HttpError(400, 'This reset link is invalid or has expired.');
    q.setPassword.run(hashPassword(password), r.user_id);
    q.delUserResets.run(r.user_id);
    q.delUserSessions.run(r.user_id); // sign out everywhere
    return { status: 200, body: { ok: true } };
  },
};

// ---------- static files ----------
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon', '.webp': 'image/webp', '.txt': 'text/plain' };
function serveStatic(req, res, pathname) {
  let rel = decodeURIComponent(pathname);
  if (rel.endsWith('/')) rel += 'index.html';
  const file = path.normalize(path.join(PUBLIC_DIR, rel));
  if (!file.startsWith(PUBLIC_DIR + path.sep)) return send(res, 403, 'Forbidden');
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) return send(res, 404, 'Not found');
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream',
      'Cache-Control': path.extname(file) === '.html' ? 'no-cache' : 'public, max-age=3600' });
    if (req.method === 'HEAD') return res.end();
    fs.createReadStream(file).pipe(res);
  });
}

// ---------- server ----------
const server = http.createServer(async (req, res) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  if (PROD) res.setHeader('Strict-Transport-Security', 'max-age=15552000; includeSubDomains');

  let url;
  try { url = new URL(req.url, 'http://x'); } catch { return send(res, 400, 'Bad request'); }
  const pathname = url.pathname;

  if (pathname.startsWith('/api/')) {
    // CORS (credentials only for allow-listed origins)
    const origin = req.headers.origin;
    let crossOrigin = false;
    if (origin) { try { crossOrigin = new URL(origin).host !== req.headers.host; } catch { crossOrigin = true; } }
    if (origin && ALLOWED_ORIGINS.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
      res.setHeader('Vary', 'Origin');
    }
    if (req.method === 'OPTIONS') return send(res, 204, '');
    // CSRF: state-changing requests from a foreign origin must be allow-listed.
    if (req.method === 'POST' && origin && crossOrigin && !ALLOWED_ORIGINS.includes(origin)) {
      return send(res, 403, { error: 'Origin not allowed.' });
    }
    const handler = routes[`${req.method} ${pathname}`];
    if (!handler) return send(res, 404, { error: 'Not found.' });
    try {
      const out = await handler(req, res);
      return send(res, out.status, out.body);
    } catch (e) {
      if (e instanceof HttpError) return send(res, e.status, { error: e.message });
      console.error(e);
      return send(res, 500, { error: 'Something went wrong on our side.' });
    }
  }

  if (pathname === '/healthz') return send(res, 200, { ok: true });
  if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, 'Method not allowed');
  serveStatic(req, res, pathname);
});

if (require.main === module) {
  server.listen(PORT, () => console.log(`NEXA GRID running on http://localhost:${PORT}  (db: ${DB_PATH})`));
  const shutdown = () => { server.close(() => { try { db.close(); } catch (_) {} process.exit(0); }); setTimeout(() => process.exit(0), 3000).unref(); };
  process.on('SIGTERM', shutdown); process.on('SIGINT', shutdown);
}
module.exports = { server };
