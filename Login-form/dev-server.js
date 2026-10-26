'use strict';
// Local development server (same handlers as Vercel). Run: npm start
const http = require('node:http'), fs = require('node:fs'), path = require('node:path');
try { for (const l of fs.readFileSync(path.join(__dirname, '.env'), 'utf8').split(/\r?\n/)) { const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/); if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, ''); } } catch {}
const PUB = path.join(__dirname, 'public'), MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon' };
const handlers = {}; for (const f of fs.readdirSync(path.join(__dirname, 'api'))) handlers[f.replace(/\.js$/, '')] = require('./api/' + f);
const server = http.createServer((req, res) => {
  const p = new URL(req.url, 'http://x').pathname;
  const m = p.match(/^\/api\/([a-z]+)$/);
  if (m) return handlers[m[1]] ? handlers[m[1]](req, res) : (res.statusCode = 404, res.end('{"error":"Not found."}'));
  const file = path.normalize(path.join(PUB, p.endsWith('/') ? p + 'index.html' : p));
  if (!file.startsWith(PUB + path.sep)) { res.statusCode = 403; return res.end(); }
  fs.readFile(file, (e, buf) => { if (e) { res.statusCode = 404; return res.end('Not found'); } res.setHeader('Content-Type', MIME[path.extname(file)] || 'application/octet-stream'); res.end(buf); });
});
if (require.main === module) { const port = process.env.PORT || 3000; server.listen(port, () => console.log(`NEXA GRID on http://localhost:${port}  (database: ${process.env.TURSO_URL ? 'Turso' : 'local file'})`)); }
module.exports = { server };
