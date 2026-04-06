import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { scanInput } from '../src/services/scan_service.mjs';

describe('scanInput — Swiss scam patterns', () => {
  it('detects fake Poste SMS', () => {
    const r = scanInput('Votre colis est bloqué. Payez CHF 2.90 ici: https://post-ch-delivery.xyz/pay');
    assert.equal(r.verdict, 'danger');
    assert.ok(r.signals.some(s => s.id === 'faux_poste'));
  });

  it('detects fake Swisscom invoice', () => {
    const r = scanInput('Swisscom facture impayée. Réglez immédiatement: https://swisscom-pay.top/invoice');
    assert.equal(r.verdict, 'danger');
    assert.ok(r.signals.some(s => s.id === 'faux_swisscom'));
  });

  it('detects fake tax refund', () => {
    const r = scanInput('Administration fiscale: vous avez droit à un remboursement d\'impôts de CHF 380');
    assert.ok(['danger', 'suspect'].includes(r.verdict));
    assert.ok(r.signals.some(s => s.id === 'faux_impots'));
  });

  it('detects fake bank message', () => {
    const r = scanInput('UBS Security: verify your account immediately at https://ubs-verify.click/login');
    assert.equal(r.verdict, 'danger');
    assert.ok(r.signals.some(s => s.id === 'faux_banque'));
  });

  it('detects crypto scam', () => {
    const r = scanInput('Investissez dans Bitcoin, rendement garanti 500% par jour!');
    assert.ok(['danger', 'suspect'].includes(r.verdict));
    assert.ok(r.signals.some(s => s.id === 'crypto_scam'));
  });

  it('detects fake job offer', () => {
    const r = scanInput('Travail à la maison, gagnez 5000 CHF par jour facilement!');
    assert.ok(r.signals.some(s => s.id === 'faux_emploi'));
  });

  it('detects fake prize', () => {
    const r = scanInput('Félicitations! Vous avez gagné un iPhone 16! Cliquez ici pour réclamer');
    assert.ok(r.signals.some(s => s.id === 'faux_concours'));
  });

  it('detects fake admin urgency', () => {
    const r = scanInput('Votre permis de séjour expire dans 24h. Payez l\'amende immédiatement');
    assert.ok(r.signals.some(s => s.id === 'urgence_admin'));
  });
});

describe('scanInput — URL analysis', () => {
  it('flags suspicious TLD', () => {
    const r = scanInput('https://important-message.xyz/verify');
    assert.ok(r.signals.some(s => s.type === 'suspicious_tld'));
  });

  it('flags typosquatting', () => {
    const r = scanInput('https://postch-delivery.com/track');
    assert.ok(r.signals.some(s => s.type === 'typosquatting'));
  });

  it('recognizes legit Swiss domain', () => {
    const r = scanInput('https://www.post.ch/tracking');
    assert.ok(r.signals.some(s => s.type === 'whitelist'));
    // Legit domain should reduce score significantly
    assert.ok(r.verdict === 'safe' || r.verdict === 'suspect');
  });

  it('flags HTTP without S', () => {
    const r = scanInput('http://example.com/login');
    assert.ok(r.signals.some(s => s.type === 'no_https'));
  });
});

describe('scanInput — urgency detection', () => {
  it('detects multiple urgency signals', () => {
    const r = scanInput('URGENT! Agir maintenant! Dans les 2 heures votre compte sera supprimé!');
    assert.ok(r.signals.some(s => s.type === 'urgency'));
    assert.ok(r.score >= 20);
  });
});

describe('scanInput — data request', () => {
  it('detects password request', () => {
    const r = scanInput('Entrez votre mot de passe pour confirmer');
    assert.ok(r.signals.some(s => s.type === 'data_request'));
  });

  it('detects credit card request', () => {
    const r = scanInput('Veuillez entrer votre numéro de carte bancaire et le CVV');
    assert.ok(r.signals.some(s => s.type === 'data_request'));
  });
});

describe('scanInput — safe messages', () => {
  it('normal message is safe', () => {
    const r = scanInput('Salut, on se voit demain pour le café?');
    assert.equal(r.verdict, 'safe');
    assert.equal(r.score, 0);
  });

  it('legit Swiss URL is safe', () => {
    const r = scanInput('Regarde cette offre sur https://www.ricardo.ch/annonce/12345');
    assert.equal(r.verdict, 'safe');
  });

  it('empty input returns error', () => {
    const r = scanInput('');
    assert.equal(r.verdict, 'error');
  });

  it('null input returns error', () => {
    const r = scanInput(null);
    assert.equal(r.verdict, 'error');
  });
});

describe('scanInput — output format', () => {
  it('always includes verdict, color, score, explanation, action, disclaimer', () => {
    const r = scanInput('test message');
    assert.ok('verdict' in r);
    assert.ok('color' in r);
    assert.ok('score' in r);
    assert.ok('explanation' in r);
    assert.ok('action' in r);
    assert.ok('disclaimer' in r);
    assert.ok('scanned_at' in r);
  });

  it('explanation is multilingual', () => {
    const r = scanInput('Votre colis Poste bloqué');
    assert.ok(r.explanation.fr);
    assert.ok(r.explanation.en || r.explanation.de);
  });

  it('danger verdict has strong action', () => {
    const r = scanInput('UBS verify your account https://ubs-verify.xyz/now dans les 2 heures URGENT mot de passe');
    assert.equal(r.verdict, 'danger');
    assert.ok(r.action.fr.includes('banque') || r.action.fr.includes('clique'));
  });
});
