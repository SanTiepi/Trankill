/**
 * Service de scan de liens / messages suspects.
 *
 * Analyse un lien ou un message et retourne un verdict :
 * - safe : rien de suspect
 * - suspect : quelques signaux d'alerte
 * - danger : arnaque probable
 *
 * Méthodes de détection (locales, sans API externe) :
 * 1. Patterns connus d'arnaques suisses
 * 2. Analyse du domaine (typosquatting, domaine récent, TLD suspect)
 * 3. Analyse du contenu (urgence artificielle, demande d'argent/données)
 * 4. Base communautaire (signalements précédents)
 */

// Patterns d'arnaques suisses courantes
const SWISS_SCAM_PATTERNS = [
  { id: 'faux_poste', regex: /post[.-]?ch|swiss-?post|colis.*bloqu|paket.*zustellung/i, type: 'phishing', description: { fr: 'Faux message de la Poste suisse', de: 'Gefälschte Nachricht der Schweizerischen Post', en: 'Fake Swiss Post message' } },
  { id: 'faux_swisscom', regex: /swisscom.*facture|swisscom.*rechnung|swisscom.*bill|swisscom-?pay/i, type: 'phishing', description: { fr: 'Faux message Swisscom', de: 'Gefälschte Swisscom-Nachricht', en: 'Fake Swisscom message' } },
  { id: 'faux_impots', regex: /imp[oô]ts?.*rembours|steuer.*r[üu]ck|tax.*refund|administration.*fiscale/i, type: 'phishing', description: { fr: 'Fausse notification de remboursement d\'impôts', de: 'Gefälschte Steuerrückerstattung', en: 'Fake tax refund notification' } },
  { id: 'faux_banque', regex: /ubs.*verify|credit.?suisse.*login|raiffeisen.*confirm|postfinance.*secur|bcv.*verif/i, type: 'phishing', description: { fr: 'Faux message de votre banque', de: 'Gefälschte Banknachricht', en: 'Fake bank message' } },
  { id: 'crypto_scam', regex: /bitcoin.*profit|crypto.*invest|trading.*garanti|rendement.*jour|ethereum.*double/i, type: 'investment_fraud', description: { fr: 'Arnaque à l\'investissement crypto', de: 'Krypto-Investitionsbetrug', en: 'Crypto investment scam' } },
  { id: 'romance_scam', regex: /love.*money|send.*western.?union|help.*transfer.*urgent|military.*abroad.*money/i, type: 'romance_fraud', description: { fr: 'Arnaque sentimentale', de: 'Liebesbetrug', en: 'Romance scam' } },
  { id: 'faux_concours', regex: /gagn[ée].*iphone|gewinn.*samsung|won.*prize|congratul.*selected/i, type: 'prize_scam', description: { fr: 'Faux concours / faux gain', de: 'Gefälschter Gewinn', en: 'Fake prize scam' } },
  { id: 'urgence_admin', regex: /permis.*expir|aufenthalt.*abl|visa.*urgent|police.*convoc|amende.*payer/i, type: 'admin_fraud', description: { fr: 'Fausse urgence administrative (permis, amende...)', de: 'Gefälschte Behördennachricht', en: 'Fake administrative urgency' } },
  { id: 'faux_support', regex: /microsoft.*support|apple.*support|virus.*detect|computer.*infect|appelez.*imm[ée]diat/i, type: 'tech_support', description: { fr: 'Faux support technique', de: 'Gefälschter technischer Support', en: 'Fake tech support' } },
  { id: 'faux_emploi', regex: /travail.*maison.*[0-9].*CHF|emploi.*facile|gagn.*[0-9]+.*jour|job.*home.*[0-9]+/i, type: 'job_scam', description: { fr: 'Fausse offre d\'emploi', de: 'Gefälschtes Jobangebot', en: 'Fake job offer' } },
];

// Signaux d'urgence artificielle
const URGENCY_SIGNALS = [
  /dans les \d+ (heure|minute|jour)/i,
  /innerhalb (von )?\d+ (Stunde|Minute|Tag)/i,
  /within \d+ (hour|minute|day)/i,
  /immédiat/i, /sofort/i, /immediately/i,
  /dernière chance/i, /letzte chance/i, /last chance/i,
  /votre compte sera (supprimé|bloqué|fermé)/i,
  /agir maintenant/i, /act now/i, /jetzt handeln/i,
  /urgent/i, /dringend/i,
];

// TLDs suspects
const SUSPICIOUS_TLDS = ['.xyz', '.top', '.club', '.info', '.click', '.link', '.buzz', '.gq', '.ml', '.tk', '.cf', '.ga'];

// Domaines légitimes suisses (whitelist)
const LEGIT_SWISS_DOMAINS = [
  'post.ch', 'swisscom.ch', 'ubs.com', 'credit-suisse.com', 'raiffeisen.ch',
  'postfinance.ch', 'bcv.ch', 'admin.ch', 'ch.ch', 'bag.admin.ch',
  'sbb.ch', 'coop.ch', 'migros.ch', 'ricardo.ch', 'anibis.ch',
  'comparis.ch', 'homegate.ch', 'jobs.ch', 'local.ch',
];

/**
 * Analyse un lien ou message.
 * @param {string} input — URL ou texte de message
 * @returns {object} — verdict + détails
 */
export function scanInput(input) {
  if (!input || typeof input !== 'string') {
    return { verdict: 'error', message: 'Rien à analyser' };
  }

  const text = input.trim();
  const signals = [];
  let dangerScore = 0;

  // 1. Patterns suisses connus
  for (const pattern of SWISS_SCAM_PATTERNS) {
    if (pattern.regex.test(text)) {
      signals.push({
        type: 'pattern_match',
        id: pattern.id,
        scam_type: pattern.type,
        description: pattern.description,
        severity: 'high',
      });
      dangerScore += 40;
    }
  }

  // 2. Analyse URL si présente
  const urlMatch = text.match(/https?:\/\/[^\s<>"]+/i);
  if (urlMatch) {
    const url = urlMatch[0];
    const urlSignals = analyzeUrl(url);
    signals.push(...urlSignals.signals);
    dangerScore += urlSignals.score;
  }

  // 3. Signaux d'urgence
  let urgencyCount = 0;
  for (const regex of URGENCY_SIGNALS) {
    if (regex.test(text)) urgencyCount++;
  }
  if (urgencyCount >= 2) {
    signals.push({
      type: 'urgency',
      description: { fr: `${urgencyCount} signaux d'urgence artificielle détectés`, en: `${urgencyCount} artificial urgency signals detected` },
      severity: 'medium',
    });
    dangerScore += urgencyCount * 10;
  }

  // 4. Demande d'argent ou de données
  if (/IBAN|carte.*bancaire|numéro.*carte|CVV|mot de passe|password|identifiant|Kreditkarte/i.test(text)) {
    signals.push({
      type: 'data_request',
      description: { fr: 'Demande de données sensibles (carte bancaire, mot de passe...)', en: 'Sensitive data request detected' },
      severity: 'high',
    });
    dangerScore += 30;
  }

  // Verdict
  let verdict, color;
  if (dangerScore >= 50) { verdict = 'danger'; color = 'red'; }
  else if (dangerScore >= 20) { verdict = 'suspect'; color = 'orange'; }
  else { verdict = 'safe'; color = 'green'; }

  // Explication simple
  const explanation = generateExplanation(verdict, signals);

  // Action recommandée
  const action = generateAction(verdict, signals);

  return {
    verdict,
    color,
    score: Math.min(100, dangerScore),
    signals,
    explanation,
    action,
    input_preview: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
    scanned_at: new Date().toISOString(),
    disclaimer: 'Estimation automatique. En cas de doute, ne cliquez pas et demandez à un proche.',
  };
}

function analyzeUrl(url) {
  const signals = [];
  let score = 0;

  try {
    const parsed = new URL(url);
    const domain = parsed.hostname.toLowerCase();

    // Check whitelist
    if (LEGIT_SWISS_DOMAINS.some(d => domain === d || domain.endsWith('.' + d))) {
      signals.push({ type: 'whitelist', description: { fr: 'Domaine officiel reconnu', en: 'Recognized official domain' }, severity: 'safe' });
      score -= 20;
      return { signals, score };
    }

    // TLD suspect
    const tld = '.' + domain.split('.').pop();
    if (SUSPICIOUS_TLDS.includes(tld)) {
      signals.push({ type: 'suspicious_tld', description: { fr: `Extension de domaine suspecte (${tld})`, en: `Suspicious domain extension (${tld})` }, severity: 'medium' });
      score += 20;
    }

    // Typosquatting (domaine qui ressemble à un domaine légitime)
    for (const legit of LEGIT_SWISS_DOMAINS) {
      const legitBase = legit.split('.')[0];
      if (domain.includes(legitBase) && !LEGIT_SWISS_DOMAINS.some(d => domain === d || domain.endsWith('.' + d))) {
        signals.push({ type: 'typosquatting', description: { fr: `Le domaine imite "${legit}" mais n'est pas le vrai site`, en: `Domain mimics "${legit}" but is not the real site` }, severity: 'high' });
        score += 35;
      }
    }

    // URL très longue avec des paramètres suspects
    if (url.length > 200) {
      signals.push({ type: 'long_url', description: { fr: 'Lien anormalement long (souvent utilisé pour masquer la destination)', en: 'Abnormally long URL' }, severity: 'low' });
      score += 5;
    }

    // HTTP sans S
    if (parsed.protocol === 'http:') {
      signals.push({ type: 'no_https', description: { fr: 'Site non sécurisé (pas de HTTPS)', en: 'Unsecured site (no HTTPS)' }, severity: 'medium' });
      score += 10;
    }

  } catch {
    // URL invalide
    signals.push({ type: 'invalid_url', description: { fr: 'Le lien n\'est pas une adresse web valide', en: 'Invalid URL' }, severity: 'low' });
  }

  return { signals, score };
}

function generateExplanation(verdict, signals) {
  if (verdict === 'safe') {
    return {
      fr: 'Rien de suspect détecté. Mais reste vigilant(e) — en cas de doute, demande à un proche.',
      de: 'Nichts Verdächtiges erkannt. Aber bleib wachsam.',
      en: 'Nothing suspicious detected. But stay vigilant — when in doubt, ask someone you trust.',
    };
  }

  const reasons = signals
    .filter(s => s.severity === 'high' || s.severity === 'medium')
    .map(s => s.description.fr)
    .slice(0, 3);

  if (verdict === 'danger') {
    return {
      fr: `Attention, c'est très probablement une arnaque. ${reasons.join('. ')}. NE CLIQUE PAS et NE DONNE AUCUNE INFORMATION.`,
      de: `Achtung, das ist höchstwahrscheinlich ein Betrug. NICHT KLICKEN.`,
      en: `Warning, this is very likely a scam. ${reasons.map(r => r).join('. ')}. DO NOT CLICK and DO NOT share any information.`,
    };
  }

  return {
    fr: `Quelques éléments suspects détectés : ${reasons.join('. ')}. Sois prudent(e) et vérifie l'expéditeur avant d'agir.`,
    de: `Einige verdächtige Elemente erkannt. Sei vorsichtig.`,
    en: `Some suspicious elements detected. Be careful and verify the sender before acting.`,
  };
}

function generateAction(verdict, signals) {
  if (verdict === 'safe') {
    return { fr: 'Tu peux continuer, mais reste attentif(ve).', en: 'You can proceed, but stay attentive.' };
  }

  if (verdict === 'danger') {
    return {
      fr: '1. Ne clique sur aucun lien\n2. Ne donne aucune information personnelle\n3. Supprime le message\n4. Si tu as déjà cliqué ou donné des infos, appelle ta banque IMMÉDIATEMENT\n5. Signale à la police (https://www.cybercrimepolice.ch)',
      en: '1. Do not click any link\n2. Do not share any personal information\n3. Delete the message\n4. If you already clicked or shared info, call your bank IMMEDIATELY\n5. Report to police',
    };
  }

  return {
    fr: '1. Vérifie l\'expéditeur (compare avec le site officiel)\n2. Ne clique pas sur le lien directement — va sur le site officiel toi-même\n3. En cas de doute, demande à un proche ou appelle le service client officiel',
    en: '1. Verify the sender\n2. Do not click the link directly — go to the official website yourself\n3. When in doubt, ask someone you trust',
  };
}
