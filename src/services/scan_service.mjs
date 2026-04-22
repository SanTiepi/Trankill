/**
 * Service de scan de liens / messages / numéros suspects.
 *
 * Verdicts (4 niveaux) :
 * - safe    : rien de suspect
 * - doubt   : signaux faibles — recommander de vérifier avec un proche ou la source officielle
 * - suspect : arnaque probable — safe pause recommandée
 * - danger  : arnaque quasi certaine — safe pause + alerte cercle immédiate
 *
 * Design : consent-first. L'output inclut toujours suggested_verifiers (proches à
 * contacter) et official_contact (vraie source à rappeler) pour que l'utilisateur
 * garde le contrôle de sa décision.
 *
 * Sources de patterns :
 * - NCSC Suisse rapport semestriel 2025/1 (65k reports, 26% vishing autorités, 19% phishing)
 * - PostFinance : TWINT scams, vishing, physical mail QR codes
 * - Swiss Post : fraudulent domains (post.ch.paysget.info, pakete-inland.info, etc.)
 * - Swisscom : fake bill phishing
 * - Pattern émergent 2025 : SMS blasters amendes parking Suisse romande
 */

// ============================================================================
// Patterns — arnaques suisses 2025 (validées contre sources officielles)
// ============================================================================

const SWISS_SCAM_PATTERNS = [
  {
    id: 'faux_poste',
    regex: /post[.-]?ch|swiss-?post|colis.*(bloqu|retenu|terminal)|paket.*(zustellung|abholung|terminal)|livraison.*ratée|unsuccessful.*delivery/i,
    type: 'phishing',
    severity: 40,
    official_contact: { name: 'La Poste Suisse', phone: '0848 888 888', url: 'https://www.post.ch' },
    description: {
      fr: 'Faux message de La Poste suisse',
      de: 'Gefälschte Nachricht der Schweizerischen Post',
      it: 'Falso messaggio della Posta Svizzera',
      en: 'Fake Swiss Post message',
    },
  },
  {
    id: 'faux_swisscom',
    regex: /swisscom.*(facture|rechnung|bill|impay|fattura)|swisscom-?pay/i,
    type: 'phishing',
    severity: 40,
    official_contact: { name: 'Swisscom', phone: '0800 800 800', url: 'https://www.swisscom.ch' },
    description: {
      fr: 'Faux message Swisscom (fausse facture)',
      de: 'Gefälschte Swisscom-Nachricht (falsche Rechnung)',
      it: 'Falso messaggio Swisscom (falsa fattura)',
      en: 'Fake Swisscom message (fake bill)',
    },
  },
  {
    id: 'faux_twint',
    regex: /twint.*(bloqu|expire|r[ée]activ|pin|d[ée]sactiv|access.*limit|not.*accessible)/i,
    type: 'phishing',
    severity: 45,
    official_contact: { name: 'TWINT (via ta banque)', phone: null, url: 'https://www.twint.ch' },
    description: {
      fr: 'Faux message TWINT — ne jamais donner son code PIN par message',
      de: 'Gefälschte TWINT-Nachricht — niemals PIN per Nachricht preisgeben',
      it: 'Falso messaggio TWINT — mai comunicare il PIN tramite messaggio',
      en: 'Fake TWINT message — never share your PIN via message',
    },
  },
  {
    id: 'faux_postfinance',
    regex: /postfinance.*(secur|verif|login|reactiv|update|e-?finance)|e-?finance.*(hack|verif|reactiv)/i,
    type: 'phishing',
    severity: 45,
    official_contact: { name: 'PostFinance', phone: '+41 58 448 14 14', url: 'https://www.postfinance.ch' },
    description: {
      fr: 'Faux message PostFinance — l\'e-finance ne demande jamais de vérification par SMS',
      de: 'Gefälschte PostFinance-Nachricht',
      it: 'Falso messaggio PostFinance',
      en: 'Fake PostFinance message',
    },
  },
  {
    id: 'faux_banque',
    regex: /ubs.*(verif|security|login)|credit.?suisse.*login|raiffeisen.*(confirm|secur)|bcv.*(verif|secur)|zkb.*(verif|secur)/i,
    type: 'phishing',
    severity: 40,
    official_contact: { name: 'Ta banque (n° au dos de ta carte)', phone: null, url: null },
    description: {
      fr: 'Faux message de banque — appelle le numéro au dos de ta carte',
      de: 'Gefälschte Banknachricht',
      it: 'Falso messaggio bancario',
      en: 'Fake bank message — call the number on the back of your card',
    },
  },
  {
    id: 'faux_impots',
    regex: /imp[oô]ts?.*(rembours|arriér)|steuer.*(r[üu]ck|nach)|tax.*refund|administration.*fiscale.*(rembours|urgent)/i,
    type: 'phishing',
    severity: 35,
    official_contact: { name: 'Administration fiscale cantonale', phone: null, url: 'https://www.ch.ch/fr/impots' },
    description: {
      fr: 'Fausse notification fiscale — l\'administration ne demande jamais d\'infos par SMS/email',
      de: 'Gefälschte Steuernachricht',
      it: 'Falsa notifica fiscale',
      en: 'Fake tax notification',
    },
  },
  {
    id: 'amende_parking_sms',
    regex: /amende.*(stationnement|parking|parcage).*(pay|r[èé]gl)|parkb(u|ü)sse|parking.*fine.*pay|contravention.*parking/i,
    type: 'sms_blaster',
    severity: 50,
    official_contact: { name: 'Police municipale de ta commune', phone: null, url: null },
    description: {
      fr: 'Faux SMS d\'amende de parking (arnaque 2025 via SMS blasters en Suisse romande)',
      de: 'Falsche Parkbusse per SMS (2025 SMS-Blaster-Betrug in der Westschweiz)',
      it: 'Falsa multa di parcheggio via SMS (truffa 2025)',
      en: 'Fake parking fine SMS (2025 SMS blaster scam in western Switzerland)',
    },
  },
  {
    id: 'vishing_autorites',
    regex: /(police|cantonale?|fedpol|minist[èe]re).*(appel|convoc|urgent|amende|mandat)|interpol.*(urgent|mandat)|douane.*(colis|bloqu|retenu)/i,
    type: 'vishing',
    severity: 40,
    official_contact: { name: 'Police cantonale (raccroche et rappelle toi-même)', phone: '117', url: null },
    description: {
      fr: 'Faux appel/message des autorités — #1 des arnaques en Suisse 2025 (26% des signalements NCSC). La police ne demande JAMAIS de paiement par téléphone.',
      de: 'Gefälschter Behördenanruf — #1 Betrug 2025 (26% NCSC-Meldungen). Die Polizei verlangt nie Zahlung per Telefon.',
      it: 'Falsa chiamata delle autorità — #1 truffa 2025',
      en: 'Fake authority call/message — #1 scam in Switzerland 2025 (26% of NCSC reports)',
    },
  },
  {
    id: 'marketplace_twint',
    regex: /(tutti|ricardo|anibis|facebook.*marketplace|marketplace).*(paiement|pay|twint|qr.?code)|acheteur.*int[ée]ress[ée].*(twint|qr|lien)/i,
    type: 'marketplace_fraud',
    severity: 45,
    official_contact: { name: 'Refuse les liens/QR, reste sur la plateforme', phone: null, url: null },
    description: {
      fr: 'Faux acheteur sur Tutti/Ricardo/FB Marketplace — les vrais acheteurs ne demandent JAMAIS de QR code TWINT',
      de: 'Falscher Käufer auf Marktplatz — echte Käufer verlangen nie TWINT-QR-Codes',
      it: 'Falso acquirente sul marketplace',
      en: 'Fake marketplace buyer — real buyers never request TWINT QR codes',
    },
  },
  {
    id: 'crypto_scam',
    regex: /bitcoin.*(profit|double|garanti)|crypto.*(invest.*garanti|rendement)|trading.*garanti|ethereum.*double/i,
    type: 'investment_fraud',
    severity: 35,
    official_contact: { name: 'FINMA (autorité suisse)', phone: null, url: 'https://www.finma.ch' },
    description: {
      fr: 'Arnaque à l\'investissement crypto — aucun rendement garanti n\'existe',
      de: 'Krypto-Investitionsbetrug',
      it: 'Truffa investimento crypto',
      en: 'Crypto investment scam',
    },
  },
  {
    id: 'romance_scam',
    regex: /love.*(money|send|transfer)|western.?union.*urgent|help.*transfer.*urgent|military.*abroad.*money|soldat.*ukraine.*argent/i,
    type: 'romance_fraud',
    severity: 40,
    official_contact: { name: 'Parle à un proche avant d\'envoyer un centime', phone: null, url: null },
    description: {
      fr: 'Arnaque sentimentale — ne JAMAIS envoyer d\'argent à une personne jamais rencontrée',
      de: 'Liebesbetrug',
      it: 'Truffa sentimentale',
      en: 'Romance scam',
    },
  },
  {
    id: 'faux_concours',
    regex: /gagn[ée].*(iphone|samsung|voyage)|gewinn.*(samsung|iphone)|won.*prize|congratul.*selected|tirage.*gagnant/i,
    type: 'prize_scam',
    severity: 30,
    official_contact: null,
    description: {
      fr: 'Faux concours / faux gain — personne ne gagne un iPhone sans avoir participé',
      de: 'Gefälschter Gewinn',
      it: 'Finto premio',
      en: 'Fake prize scam',
    },
  },
  {
    id: 'urgence_admin',
    regex: /permis.*(expir|renouvel|invalid)|aufenthalt.*abl|visa.*urgent|convoc.*police|mandat.*arr[êe]t/i,
    type: 'admin_fraud',
    severity: 35,
    official_contact: { name: 'Service cantonal des migrations', phone: null, url: null },
    description: {
      fr: 'Fausse urgence administrative (permis, mandat) — piège classique envers les migrants',
      de: 'Gefälschte Behördendringlichkeit',
      it: 'Falsa urgenza amministrativa',
      en: 'Fake administrative urgency',
    },
  },
  {
    id: 'faux_support',
    regex: /microsoft.*support|apple.*support|virus.*detect|computer.*infect|ordinateur.*infect|appelez.*imm[ée]diat.*technicien/i,
    type: 'tech_support',
    severity: 35,
    official_contact: { name: 'Aucun support ne t\'appelle spontanément — raccroche', phone: null, url: null },
    description: {
      fr: 'Faux support technique — Microsoft/Apple ne t\'appellent JAMAIS spontanément',
      de: 'Gefälschter technischer Support',
      it: 'Falso supporto tecnico',
      en: 'Fake tech support',
    },
  },
  {
    id: 'faux_emploi',
    regex: /travail.*maison.*\d+.*(CHF|euro)|emploi.*facile.*\d+|gagn.*\d{3,}.*jour|job.*home.*\d{3,}/i,
    type: 'job_scam',
    severity: 30,
    official_contact: null,
    description: {
      fr: 'Fausse offre d\'emploi — aucun vrai employeur ne promet des milliers par jour sans qualification',
      de: 'Gefälschtes Jobangebot',
      it: 'Falsa offerta di lavoro',
      en: 'Fake job offer',
    },
  },
  {
    id: 'faux_neveu',
    regex: /mamie|grand-?m[èa][ma]re|tante.*(accident|urgence|argent|caution|avocat)|hallo oma.*geld|neveu.*probl[èe]me/i,
    type: 'grandparent_scam',
    severity: 50,
    official_contact: { name: 'Raccroche et rappelle ton petit-enfant sur son vrai numéro', phone: null, url: null },
    description: {
      fr: 'Arnaque au faux neveu/petit-enfant — raccroche et rappelle la personne sur son vrai numéro',
      de: 'Enkeltrick-Betrug — auflegen und auf der echten Nummer zurückrufen',
      it: 'Truffa del finto nipote',
      en: 'Grandparent scam',
    },
  },
];

// ============================================================================
// Signaux transverses
// ============================================================================

const URGENCY_SIGNALS = [
  /dans les? \d+ (heure|minute|jour)/i,
  /innerhalb (von )?\d+ (Stunde|Minute|Tag)/i,
  /entro \d+ (ora|minut|giorn)/i,
  /within \d+ (hour|minute|day)/i,
  /imm[ée]diat/i, /sofort/i, /immediatamente/i, /immediately/i,
  /derni[èe]re chance/i, /letzte chance/i, /ultima occasione/i, /last chance/i,
  /compte sera (supprim|bloqu|ferm|d[ée]sactiv)/i,
  /konto wird (gesperrt|gel[öo]scht)/i,
  /agir maintenant/i, /act now/i, /jetzt handeln/i,
  /urgent/i, /dringend/i, /urgente/i,
  /24h.*deadline|deadline.*24h|24 hour/i,
];

const DATA_REQUEST_SIGNALS = [
  /IBAN/i,
  /carte.*(bancaire|cr[ée]dit)/i,
  /num[ée]ro.*carte/i,
  /CVV/i,
  /mot de passe/i,
  /password/i,
  /passwort/i,
  /kennwort/i,
  /identifiant.*login/i,
  /kreditkarte/i,
  /pin.*code/i,
  /code.*pin/i,
  /zugangsdaten/i,
];

// TLDs suspects (coût faible, souvent utilisés par scammers)
const SUSPICIOUS_TLDS = ['.xyz', '.top', '.club', '.info', '.click', '.link', '.buzz', '.gq', '.ml', '.tk', '.cf', '.ga', '.icu', '.rest', '.cam'];

// Domaines frauduleux connus (liste enrichie depuis Swiss Post Q1 2025)
const KNOWN_FRAUD_DOMAINS = [
  'pakete-inland.info',
  'post-receive.com',
  'paysget.info',
  'postch-delivery',
  'swisspost-delivery',
  'swisscom-pay',
  'twint-secure',
  'postfinance-verify',
];

// Whitelist des vrais domaines suisses
const LEGIT_SWISS_DOMAINS = [
  'post.ch', 'poste.ch', 'posta.ch', 'swisspost.ch', 'swisspost.com',
  'swisscom.ch', 'sunrise.ch', 'salt.ch',
  'ubs.com', 'credit-suisse.com', 'raiffeisen.ch', 'postfinance.ch',
  'bcv.ch', 'zkb.ch', 'bcge.ch', 'bcf.ch', 'bcn.ch',
  'admin.ch', 'ch.ch', 'bag.admin.ch', 'ncsc.admin.ch', 'antiphishing.ch',
  'sbb.ch', 'cff.ch', 'ffs.ch',
  'coop.ch', 'migros.ch', 'manor.ch',
  'ricardo.ch', 'anibis.ch', 'tutti.ch',
  'comparis.ch', 'homegate.ch', 'jobs.ch', 'local.ch',
  'twint.ch',
];

// ============================================================================
// Contacts officiels (fallback quand aucun pattern ne matche)
// ============================================================================

const GENERIC_OFFICIAL_CONTACTS = {
  bank: { name: 'Ta banque (numéro au dos de ta carte)', phone: null, url: null },
  police: { name: 'Police (urgence 117, non-urgence : commune)', phone: '117', url: 'https://www.cybercrimepolice.ch' },
  ncsc: { name: 'NCSC (Centre national cybersécurité)', phone: null, url: 'https://www.ncsc.admin.ch' },
  frc: { name: 'FRC (Fédération romande des consommateurs)', phone: null, url: 'https://www.frc.ch' },
};

// ============================================================================
// Scan principal
// ============================================================================

/**
 * Analyse un lien ou message.
 * @param {string} input — URL ou texte de message
 * @param {object} [options] — { verifiers: [{name, phone}] } pour suggested_verifiers
 * @returns {object} — verdict + détails
 */
export function scanInput(input, options = {}) {
  if (!input || typeof input !== 'string' || input.trim().length === 0) {
    return { verdict: 'error', message: 'Rien à analyser' };
  }

  const text = input.trim();
  const signals = [];
  let dangerScore = 0;
  const matchedContacts = [];

  // 1. Analyse URL d'abord (on a besoin de savoir si whitelist pour filtrer les patterns)
  const urlMatch = text.match(/https?:\/\/[^\s<>"]+/i);
  let urlIsWhitelisted = false;
  if (urlMatch) {
    const urlAnalysis = analyzeUrl(urlMatch[0]);
    signals.push(...urlAnalysis.signals);
    dangerScore += urlAnalysis.score;
    urlIsWhitelisted = urlAnalysis.signals.some(s => s.type === 'whitelist');
  }

  // Patterns de marque qu'on skip si l'URL est whitelist (évite faux positifs sur post.ch légit)
  const BRAND_PATTERNS = new Set(['faux_poste', 'faux_swisscom', 'faux_postfinance', 'faux_banque', 'faux_twint']);

  // 2. Patterns suisses connus (skip brand patterns if URL whitelisted)
  for (const pattern of SWISS_SCAM_PATTERNS) {
    if (urlIsWhitelisted && BRAND_PATTERNS.has(pattern.id)) continue;
    if (pattern.regex.test(text)) {
      signals.push({
        type: 'pattern_match',
        id: pattern.id,
        scam_type: pattern.type,
        description: pattern.description,
        severity: pattern.severity >= 45 ? 'high' : 'medium',
      });
      dangerScore += pattern.severity;
      if (pattern.official_contact) matchedContacts.push(pattern.official_contact);
    }
  }

  // 3. Signaux d'urgence artificielle
  let urgencyCount = 0;
  for (const regex of URGENCY_SIGNALS) {
    if (regex.test(text)) urgencyCount++;
  }
  if (urgencyCount >= 2) {
    signals.push({
      type: 'urgency',
      description: {
        fr: `${urgencyCount} signaux d'urgence artificielle — les arnaqueurs créent la panique pour court-circuiter ta réflexion`,
        de: `${urgencyCount} Dringlichkeitssignale erkannt`,
        it: `${urgencyCount} segnali di urgenza artificiale`,
        en: `${urgencyCount} artificial urgency signals detected`,
      },
      severity: 'medium',
    });
    dangerScore += Math.min(urgencyCount * 8, 25);
  } else if (urgencyCount === 1) {
    dangerScore += 5;
  }

  // 4. Demande de données sensibles
  let dataRequestHit = false;
  for (const regex of DATA_REQUEST_SIGNALS) {
    if (regex.test(text)) { dataRequestHit = true; break; }
  }
  if (dataRequestHit) {
    signals.push({
      type: 'data_request',
      description: {
        fr: 'Demande de données sensibles (carte, mot de passe, IBAN) — aucun organisme sérieux ne demande ça par message',
        de: 'Anfrage sensibler Daten',
        it: 'Richiesta di dati sensibili',
        en: 'Sensitive data request detected',
      },
      severity: 'high',
    });
    dangerScore += 30;
  }

  // ─── Verdict 4 niveaux ────────────────────────────────────────────────────
  let verdict, color;
  if (dangerScore >= 50) { verdict = 'danger'; color = 'red'; }
  else if (dangerScore >= 25) { verdict = 'suspect'; color = 'orange'; }
  else if (dangerScore >= 10) { verdict = 'doubt'; color = 'yellow'; }
  else { verdict = 'safe'; color = 'green'; }

  // ─── Official contact (prioritaire : pattern matché, sinon générique) ─────
  const officialContact = matchedContacts[0] || pickGenericContact(verdict);

  // ─── Suggested verifiers (proches à contacter) ────────────────────────────
  const suggestedVerifiers = (options.verifiers || []).slice(0, 3);

  // ─── Explication + action adaptées au verdict ─────────────────────────────
  const explanation = generateExplanation(verdict, signals);
  const action = generateAction(verdict, signals, officialContact, suggestedVerifiers);

  return {
    verdict,
    color,
    score: Math.max(0, Math.min(100, dangerScore)),
    signals,
    explanation,
    action,
    official_contact: officialContact,
    suggested_verifiers: suggestedVerifiers,
    input_preview: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
    scanned_at: new Date().toISOString(),
    disclaimer: {
      fr: 'Estimation automatique. En cas de doute, ne clique pas et demande à un proche.',
      de: 'Automatische Einschätzung. Im Zweifel nicht klicken und eine Vertrauensperson fragen.',
      it: 'Stima automatica. In caso di dubbio, non cliccare e chiedi a una persona fidata.',
      en: 'Automated estimate. When in doubt, do not click and ask someone you trust.',
    },
  };
}

/**
 * Scan d'un numéro de téléphone suspect.
 * Pas d'API tierce : heuristiques locales + base communautaire (futur).
 * @param {string} phoneNumber
 * @returns {object}
 */
export function scanPhone(phoneNumber) {
  if (!phoneNumber || typeof phoneNumber !== 'string') {
    return { verdict: 'error', message: 'Numéro invalide' };
  }

  const normalized = phoneNumber.replace(/[\s\-().]/g, '');
  const signals = [];
  let score = 0;

  // Numéro international non-suisse → léger signal
  if (/^\+(?!41)/.test(normalized)) {
    signals.push({
      type: 'foreign_number',
      description: {
        fr: 'Numéro international non-suisse — vérifie que tu attends un appel de l\'étranger',
        de: 'Ausländische Nummer',
        it: 'Numero internazionale',
        en: 'Non-Swiss international number',
      },
      severity: 'low',
    });
    score += 10;
  }

  // Numéros premium / surtaxés connus
  if (/^(\+41)?09[01]/.test(normalized)) {
    signals.push({
      type: 'premium_number',
      description: {
        fr: 'Numéro surtaxé suisse (090x / 091x) — rappel très coûteux',
        de: 'Mehrwertnummer',
        it: 'Numero a sovrapprezzo',
        en: 'Swiss premium number — expensive callback',
      },
      severity: 'high',
    });
    score += 35;
  }

  // Numéro masqué
  if (/^(anonyme|hidden|private|masqué)$/i.test(phoneNumber.trim())) {
    signals.push({
      type: 'hidden_number',
      description: {
        fr: 'Numéro masqué — les autorités suisses n\'appellent jamais en numéro masqué',
        de: 'Versteckte Nummer',
        it: 'Numero nascosto',
        en: 'Hidden caller ID',
      },
      severity: 'medium',
    });
    score += 20;
  }

  // Verdict
  let verdict, color;
  if (score >= 50) { verdict = 'danger'; color = 'red'; }
  else if (score >= 25) { verdict = 'suspect'; color = 'orange'; }
  else if (score >= 10) { verdict = 'doubt'; color = 'yellow'; }
  else { verdict = 'safe'; color = 'green'; }

  const explanation = {
    fr: verdict === 'safe'
      ? 'Rien de particulier sur ce numéro. Mais si l\'appelant prétend être d\'une banque ou d\'une autorité, raccroche et rappelle toi-même le numéro officiel.'
      : 'Ce numéro présente des signaux suspects. NE rappelle PAS. Si quelqu\'un prétend être d\'une banque ou d\'une autorité, raccroche et rappelle le numéro officiel toi-même.',
    de: verdict === 'safe'
      ? 'Nichts Verdächtiges an dieser Nummer.'
      : 'Diese Nummer zeigt verdächtige Signale. Nicht zurückrufen.',
    it: verdict === 'safe'
      ? 'Nulla di sospetto su questo numero.'
      : 'Questo numero presenta segnali sospetti. Non richiamare.',
    en: verdict === 'safe'
      ? 'Nothing specific about this number.'
      : 'This number shows suspicious signals. Do not call back.',
  };

  return {
    verdict,
    color,
    score: Math.min(100, score),
    signals,
    explanation,
    official_contact: GENERIC_OFFICIAL_CONTACTS.police,
    input_preview: phoneNumber,
    scanned_at: new Date().toISOString(),
  };
}

// ============================================================================
// Helpers
// ============================================================================

function analyzeUrl(url) {
  const signals = [];
  let score = 0;

  try {
    const parsed = new URL(url);
    const domain = parsed.hostname.toLowerCase();

    // Whitelist
    if (LEGIT_SWISS_DOMAINS.some(d => domain === d || domain.endsWith('.' + d))) {
      signals.push({
        type: 'whitelist',
        description: {
          fr: 'Domaine officiel reconnu',
          de: 'Offizielle Domain erkannt',
          it: 'Dominio ufficiale',
          en: 'Recognized official domain',
        },
        severity: 'safe',
      });
      score -= 25;
      return { signals, score };
    }

    // Domaine frauduleux connu (match direct)
    for (const fraud of KNOWN_FRAUD_DOMAINS) {
      if (domain.includes(fraud)) {
        signals.push({
          type: 'known_fraud_domain',
          description: {
            fr: `Domaine identifié comme frauduleux : ${fraud}`,
            de: `Bekannte Betrugsdomain: ${fraud}`,
            it: `Dominio fraudolento noto: ${fraud}`,
            en: `Known fraud domain: ${fraud}`,
          },
          severity: 'high',
        });
        score += 60;
        return { signals, score };
      }
    }

    // TLD suspect
    const tld = '.' + domain.split('.').pop();
    if (SUSPICIOUS_TLDS.includes(tld)) {
      signals.push({
        type: 'suspicious_tld',
        description: {
          fr: `Extension de domaine suspecte (${tld})`,
          de: `Verdächtige Domain-Endung (${tld})`,
          it: `Estensione sospetta (${tld})`,
          en: `Suspicious domain extension (${tld})`,
        },
        severity: 'medium',
      });
      score += 20;
    }

    // Typosquatting strict : le domaine contient le nom d'une marque suisse MAIS n'est pas whitelist
    // et la marque apparaît comme sous-domaine ou dans le chemin à gauche du TLD
    const brandRoots = ['post', 'swisscom', 'ubs', 'raiffeisen', 'postfinance', 'twint', 'bcv', 'zkb', 'migros', 'coop', 'ricardo', 'tutti'];
    for (const brand of brandRoots) {
      // Ne match que si la marque est clairement dans le hostname ET hors whitelist
      const brandInDomain = new RegExp(`(^|[.\\-])${brand}([.\\-]|$)`).test(domain);
      if (brandInDomain) {
        signals.push({
          type: 'typosquatting',
          description: {
            fr: `Le domaine imite "${brand}" mais n'est pas le vrai site officiel`,
            de: `Die Domain ahmt "${brand}" nach, ist aber nicht die echte`,
            it: `Il dominio imita "${brand}" ma non è quello ufficiale`,
            en: `Domain mimics "${brand}" but is not the real site`,
          },
          severity: 'high',
        });
        score += 35;
        break;
      }
    }

    // URL très longue
    if (url.length > 200) {
      signals.push({
        type: 'long_url',
        description: {
          fr: 'Lien anormalement long (souvent utilisé pour masquer la destination)',
          de: 'Auffällig lange URL',
          it: 'URL anormalmente lungo',
          en: 'Abnormally long URL',
        },
        severity: 'low',
      });
      score += 5;
    }

    // HTTP sans S
    if (parsed.protocol === 'http:') {
      signals.push({
        type: 'no_https',
        description: {
          fr: 'Site non sécurisé (pas de HTTPS)',
          de: 'Unsichere Website (kein HTTPS)',
          it: 'Sito non sicuro',
          en: 'Unsecured site (no HTTPS)',
        },
        severity: 'medium',
      });
      score += 10;
    }
  } catch {
    signals.push({
      type: 'invalid_url',
      description: {
        fr: 'Le lien n\'est pas une adresse web valide',
        de: 'Ungültige URL',
        it: 'URL non valido',
        en: 'Invalid URL',
      },
      severity: 'low',
    });
  }

  return { signals, score };
}

function pickGenericContact(verdict) {
  if (verdict === 'danger' || verdict === 'suspect') return GENERIC_OFFICIAL_CONTACTS.police;
  if (verdict === 'doubt') return GENERIC_OFFICIAL_CONTACTS.ncsc;
  return null;
}

function generateExplanation(verdict, signals) {
  const reasons = signals
    .filter(s => s.severity === 'high' || s.severity === 'medium')
    .map(s => s.description.fr)
    .slice(0, 3);

  if (verdict === 'safe') {
    return {
      fr: 'Rien de suspect détecté. Reste vigilant(e) — en cas de doute, demande à un proche.',
      de: 'Nichts Verdächtiges erkannt. Bleib wachsam — im Zweifel eine Vertrauensperson fragen.',
      it: 'Nulla di sospetto rilevato. Rimani vigile — in caso di dubbio, chiedi a qualcuno di fidato.',
      en: 'Nothing suspicious detected. Stay vigilant — when in doubt, ask someone you trust.',
    };
  }

  if (verdict === 'doubt') {
    return {
      fr: `Quelques signaux faibles — ce n'est probablement rien, mais avant de cliquer ou répondre, ${reasons[0] ? `vérifie ce point : ${reasons[0]}. ` : ''}appelle la source officielle toi-même ou demande à un proche.`,
      de: `Einige schwache Signale. Bevor du klickst, ruf selbst die offizielle Quelle an oder frag eine Vertrauensperson.`,
      it: `Alcuni segnali deboli. Prima di cliccare, chiama direttamente la fonte ufficiale o chiedi a qualcuno di fidato.`,
      en: `Some weak signals. Before clicking, call the official source yourself or ask someone you trust.`,
    };
  }

  if (verdict === 'suspect') {
    return {
      fr: `Plusieurs éléments suspects : ${reasons.join('. ')}. NE clique PAS sur le lien. Va sur le site officiel toi-même et appelle si nécessaire.`,
      de: `Mehrere verdächtige Elemente. NICHT klicken. Rufe die offizielle Website selbst auf.`,
      it: `Diversi elementi sospetti. NON cliccare. Vai direttamente al sito ufficiale.`,
      en: `Several suspicious elements. DO NOT click. Go to the official website yourself.`,
    };
  }

  // danger
  return {
    fr: `⚠️ Arnaque très probable. ${reasons.join('. ')}. NE CLIQUE PAS. NE DONNE AUCUNE INFORMATION. Si tu as déjà cliqué, appelle ta banque IMMÉDIATEMENT.`,
    de: `⚠️ Sehr wahrscheinlich Betrug. NICHT KLICKEN. Falls bereits geklickt: sofort die Bank anrufen.`,
    it: `⚠️ Truffa molto probabile. NON CLICCARE. Se hai già cliccato, chiama subito la tua banca.`,
    en: `⚠️ Very likely a scam. DO NOT CLICK. If you already did, call your bank IMMEDIATELY.`,
  };
}

function generateAction(verdict, signals, officialContact, suggestedVerifiers) {
  const callOfficial = officialContact
    ? (officialContact.phone
        ? `Appelle la source officielle toi-même : ${officialContact.name} — ${officialContact.phone}`
        : `Vérifie directement avec : ${officialContact.name}`)
    : null;

  const askVerifier = suggestedVerifiers.length > 0
    ? `Demande à ${suggestedVerifiers[0].name}${suggestedVerifiers[0].phone ? ' (' + suggestedVerifiers[0].phone + ')' : ''}`
    : 'Demande à un proche de confiance';

  if (verdict === 'safe') {
    return {
      fr: 'Tu peux continuer, mais reste attentif(ve).',
      de: 'Du kannst fortfahren, bleib aber aufmerksam.',
      it: 'Puoi procedere, ma resta attento.',
      en: 'You can proceed, but stay attentive.',
      primary: null,
      secondary: null,
    };
  }

  if (verdict === 'doubt') {
    return {
      fr: `1. Ne clique pas tout de suite\n2. ${askVerifier}\n3. ${callOfficial || 'Va sur le site officiel toi-même'}`,
      de: `1. Noch nicht klicken\n2. Eine Vertrauensperson fragen\n3. Offizielle Quelle direkt kontaktieren`,
      it: `1. Non cliccare subito\n2. Chiedi a qualcuno di fidato\n3. Contatta la fonte ufficiale`,
      en: `1. Don't click yet\n2. Ask someone you trust\n3. Contact the official source yourself`,
      primary: { label: askVerifier, action: 'ask_verifier' },
      secondary: callOfficial ? { label: callOfficial, action: 'call_official' } : null,
    };
  }

  if (verdict === 'suspect') {
    return {
      fr: `1. NE clique PAS sur le lien\n2. ${callOfficial || 'Va sur le site officiel toi-même'}\n3. ${askVerifier}\n4. Ne donne aucune information personnelle`,
      de: `1. NICHT klicken\n2. Offizielle Quelle direkt kontaktieren\n3. Eine Vertrauensperson fragen\n4. Keine persönlichen Daten preisgeben`,
      it: `1. NON cliccare\n2. Contatta la fonte ufficiale\n3. Chiedi a qualcuno di fidato\n4. Non fornire informazioni personali`,
      en: `1. DO NOT click\n2. Contact the official source\n3. Ask someone you trust\n4. Share no personal information`,
      primary: callOfficial ? { label: callOfficial, action: 'call_official' } : null,
      secondary: { label: askVerifier, action: 'ask_verifier' },
    };
  }

  // danger
  return {
    fr: `1. Ne clique sur AUCUN lien\n2. Ne donne AUCUNE information\n3. Supprime le message\n4. Si tu as déjà cliqué ou donné des infos : appelle ta banque IMMÉDIATEMENT\n5. Signale à antiphishing.ch ou au NCSC`,
    de: `1. Nicht klicken\n2. Keine Daten preisgeben\n3. Nachricht löschen\n4. Falls schon geklickt: sofort die Bank anrufen\n5. Bei antiphishing.ch melden`,
    it: `1. Non cliccare\n2. Non fornire dati\n3. Elimina il messaggio\n4. Se hai già cliccato: chiama subito la banca\n5. Segnala a antiphishing.ch`,
    en: `1. Do not click\n2. Share no information\n3. Delete the message\n4. If already clicked: call your bank IMMEDIATELY\n5. Report to antiphishing.ch`,
    primary: { label: 'Appelle ta banque maintenant', action: 'call_bank' },
    secondary: { label: 'Signaler à antiphishing.ch', action: 'report_ncsc' },
  };
}
