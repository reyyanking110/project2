'use strict';
/**
 * Database adapter.
 *  - TURSO_URL + TURSO_TOKEN set  -> Turso (hosted SQLite) over HTTPS. Used on Vercel.
 *  - otherwise                    -> local SQLite file via node:sqlite (for running on your PC).
 * Both expose:  await db.query(sql, [args])  ->  { rows: [{col: value}], lastId }
 */
const path = require('node:path');
const fs = require('node:fs');

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS users (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     username TEXT NOT NULL UNIQUE COLLATE NOCASE,
     email TEXT NOT NULL UNIQUE COLLATE NOCASE,
     password_hash TEXT NOT NULL,
     created_at INTEGER NOT NULL,
     last_login_at INTEGER)`,
  `CREATE TABLE IF NOT EXISTS sessions (
     token_hash TEXT PRIMARY KEY,
     user_id INTEGER NOT NULL,
     expires_at INTEGER NOT NULL,
     created_at INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS resets (
     token_hash TEXT PRIMARY KEY,
     user_id INTEGER NOT NULL,
     expires_at INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS rate_limits (
     k TEXT PRIMARY KEY,
     count INTEGER NOT NULL,
     reset_at INTEGER NOT NULL)`,
];

function tursoAdapter(url, token) {
  const endpoint = url.replace(/^libsql:\/\//, 'https://').replace(/\/$/, '') + '/v2/pipeline';
  const enc = v => v === null || v === undefined ? { type: 'null' }
    : typeof v === 'number' ? (Number.isInteger(v) ? { type: 'integer', value: String(v) } : { type: 'float', value: v })
    : { type: 'text', value: String(v) };
  const dec = c => c.type === 'null' ? null : c.type === 'integer' ? Number(c.value) : c.type === 'float' ? Number(c.value) : c.value;

  async function pipeline(stmts) {
    const requests = stmts.map(([sql, args = []]) => ({ type: 'execute', stmt: { sql, args: args.map(enc) } }));
    requests.push({ type: 'close' });
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ requests }),
    });
    if (!res.ok) throw new Error(`Turso HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
    const data = await res.json();
    return data.results.slice(0, stmts.length).map(r => {
      if (r.type === 'error') { const e = new Error(r.error && r.error.message || 'Turso error'); throw e; }
      const result = r.response.result;
      const cols = result.cols.map(c => c.name);
      return {
        rows: result.rows.map(row => Object.fromEntries(row.map((cell, i) => [cols[i], dec(cell)]))),
        lastId: result.last_insert_rowid != null ? Number(result.last_insert_rowid) : null,
      };
    });
  }
  return { pipeline, query: async (sql, args) => (await pipeline([[sql, args]]))[0] };
}

function localAdapter() {
  const { DatabaseSync } = require('node:sqlite');
  const file = path.resolve(process.env.DB_PATH || path.join(__dirname, '..', 'data', 'app.db'));
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec('PRAGMA journal_mode = WAL;');
  const query = async (sql, args = []) => {
    const st = db.prepare(sql);
    if (/^\s*(select|pragma)|\breturning\b/i.test(sql)) return { rows: st.all(...args).map(r => ({ ...r })), lastId: null };
    const info = st.run(...args);
    return { rows: [], lastId: Number(info.lastInsertRowid) };
  };
  return { query, pipeline: async stmts => { const out = []; for (const [s, a] of stmts) out.push(await query(s, a)); return out; } };
}

let ready = null;
function getDb() {
  if (!ready) {
    ready = (async () => {
      const url = process.env.TURSO_URL, token = process.env.TURSO_TOKEN;
      const db = url ? tursoAdapter(url, token || '') : localAdapter();
      await db.pipeline(SCHEMA.map(s => [s]));
      return db;
    })().catch(e => { ready = null; throw e; });
  }
  return ready;
}
module.exports = { getDb };
