#!/usr/bin/env node
/**
 * Trankill — Validation simulée (inspirée de WorldEngine)
 *
 * Objectif : avant de faire de l'outreach à de vrais humains (Pro Senectute, FRC,
 * Reddit), faire passer le flow Trankill à des personas simulés pour identifier
 * les failles UX, le ton maladroit, les cas où le verdict `doubt` ne marche pas.
 *
 * Mécanique :
 * 1. Pour chaque (persona, scénario), on scanne d'abord le message avec Trankill
 * 2. On donne au persona le scénario brut + la réponse Trankill
 * 3. On lui demande ce qu'il fait, ce qui lui manque, ce qui le dérange
 * 4. On agrège tout dans docs/validation/session-{timestamp}.md
 *
 * Contrainte IMPORTANTE : les personas sont forcés à jouer leurs faiblesses
 * humaines (panique, confiance aveugle, gêne de déranger) et pas la version
 * "bien éduquée" par défaut que les LLMs adorent servir.
 *
 * Lancement :
 *   node scripts/validate.mjs              # full run (6 × 4 = 24 interactions)
 *   node scripts/validate.mjs --quick      # 3 × 2 = 6 interactions (test rapide)
 *   node scripts/validate.mjs --persona maria --scenario poste  # 1 interaction
 */

import { execSync, spawnSync } from 'node:child_process';
import { writeFileSync, appendFileSync, mkdirSync, writeFileSync as fsWrite } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { scanInput } from '../src/services/scan_service.mjs';

// ============================================================================
// PERSONAS — enrichis avec faiblesses humaines explicites
// ============================================================================

const PERSONAS = {
  maria: {
    name: 'Maria',
    short: 'Maria, 72 ans, peu tech, Morges',
    profile: `Tu es Maria, 72 ans, Suisse romande, veuve, habite seule à Morges. Tu as un smartphone Android mais tu confonds encore WhatsApp et SMS. Tu parles français, un peu d'italien. Ta fille Sophie habite à Genève, vous vous appelez 2 fois par semaine. Tu as peur de la déranger pour "rien" parce qu'elle a deux enfants et un job prenant.

FAIBLESSES que tu DOIS jouer :
- Quand tu reçois un message officiel, tu te dis "ils ne prendraient pas la peine de m'écrire si ce n'était pas vrai"
- L'urgence te stresse — tu veux régler vite pour ne pas "avoir ça sur la tête"
- Tu as honte de ne pas comprendre la technologie
- Tu ne veux pas déranger Sophie si tu peux éviter
- Tu fais confiance aux marques (La Poste, Swisscom, Migros) parce qu'elles sont "sérieuses"`,
  },

  peter: {
    name: 'Peter',
    short: 'Peter, 68 ans, ingénieur retraité, Bern',
    profile: `Tu es Peter, 68 ans, Suisse allemand, ingénieur civil à la retraite. Tu habites à Bern avec ta femme. Tu es plutôt à l'aise avec la technologie — tu utilises l'e-banking UBS, WhatsApp, et tu as un iPad. Tu es sceptique envers tout ce qui est "social" ou "familial" sur les apps parce que tu valorises ton indépendance.

FAIBLESSES que tu DOIS jouer :
- Tu es convaincu que "toi tu ne te ferais jamais avoir", donc tu vérifies moins que tu ne le devrais
- Tu détestes qu'une app te dise quoi faire de manière paternaliste
- Tu refuses qu'un outil "partage" automatiquement avec tes enfants — tu considères ça comme de la surveillance
- Tu parles allemand en premier, français en second, et tu trouves que beaucoup d'apps FR/EN sont mal traduites`,
  },

  sophie: {
    name: 'Sophie',
    short: 'Sophie, 42 ans, fille inquiète, Lausanne',
    profile: `Tu es Sophie, 42 ans, deux enfants, chef de projet dans une ONG à Lausanne. Ta mère (Maria) vit seule à Morges, et tu t'inquiètes régulièrement parce qu'elle t'a déjà raconté avoir failli cliquer sur un faux SMS Poste. Tu voudrais la protéger sans la faire se sentir surveillée ou infantilisée.

FAIBLESSES que tu DOIS jouer :
- Tu es en surcharge mentale permanente — tu n'auras pas le temps de checker un dashboard tous les jours
- Tu veux être alertée seulement quand c'est grave, pas de faux positifs
- Tu culpabilises de ne pas être plus présente auprès de Maria
- Tu as déjà essayé des apps "familiales" qui sont devenues du bruit — tu es méfiante`,
  },

  dilan: {
    name: 'Dilan',
    short: 'Dilan, 30 ans, migrant Kosovo, Lausanne',
    profile: `Tu es Dilan, 30 ans, tu es arrivé du Kosovo il y a 5 ans, tu travailles dans le bâtiment à Lausanne. Tu parles français correct mais pas parfait. Tu as un permis B qu'il faut renouveler chaque année et c'est toujours stressant. Tu as reçu plusieurs faux SMS disant "votre permis expire, payez l'amende". Un cousin à toi s'est fait voler CHF 800 comme ça l'an dernier.

FAIBLESSES que tu DOIS jouer :
- Les messages administratifs suisses te stressent fort — tu as peur de perdre ton permis
- Tu ne fais pas confiance aux "autorités" suisses de base à cause de l'angoisse administrative
- Tu préfères demander à ton cousin plutôt qu'à un inconnu
- Tu utilises surtout WhatsApp et Viber, peu de SMS
- Tu parles français avec des fautes, mais tu comprends tout`,
  },

  mme_gaudin: {
    name: 'Mme Gaudin',
    short: 'Mme Gaudin, 54 ans, animatrice Pro Senectute Vaud',
    profile: `Tu es Mme Gaudin, 54 ans, animatrice bénévole à Pro Senectute Vaud depuis 8 ans. Tu organises des ateliers de prévention des arnaques pour seniors deux fois par mois, dans des EMS et des locaux communaux. Tu vois régulièrement des victimes en détresse, et tu passes beaucoup de temps à les rassurer après coup. Tu n'es pas développeuse mais tu utilises PowerPoint et email.

FAIBLESSES et BESOINS que tu DOIS jouer :
- Tu cherches des outils concrets à montrer pendant tes ateliers, pas des théories
- Tu es méfiante envers les "solutions tech" parce qu'elles sont souvent inadaptées aux seniors
- Tu veux un outil que TU peux maîtriser en 10 minutes avant de le présenter à 20 seniors
- Tu es attentive à ce qui protège la DIGNITÉ des aînés — jamais d'outil infantilisant
- Tu aurais besoin d'un outil pour l'accompagnement POST-arnaque (écoute, quoi faire dans l'heure, quels numéros)`,
  },

  jean_marc: {
    name: 'Jean-Marc',
    short: 'Jean-Marc, 60 ans, victime romance scam, Fribourg',
    profile: `Tu es Jean-Marc, 60 ans, divorcé depuis 3 ans, habite Fribourg. Il y a 6 mois tu as "rencontré" Elena sur Facebook, une femme qui disait être infirmière en Ukraine. Tu lui as envoyé CHF 15'000 en 4 virements avant de comprendre. Tu as honte, tu n'en parles à personne. Tu es devenu méfiant envers tout, y compris les outils "anti-scam".

FAIBLESSES et BLESSURES que tu DOIS jouer :
- Tu as honte immense et tu refuses d'admettre que tu t'es fait avoir
- Tu es méfiant envers tout ce qui dit "anti-arnaque" — tu te dis "maintenant ils vont me prendre pour un idiot"
- Tu ne veux rien "partager" avec ta famille, ils ne savent pas pour Elena
- Tu voudrais un outil qui t'aide sans te juger
- Tu te méfies maintenant des messages émotionnels (urgence, drame, amour)`,
  },
};

// ============================================================================
// SCÉNARIOS — arnaques suisses réelles 2025
// ============================================================================

const SCENARIOS = {
  poste: {
    label: 'Faux SMS La Poste',
    input: 'La Poste: Votre colis 8947362 est bloqué au terminal. Frais de dédouanement CHF 2.90 à régler sous 24h : https://post-ch-delivery.xyz/pay',
  },
  vishing: {
    label: 'Faux appel police cantonale',
    input: 'Message vocal : "Bonjour, ici la police cantonale de Fribourg. Un mandat d\'arrêt a été émis à votre nom pour une fraude fiscale. Rappelez immédiatement le 0848 004 005 pour régulariser votre situation avant 18h sinon nous envoyons une patrouille."',
  },
  parking: {
    label: 'Faux SMS amende de parking (SMS blaster romand)',
    input: 'Police municipale Lausanne : Contravention impayée CHF 40 pour stationnement rue du Rhône le 05.04.2026. Règlement sous 48h pour éviter majoration : https://amende-parking-vd.info/pay',
  },
  twint: {
    label: 'Faux acheteur marketplace TWINT',
    input: 'Message WhatsApp d\'un acheteur Ricardo : "Bonjour, je suis très intéressé par votre vélo. Je ne peux pas me déplacer, je vous envoie le paiement par TWINT via ce lien sécurisé : https://twint-secure-pay.xyz/confirm?id=8743. Cliquez et confirmez le montant de CHF 450 pour que ma banque libère les fonds."',
  },
};

// ============================================================================
// Prompt builder
// ============================================================================

function buildPrompt(persona, scenario, trankillResponse) {
  const { explanation, action, official_contact, verdict, score } = trankillResponse;
  const officialLine = official_contact
    ? `- ☎️ Appeler ${official_contact.name}${official_contact.phone ? ' (' + official_contact.phone + ')' : ''}`
    : '';

  return `${persona.profile}

─────────────────────────────────────────────
SCÉNARIO
─────────────────────────────────────────────

Tu reçois ce message :

"${scenario.input}"

─────────────────────────────────────────────
ÉTAPE 1 — Ta réaction SPONTANÉE (sans Trankill)
─────────────────────────────────────────────

Raconte en 2-3 phrases, en français, à la première personne, ce que tu fais dans les 30 secondes qui suivent. Reste fidèle à tes FAIBLESSES. Ne joue pas le personnage idéal qui "ne se ferait jamais avoir".

─────────────────────────────────────────────
ÉTAPE 2 — Tu ouvres Trankill et tu colles le message
─────────────────────────────────────────────

L'app te répond :

🔍 Verdict : **${verdict.toUpperCase()}** (score ${score}/100)

${explanation.fr}

Actions proposées :
- 👨‍👩‍👧 Demander à un proche de confiance
${officialLine}

Étapes recommandées :
${action.fr}

─────────────────────────────────────────────
ÉTAPE 3 — Ta réaction face à l'app (honnête, brute)
─────────────────────────────────────────────

Réponds à ces 4 questions, à la première personne, en restant toi-même avec tes défauts :

1. Est-ce que tu utilises un des deux boutons ? Lequel ? Pourquoi ?
2. Qu'est-ce qui te dérange ou te gêne dans ce que l'app te montre ? (ton, longueur, vocabulaire, présence du cercle familial, autre)
3. Qu'est-ce qui te MANQUE pour te sentir vraiment aidé(e) ?
4. Si tu devais changer UNE chose à cette app, qu'est-ce que ce serait ?

IMPORTANT : reste brutalement honnête. Si tu trouves ça condescendant, dis-le. Si tu trouves ça inutile, dis-le. Si tu n'aurais jamais ouvert l'app de base, dis-le. Pas de bienveillance artificielle.

Réponds en français, en 15 lignes maximum au total pour les étapes 1+2+3.`;
}

// ============================================================================
// Runner
// ============================================================================

function callCodex(prompt) {
  // Passer le prompt via stdin évite tous les problèmes de shell escaping
  // (newlines, guillemets, $, backticks, emojis, etc.) quel que soit l'OS.
  try {
    // shell: true sur Windows pour résoudre codex.cmd via cmd.exe
    // Le prompt est passé via stdin (input) donc pas de problème d'escaping argv
    const result = spawnSync('codex exec --full-auto', {
      input: prompt,
      encoding: 'utf-8',
      timeout: 180_000,
      maxBuffer: 10 * 1024 * 1024,
      shell: true,
    });
    if (result.error) return `[ERREUR spawn : ${result.error.message}]`;
    if (result.status !== 0) return `[ERREUR codex exit ${result.status} : ${result.stderr || ''}]`;

    const raw = result.stdout || '';
    // Le format codex exec a du bruit avant la réponse.
    // Structure typique : header → "user\n<prompt>\ncodex\n<response>\ntokens used\n<count>\n<response encore>"
    // On prend la dernière occurrence de "\ncodex\n" et on coupe à "tokens used"
    const marker = raw.lastIndexOf('\ncodex\n');
    if (marker >= 0) {
      const after = raw.slice(marker + 7);
      const stopAt = after.search(/\n(tokens used|workdir:)/);
      return (stopAt >= 0 ? after.slice(0, stopAt) : after).trim();
    }
    return raw.trim();
  } catch (err) {
    return `[ERREUR codex : ${err.message}]`;
  }
}

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = { quick: false, persona: null, scenario: null };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--quick') opts.quick = true;
    else if (args[i] === '--persona') opts.persona = args[++i];
    else if (args[i] === '--scenario') opts.scenario = args[++i];
  }
  return opts;
}

async function main() {
  const opts = parseArgs();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const outFile = join(process.cwd(), 'docs', 'validation', `session-${timestamp}.md`);
  mkdirSync(join(process.cwd(), 'docs', 'validation'), { recursive: true });

  // Selection
  let personaKeys = Object.keys(PERSONAS);
  let scenarioKeys = Object.keys(SCENARIOS);
  if (opts.persona) personaKeys = [opts.persona];
  if (opts.scenario) scenarioKeys = [opts.scenario];
  if (opts.quick && !opts.persona && !opts.scenario) {
    personaKeys = ['maria', 'peter', 'jean_marc'];
    scenarioKeys = ['poste', 'vishing'];
  }

  const total = personaKeys.length * scenarioKeys.length;
  console.log(`▶ Validation Trankill : ${personaKeys.length} personas × ${scenarioKeys.length} scénarios = ${total} interactions`);
  console.log(`▶ Sortie : ${outFile}`);
  console.log('');

  // Header
  writeFileSync(outFile, `# Session de validation Trankill — ${timestamp}

> Simulation via codex exec. Personas et scénarios dans scripts/validate.mjs.
> Attention : ce sont des personas SIMULÉS. Ils approximent des humains, ils ne
> les remplacent pas. Objectif = identifier les failles grossières avant outreach réel.

`);

  let count = 0;
  for (const pkey of personaKeys) {
    const persona = PERSONAS[pkey];
    if (!persona) { console.error(`! persona inconnu : ${pkey}`); continue; }

    for (const skey of scenarioKeys) {
      const scenario = SCENARIOS[skey];
      if (!scenario) { console.error(`! scénario inconnu : ${skey}`); continue; }

      count++;
      const t0 = Date.now();
      console.log(`[${count}/${total}] ${persona.name} × ${scenario.label}…`);

      // 1. Scan Trankill réel
      const trankillResponse = scanInput(scenario.input, {
        verifiers: pkey === 'maria'
          ? [{ name: 'Sophie (ta fille)', phone: '+41791234567' }]
          : pkey === 'dilan'
          ? [{ name: 'Berat (ton cousin)', phone: '+41789998877' }]
          : [],
      });

      // 2. Construire le prompt et appeler codex
      const prompt = buildPrompt(persona, scenario, trankillResponse);
      const response = callCodex(prompt);
      const dt = ((Date.now() - t0) / 1000).toFixed(1);
      console.log(`   ✓ ${dt}s`);

      // 3. Append to session file
      appendFileSync(outFile, `
---

## ${persona.name} × ${scenario.label}

**Persona:** ${persona.short}
**Scenario:** ${scenario.label}
**Trankill verdict:** \`${trankillResponse.verdict}\` (score ${trankillResponse.score}/100)
**Durée appel codex:** ${dt}s

### Réponse du persona

${response}

`);
    }
  }

  // Footer + synthesis prompt
  appendFileSync(outFile, `
---

## Synthèse à faire à la main

Après avoir lu toutes les réponses ci-dessus, note :

1. **Patterns communs** — qu'est-ce qui revient chez plusieurs personas ?
2. **Failles du flow** — quels personas ne sont PAS bien servis ? Pourquoi ?
3. **Ton / wording** — y a-t-il des formulations qui sont rejetées plusieurs fois ?
4. **Décisions concrètes pour la Phase 1 du code** — quoi ajouter/changer/supprimer ?
5. **Nouvelles hypothèses à valider** — que faut-il demander en priorité dans l'outreach réel ?

Rappel : ces personas sont simulés. Ils révèlent des failles grossières mais ne
remplacent PAS Pro Senectute, FRC, NCSC, ou les vrais témoignages Reddit.
`);

  console.log('');
  console.log(`✓ Terminé. Résultats dans ${outFile}`);
}

main().catch(err => {
  console.error('Erreur fatale :', err);
  process.exit(1);
});
