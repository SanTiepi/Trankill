# RESUME-HERE — Trankill
> Point d'entrée pour reprendre la session. Mis à jour : 2026-06-10.

## Où on en est

Safe Pause (TRK-005) est livré et vert. 120 tests, 0 fail.
- Page `/pause/:scanId` : countdown SVG 5 min, auto-unlock, boutons "Demander à [proche]" / "Appeler source officielle", ton rassurant
- Notification cercle best-effort (erreur circle ignorée pour ne pas bloquer)
- Store in-memory (perd les pauses au restart — acceptable pour MVP)

Pack outreach (TRK-014) est prêt mais pas encore envoyé. Tout est dans `docs/outreach/SEND-THIS.md`.

## Lancer

```bash
cd "C:\PROJET IA\Trankill"
npm test          # 120 tests, doit être 0 fail
npm run dev       # serveur dev avec watch
npm start         # serveur prod
```

## 3 prochaines actions concrètes

**1. Envoyer l'outreach (30 min, zéro code)**
Ouvre `docs/outreach/SEND-THIS.md`. Envoie les emails. Pour Pro Senectute Vaud : formulaire web + tél. 021 646 17 21 (pas d'email public confirmé). Pour FRC : formulaire frc.ch/contact. Pour Reddit : vérifier la sidebar avant de poster.

**2. Coder TRK-015 — Consent-first circle redesign**
Quand tu as au moins quelques retours terrain (ou si tu veux avancer en parallèle).
Objectif : senior = owner, visibilité symétrique, granularité du partage, bouton "quitter le cercle".
Design dans `TASKS.md#TRK-015`.

**3. Déployer le MVP pour le test terrain**
Le serveur tourne mais n'est pas public. Avant les interviews Pro Senectute, déployer sur un sous-domaine (ex. `trankill.batiscan.ch`) via Docker sur le VPS studio-robin. Voir TRK-017 (SQLite) si persistance requise avant déploiement.

## Règle terrain (rappel)
**Phase 0 = parler à des humains AVANT de coder plus.** Aucune feature Phase 1 (sauf TRK-015 si tu veux avancer) tant que 10 témoignages ne sont pas dans `docs/testimonials.md`.

## Fichiers clés
- `TASKS.md` — kanban complet
- `docs/outreach/SEND-THIS.md` — pack outreach prêt à envoyer
- `src/services/pause_service.mjs` — Safe Pause service
- `src/routes/index.mjs` — routes /pause et /pause/:scanId/unlock
- `src/public/pause.html` — page pause frontend
- `test/pause.test.mjs` — 21 tests TRK-005
