# TASKS — Trankill

> Source de vérité des tâches.
> Créé : 2026-04-06

## KANBAN

### Done
TRK-001, TRK-002

### Ready
TRK-003, TRK-004

### Backlog
TRK-005, TRK-006, TRK-007, TRK-008, TRK-009, TRK-010, TRK-011, TRK-012

---

## TÂCHES — READY

### TRK-002 — Scan de lien : POST /scan
**Type :** feat | **Priorité :** P0
**Objectif :** L'utilisateur colle un lien/message suspect → l'API retourne : verdict (safe/suspect/danger), score de confiance, explication en langage simple, type d'arnaque détectée, action recommandée.
**Sources :** PhishTank API, Google Safe Browsing API, patterns regex (faux Poste, Swisscom, impôts), heuristiques (domaine récent, typosquatting, urgence dans le texte).
**Critères :** Réponse <2 secondes. Détecte les 5 arnaques suisses les plus courantes. 15+ tests.

### TRK-003 — Cercle familial : CRUD + alertes
**Type :** feat | **Priorité :** P0
**Objectif :** Créer un cercle (code invite), ajouter des membres, envoyer une alerte quand un membre scanne un lien dangereux. Dashboard : "cette semaine, maman a été protégée 3 fois."
**Critères :** Invitation par code 6 chars. Max 10 membres par cercle. Alerte en <5 secondes.

### TRK-004 — Frontend : page de scan + dashboard cercle
**Type :** feat | **Priorité :** P0
**Objectif :** Page web dark mode : coller un lien → verdict visuel (vert/orange/rouge) + explication + action. Section cercle familial.

---

## TÂCHES — BACKLOG

| ID | Titre | Type | Prio | Objectif |
|----|-------|------|------|----------|
| TRK-005 | Safe Pause (page de blocage temporaire) | feat | P0 | Page qui remplace le site suspect pendant 5 min + notification cercle |
| TRK-006 | Extension Chrome (scan automatique) | feat | P1 | Intercepte les clics vers sites suspects, déclenche safe pause |
| TRK-007 | Base de données arnaques suisses | feat | P1 | Patterns faux Poste, Swisscom, impôts, UBS, crypto suisses |
| TRK-008 | Bot contre-attaque SMS | feat | P1 | Répond automatiquement aux SMS d'arnaque, fait perdre du temps |
| TRK-009 | Simulations éducatives (NegotiateAI) | feat | P2 | "Tu reçois ce message. Que fais-tu ?" Gamifié. |
| TRK-010 | Multi-langue (15 langues) | feat | P1 | FR, DE, IT, EN, PT, ES, SQ, SR, TR, AR, TI, TA, ZH, TH, RO |
| TRK-011 | Signalement automatique (NCSC, Google, hébergeurs) | feat | P2 | Chaque arnaque détectée = signalement auto aux autorités |
| TRK-012 | API B2B white-label | feat | P3 | Pour banques/assureurs/télécoms : intégrer Trankill dans leur app |
