'use strict';
const crypto = require('node:crypto');
const { getDb } = require('./db');

const env = (k, d = '') => process.env[k] || d;
const REDIRECT_URL = () => env('REDIRECT_URL', 'https://reyyanabbas.vercel.app');
const ALLOWED_ORIGINS = () => env('ALLOWED_ORIGINS', 'https://reyyanabbas.vercel.app').split(',').map(s => s.trim()).filter(Boolean);
const SAMESITE = () => (env('COOKIE_SAMESITE', 'lax').toLowerCase() === 'none' ? 'None' : 'Lax');
const COOKIE = 'nexa_sid';
const SESSION_TTL = 24 * 3600e3, SESSION_TTL_REMEMBER = 30 * 24 * 3600e3, RESET_TTL = 3600e3;

class HttpError extends Error { constructor(status, message) { super(message); this.status = status; } }

// ---- crypto ----
const sha256 = s => crypto.createHash('sha256').update(s).digest('hex');
const SCRYPT = { N: 16384, r: 8, p: 1 };
function hashPassword(pw) {
  const salt = crypto.randomBytes(16);
  return `scrypt$${salt.toString('hex')}$${crypto.scryptSync(pw, salt, 64, SCRYPT).toString('hex')}`;
}
function verifyPassword(pw, stored) {
  const [alg, s, k] = String(stored).split('$');
  if (alg !== 'scrypt') return false;
  const key = crypto.scryptSync(pw, Buffer.from(s, 'hex'), 64, SCRYPT), exp = Buffer.from(k, 'hex');
  return key.length === exp.length && crypto.timingSafeEqual(key, exp);
}
let DUMMY; const dummyHash = () => (DUMMY = DUMMY || hashPassword('dummy-password-for-timing'));

// ---- request helpers ----
const header = (req, n) => { const v = req.headers[n]; return Array.isArray(v) ? v[0] : v; };
const clientIp = req => (header(req, 'x-forwarded-for') || req.socket.remoteAddress || 'unknown').split(',')[0].trim();
function parseCookies(req) {
  const out = {};
  for (const part of String(header(req, 'cookie') || '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}
function setCookie(res, value, maxAgeSec) {
  const secure = env('NODE_ENV') === 'production' || env('VERCEL') || SAMESITE() === 'None';
  res.setHeader('Set-Cookie', `${COOKIE}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=${SAMESITE()}; Max-Age=${maxAgeSec}${secure ? '; Secure' : ''}`);
}
async function readBody(req) {
  if (req.body !== undefined && req.body !== null) { // Vercel pre-parses JSON
    if (typeof req.body === 'object' && !Buffer.isBuffer(req.body)) return req.body;
    try { const v = JSON.parse(String(req.body)); return v && typeof v === 'object' ? v : {}; } catch { throw new HttpError(400, 'Invalid JSON'); }
  }
  const chunks = []; let size = 0;
  for await (const c of req) { size += c.length; if (size > 10 * 1024) throw new HttpError(413, 'Request too large'); chunks.push(c); }
  if (!chunks.length) return {};
  try { const v = JSON.parse(Buffer.concat(chunks).toString('utf8')); return v && typeof v === 'object' ? v : {}; } catch { throw new HttpError(400, 'Invalid JSON'); }
}
function sendJson(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

// ---- rate limiting (stored in the DB so it works across serverless instances) ----
async function rateLimit(req, bucket, max, windowMs) {
  const db = await getDb(), now = Date.now(), key = `${bucket}:${clientIp(req)}`;
  const { rows } = await db.query(
    `INSERT INTO rate_limits (k, count, reset_at) VALUES (?, 1, ?)
     ON CONFLICT(k) DO UPDATE SET
       count = CASE WHEN rate_limits.reset_at < ? THEN 1 ELSE rate_limits.count + 1 END,
       reset_at = CASE WHEN rate_limits.reset_at < ? THEN ? ELSE rate_limits.reset_at END
     RETURNING count`, [key, now + windowMs, now, now, now + windowMs]);
  if (rows[0].count > max) throw new HttpError(429, 'Too many attempts. Please wait a few minutes and try again.');
}

// ---- validation ----
const USERNAME_RE = /^[A-Za-z0-9_.-]{3,24}$/, EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const str = v => (typeof v === 'string' ? v : '');
function validPassword(pw) {
  if (pw.length < 6) throw new HttpError(400, 'Password must be at least 6 characters.');
  if (pw.length > 128) throw new HttpError(400, 'Password is too long.');
}
const publicUser = u => ({ id: u.id, username: u.username, email: u.email, createdAt: u.created_at, lastLoginAt: u.last_login_at });

// ---- sessions ----
async function createSession(res, userId, remember) {
  const db = await getDb(), token = crypto.randomBytes(32).toString('base64url');
  const ttl = remember ? SESSION_TTL_REMEMBER : SESSION_TTL;
  await db.query('INSERT INTO sessions (token_hash, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)', [sha256(token), userId, Date.now() + ttl, Date.now()]);
  setCookie(res, token, Math.floor(ttl / 1000));
}
async function currentUser(req) {
  const token = parseCookies(req)[COOKIE]; if (!token) return null;
  const db = await getDb();
  const { rows } = await db.query(
    `SELECT u.id, u.username, u.email, u.created_at, u.last_login_at FROM sessions s JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = ? AND s.expires_at > ?`, [sha256(token), Date.now()]);
  return rows[0] || null;
}

// ---- password reset delivery ----
async function deliverReset(user, link) {
  console.log(`[reset] ${user.email} -> ${link}`);
  try {
    if (env('RESEND_API_KEY')) {
      await fetch('https://api.resend.com/emails', {
        method: 'POST', headers: { Authorization: `Bearer ${env('RESEND_API_KEY')}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: env('RESEND_FROM', 'NEXA GRID <onboarding@resend.dev>'), to: [user.email], subject: 'Reset your password',
          html: `<p>Hi ${user.username.replace(/[<>&"]/g, '')},</p><p><a href="${link}">Click here to reset your password</a>. This link expires in 1 hour.</p><p>If you didn't ask for this, ignore this email.</p>` }),
      });
    } else if (env('RESET_WEBHOOK_URL')) {
      await fetch(env('RESET_WEBHOOK_URL'), { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'password_reset', to: user.email, username: user.username, link, expiresInMinutes: 60 }) });
    }
  } catch (e) { console.error('[reset] delivery failed:', e.message); }
}
function baseUrl(req) {
  if (env('PUBLIC_URL')) return env('PUBLIC_URL').replace(/\/$/, '');
  const proto = header(req, 'x-forwarded-proto') || 'http';
  return `${proto}://${header(req, 'host')}`;
}

// ---- route handlers: (req,res) -> {status, body} ----
const routes = {
  config: async () => ({ status: 200, body: { redirectUrl: REDIRECT_URL() } }),

  me: async (req) => {
    const u = await currentUser(req);
    return u ? { status: 200, body: { user: publicUser(u) } } : { status: 401, body: { error: 'Not signed in.' } };
  },

  register: async (req) => {
    await rateLimit(req, 'register', 10, 15 * 60e3);
    const b = await readBody(req), db = await getDb();
    const username = str(b.username).trim(), email = str(b.email).trim().toLowerCase(), password = str(b.password);
    if (!USERNAME_RE.test(username)) throw new HttpError(400, 'Username must be 3–24 characters (letters, numbers, _ . -).');
    if (!EMAIL_RE.test(email) || email.length > 254) throw new HttpError(400, 'Please enter a valid email address.');
    validPassword(password);
    const taken = await db.query('SELECT id FROM users WHERE username = ? OR email = ?', [username, email]);
    if (taken.rows.length) throw new HttpError(409, 'That username or email is already registered.');
    let id;
    try { id = (await db.query('INSERT INTO users (username, email, password_hash, created_at) VALUES (?, ?, ?, ?)', [username, email, hashPassword(password), Date.now()])).lastId; }
    catch (e) { if (/UNIQUE/i.test(e.message)) throw new HttpError(409, 'That username or email is already registered.'); throw e; }
    const { rows } = await db.query('SELECT id, username, email, created_at, last_login_at FROM users WHERE id = ?', [id]);
    return { status: 201, body: { user: publicUser(rows[0]) } };
  },

  login: async (req, res) => {
    await rateLimit(req, 'login', 10, 15 * 60e3);
    const b = await readBody(req), db = await getDb();
    const id = str(b.username).trim(), password = str(b.password);
    if (!id || !password) throw new HttpError(400, 'Username and password are required.');
    const { rows } = await db.query('SELECT * FROM users WHERE username = ? OR email = ?', [id, id.toLowerCase()]);
    const row = rows[0], ok = verifyPassword(password, row ? row.password_hash : dummyHash());
    if (!row || !ok) throw new HttpError(401, 'Invalid username or password.');
    await db.query('UPDATE users SET last_login_at = ? WHERE id = ?', [Date.now(), row.id]);
    await createSession(res, row.id, !!b.remember);
    return { status: 200, body: { user: publicUser({ ...row, last_login_at: Date.now() }), redirectUrl: REDIRECT_URL() } };
  },

  logout: async (req, res) => {
    const token = parseCookies(req)[COOKIE];
    if (token) await (await getDb()).query('DELETE FROM sessions WHERE token_hash = ?', [sha256(token)]);
    setCookie(res, '', 0);
    return { status: 200, body: { ok: true } };
  },

  forgot: async (req) => {
    await rateLimit(req, 'forgot', 5, 15 * 60e3);
    const b = await readBody(req), db = await getDb(), email = str(b.email).trim().toLowerCase();
    if (!EMAIL_RE.test(email)) throw new HttpError(400, 'Please enter a valid email address.');
    const { rows } = await db.query('SELECT id, username, email FROM users WHERE email = ?', [email]);
    if (rows[0]) {
      const token = crypto.randomBytes(32).toString('base64url');
      await db.query('DELETE FROM resets WHERE user_id = ?', [rows[0].id]);
      await db.query('INSERT INTO resets (token_hash, user_id, expires_at) VALUES (?, ?, ?)', [sha256(token), rows[0].id, Date.now() + RESET_TTL]);
      await deliverReset(rows[0], `${baseUrl(req)}/?reset=${token}`);
    }
    return { status: 200, body: { ok: true, message: 'If that email is registered, a reset link has been sent.' } };
  },

  reset: async (req) => {
    await rateLimit(req, 'reset', 10, 15 * 60e3);
    const b = await readBody(req), db = await getDb(), token = str(b.token), password = str(b.password);
    validPassword(password);
    const { rows } = token ? await db.query('SELECT user_id FROM resets WHERE token_hash = ? AND expires_at > ?', [sha256(token), Date.now()]) : { rows: [] };
    if (!rows[0]) throw new HttpError(400, 'This reset link is invalid or has expired.');
    const uid = rows[0].user_id;
    await db.query('UPDATE users SET password_hash = ? WHERE id = ?', [hashPassword(password), uid]);
    await db.query('DELETE FROM resets WHERE user_id = ?', [uid]);
    await db.query('DELETE FROM sessions WHERE user_id = ?', [uid]);
    return { status: 200, body: { ok: true } };
  },
};
const METHOD = { config: 'GET', me: 'GET' };

/** Wraps a route into a (req, res) handler usable by Vercel and by dev-server.js */
function makeHandler(name) {
  return async function handler(req, res) {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    const origin = header(req, 'origin');
    if (origin && ALLOWED_ORIGINS().includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
      res.setHeader('Vary', 'Origin');
    }
    if (req.method === 'OPTIONS') { res.statusCode = 204; return res.end(); }
    if (req.method !== (METHOD[name] || 'POST')) return sendJson(res, 405, { error: 'Method not allowed.' });
    if (req.method === 'POST' && origin) { // CSRF: foreign origins must be allow-listed
      let foreign = true; try { foreign = new URL(origin).host !== header(req, 'host'); } catch {}
      if (foreign && !ALLOWED_ORIGINS().includes(origin)) return sendJson(res, 403, { error: 'Origin not allowed.' });
    }
    try {
      const out = await routes[name](req, res);
      return sendJson(res, out.status, out.body);
    } catch (e) {
      if (e instanceof HttpError) return sendJson(res, e.status, { error: e.message });
      console.error(e);
      return sendJson(res, 500, { error: 'Something went wrong on our side.' });
    }
  };
}
module.exports = { makeHandler, routes };
