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

## À faire avant un premier déploiement public

- [ ] Pause forcée (Safe Pause) implémentée.
- [ ] Persistance SQLite (les cercles sont actuellement perdus au redémarrage).
- [ ] Auth HMAC + rate limit.
- [ ] Domaine + DNS configurés.
- [ ] `npm test` vert sur le VPS, `curl /health` répond en prod.

(Détail des tâches dans `TASKS.md`.)
