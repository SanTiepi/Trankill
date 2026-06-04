# Trankill — Bouclier Familial Anti-Arnaque

> « Sois tranquille, ta famille est protégée. »

Trankill aide les proches vulnérables à ne pas être seuls face à une arnaque. Quand un lien ou un message suspect arrive, l'app détecte le pattern, impose une pause de réflexion pour casser l'urgence artificielle, et alerte le cercle familial en temps réel.

**État : bootstrap / pas encore déployé.** Le code tourne en local, les tests passent (99/99), mais l'app n'est pas accessible publiquement.

## Le problème

La détection brute est déjà couverte par les antivirus. Le vrai problème : la victime est **seule, stressée, pressée** par une urgence fabriquée. Trankill casse cet isolement en mettant un proche dans la boucle.

## Ce que ça fait

1. **Détecte** — lien, SMS, email, numéro de téléphone suspect (patterns suisses validés contre sources NCSC/PostFinance/Swiss Post).
2. **Alerte le cercle** — un proche (fils/fille) est prévenu en temps réel.
3. **Explique** — pourquoi c'est suspect, en FR/DE/IT/EN, en langage simple.
4. **4 niveaux de verdict** — `safe` / `doubt` / `suspect` / `danger`.

Backlog (non fait) : pause forcée 5 min, persistance SQLite, auth HMAC + rate limit (cf. `TASKS.md`).

## Stack technique

- Backend : Node.js ESM, **zéro dépendances** npm, `node:http` natif.
- Frontend : PWA mobile-first, vanilla JS/CSS.
- Stockage : in-memory (données perdues au redémarrage — SQLite prévu).
- Tests : `node:test` natif (99 cas, 0 fail).
- Licence : MIT.

## Installation

```bash
git clone https://github.com/SanTiepi/Trankill.git
cd Trankill
```

Aucune dépendance à installer (`npm install` inutile — zéro deps).

## Lancer en local

```bash
npm start            # ou npm run dev
PORT=8080 npm start  # pour changer le port (défaut 3500)
```

PWA à la racine `/`. API JSON sur `/scan`, `/scan/phone`, `/circle/*`.

## Tester

```bash
npm test             # 99 cas, 0 fail (~170 ms)
```

## Structure

```
trankill/
├── src/
│   ├── server.mjs              # Point d'entrée — node:http sur PORT
│   ├── routes/index.mjs        # Router HTTP + fichiers statiques
│   ├── services/
│   │   ├── scan_service.mjs    # Détection : patterns, URL, urgence, données
│   │   └── circle_service.mjs  # Cercle familial CRUD + alertes (in-memory)
│   └── public/                 # PWA frontend (HTML/CSS/JS vanilla)
├── test/                       # Tests node:test
├── docs/outreach/              # Emails Pro Senectute / FRC / NCSC
├── CLAUDE.md                   # Instructions pour Claude Code
├── TASKS.md                    # Kanban + roadmap
└── package.json
```

## API (résumé)

| Méthode | Endpoint | Description |
|---|---|---|
| GET | `/health` | Statut du serveur |
| POST | `/scan` | Analyse `{ input }` (lien ou message) |
| POST | `/scan/phone` | Analyse `{ phone }` |
| POST | `/circle` | Créer un cercle `{ ownerName }` |
| GET | `/circle/:id` | Détails + membres |
| POST | `/circle/:id/members` | Ajouter un membre |
| POST | `/circle/:id/alert` | Envoyer une alerte |
| GET | `/circle/:id/alerts` | Lister les alertes |
| GET | `/circle/:id/stats` | Statistiques |

## Principes

- Local-first : les données restent chez l'utilisateur.
- Jamais promettre « protection 100 % » — on aide à détecter et réagir.
- Ton rassurant, pas anxiogène.
- Zéro-deps : pas de framework, pas de bundler.
- Open source : transparence totale sur les patterns de détection.
