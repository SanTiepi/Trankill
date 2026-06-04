# Déploiement — Trankill

> **Statut : pas encore déployé (2026-06-04).**
> Ce document décrit la cible probable et les étapes à valider. Les blocs `TODO:` indiquent ce qui reste à décider — rien n'est inventé comme acquis.

## Cible probable

Backend Node.js derrière Caddy sur le VPS Batiscan (`83.228.221.188`), dans l'infrastructure Docker existante du studio.

URL cible : `TODO:` `trankill.batiscan.ch` ou domaine propre.

## Prérequis

- Node.js 22+ sur le VPS (requis pour `node:sqlite` natif, persistance prévue).
- Docker + Caddy déjà en place (infra Batiscan-V4).
- `TODO:` décider container dédié vs processus systemd/PM2.

## Variables d'environnement (VPS)

```bash
PORT=3500   # ou le port interne souhaité
```

Aucune autre variable requise à ce stade.

## Étapes (à valider)

1. Pousser le code (rsync depuis Windows façon `push-files.ps1`, ou `git clone` direct sur le VPS).
2. Lancer : `node src/server.mjs` (aucun `npm install` — zéro deps). `TODO:` choisir le gestionnaire de process.
3. Ajouter un bloc Caddy (`/home/ubuntu/Batiscan-V4/Caddyfile`) :
   ```caddyfile
   trankill.batiscan.ch {        # TODO: domaine
       reverse_proxy localhost:3500
   }
   ```
   ⚠️ Ne PAS faire `cp` sur le Caddyfile (bind mount) — utiliser `tee` + `docker restart batiscan_caddy` :
   ```bash
   cat /home/ubuntu/Batiscan-V4/Caddyfile | docker exec -i batiscan_caddy tee /etc/caddy/Caddyfile
   docker restart batiscan_caddy
   ```
4. Vérifier : `curl https://trankill.batiscan.ch/health` → `{"ok":true,...}`.

## Rollback

Pas encore déployé → aucun rollback en prod à ce jour. Une fois déployé (cible VPS + Caddy ci-dessus), le rollback suivra le pattern du studio : sur le VPS, `git checkout <commit stable>` puis redéploiement (ou repointer l'image Docker précédente), vérif `curl /health`. **Données** : les cercles familiaux sont in-memory (perdus au redémarrage) tant que la persistance SQLite n'est pas faite — donc aucun état à préserver lors d'un rollback pour l'instant. Ça changera quand la persistance arrivera (penser alors à ne pas écraser la DB).

## À faire avant un premier déploiement public

- [ ] Pause forcée (Safe Pause) implémentée.
- [ ] Persistance SQLite (les cercles sont actuellement perdus au redémarrage).
- [ ] Auth HMAC + rate limit.
- [ ] Domaine + DNS configurés.
- [ ] `npm test` vert sur le VPS, `curl /health` répond en prod.

(Détail des tâches dans `TASKS.md`.)
