/**
 * Frontend Tests — TRK-004
 * Tests for scan page UI + circle dashboard + dark mode
 */

import { test, describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { createServer } from 'node:http';
import { router } from '../src/routes/index.mjs';
import { _clearAll } from '../src/services/circle_service.mjs';

let server;
const PORT = 3501;

// Start test server
before(async () => {
  _clearAll();
  server = createServer(async (req, res) => {
    try {
      await router(req, res);
    } catch (err) {
      res.writeHead(500);
      res.end('Internal error');
    }
  });

  return new Promise((resolve) => {
    server.listen(PORT, () => resolve());
  });
});

// Cleanup
after(async () => {
  return new Promise((resolve) => {
    server.close(() => resolve());
  });
});

describe('Frontend — TRK-004', () => {
  describe('HTML Page', () => {
    it('should serve index.html at root', async () => {
      const res = await fetch(`http://localhost:${PORT}/`);
      assert.strictEqual(res.status, 200);
      assert(res.headers.get('content-type').includes('text/html'));
      const html = await res.text();
      assert(html.includes('Trankill'));
      assert(html.includes('Bouclier Familial'));
    });

    it('should serve CSS with dark mode colors', async () => {
      const res = await fetch(`http://localhost:${PORT}/style.css`);
      assert.strictEqual(res.status, 200);
      assert(res.headers.get('content-type').includes('text/css'));
      const css = await res.text();
      assert(css.includes('--bg: #1a1a2e')); // Dark bg
      assert(css.includes('--accent: #e94560')); // Accent color
      assert(css.includes(':root')); // CSS variables
    });

    it('should serve app.js', async () => {
      const res = await fetch(`http://localhost:${PORT}/app.js`);
      assert.strictEqual(res.status, 200);
      assert(res.headers.get('content-type').includes('javascript'));
      const js = await res.text();
      assert(js.includes('renderApp'));
      assert(js.includes('handleScan'));
    });

    it('should serve manifest.json for PWA', async () => {
      const res = await fetch(`http://localhost:${PORT}/manifest.json`);
      assert.strictEqual(res.status, 200);
      const manifest = await res.json();
      assert.strictEqual(manifest.name, 'Trankill — Bouclier Familial Anti-Arnaque');
      assert.strictEqual(manifest.display, 'standalone');
      assert(manifest.icons.length > 0);
    });
  });

  describe('POST /scan — Link Analysis', () => {
    it('should analyze a safe link', async () => {
      const res = await fetch(`http://localhost:${PORT}/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: 'https://post.ch/services' }),
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.verdict, 'safe');
      assert(data.color === 'green');
      assert(data.explanation);
      assert(data.action);
    });

    it('should detect danger verdict', async () => {
      const res = await fetch(`http://localhost:${PORT}/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: 'Faux message de la Poste — colis bloqué, payer tout de suite sur https://post-ch-fake.com' }),
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.verdict, 'danger');
      assert(data.signals.length > 0);
      assert(data.explanation.fr.includes('probable'));
    });

    it('should detect doubt or suspect verdict for medium signals', async () => {
      const res = await fetch(`http://localhost:${PORT}/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: 'https://swiisscom-pay.xyz' }),
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert(['doubt', 'suspect'].includes(data.verdict));
      assert(data.signals.some(s => s.type === 'suspicious_tld'));
    });

    it('should detect crypto scam pattern', async () => {
      const res = await fetch(`http://localhost:${PORT}/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: 'Bitcoin investment guaranteed 200% profit daily!' }),
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert(data.verdict === 'danger' || data.verdict === 'suspect');
      assert(data.signals.some(s => s.id === 'crypto_scam'));
    });

    it('should generate French explanations', async () => {
      const res = await fetch(`http://localhost:${PORT}/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: 'Faux impôts' }),
      });
      const data = await res.json();
      assert(data.explanation.fr);
      assert(data.action.fr);
    });

    it('should return error for empty input', async () => {
      const res = await fetch(`http://localhost:${PORT}/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: '' }),
      });
      const data = await res.json();
      assert.strictEqual(data.verdict, 'error');
    });

    it('should include multilingual disclaimer in result', async () => {
      const res = await fetch(`http://localhost:${PORT}/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: 'test' }),
      });
      const data = await res.json();
      assert(data.disclaimer);
      assert(data.disclaimer.fr);
      assert(data.disclaimer.fr.includes('Estimation'));
    });
  });

  describe('Circle CRUD + Alerts', () => {
    let circleId, memberId;

    it('should create a circle', async () => {
      const res = await fetch(`http://localhost:${PORT}/circle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ownerName: 'Maman' }),
      });
      assert.strictEqual(res.status, 201);
      const data = await res.json();
      circleId = data.circleId;
      assert(circleId);
      assert(data.inviteCode);
      assert.strictEqual(data.owner, 'Maman');
    });

    it('should get circle details', async () => {
      const res = await fetch(`http://localhost:${PORT}/circle/${circleId}`);
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.owner, 'Maman');
      assert(data.members.length > 0);
      memberId = data.members[0].memberId;
    });

    it('should add member with valid invite code', async () => {
      const getRes = await fetch(`http://localhost:${PORT}/circle/${circleId}`);
      const circle = await getRes.json();
      const inviteCode = circle.inviteCode;

      const res = await fetch(`http://localhost:${PORT}/circle/${circleId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteCode, memberName: 'Fils' }),
      });
      assert.strictEqual(res.status, 201);
      const data = await res.json();
      assert.strictEqual(data.name, 'Fils');
      assert(data.memberId);
    });

    it('should reject invalid invite code', async () => {
      const res = await fetch(`http://localhost:${PORT}/circle/${circleId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteCode: 'INVALID', memberName: 'Test' }),
      });
      assert.strictEqual(res.status, 400);
    });

    it('should send alert to circle', async () => {
      const res = await fetch(`http://localhost:${PORT}/circle/${circleId}/alert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memberId,
          verdict: 'danger',
          message: 'Suspicious link detected',
          type: 'link_scan',
        }),
      });
      assert.strictEqual(res.status, 201);
      const data = await res.json();
      assert(data.alertId);
      assert.strictEqual(data.verdict, 'danger');
    });

    it('should list alerts for circle', async () => {
      const res = await fetch(`http://localhost:${PORT}/circle/${circleId}/alerts`);
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert(Array.isArray(data.alerts));
      assert(data.alerts.length > 0);
      assert.strictEqual(data.alerts[0].verdict, 'danger');
    });

    it('should get circle stats', async () => {
      const res = await fetch(`http://localhost:${PORT}/circle/${circleId}/stats`);
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(typeof data.memberCount, 'number');
      assert.strictEqual(typeof data.totalAlerts, 'number');
      assert(data.memberCount > 0);
      assert(data.totalAlerts > 0);
    });
  });

  describe('Edge Cases', () => {
    it('should limit circle members to 10', async () => {
      // Create a circle
      const createRes = await fetch(`http://localhost:${PORT}/circle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ownerName: 'Owner' }),
      });
      const circle = await createRes.json();
      const circleId = circle.circleId;

      // Try to add 10 members (owner + 9 more)
      for (let i = 0; i < 9; i++) {
        await fetch(`http://localhost:${PORT}/circle/${circleId}/members`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ inviteCode: circle.inviteCode, memberName: `Member${i}` }),
        });
      }

      // 10th member should fail
      const res = await fetch(`http://localhost:${PORT}/circle/${circleId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteCode: circle.inviteCode, memberName: 'Member10' }),
      });
      assert.strictEqual(res.status, 400);
      const error = await res.json();
      assert(error.error.includes('full'));
    });

    it('should prevent typosquatting attacks', async () => {
      const res = await fetch(`http://localhost:${PORT}/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: 'https://post-suisse-ch.xyz/paier-maintenant' }),
      });
      const data = await res.json();
      assert(data.signals.some(s => s.type === 'typosquatting'));
    });

    it('should detect multiple urgency signals', async () => {
      const res = await fetch(`http://localhost:${PORT}/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: 'Urgent! Agir immédiatement dans les 5 minutes!' }),
      });
      const data = await res.json();
      assert(data.signals.some(s => s.type === 'urgency'));
    });

    it('should detect financial data requests', async () => {
      const res = await fetch(`http://localhost:${PORT}/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: 'Veuillez entrer votre numéro IBAN et CVV' }),
      });
      const data = await res.json();
      assert(data.signals.some(s => s.type === 'data_request'));
    });

    it('should handle very long URLs', async () => {
      const longUrl = 'https://example.com/' + 'a'.repeat(300);
      const res = await fetch(`http://localhost:${PORT}/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: longUrl }),
      });
      const data = await res.json();
      assert(data.signals.some(s => s.type === 'long_url'));
    });
  });
});
