# TASKS — Trankill

> Source de vérité des tâches.
> Créé : 2026-04-06
> Refondu : 2026-04-09 (après brainstorm multi-voix + recherche terrain + validation NCSC/Pro Senectute)

## KANBAN

### Done
TRK-001, TRK-002, TRK-003, TRK-013 (verdict doubt + patterns 2025 + FR/DE/IT + scan téléphone + contrôle-first frontend)

### Doing (Phase 0 — validation terrain, AUCUN code)
TRK-014 (outreach : Pro Senectute / FRC / NCSC / Reddit)

### Ready (Phase 1 — à coder quand Phase 0 a livré des retours)
TRK-005 (Safe Pause — avancé depuis backlog)
TRK-015 (consent-first circle redesign)
TRK-016 (Web Share Target Android)

### Backlog
TRK-004, TRK-007, TRK-017, TRK-018, TRK-006, TRK-010, TRK-009, TRK-011, TRK-008, TRK-012

---

## TÂCHES — DONE

### TRK-013 — Verdict `doubt` + patterns 2025 + multilingue + scan phone
**Type :** feat | **Livré :** 2026-04-09
**Ce qui a changé :**
- 4 verdicts au lieu de 3 : `safe` / `doubt` / `suspect` / `danger`
- Champs `official_contact` et `suggested_verifiers` dans chaque réponse scan
- 16 patterns suisses validés contre sources NCSC/PostFinance/Swiss Post/Swisscom
- Nouveaux patterns émergents 2025 : `amende_parking_sms`, `vishing_autorites`, `faux_twint`, `faux_postfinance`, `marketplace_twint`, `faux_neveu`
- Fix faux positifs : URLs whitelist (post.ch, etc.) désactivent les patterns de marque
- Explication et actions en FR/DE/IT/EN
- Nouveau endpoint `POST /scan/phone` + `scanPhone()`
- Frontend refondu : verdict `doubt` affiche 2 gros boutons "Demander à [proche]" + "Appeler [source officielle]"
- 99/99 tests passent

---

## TÂCHES — DOING (Phase 0 terrain)

### TRK-014 — Validation terrain (outreach)
**Type :** research | **Priorité :** P0 | **Coût :** 0 ligne de code
**Objectif :** Avant de coder plus, parler à 10-20 humains réels pour valider que le concept `doubt + contrôle` résout un vrai problème.
**Livrables :**
- Envoyer [docs/outreach/pro_senectute.md](docs/outreach/pro_senectute.md) aux 5 antennes cantonales
- Envoyer [docs/outreach/frc.md](docs/outreach/frc.md)
- Envoyer [docs/outreach/ncsc.md](docs/outreach/ncsc.md)
- Poster [docs/outreach/reddit_post.md](docs/outreach/reddit_post.md) sur r/Suisse et r/Switzerland samedi matin
- Installer et tester Bitdefender Scamio sur WhatsApp avec 10 vrais messages d'arnaque suisses (benchmark)
- Lire le rapport semestriel NCSC 2025/1 en entier + rapport anti-phishing 2024
**Critère de sortie :** 10+ témoignages/réponses rassemblés dans `docs/testimonials.md`. Puis décision : coder Phase 1, pivoter, ou s'aligner sur un partenaire.

---

## TÂCHES — READY (Phase 1, à coder après Phase 0)

### TRK-005 — Safe Pause (page de blocage temporaire)
**Type :** feat | **Priorité :** P0 (avancé depuis backlog, c'était le cœur produit)
**Objectif :** Quand un verdict `suspect` ou `danger` tombe, l'utilisateur atterrit sur une page `/pause/:scanId` avec un compte à rebours de 5 min. Le message est clair et rassurant (pas anxiogène — règle CLAUDE.md #5). Le cercle familial est notifié en parallèle. Après 5 min, l'utilisateur peut débloquer manuellement.
**Critères :** Page responsive mobile-first. Compte à rebours visible. Ton apaisant. Notification cercle via endpoint existant. Bouton "demander à [proche]" et "appeler source officielle" réutilisés depuis TRK-013.

### TRK-015 — Consent-first circle redesign
**Type :** refactor | **Priorité :** P0
**Objectif :** Refonder le circle_service pour que le senior soit owner par défaut, avec visibilité symétrique (chaque membre voit les mêmes alertes), granularité du partage (partager seulement `danger`, ou tout), bouton "quitter le cercle" fonctionnel. Basé sur le framework académique *Safety-Autonomy Grid* (PMC 2025) : on ne construit pas un outil de surveillance, on construit un outil de coordination consentie.
**Critères :** Tests qui valident symétrie + granularité. Pas de mode caché. Docs dans `docs/design/consent-first.md`.

### TRK-016 — Web Share Target Android (friction zéro)
**Type :** feat | **Priorité :** P1
**Objectif :** Ajouter `share_target` dans le manifest.json de la PWA. Quand un utilisateur installe Trankill sur Android Chrome, l'app apparaît dans la liste "Partager" du système. Long-press sur SMS → Partager → Trankill → scan instantané. 1 tap au lieu du copier-coller.
**Note iOS :** Safari ne supporte PAS Web Share Target en 2026 (WebKit bug 194593 ouvert). Android-only. Couvre ~65% du parc senior CH.
**Critères :** Manifest mis à jour, handler `POST /share` qui parse multipart et redirige vers page verdict, testé sur un vrai Android via ngrok.

---

## TÂCHES — BACKLOG

| ID | Titre | Type | Prio | Objectif |
|----|-------|------|------|----------|
| TRK-004 | Frontend dashboard cercle enrichi | feat | P1 | Dashboard "ta mère a évité 3 arnaques cette semaine" — growth loop famille. Priorité rétrogradée : le core produit est TRK-005 et TRK-015 |
| TRK-007 | Base de données arnaques suisses enrichie | feat | P1 | Intégrer phishing-domain-checker npm + Google Web Risk API (100k/mois gratuit) + éventuellement PhishTank |
| TRK-017 | Persistance SQLite (node:sqlite natif) | refactor | P1 | Passer de in-memory à node:sqlite (Node 22+ natif, vraiment zéro-dep). Les cercles survivent au restart |
| TRK-018 | Auth HMAC + rate limit /scan | security | P1 | Token signé HMAC sur routes cercle, rate limit in-memory par IP sur /scan et /scan/phone |
| TRK-006 | Extension Chrome (scan automatique) | feat | P2 | Intercepte les clics vers sites suspects dans le navigateur desktop. Utile mais couvre ~15% du volume |
| TRK-010 | Multi-langue (élargir DE/IT depuis FR) | feat | P2 | FR/DE/IT déjà dans le code (TRK-013). À étendre : PT/ES/SQ/TR/AR/TI si partenariat Pro Senectute le justifie |
| TRK-009 | Simulations éducatives (NegotiateAI) | feat | P2 | « Tu reçois ce message. Que fais-tu ? » Gamifié. Priorité selon retours Pro Senectute |
| TRK-011 | Signalement automatique NCSC | feat | P2 | Signalement batch à reports@antiphishing.ch. À activer si NCSC répond favorablement à TRK-014 |
| TRK-008 | Bot contre-attaque SMS | feat | P3 | Rétrogradé : plus de traction réaliste tant qu'on n'a pas 500 users |
| TRK-012 | API B2B white-label | feat | P3 | À activer si Pro Senectute ou FRC montre un intérêt concret |

---

## Principes de priorisation (2026-04-09)

1. **Pas une ligne de code tant que Phase 0 n'a pas livré des retours humains réels.**
2. **Le cœur produit = verdict `doubt` + safe pause + consent-first cercle.** Le reste est du sucre.
3. **Suisse romande d'abord, puis DE/IT.** Pas de distraction internationale avant 1000 users suisses.
4. **Zero-deps est un principe, pas un dogme.** On ajoute `node:sqlite` (natif) et plus tard `phishing-domain-checker` si le bénéfice est net. On ne monte PAS de pipeline React/Vite.
5. **Open source et transparent.** Tout pattern de détection est visible dans le code, pas caché dans un modèle ML.
