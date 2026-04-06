import { readFile } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { scanInput } from '../services/scan_service.mjs';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const PUBLIC_DIR = join(__dirname, '..', 'public');

const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'application/javascript', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml' };

function json(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', c => chunks.push(c));
    req.on('end', () => { try { resolve(JSON.parse(Buffer.concat(chunks).toString())); } catch { resolve({}); } });
    req.on('error', reject);
  });
}

export async function router(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const path = url.pathname;
  const method = req.method;

  if (path === '/health' && method === 'GET') {
    return json(res, 200, { ok: true, name: 'trankill', version: '0.1.0' });
  }

  // POST /scan — Analyse un lien/message
  if (path === '/scan' && method === 'POST') {
    const body = await parseBody(req);
    const result = scanInput(body.input || body.url || body.message || '');
    return json(res, 200, result);
  }

  // Static files
  if (method === 'GET') {
    const filePath = path === '/' ? '/index.html' : path;
    if (filePath.includes('..')) return json(res, 403, { error: 'Forbidden' });
    try {
      const content = await readFile(join(PUBLIC_DIR, filePath));
      res.writeHead(200, { 'Content-Type': MIME[extname(filePath)] || 'application/octet-stream' });
      res.end(content);
      return;
    } catch {}
  }

  json(res, 404, { error: 'Not found' });
}
