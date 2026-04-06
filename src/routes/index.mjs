import { readFile } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { scanInput } from '../services/scan_service.mjs';
import {
  createCircle,
  getCircle,
  addMember,
  sendAlert,
  listAlerts,
  markAlertRead,
  getCircleStats,
} from '../services/circle_service.mjs';

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

  // POST /circle — Create family circle
  if (path === '/circle' && method === 'POST') {
    try {
      const body = await parseBody(req);
      const result = createCircle(body.ownerName);
      return json(res, 201, result);
    } catch (err) {
      return json(res, 400, { error: err.message });
    }
  }

  // GET /circle/:circleId — Get circle info
  if (path.match(/^\/circle\/[a-f0-9]+$/) && method === 'GET') {
    try {
      const circleId = path.split('/')[2];
      const result = getCircle(circleId);
      return json(res, 200, result);
    } catch (err) {
      return json(res, 404, { error: err.message });
    }
  }

  // POST /circle/:circleId/members — Add member to circle
  if (path.match(/^\/circle\/[a-f0-9]+\/members$/) && method === 'POST') {
    try {
      const circleId = path.split('/')[2];
      const body = await parseBody(req);
      const result = addMember(circleId, body.inviteCode, body.memberName);
      return json(res, 201, result);
    } catch (err) {
      return json(res, 400, { error: err.message });
    }
  }

  // POST /circle/:circleId/alert — Send alert to circle
  if (path.match(/^\/circle\/[a-f0-9]+\/alert$/) && method === 'POST') {
    try {
      const circleId = path.split('/')[2];
      const body = await parseBody(req);
      const result = sendAlert(circleId, body);
      return json(res, 201, result);
    } catch (err) {
      return json(res, 400, { error: err.message });
    }
  }

  // GET /circle/:circleId/alerts — List alerts for circle
  if (path.match(/^\/circle\/[a-f0-9]+\/alerts$/) && method === 'GET') {
    try {
      const circleId = path.split('/')[2];
      const limit = parseInt(url.searchParams.get('limit') || '50');
      const result = listAlerts(circleId, limit);
      return json(res, 200, { alerts: result });
    } catch (err) {
      return json(res, 404, { error: err.message });
    }
  }

  // POST /circle/:circleId/alert/:alertId/read — Mark alert as read
  if (path.match(/^\/circle\/[a-f0-9]+\/alert\/[a-f0-9]+\/read$/) && method === 'POST') {
    try {
      const parts = path.split('/');
      const circleId = parts[2];
      const alertId = parts[4];
      markAlertRead(circleId, alertId);
      return json(res, 200, { ok: true });
    } catch (err) {
      return json(res, 404, { error: err.message });
    }
  }

  // GET /circle/:circleId/stats — Get circle statistics
  if (path.match(/^\/circle\/[a-f0-9]+\/stats$/) && method === 'GET') {
    try {
      const circleId = path.split('/')[2];
      const result = getCircleStats(circleId);
      return json(res, 200, result);
    } catch (err) {
      return json(res, 404, { error: err.message });
    }
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
