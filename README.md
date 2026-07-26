# Le QG des vacances — Argelès-Gazost 2026 (GitHub + Render)

Appli familiale partagée : planning des animations du camping (toujours **en extra**), fiches sorties détaillées (photo, accès, itinéraire, horaires, points forts), missions, météo du jour, score famille. Un seul front (`index.html`) + un petit serveur Node (`server.js`) qui sert la page **et** l'API `/api/sync` (fusion horodatée, persistance Upstash Redis).

## Mise en ligne (une fois, ~10 min)

1. **Upstash** (persistance, gratuit) : console.upstash.com → Create Database (Redis, région Europe) → copier `UPSTASH_REDIS_REST_URL` et `UPSTASH_REDIS_REST_TOKEN` (onglet REST API).
2. **GitHub** : créer un dépôt (suggestion : `qg-sejour-argeles-2026`, privé) et pousser ce dossier — Claude Code fait ça avec `gh repo create … --private --source . --push`.
3. **Render** : dashboard.render.com → New + → **Blueprint** → sélectionner le dépôt (le fichier `render.yaml` fait le reste) → renseigner les 2 variables Upstash → Apply. Sans Blueprint : New + → Web Service → runtime Node → Start command `node server.js` → mêmes variables.
4. **Sécurité minimale** : dans `index.html`, remplacer `TRIP = "sejour-argeles-2026-CHANGEZ-MOI"` par une chaîne aléatoire longue (`openssl rand -hex 16`), commit + push (Render redéploie seul).
5. Partager l'URL Render à la famille (l'ajouter à l'écran d'accueil du téléphone = effet appli).

## Limites connues
- **Plan gratuit Render : le service s'endort** après inactivité → premier chargement de la journée en ~30-60 s. Acceptable en usage famille ; sinon plan payant, ou variante Vercel (le front est compatible avec l'`api/sync.js` du dépôt roadbook — même contrat `{state:{clé:{v,t}}, resetAt}`).
- Pas d'authentification : URL + `TRIP` font office de clé. Rien de sensible dedans.
- Sans backend joignable, l'appli fonctionne en local d'appareil (bandeau « hors ligne »).

## Données embarquées
- Planning camping 25/07 → 01/08 transcrit des photos du panneau (26/07). Semaine 2 : à injecter dès la photo (samedi 01/08).
- Sorties issues du guide `guide-famille-argeles-2026.md` — prix vérifiés le 26/07/2026, mentions **[à vérifier]** conservées volontairement.
