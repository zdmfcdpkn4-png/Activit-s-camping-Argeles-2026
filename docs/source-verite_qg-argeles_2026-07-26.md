# Source de Vérité — QG du séjour Argelès-Gazost 2026 — 2026-07-26

> Contexte source complet : Oui
> Domaine : dev

## ⚠️ À surveiller
- Non tranché : nom définitif du dépôt GitHub (suggestion `qg-sejour-argeles-2026`) ; visibilité (privé conseillé) ; stratégie face à l'endormissement du plan gratuit Render ; valeur définitive de `TRIP`.
- Lacunes / [non renseigné] : aucun identifiant GitHub / Render / Upstash dans ce fichier (volontaire) ; horaires marqués [à vérifier] dans les fiches sorties (remontées Pont d'Espagne, Pic du Jer, château fort, Jardin des Bains, balade à cheval) ; planning camping semaine 02→08/08 non transcrit (photo du panneau attendue le 01/08).

## Objectif de la session
Construire l'appli familiale partagée « QG des vacances » pour le séjour au camping Les 3 Vallées (Argelès-Gazost, 25/07→08/08/2026) : planning des animations camping en extra, fiches sorties détaillées, missions, météo du jour, score famille — avec un vrai backend de synchronisation sur le modèle du roadbook du trajet. État atteint : v1.2 fonctionnelle et testée hors Redis, portée de Vercel vers Render, prête à pousser sur GitHub et déployer.

## Décisions validées
- Les animations du camping s'affichent toujours EN EXTRA, en plus des sorties, jamais à la place (consigne utilisateur explicite).
- Reprise du modèle roadbook : état `{state:{clé:{v,t}}, resetAt}`, fusion horodatée par clé côté serveur, remise à zéro protégée par double appui (`resetAt`).
- Cible de déploiement : GitHub + **Render** (remplace Vercel pour ce livrable) ; persistance **Upstash Redis REST** (gratuit, zéro dépendance npm).
- Front sans stockage navigateur ; si l'API est injoignable : mode « hors ligne » local avec bandeau.
- Fiches sorties dépliables : photo chargée à la volée via l'API REST Wikipédia (repli bandeau illustré), bouton itinéraire Google Maps par nom de lieu, horaires, durée idéale famille (enfant de 5 ans), points forts. Mentions [à vérifier] conservées.
- Données planning issues des photos du panneau d'affichage (26/07), semaine 25/07→01/08, trois publics (Enfants 5-12 / Ados / Adultes).
- Passation de la gestion continue à Claude Code (ce fichier + CLAUDE.md), comme pour le roadbook.

## Structure / architecture retenue
    qg-sejour-argeles-2026/
    ├── index.html      (front complet : vues Semaine / Sorties / Missions / Infos, client sync)
    ├── server.js       (Node natif >=18 : sert "/" et GET|POST /api/sync?trip=<id>)
    ├── render.yaml     (Blueprint Render : web service plan free, startCommand node server.js)
    ├── package.json    ("type":"module", "start":"node server.js", engines node >=18)
    ├── .gitignore
    ├── README.md       (déploiement Upstash → GitHub → Render, limites)
    ├── CLAUDE.md       (mission immédiate + invariants + backlog)
    └── docs/source-verite_qg-argeles_2026-07-26.md (ce fichier)

## Contraintes techniques & paramètres figés
- Contrat API : `{state:{clé:{v,t}}, resetAt}` (figé)
- Clé Redis : `sync:<trip>` (figé)
- `TRIP` (index.html) : `sejour-argeles-2026-CHANGEZ-MOI` — à remplacer par `sejour-` + `openssl rand -hex 16` (figé)
- Endpoint client : `POST /api/sync?trip=<TRIP>` ; polling 15 s si page visible ; debounce 800 ms (figé)
- Env serveur : `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` (alias `KV_REST_API_URL` / `KV_REST_API_TOKEN`) (figé)
- `PORT` : `process.env.PORT || 10000` (figé — Render fournit PORT)
- Démarrage : `node server.js` ; Node >= 18 ; zéro dépendance npm (figé)
- Limite corps requête : 1e6 octets → 413 (figé)
- Photos : `https://fr.wikipedia.org/api/rest_v1/page/summary/<titre>` (figé)
- Itinéraires : `https://www.google.com/maps/dir/?api=1&travelmode=driving&destination=<nom encodé>` (figé)

## Pistes écartées
- Fonction serverless Vercel (`api/sync.js`) — écartée car cible demandée = Render ; l'équivalent vit dans le dépôt roadbook (front compatible, même contrat).
- Stockage artifact `window.storage` — écarté car un vrai backend partagé était demandé.
- Persistance fichier sur le disque Render — écartée : disque éphémère en plan gratuit.
- Coordonnées GPS en dur pour les itinéraires — écartées au profit du géocodage Google par nom de lieu.
- Photos hotlinkées en dur — écartées (liens fragiles, droits) au profit de l'API Wikipédia + repli.

## Fichiers produits
- `index.html` : front complet v1.2 (données planning + 21 fiches sorties enrichies).
- `server.js` : serveur Render (statique + API sync).
- `render.yaml`, `package.json`, `.gitignore` : déploiement.
- `README.md`, `CLAUDE.md` : exploitation et reprise.
- Hors dépôt : `guide-famille-argeles-2026.md` (guide source des fiches, livré à l'utilisateur côté chat).

## En cours & prochaines étapes
- [todo] Créer le dépôt GitHub privé et pousser (`gh repo create qg-sejour-argeles-2026 --private --source . --push`) — Claude Code.
- [todo] Remplacer `TRIP` par une chaîne aléatoire longue, commit.
- [todo] Créer la base Upstash Redis (REST URL + TOKEN) — dashboard Upstash, gratuit.
- [todo] Déployer sur Render via Blueprint `render.yaml`, renseigner les 2 variables, vérifier `/` et `/api/sync`.
- [todo] Tester la synchronisation depuis 2 appareils sur l'URL Render, transmettre l'URL à la famille.
- [todo] Injecter le planning camping semaine 02→08/08 dès la photo du panneau (01/08).
- [bloqué] Push GitHub / configuration Render impossibles depuis le chat d'origine (aucun identifiant disponible) — motif de cette passation.

---

## Bloc de contexte (JSON)
```json
{
  "session": {
    "projet": "QG du séjour Argelès-Gazost 2026",
    "date": "2026-07-26",
    "domaine": "dev",
    "contexte_source_complet": true
  },
  "decisions": [
    { "enonce": "Animations camping toujours affichées en extra, jamais à la place des sorties", "statut": "valide" },
    { "enonce": "Modèle roadbook repris : état {state:{clé:{v,t}}, resetAt}, fusion horodatée, RAZ double appui", "statut": "valide" },
    { "enonce": "Déploiement GitHub + Render (remplace Vercel) avec persistance Upstash Redis REST", "statut": "valide" },
    { "enonce": "Front sans stockage navigateur ; mode hors ligne local si API injoignable", "statut": "valide" },
    { "enonce": "Fiches sorties dépliables : photo Wikipédia avec repli, itinéraire Google Maps, horaires, durée famille, points forts, mentions [à vérifier] conservées", "statut": "valide" },
    { "enonce": "Planning camping transcrit des photos du panneau, semaine 25/07-01/08, trois publics", "statut": "valide" },
    { "enonce": "Gestion continue confiée à Claude Code via CLAUDE.md et cette passation", "statut": "valide" }
  ],
  "contraintes": [
    { "cle": "contrat_api", "valeur": "{state:{clé:{v,t}}, resetAt}", "type": "fige" },
    { "cle": "cle_redis", "valeur": "sync:<trip>", "type": "fige" },
    { "cle": "TRIP", "valeur": "sejour-argeles-2026-CHANGEZ-MOI (à remplacer par sejour- + openssl rand -hex 16)", "type": "fige" },
    { "cle": "endpoint_client", "valeur": "POST /api/sync?trip=<TRIP> ; polling 15 s si visible ; debounce 800 ms", "type": "fige" },
    { "cle": "env_serveur", "valeur": "UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN (alias KV_REST_API_*)", "type": "fige" },
    { "cle": "PORT", "valeur": "process.env.PORT || 10000", "type": "fige" },
    { "cle": "demarrage", "valeur": "node server.js ; Node >= 18 ; zéro dépendance npm", "type": "fige" },
    { "cle": "limite_corps", "valeur": "1e6 octets -> 413", "type": "fige" },
    { "cle": "photos", "valeur": "https://fr.wikipedia.org/api/rest_v1/page/summary/<titre>", "type": "fige" },
    { "cle": "itineraires", "valeur": "https://www.google.com/maps/dir/?api=1&travelmode=driving&destination=<nom encodé>", "type": "fige" }
  ],
  "en_cours": [
    { "tache": "Créer le dépôt GitHub privé et pousser (gh repo create qg-sejour-argeles-2026 --private --source . --push)", "statut": "todo", "detail": "Claude Code" },
    { "tache": "Remplacer TRIP par une chaîne aléatoire longue puis commit", "statut": "todo", "detail": "openssl rand -hex 16" },
    { "tache": "Créer la base Upstash Redis et récupérer REST URL + TOKEN", "statut": "todo", "detail": "dashboard Upstash, plan gratuit" },
    { "tache": "Déployer sur Render via Blueprint render.yaml et renseigner les 2 variables", "statut": "todo", "detail": "vérifier / et /api/sync" },
    { "tache": "Tester la synchronisation depuis 2 appareils et transmettre l'URL famille", "statut": "todo", "detail": "badge ✓ partagé attendu" },
    { "tache": "Injecter le planning camping semaine 02-08/08", "statut": "todo", "detail": "photo du panneau attendue le 01/08" },
    { "tache": "Push GitHub / configuration Render depuis le chat d'origine", "statut": "bloque", "detail": "aucun identifiant disponible — motif de la passation" }
  ],
  "pistes_ecartees": [
    { "piste": "Fonction serverless Vercel api/sync.js", "raison": "cible demandée = Render ; équivalent conservé dans le dépôt roadbook" },
    { "piste": "Stockage artifact window.storage", "raison": "un vrai backend partagé était demandé" },
    { "piste": "Persistance fichier sur disque Render", "raison": "disque éphémère en plan gratuit" },
    { "piste": "Coordonnées GPS en dur pour les itinéraires", "raison": "géocodage Google par nom de lieu plus fiable" },
    { "piste": "Photos hotlinkées en dur", "raison": "liens fragiles et droits ; API Wikipédia + repli préférés" }
  ],
  "fichiers": [
    { "nom": "index.html", "role": "front complet v1.2 (planning + 21 fiches sorties enrichies + client sync)" },
    { "nom": "server.js", "role": "serveur Render : statique + API /api/sync" },
    { "nom": "render.yaml", "role": "Blueprint Render (web service free, node server.js)" },
    { "nom": "package.json", "role": "module ES, start, engines node >=18" },
    { "nom": "README.md", "role": "déploiement Upstash -> GitHub -> Render, limites" },
    { "nom": "CLAUDE.md", "role": "mission immédiate, invariants, backlog" },
    { "nom": "docs/source-verite_qg-argeles_2026-07-26.md", "role": "cette passation" }
  ],
  "non_tranche": [
    "nom définitif du dépôt GitHub",
    "visibilité du dépôt (privé conseillé)",
    "stratégie face à l'endormissement du plan gratuit Render",
    "valeur définitive de TRIP"
  ],
  "lacunes": [
    "aucun identifiant GitHub / Render / Upstash dans ce fichier (volontaire)",
    "horaires [à vérifier] dans les fiches sorties : remontées Pont d'Espagne, Pic du Jer, château fort, Jardin des Bains, balade à cheval",
    "planning camping semaine 02-08/08 non transcrit (photo attendue le 01/08)"
  ]
}
```
