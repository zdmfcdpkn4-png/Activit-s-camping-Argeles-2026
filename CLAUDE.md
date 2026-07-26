# CLAUDE.md — QG du séjour Argelès-Gazost 2026

## Mission immédiate (à exécuter par Claude Code)
1. Lire `docs/source-verite_qg-argeles_2026-07-26.md` (source de vérité de la session d'origine).
2. ~~Créer et pousser le dépôt~~ — fait : dépôt `Activit-s-camping-Argeles-2026`, branche `claude/new-session-kzzpl2`.
3. ~~Remplacer `TRIP` par une chaîne aléatoire~~ — fait (`sejour-` + `openssl rand -hex 16`).
4. Tester en local : `node --check server.js` puis `npm install` + `PORT=10123 node server.js` + `curl localhost:10123/` (HTML) et `curl "localhost:10123/api/sync?trip=test"` (500 attendu tant que `DATABASE_URL` n'est pas définie).
5. Guider l'utilisateur pas à pas : création base **PostgreSQL Render** (plan Free, essai ~1 mois) → copier l'Internal Database URL → Render → New + → Blueprint → ce dépôt → variable `DATABASE_URL` → Apply (voir README). L'URL de base contient le mot de passe : jamais dans le dépôt.
6. Vérifier sur l'URL Render : page OK, badge « ✓ partagé », coche visible depuis un 2e appareil. Donner l'URL finale.

## Invariants (ne pas casser)
- Tout en français. Mobile-first, cibles tactiles >= 44 px.
- Les animations du camping s'affichent TOUJOURS « en extra », en plus des sorties — jamais à la place.
- Aucune donnée inventée : planning = photos du panneau ; prix/horaires = sources du guide ; sinon marquer [à vérifier].
- Pas de localStorage / sessionStorage : état partagé via /api/sync, contrat {state:{clé:{v,t}}, resetAt}, fusion horodatée par clé, resetAt purge les clés antérieures. Stockage : table PostgreSQL `sync_state` (une ligne par `trip`, colonne `data` JSONB), créée automatiquement au premier appel.
- `TRIP` reste une chaîne aléatoire longue (pas d'authentification).
- Déploiement cible : Render Web Service (`server.js`, Node >= 18, une seule dépendance npm : `pg`) + base PostgreSQL Render via env `DATABASE_URL`. La variante Vercel n'existe plus ici (voir dépôt roadbook) ; la variante Upstash Redis a été remplacée le 26/07 (décision utilisateur).

## État au 26/07/2026 (v1.3)
- Vues : Semaine (météo du jour partagée + camping en extra), Sorties (22 fiches dépliables : photo Wikipédia avec repli, accès, bouton itinéraire Google Maps, horaires, durée idéale famille, points forts), Missions, Infos (RAZ double appui). Score famille, niveaux Marmotte → Ours.
- Planning camping transcrit : 26/07 → 01/08 (3 publics). Jours 02 → 08/08 : placeholder.
- v1.2 : backend porté de Vercel vers Render (`server.js` sert `/` et `/api/sync`).
- v1.3 : persistance portée d'Upstash Redis vers **PostgreSQL Render** (`DATABASE_URL`, TLS auto pour les URL externes `render.com`, pool `pg` avec gestionnaire d'erreurs) ; contrat API et front inchangés ; `render.yaml` passe à `buildCommand: npm install`.
- v1.4 : onglet **⭐ Favoris** — liste des membres de la famille partagée (clé `mb`, prénoms ajoutés par la famille elle-même, jamais inventés), votes par membre (clés `fav:<membre>:<sortie>`), classement « Par votes » (podium 🥇🥈🥉, émojis des votants) ou « Par type » (par catégorie), compteur ❤️ reporté sur les fiches Sorties. L'identité du votant (`moi`) reste en mémoire de page — aucun stockage navigateur (invariant respecté) : on retouche son prénom après un rechargement. La RAZ globale efface aussi membres et votes.

## Backlog (non décidé)
- Injecter le planning camping semaine 02-08/08 (photo attendue le 01/08).
- Météo automatique (Open-Meteo) en plus du choix manuel.
- QR code de l'URL à imprimer pour la famille.
- Endormissement du plan gratuit Render : décider (accepter / cron de réveil / plan payant / retour Vercel).
- Fin de l'essai PostgreSQL (~fin août) : sans enjeu après le séjour (08/08) — supprimer la base, ou migrer si l'appli doit survivre.
