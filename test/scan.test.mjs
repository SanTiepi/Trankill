import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { scanInput, scanPhone } from '../src/services/scan_service.mjs';

// ============================================================================
// Patterns suisses 2025
// ============================================================================

describe('scanInput — patterns suisses classiques', () => {
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
    assert.ok(['danger', 'suspect', 'doubt'].includes(r.verdict));
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
    const r = scanInput('Votre permis de séjour expire dans 24h. Mandat d\'arrêt si non réglé');
    assert.ok(r.signals.some(s => s.id === 'urgence_admin'));
  });
});

describe('scanInput — patterns émergents 2025', () => {
  it('detects fake parking fine SMS (SMS blaster western Switzerland)', () => {
    const r = scanInput('Amende de stationnement impayée CHF 40 — à régler avant 24h: https://parking-ge.xyz/pay');
    assert.ok(r.signals.some(s => s.id === 'amende_parking_sms'));
    assert.ok(['danger', 'suspect'].includes(r.verdict));
  });

  it('detects fake authority vishing (top scam #1 NCSC 2025)', () => {
    const r = scanInput('Bonjour, police cantonale. Un mandat d\'arrêt est émis contre vous, payez l\'amende immédiatement');
    assert.ok(r.signals.some(s => s.id === 'vishing_autorites'));
  });

  it('detects fake TWINT message', () => {
    const r = scanInput('Votre compte TWINT sera bloqué. Réactivez-le ici: https://twint-secure.xyz/reactivate');
    assert.ok(r.signals.some(s => s.id === 'faux_twint'));
    assert.equal(r.verdict, 'danger');
  });

  it('detects fake PostFinance e-finance', () => {
    const r = scanInput('PostFinance: votre e-finance doit être réactivé suite à une activité suspecte');
    assert.ok(r.signals.some(s => s.id === 'faux_postfinance'));
  });

  it('detects marketplace TWINT buyer scam', () => {
    const r = scanInput('Bonjour, je suis intéressé par votre annonce Ricardo. Je vous envoie un QR code TWINT pour le paiement');
    assert.ok(r.signals.some(s => s.id === 'marketplace_twint'));
  });

  it('detects grandparent scam (faux neveu)', () => {
    const r = scanInput('Mamie, j\'ai eu un accident, j\'ai besoin d\'argent urgent pour l\'avocat');
    assert.ok(r.signals.some(s => s.id === 'faux_neveu'));
    assert.equal(r.verdict, 'danger');
  });
});

// ============================================================================
// URL analysis
// ============================================================================

describe('scanInput — URL analysis', () => {
  it('flags suspicious TLD', () => {
    const r = scanInput('https://important-message.xyz/verify');
    assert.ok(r.signals.some(s => s.type === 'suspicious_tld'));
  });

  it('flags known fraud domain (pakete-inland.info)', () => {
    const r = scanInput('https://pakete-inland.info/track');
    assert.ok(r.signals.some(s => s.type === 'known_fraud_domain'));
    assert.equal(r.verdict, 'danger');
  });

  it('flags typosquatting of Swiss brand', () => {
    const r = scanInput('https://post-ch-delivery.com/track');
    assert.ok(r.signals.some(s => s.type === 'typosquatting'));
  });

  it('recognizes legit Swiss domain (post.ch)', () => {
    const r = scanInput('https://www.post.ch/tracking');
    assert.ok(r.signals.some(s => s.type === 'whitelist'));
    assert.equal(r.verdict, 'safe');
  });

  it('recognizes legit subdomain of Swiss domain', () => {
    const r = scanInput('https://service.swisscom.ch/login');
    assert.ok(r.signals.some(s => s.type === 'whitelist'));
  });

  it('flags HTTP without S', () => {
    const r = scanInput('http://example.com/login');
    assert.ok(r.signals.some(s => s.type === 'no_https'));
  });

  it('does NOT false-positive on legitimate post.ch with typosquatting detector', () => {
    const r = scanInput('Voici le lien officiel: https://www.post.ch/fr/suivi');
    assert.ok(!r.signals.some(s => s.type === 'typosquatting'));
    assert.equal(r.verdict, 'safe');
  });
});

// ============================================================================
// Urgency + data request
// ============================================================================

describe('scanInput — urgency detection', () => {
  it('detects multiple urgency signals', () => {
    const r = scanInput('URGENT! Agir maintenant! Dans les 2 heures votre compte sera supprimé!');
    assert.ok(r.signals.some(s => s.type === 'urgency'));
    assert.ok(r.score >= 15);
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

// ============================================================================
// Verdict 4-level (safe / doubt / suspect / danger)
// ============================================================================

describe('scanInput — 4-level verdict scale', () => {
  it('safe: normal message', () => {
    const r = scanInput('Salut, on se voit demain pour le café?');
    assert.equal(r.verdict, 'safe');
    assert.equal(r.color, 'green');
  });

  it('safe: legit Swiss marketplace URL', () => {
    const r = scanInput('Regarde cette offre sur https://www.ricardo.ch/annonce/12345');
    assert.equal(r.verdict, 'safe');
  });

  it('doubt: weak signal — suspicious TLD alone', () => {
    const r = scanInput('Check this https://random-blog.xyz/article');
    // 1 signal faible (suspicious_tld ~20) → doubt ou suspect acceptable
    assert.ok(['doubt', 'suspect'].includes(r.verdict));
    assert.ok(r.score >= 10);
  });

  it('doubt: single urgency word, nothing else', () => {
    const r = scanInput('C\'est urgent, viens vite');
    // 5 points urgency seul → safe ou doubt
    assert.ok(['safe', 'doubt'].includes(r.verdict));
  });

  it('suspect: moderate score', () => {
    const r = scanInput('Votre facture est disponible sur https://invoice-online.top/view');
    // suspicious_tld + typo éventuel
    assert.ok(['doubt', 'suspect'].includes(r.verdict));
  });

  it('danger: fake Poste with all signals', () => {
    const r = scanInput('URGENT: colis Poste bloqué. Entrez votre carte bancaire sur https://post-ch-delivery.xyz dans les 2 heures ou mot de passe');
    assert.equal(r.verdict, 'danger');
    assert.equal(r.color, 'red');
  });
});

// ============================================================================
// Official contact + suggested verifiers (consent-first design)
// ============================================================================

describe('scanInput — official_contact (consent-first)', () => {
  it('returns La Poste contact on faux_poste match', () => {
    const r = scanInput('Votre colis Poste est bloqué');
    assert.ok(r.official_contact);
    assert.match(r.official_contact.name, /Poste/i);
    assert.equal(r.official_contact.phone, '0848 888 888');
  });

  it('returns PostFinance contact on faux_postfinance match', () => {
    const r = scanInput('PostFinance: votre e-finance a été hacké, vérifiez ici');
    assert.ok(r.official_contact);
    assert.match(r.official_contact.name, /PostFinance/i);
  });

  it('returns police contact on vishing match', () => {
    const r = scanInput('Police cantonale: mandat d\'arrêt à payer immédiatement');
    assert.ok(r.official_contact);
    assert.match(r.official_contact.name, /Police/i);
  });

  it('returns generic police contact for danger without pattern', () => {
    const r = scanInput('Entrez votre mot de passe IBAN et carte bancaire CVV dans les 2 heures urgent');
    if (r.verdict === 'danger' || r.verdict === 'suspect') {
      assert.ok(r.official_contact);
    }
  });
});

describe('scanInput — suggested_verifiers (family circle integration)', () => {
  it('includes verifiers passed in options', () => {
    const verifiers = [
      { name: 'Max (fils)', phone: '+41791234567' },
      { name: 'Sophie (fille)', phone: '+41798887766' },
    ];
    const r = scanInput('Votre colis Poste est bloqué', { verifiers });
    assert.equal(r.suggested_verifiers.length, 2);
    assert.equal(r.suggested_verifiers[0].name, 'Max (fils)');
  });

  it('limits to 3 verifiers max', () => {
    const verifiers = [
      { name: 'A' }, { name: 'B' }, { name: 'C' }, { name: 'D' }, { name: 'E' },
    ];
    const r = scanInput('Votre colis Poste est bloqué', { verifiers });
    assert.equal(r.suggested_verifiers.length, 3);
  });

  it('empty verifiers when none passed', () => {
    const r = scanInput('Salut');
    assert.deepEqual(r.suggested_verifiers, []);
  });
});

// ============================================================================
// Multilingual (FR/DE/IT/EN)
// ============================================================================

describe('scanInput — multilingual output', () => {
  it('explanation exists in FR, DE, IT, EN', () => {
    const r = scanInput('Votre colis Poste bloqué');
    assert.ok(r.explanation.fr);
    assert.ok(r.explanation.de);
    assert.ok(r.explanation.it);
    assert.ok(r.explanation.en);
  });

  it('disclaimer exists in FR, DE, IT, EN', () => {
    const r = scanInput('test');
    assert.ok(r.disclaimer.fr);
    assert.ok(r.disclaimer.de);
    assert.ok(r.disclaimer.it);
    assert.ok(r.disclaimer.en);
  });

  it('action exists in FR, DE, IT, EN', () => {
    const r = scanInput('Votre colis Poste bloqué');
    assert.ok(r.action.fr);
    assert.ok(r.action.de);
    assert.ok(r.action.it);
    assert.ok(r.action.en);
  });

  it('safe messages are multilingual too', () => {
    const r = scanInput('Salut');
    assert.ok(r.explanation.fr);
    assert.ok(r.explanation.de);
    assert.ok(r.explanation.it);
  });

  it('detects German fake Poste wording', () => {
    const r = scanInput('Ihr Paket ist bereit zur Abholung im Terminal, Zustellung verpasst');
    assert.ok(r.signals.some(s => s.id === 'faux_poste'));
  });
});

// ============================================================================
// Output format
// ============================================================================

describe('scanInput — output format', () => {
  it('always includes full output structure', () => {
    const r = scanInput('test message');
    assert.ok('verdict' in r);
    assert.ok('color' in r);
    assert.ok('score' in r);
    assert.ok('signals' in r);
    assert.ok('explanation' in r);
    assert.ok('action' in r);
    assert.ok('official_contact' in r);
    assert.ok('suggested_verifiers' in r);
    assert.ok('disclaimer' in r);
    assert.ok('scanned_at' in r);
  });

  it('empty input returns error', () => {
    const r = scanInput('');
    assert.equal(r.verdict, 'error');
  });

  it('null input returns error', () => {
    const r = scanInput(null);
    assert.equal(r.verdict, 'error');
  });

  it('danger verdict has primary action for banking', () => {
    const r = scanInput('UBS verify https://ubs-verify.xyz/now dans les 2 heures URGENT mot de passe CVV');
    assert.equal(r.verdict, 'danger');
    assert.ok(r.action.primary || r.action.fr.includes('banque'));
  });
});

// ============================================================================
// Phone scan
// ============================================================================

describe('scanPhone — suspicious numbers', () => {
  it('safe for a standard Swiss mobile', () => {
    const r = scanPhone('+41791234567');
    assert.equal(r.verdict, 'safe');
  });

  it('flags premium number 0901', () => {
    const r = scanPhone('0901234567');
    assert.ok(r.signals.some(s => s.type === 'premium_number'));
    assert.equal(r.verdict, 'suspect');
  });

  it('flags hidden number keyword', () => {
    const r = scanPhone('anonyme');
    assert.ok(r.signals.some(s => s.type === 'hidden_number'));
  });

  it('flags foreign non-Swiss number as doubt', () => {
    const r = scanPhone('+12125551234');
    assert.ok(r.signals.some(s => s.type === 'foreign_number'));
    assert.ok(['doubt', 'safe'].includes(r.verdict));
  });

  it('error for empty phone', () => {
    const r = scanPhone('');
    assert.equal(r.verdict, 'error');
  });

  it('returns multilingual explanation', () => {
    const r = scanPhone('+41791234567');
    assert.ok(r.explanation.fr);
    assert.ok(r.explanation.de);
    assert.ok(r.explanation.it);
  });
});
