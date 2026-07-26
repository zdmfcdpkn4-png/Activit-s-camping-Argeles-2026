# CLAUDE.md — QG du séjour Argelès-Gazost 2026

## Mission immédiate (à exécuter par Claude Code)
1. Lire `docs/source-verite_qg-argeles_2026-07-26.md` (source de vérité de la session d'origine).
2. `gh auth status` puis créer et pousser le dépôt : `gh repo create qg-sejour-argeles-2026 --private --source . --push` (adapter le nom si l'utilisateur préfère).
3. Remplacer `TRIP = "sejour-argeles-2026-CHANGEZ-MOI"` dans `index.html` par `sejour-` + `openssl rand -hex 16` ; commit.
4. Tester en local : `node --check server.js` puis `PORT=10123 node server.js` + `curl localhost:10123/` (HTML) et `curl "localhost:10123/api/sync?trip=test"` (500 attendu tant qu'Upstash n'est pas configuré).
5. Guider l'utilisateur pas à pas : création base Upstash (REST URL + TOKEN), puis Render → New + → Blueprint → ce dépôt → variables → Apply (voir README).
6. Vérifier sur l'URL Render : page OK, badge « ✓ partagé », coche visible depuis un 2e appareil. Donner l'URL finale.

## Invariants (ne pas casser)
- Tout en français. Mobile-first, cibles tactiles >= 44 px.
- Les animations du camping s'affichent TOUJOURS « en extra », en plus des sorties — jamais à la place.
- Aucune donnée inventée : planning = photos du panneau ; prix/horaires = sources du guide ; sinon marquer [à vérifier].
- Pas de localStorage / sessionStorage : état partagé via /api/sync, contrat {state:{clé:{v,t}}, resetAt}, fusion horodatée par clé, resetAt purge les clés antérieures, clé Redis `sync:<trip>`.
- `TRIP` reste une chaîne aléatoire longue (pas d'authentification).
- Déploiement cible : Render Web Service (`server.js`, Node >= 18, zéro dépendance). La variante Vercel n'existe plus ici (voir dépôt roadbook).

## État au 26/07/2026 (v1.2)
- Vues : Semaine (météo du jour partagée + camping en extra), Sorties (21 fiches dépliables : photo Wikipédia avec repli, accès, bouton itinéraire Google Maps, horaires, durée idéale famille, points forts), Missions, Infos (RAZ double appui). Score famille, niveaux Marmotte → Ours.
- Planning camping transcrit : 26/07 → 01/08 (3 publics). Jours 02 → 08/08 : placeholder.
- Backend porté de Vercel vers Render : `server.js` sert `/` et `/api/sync` ; persistance Upstash Redis REST (env `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`, alias `KV_REST_API_*` acceptés).

## Backlog (non décidé)
- Injecter le planning camping semaine 02-08/08 (photo attendue le 01/08).
- Météo automatique (Open-Meteo) en plus du choix manuel.
- QR code de l'URL à imprimer pour la famille.
- Endormissement du plan gratuit Render : décider (accepter / cron de réveil / plan payant / retour Vercel).
