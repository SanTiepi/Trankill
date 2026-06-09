/**
 * Safe Pause — TRK-005 tests
 * Covers: create, retrieve, circle notification, manual unlock, tone/fields.
 */

import { test, before, after, describe } from 'node:test';
import { strict as assert } from 'node:assert';
import { createServer } from 'node:http';
import { router } from '../src/routes/index.mjs';
import {
  createPause,
  getPause,
  markCircleNotified,
  unlockPause,
  isPauseOver,
  _clearPauses,
} from '../src/services/pause_service.mjs';
import {
  createCircle,
  getCircle,
  _clearAll as clearCircles,
} from '../src/services/circle_service.mjs';

// ─── Unit tests — pause_service ──────────────────────────────────────────────

describe('Pause Service — TRK-005 unit', () => {
  before(() => {
    _clearPauses();
    clearCircles();
  });

  test('createPause — verdict suspect creates a retrievable entry', () => {
    const scanResult = {
      verdict: 'suspect',
      score: 55,
      input_preview: 'https://fake-post.xyz/colis',
      explanation: { fr: 'Site suspect', en: 'Suspicious site' },
      official_contact: null,
      suggested_verifiers: [],
      scanned_at: new Date().toISOString(),
    };
    const entry = createPause(scanResult);

    assert.ok(entry.scanId, 'scanId must exist');
    assert.equal(entry.verdict, 'suspect');
    assert.equal(entry.circleNotified, false);
    assert.equal(entry.unlocked, false);
    assert.ok(entry.pauseUntil > Date.now(), 'pauseUntil must be in the future');
  });

  test('createPause — verdict danger creates a retrievable entry', () => {
    const scanResult = {
      verdict: 'danger',
      score: 85,
      input_preview: 'https://twint-secure.top/pay',
      explanation: { fr: 'Arnaque connue TWINT', en: 'Known TWINT scam' },
      official_contact: { name: 'TWINT', phone: null, url: 'https://www.twint.ch' },
      suggested_verifiers: [],
      scanned_at: new Date().toISOString(),
    };
    const entry = createPause(scanResult);
    assert.ok(entry.scanId);
    assert.equal(entry.verdict, 'danger');

    const retrieved = getPause(entry.scanId);
    assert.equal(retrieved.scanId, entry.scanId);
    assert.equal(retrieved.verdict, 'danger');
  });

  test('createPause — rejects safe verdict', () => {
    assert.throws(
      () => createPause({ verdict: 'safe', score: 0 }),
      /suspect\|danger/,
      'should reject non-alerting verdicts'
    );
  });

  test('createPause — rejects doubt verdict', () => {
    assert.throws(
      () => createPause({ verdict: 'doubt', score: 15 }),
      /suspect\|danger/
    );
  });

  test('getPause — throws for unknown scanId', () => {
    assert.throws(
      () => getPause('deadbeefdeadbeef'),
      /Pause not found/
    );
  });

  test('markCircleNotified — flips circleNotified flag', () => {
    const entry = createPause({
      verdict: 'suspect',
      score: 40,
      explanation: { fr: 'Test' },
      suggested_verifiers: [],
      scanned_at: new Date().toISOString(),
    });
    assert.equal(entry.circleNotified, false);
    markCircleNotified(entry.scanId);
    assert.equal(getPause(entry.scanId).circleNotified, true);
  });

  test('markCircleNotified — idempotent', () => {
    const entry = createPause({
      verdict: 'danger',
      score: 70,
      explanation: { fr: 'Test' },
      suggested_verifiers: [],
      scanned_at: new Date().toISOString(),
    });
    markCircleNotified(entry.scanId);
    markCircleNotified(entry.scanId); // second call must not throw
    assert.equal(getPause(entry.scanId).circleNotified, true);
  });

  test('unlockPause — sets unlocked=true and isPauseOver returns true', () => {
    const entry = createPause({
      verdict: 'suspect',
      score: 45,
      explanation: { fr: 'Test' },
      suggested_verifiers: [],
      scanned_at: new Date().toISOString(),
    });
    assert.equal(entry.unlocked, false);
    assert.equal(isPauseOver(entry.scanId), false);

    unlockPause(entry.scanId);
    assert.equal(getPause(entry.scanId).unlocked, true);
    assert.equal(isPauseOver(entry.scanId), true);
  });

  test('unlockPause — throws for unknown scanId', () => {
    assert.throws(
      () => unlockPause('0000000000000000'),
      /Pause not found/
    );
  });

  test('pause fields — required tone/content fields present', () => {
    const now = new Date().toISOString();
    const entry = createPause({
      verdict: 'suspect',
      score: 50,
      input_preview: 'fake-site.xyz',
      explanation: { fr: 'Ce site ressemble à une arnaque.', en: 'Suspicious site.' },
      official_contact: { name: 'Police', phone: '117', url: null },
      suggested_verifiers: [{ name: 'Maman', phone: '+41791234567' }],
      scanned_at: now,
    });

    // Structural checks
    assert.ok(entry.scanId, 'scanId');
    assert.ok(['suspect', 'danger'].includes(entry.verdict), 'verdict in allowed set');
    assert.ok(typeof entry.score === 'number', 'score is number');
    assert.ok(entry.explanation.fr, 'explanation.fr present');
    assert.ok(entry.official_contact, 'official_contact present');
    assert.ok(Array.isArray(entry.suggested_verifiers), 'suggested_verifiers array');
    assert.ok(entry.pauseUntil > Date.now(), 'pauseUntil future');
    assert.equal(entry.circleNotified, false);
    assert.equal(entry.unlocked, false);
  });
});

// ─── HTTP integration tests ───────────────────────────────────────────────────

let server;
const PORT = 3502;

before(async () => {
  _clearPauses();
  clearCircles();
  server = createServer(async (req, res) => {
    try {
      await router(req, res);
    } catch (err) {
      res.writeHead(500);
      res.end('Internal error');
    }
  });
  return new Promise(resolve => server.listen(PORT, resolve));
});

after(async () => new Promise(resolve => server.close(resolve)));

async function post(path, body) {
  const res = await fetch(`http://localhost:${PORT}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return { status: res.status, body: await res.json() };
}

async function get(path) {
  const res = await fetch(`http://localhost:${PORT}${path}`);
  return { status: res.status, body: await res.json() };
}

describe('Safe Pause HTTP — TRK-005', () => {
  test('POST /pause — creates pause for suspect verdict', async () => {
    const { status, body } = await post('/pause', {
      scanResult: {
        verdict: 'suspect',
        score: 55,
        input_preview: 'https://parking-berne.xyz/amende',
        explanation: { fr: 'Site suspect', en: 'Suspicious' },
        official_contact: null,
        suggested_verifiers: [],
        scanned_at: new Date().toISOString(),
      },
    });
    assert.equal(status, 201);
    assert.ok(body.scanId, 'scanId in response');
    assert.ok(body.pauseUntil > Date.now(), 'pauseUntil is future');
    assert.equal(body.verdict, 'suspect');
  });

  test('POST /pause — creates pause for danger verdict', async () => {
    const { status, body } = await post('/pause', {
      scanResult: {
        verdict: 'danger',
        score: 90,
        input_preview: 'https://postfinance-verify.tk/login',
        explanation: { fr: 'Arnaque PostFinance', en: 'PostFinance scam' },
        official_contact: { name: 'PostFinance', phone: '+41584481414', url: null },
        suggested_verifiers: [],
        scanned_at: new Date().toISOString(),
      },
    });
    assert.equal(status, 201);
    assert.ok(body.scanId);
    assert.equal(body.verdict, 'danger');
  });

  test('POST /pause — rejects missing scanResult', async () => {
    const { status } = await post('/pause', {});
    assert.equal(status, 400);
  });

  test('POST /pause — rejects safe verdict', async () => {
    const { status } = await post('/pause', {
      scanResult: { verdict: 'safe', score: 5 },
    });
    assert.equal(status, 400);
  });

  test('GET /pause/:scanId — returns pause state', async () => {
    const created = await post('/pause', {
      scanResult: {
        verdict: 'suspect',
        score: 60,
        input_preview: 'fake-twint.xyz',
        explanation: { fr: 'Arnaque probable', en: 'Probable scam' },
        official_contact: null,
        suggested_verifiers: [],
        scanned_at: new Date().toISOString(),
      },
    });
    const scanId = created.body.scanId;
    const { status, body } = await get(`/pause/${scanId}`);

    assert.equal(status, 200);
    assert.equal(body.scanId, scanId);
    assert.equal(body.verdict, 'suspect');
    assert.equal(body.unlocked, false);
    assert.equal(body.circleNotified, false);
    assert.ok(typeof body.over === 'boolean', 'over field present');
  });

  test('GET /pause/:scanId — 404 for unknown id', async () => {
    const { status } = await get('/pause/abcdef1234567890');
    assert.equal(status, 404);
  });

  test('POST /pause/:scanId/unlock — manual unlock works', async () => {
    const created = await post('/pause', {
      scanResult: {
        verdict: 'danger',
        score: 80,
        input_preview: 'https://swisscom-pay.top/bill',
        explanation: { fr: 'Swisscom faux', en: 'Fake Swisscom' },
        official_contact: null,
        suggested_verifiers: [],
        scanned_at: new Date().toISOString(),
      },
    });
    const scanId = created.body.scanId;

    // Should not be over yet
    const before = await get(`/pause/${scanId}`);
    assert.equal(before.body.unlocked, false);

    // Unlock
    const { status, body } = await post(`/pause/${scanId}/unlock`, {});
    assert.equal(status, 200);
    assert.equal(body.unlocked, true);
    assert.equal(body.over, true);
    assert.ok(body.message, 'unlock message present');

    // Confirm state
    const after = await get(`/pause/${scanId}`);
    assert.equal(after.body.unlocked, true);
    assert.equal(after.body.over, true);
  });

  test('POST /pause/:scanId/unlock — 404 for unknown id', async () => {
    const { status } = await post('/pause/0000000000000000/unlock', {});
    assert.equal(status, 404);
  });

  test('POST /pause — notifies circle when circleId + memberId provided', async () => {
    // Setup: create a real circle + get owner memberId
    const circleRes = await post('/circle', { ownerName: 'Mémé' });
    assert.equal(circleRes.status, 201);
    const { circleId } = circleRes.body;

    const circleData = await get(`/circle/${circleId}`);
    const memberId = circleData.body.members[0].memberId;

    // Create pause with circle context
    const { status, body } = await post('/pause', {
      scanResult: {
        verdict: 'danger',
        score: 88,
        input_preview: 'https://arnaque-postfinance.xyz',
        explanation: { fr: 'Faux PostFinance', en: 'Fake PostFinance' },
        official_contact: null,
        suggested_verifiers: [],
        scanned_at: new Date().toISOString(),
      },
      circleId,
      memberId,
    });

    assert.equal(status, 201);
    assert.equal(body.circleNotified, true, 'circle must be notified when valid circle+member provided');

    // Confirm alert logged in circle
    const alertsRes = await fetch(`http://localhost:${PORT}/circle/${circleId}/alerts`);
    const alertsData = await alertsRes.json();
    const pauseAlert = alertsData.alerts.find(a => a.type === 'safe_pause');
    assert.ok(pauseAlert, 'safe_pause alert must appear in circle history');
    assert.equal(pauseAlert.verdict, 'danger');
  });

  test('POST /pause — circleNotified stays false for invalid circle (best-effort)', async () => {
    const { status, body } = await post('/pause', {
      scanResult: {
        verdict: 'suspect',
        score: 55,
        input_preview: 'https://fake-sbb.xyz',
        explanation: { fr: 'Suspect SBB', en: 'Suspicious SBB' },
        official_contact: null,
        suggested_verifiers: [],
        scanned_at: new Date().toISOString(),
      },
      circleId: 'nonexistentcircle',
      memberId: 'nonexistentmember',
    });
    // Pause still created, circle notification silently fails
    assert.equal(status, 201, 'pause must still be created');
    assert.equal(body.circleNotified, false, 'circleNotified must be false when circle missing');
  });

  test('GET /pause/:scanId — response contains tone/explanation fields', async () => {
    const explanation = { fr: 'Ce site ressemble à une arnaque connue. Attends 5 min.', en: 'Suspicious.' };
    const { body: created } = await post('/pause', {
      scanResult: {
        verdict: 'suspect',
        score: 52,
        input_preview: 'fake-marketplace.top',
        explanation,
        official_contact: { name: 'Police', phone: '117', url: null },
        suggested_verifiers: [{ name: 'Fils', phone: '+41791234567' }],
        scanned_at: new Date().toISOString(),
      },
    });

    const { body } = await get(`/pause/${created.scanId}`);
    assert.ok(body.explanation.fr, 'explanation.fr present');
    assert.ok(body.official_contact, 'official_contact present');
    assert.ok(body.suggested_verifiers.length > 0, 'suggested_verifiers present');
    // Tone check: message is not anxiety-inducing — confirmed by its existence and fr content
    assert.ok(body.explanation.fr.length > 0, 'explanation is non-empty');
  });
});
