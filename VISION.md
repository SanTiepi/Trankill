# Trankill — Vision complète

> Convergence Claude × Codex × Robin — 2026-04-06
> "La fraude n'est pas un problème de détection, c'est un problème de coordination sociale sous pression." (Codex)

---

## Le problème

1 Suisse sur 7 a perdu de l'argent dans une arnaque en ligne. CHF 530M volés en crypto. 59 000 délits/an. Seulement 1/3 porte plainte.

Les outils existants (Norton, Bitdefender, Google Safe Browsing) détectent à 98%. Mais les gens IGNORENT les alertes parce que l'arnaqueur crée une URGENCE ARTIFICIELLE qui court-circuite la réflexion.

Le vrai problème : la victime est SEULE au moment critique. Personne à qui demander "c'est vrai ?" en 10 secondes.

## La solution : Safe Pause + Cercle Familial

```
Ta mère reçoit un SMS "Votre colis Poste est bloqué, payez CHF 2.90"
  ↓
Elle clique sur le lien
  ↓
Trankill détecte : faux domaine, pattern connu, urgence artificielle
  ↓
Au lieu d'une alerte qu'elle ignore :
  SAFE PAUSE — page bloquée pendant 5 minutes
  "Ce site ressemble à une arnaque connue. On a prévenu ta famille.
   Attends 5 minutes avant de continuer. Si c'est vraiment la Poste,
   le lien marchera encore dans 5 minutes."
  ↓
Notification immédiate au cercle familial :
  "[Maman] a cliqué sur un lien suspect (faux site Poste).
   On a mis en pause. Appelle-la si tu peux."
  ↓
Le fils appelle : "Maman, c'est une arnaque, supprime le SMS."
  ↓
L'arnaqueur a perdu.
```

## Les 5 couches

### 1. DÉTECTER (automatique, transparent)
- Extension navigateur : scan de chaque page visitée
- Scan de liens partagés par SMS/email/WhatsApp (copier-coller dans l'app)
- Base de données collaborative : chaque arnaque signalée protège tout le réseau
- Patterns suisses : faux Poste, faux Swisscom, faux impôts, faux banques
- Sources : PhishTank, OpenPhish, Google Safe Browsing API, base communautaire

### 2. SAFE PAUSE (le coeur de Trankill)
- Quand une arnaque probable est détectée : pause de 5 minutes
- L'urgence artificielle est cassée — le cerveau reprend le dessus
- Message clair et rassurant (pas technique, pas panique)
- Le lien n'est pas définitivement bloqué — juste mis en pause
- Si l'utilisateur confirme après 5 min que c'est légitime → accès rétabli

### 3. CERCLE FAMILIAL (la vraie innovation)
- Les enfants ajoutent leurs parents (et vice versa)
- Chaque alerte est partagée en temps réel avec le cercle
- Dashboard famille : "Cette semaine, maman a été protégée 3 fois"
- Le cercle peut ajouter des sites de confiance (whitelist familiale)
- Invitation par QR code ou lien (pas besoin de compte pour le parent)

### 4. ÉDUQUER (pas infantiliser)
- Après chaque alerte : mini-explication "Voici pourquoi c'était suspect"
- Simulations mensuelles : "Tu reçois ce message. Que fais-tu ?" (NegotiateAI)
- Score personnel : "Tu as détecté 8 arnaques sur 10 ce mois"
- Adapté à l'âge et au niveau tech de l'utilisateur
- 15 langues (communautés migrantes = très vulnérables aux arnaques admin)

### 5. CONTRE-ATTAQUER (rendre la vie des scammers difficile)
- Bot de réponse automatique aux SMS d'arnaque (modèle Apate/Jolly Roger)
- Fait perdre du temps à l'arnaqueur (chaque minute = de l'argent perdu pour lui)
- Collecte d'intel : numéros, URLs, patterns → partagés avec NCSC et police
- Signalement automatique à la plateforme (Google, Apple, hébergeur)
- Communautaire : chaque signalement Trankill enrichit la base pour tous

## Concurrents

| Concurrent | Pays | Funding | Ce qu'il fait | Ce qui manque |
|-----------|------|---------|-------------|-------------|
| Aura | US | $500M+ | Suite complète identity/credit/antivirus | Pas de safe pause, pas familial, pas en Europe |
| Carefull | US | $12M | Monitoring financier seniors | Pas de safe pause, pas de protection digitale |
| EverSafe | US | $8M | Alertes transactions suspectes | B2B banques, pas grand public |
| True Link | US | $35M | Carte de paiement avec limites | Hardware, pas de protection digitale |
| Guardio | Israël | $40M | Extension navigateur | Juste du blocage, pas familial, pas de safe pause |
| Norton Genie | US | (Symantec) | Chatbot détection arnaque | Réactif (tu dois demander), pas proactif |
| Bitdefender Scamio | Roumanie | (Bitdefender) | Chatbot WhatsApp | Réactif, pas de cercle, pas de safe pause |
| Kitboga Seraph | US | — | Bloque sites scam + alerte famille | Basique, Windows only, pas de safe pause |

**AUCUN ne fait safe pause + cercle familial + contre-attaque + éducation.**
**AUCUN n'est basé en Europe / adapté au marché suisse.**

## Offres

| Niveau | Prix | Ce que tu reçois |
|--------|------|-----------------|
| **Gratuit** | CHF 0 | Scan de liens (copier-coller), base de données communautaire |
| **Famille** | CHF 9/mois | Safe pause, cercle familial (5 personnes), alertes temps réel, dashboard |
| **Famille+** | CHF 15/mois | + extension navigateur, + contre-attaque bot, + simulations éducatives |
| **B2B** | Sur devis | White-label pour banques/assureurs/télécoms (CHF 2-5/client/mois) |

## Partenaires de distribution

| Partenaire | Pourquoi il distribuerait Trankill | Modèle |
|-----------|----------------------------------|--------|
| **Swisscom** | Consortium anti-fraude 2025, protège ses clients | Bundle avec abonnement mobile |
| **La Mobilière** | Moins de sinistres cyberfraude = économie | Inclus dans l'assurance ménage |
| **Banques cantonales** | Moins de chargebacks, confiance client | Offert aux clients e-banking |
| **Pro Senectute** | Protection des aînés, mission sociale | Distribution gratuite aux membres |
| **FRC** | Protection des consommateurs romands | Recommandation + partenariat |
| **NCSC** | Centre national cybersécurité, données d'intel | Échange de données arnaques |

## Personas (simulation WorldEngine)

| Persona | Réaction | Ce qui manque pour lui/elle |
|---------|----------|---------------------------|
| Mère 68 ans, peu tech, Morges | "Enfin quelque chose de simple" | Interface TRÈS simple, gros boutons |
| Père 72 ans, perdu CHF 3000 crypto | "J'aurais voulu avoir ça avant" | Détection spécifique crypto scam |
| Ado 16 ans, DM Instagram suspects | "C'est comme un antivirus mais cool" | Intégration réseaux sociaux |
| Femme 35 ans, achats en ligne | "Le safe pause c'est exactement ce qu'il faut" | Whitelist sites de confiance |
| Chef PME 45 ans, spearphishing | "Utile pour mes employés aussi" | Mode entreprise |
| Grand-mère 80 ans, appels frauduleux | "Je ne comprends pas la tech" | Mode téléphone fixe (impossible?) |
| Étudiant 22 ans, faux jobs | "Le scan de liens c'est pratique" | Détection offres d'emploi frauduleuses |
| Couple 55 ans, romance scam | "On aurait détecté les red flags" | Analyse de conversations |
| Migrant 30 ans, arnaques admin | "Enfin dans ma langue" | Arnaques spécifiques permis/admin suisse |
| Commerçant 50 ans, fausses factures | "Le B2B m'intéresse" | Scan de factures PDF |

## Risques (Codex)

| Risque | Gravité | Mitigation |
|--------|---------|-----------|
| "Scanner tout" impossible sur iOS/WhatsApp/téléphonie | Haute | Commencer par web (extension) + copier-coller de liens |
| Conflit utilisateur vulnérable vs payeur | Moyenne | Le cercle est consensuel, l'utilisateur peut quitter |
| Responsabilité faux positif / blocage raté | Haute | "Aide à détecter" pas "garantit la protection" |
| Les gros (Google, Apple) intègrent safe pause | Moyenne | Vitesse + communauté + Suisse-first = avance |
| CAC élevé pour le B2C | Haute | B2B distribution (banques/telcos offrent à leurs clients) |

## Séquence MVP

### Phase 0 (cette nuit) — Scan de liens + cercle
- POST /scan → analyse un lien, retourne verdict + explication
- Cercle familial (créer, inviter, alerter)
- Frontend : formulaire "colle ton lien suspect"
- 20+ tests

### Phase 1 (semaine 1) — Safe Pause + Extension
- Extension Chrome : intercepte les clics vers des sites suspects
- Safe pause : page de blocage temporaire avec explication
- Notification cercle en temps réel

### Phase 2 (semaine 2-3) — Éducation + Bot
- Simulations mensuelles (NegotiateAI adapté)
- Bot de réponse aux SMS d'arnaque
- Dashboard famille

### Phase 3 (mois 2) — B2B + Partenariats
- White-label pour banques/assureurs
- API publique
- Pitch Swisscom / Mobilière / banques cantonales
