# CLAUDE.md — Trankill

## Projet
- Nom : Trankill
- Tagline : "Sois tranquille, ta famille est protégée."
- Type : Bouclier familial anti-arnaque — détection + safe pause + cercle familial + contre-attaque + éducation
- Licence : MIT
- État : Conception + bootstrap
- Créé : 2026-04-06

## Vision

Trankill casse l'isolement de la victime au moment où l'arnaqueur frappe.

Le problème n'est PAS la détection (Norton, Google, Bitdefender détectent déjà à 98%).
Le problème c'est que la victime est SEULE, STRESSÉE, PRESSÉE par l'urgence fabriquée.
Elle n'a personne à qui demander "c'est vrai ?" en 10 secondes.

Trankill :
1. DÉTECTE le pattern suspect (lien, SMS, email, site, appel)
2. PAUSE FORCÉE — casse l'urgence artificielle (5 min de réflexion)
3. ALERTE LE CERCLE — le fils/la fille est prévenu(e) en temps réel
4. EXPLIQUE — pourquoi c'est suspect, en langage simple, dans ta langue
5. CONTRE-ATTAQUE — bots IA qui font perdre du temps/argent aux scammers
6. ÉDUQUE — simulations interactives pour apprendre à reconnaître les arnaques

## Marché
- 1 Suisse sur 7 a perdu de l'argent en ligne (sondage 2025)
- CHF 530M volés en crypto en Suisse depuis 2022
- $12.5B de pertes aux US (FTC 2024), $4.89B elder fraud (+43%)
- Marché anti-fraude logiciel : $54.6B en 2025
- AUCUN leader en Europe dans le segment famille/consumer
- Concurrents US (Aura, EverSafe, Carefull) = pas en Europe, pas de safe pause

## Stack technique
- Frontend : PWA, mobile-first
- Backend : Node.js ESM, zero deps
- IA : Claude API (analyse de messages/liens), Ollama local en option
- Extensions : Chrome/Firefox (scan temps réel des pages)
- Tests : node:test
- Hébergement : local-first, Infomaniak pour le backend partagé

## Commandes
```bash
npm test
npm run dev
npm start
```

## Liens écosystème
- NegotiateAI (c:\PROJET IA\NegotiateAI) : moteur de simulation anti-manipulation (drill mode)
- Vigila (c:\PROJET IA\Suxe) : même approche cercle de confiance / preuve
- WorldEngine (c:\PROJET IA\WorldEngine) : simulation de scénarios d'arnaque

## Partenaires de distribution potentiels
- Swisscom (consortium anti-fraude 2025 avec LexisNexis)
- La Mobilière (moins de sinistres = économie)
- Banques cantonales (moins de chargebacks)
- ASLOCA / FRC (protection des consommateurs)
- Pro Senectute (protection des aînés)

## Règles
1. Code/commits en anglais, docs en français
2. Tests obligatoires avant commit
3. Local-first : données utilisateur restent chez eux
4. JAMAIS promettre "protection 100%" — toujours "aide à détecter et réagir"
5. Le ton est RASSURANT, pas anxiogène
6. Le safe pause est le coeur — tout le reste en découle
7. Open source : transparence totale sur ce qu'on scanne et comment
