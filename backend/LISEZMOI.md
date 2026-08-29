# API Learn-Cobol

API REST en **architecture MVC** (Express 5 + Mongoose 9, ESM) qui sert le contenu
pédagogique et **persiste la progression dans MongoDB** — XP et leçons accomplies
survivent au rechargement de la page.

## Démarrer

```bash
docker compose up -d          # depuis la racine — lance MongoDB
cd backend && npm run dev     # ou npm start
```

- API : <http://localhost:3000/api>
- Aperçu frontend : <http://localhost:3000/frontend/> (plus besoin de `python -m http.server`)

Le compte admin est créé automatiquement au démarrage à partir du `.env` de la racine.
`npm run admin:init` réinitialise son mot de passe sur la valeur du `.env`.

## Architecture

```
backend/
├── server.js                       point d'entrée : connexion Mongo → admin → écoute HTTP
├── scripts/initialiser-admin.js    réinitialisation du compte admin
└── src/
    ├── app.js                      montage Express (API + statique)
    ├── config/
    │   ├── env.js                  lecture et validation du .env, chemins du projet
    │   └── database.js             connexion Mongoose
    ├── models/                     M — schémas Mongoose
    │   ├── utilisateur.model.js    hachage bcrypt, rôles admin/apprenant
    │   └── progression.model.js    XP et leçons, totaux calculés en virtuels
    ├── controllers/                C — logique de chaque endpoint
    │   ├── auth.controller.js
    │   ├── unite.controller.js
    │   └── progression.controller.js
    ├── routes/                     table de routage
    ├── services/                   règles métier réutilisables
    │   ├── unite.service.js        lecture + cache des JSON de data/
    │   └── admin.service.js        création idempotente de l'admin
    ├── middlewares/
    │   ├── authentification.js     vérification du JWT, garde de rôle
    │   └── erreurs.js              404 et gestionnaire d'erreurs centralisé
    └── utils/ErreurHttp.js         erreurs porteuses d'un code HTTP
```

Les unités restent des **fichiers JSON** sous `data/<CATEGORIE>/` : ils sont la
source du contenu, lus et mis en cache (cache invalidé à la modification du fichier).
Mongo ne stocke que ce qui est propre à l'utilisateur — son compte et sa progression.

## Authentification

Un seul compte pour l'instant (`admin`), défini dans le `.env`. Connexion → JWT à
placer dans l'en-tête `Authorization: Bearer <jeton>`. Le schéma `Utilisateur`
prévoit déjà le rôle `apprenant` pour l'ouverture future des inscriptions.

## Endpoints

### Public

| Méthode | Route | Rôle |
|---|---|---|
| `GET` | `/api/sante` | état du service et de la connexion Mongo |
| `POST` | `/api/auth/connexion` | `{ nom_utilisateur, mot_de_passe }` → jeton JWT |
| `GET` | `/api/unites` | liste des unités (`?categorie=COBOL` pour filtrer) |
| `GET` | `/api/unites/categories` | catégories disponibles et nombre d'unités |
| `GET` | `/api/unites/:uniteId` | unité complète (théorie + exercices) |
| `GET` | `/api/unites/:uniteId/cartes` | cartes de révision de l'unité |
| `GET` | `/api/unites/:uniteId/lecons/:leconId` | une leçon précise |

### Authentifié

| Méthode | Route | Rôle |
|---|---|---|
| `GET` | `/api/auth/moi` | profil du porteur du jeton |
| `GET` | `/api/progression` | toutes les progressions + totaux (XP, unités terminées) |
| `GET` | `/api/progression/:uniteId` | progression d'une unité (créée à la volée) |
| `PUT` | `/api/progression/:uniteId/lecons/:leconId` | enregistre le résultat d'une leçon |
| `DELETE` | `/api/progression/:uniteId` | réinitialise une unité |
| `DELETE` | `/api/progression` | remet toute la progression à zéro |

## Enregistrer une leçon

```http
PUT /api/progression/1-introduction/lecons/1-0-quest-ce-que-le-cobol
Authorization: Bearer <jeton>
Content-Type: application/json

{ "xp_obtenu": 50, "coeurs_restants": 5, "exercices_reussis": 5, "reussie": true }
```

**Le client est traité comme non fiable.** Le serveur recharge le JSON de l'unité et :

- refuse une unité ou une leçon inexistante (404) ;
- plafonne `xp_obtenu` au `xp` déclaré de la leçon, `coeurs_restants` à
  `gamification.coeurs_max`, `exercices_reussis` au nombre réel d'exercices ;
- n'accorde `reussie` que si la leçon s'est terminée avec au moins un cœur ;
- ne conserve que la **meilleure tentative** : un échec ultérieur n'efface ni les XP
  ni la réussite acquise, seul le compteur `tentatives` augmente.

Les totaux (`xp_total`, `lecons_reussies`, `avancement`, `terminee`) ne sont jamais
écrits par le client : ce sont des virtuels dérivés du tableau `lecons`.

## Réponses

Succès : `{ "succes": true, … }` · Erreur : `{ "succes": false, "erreur": "…" }`
(avec `details` en cas d'erreur de validation, et la pile en développement pour les 5xx).

## Variables d'environnement

Dans le `.env` de la **racine** — partagé avec `docker-compose.yml`, non versionné.

| Variable | Rôle |
|---|---|
| `PORT`, `NODE_ENV` | serveur HTTP |
| `MONGO_UTILISATEUR`, `MONGO_MOT_DE_PASSE`, `MONGO_PORT`, `MONGO_BASE` | conteneur Mongo |
| `MONGO_URI` | URI complète (reconstruite depuis les précédentes si absente) |
| `ADMIN_NOM_UTILISATEUR`, `ADMIN_MOT_DE_PASSE` | compte administrateur |
| `JWT_SECRET`, `JWT_DUREE` | signature et durée de vie des jetons |
