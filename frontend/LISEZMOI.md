# Frontend d'aperçu — Learn-Cobol

Interface **statique** (HTML/CSS/JS sans dépendance ni build) servie par l'API
Express du dossier `backend/`. Elle sert à visualiser et jouer les unités JSON,
avec une progression réellement enregistrée sur le compte connecté.

## Lancer

```
cd backend
npm start          # ou : npm run dev
```

puis <http://localhost:3000/frontend/> (la racine `/` y redirige).

MongoDB doit tourner (voir `docker-compose.yml`) et le `.env` de la racine
doit être renseigné : le compte admin est créé au démarrage à partir de
`ADMIN_NOM_UTILISATEUR` / `ADMIN_MOT_DE_PASSE`.

## Session et progression

- **Connexion obligatoire** : l'écran de connexion appelle `POST /api/auth/connexion`
  et conserve le jeton JWT dans `localStorage`. Au rechargement, `GET /api/auth/moi`
  restaure la session sans redemander le mot de passe.
- **Identité visible en permanence** : avatar, nom du compte, rôle, et un jeton
  `ADMIN` en jaune dans la barre du haut ; le bandeau sous l'entête rappelle
  « Connecté en tant que admin — administrateur » et où vont les XP.
- **XP enregistrés** : chaque fin de leçon envoie
  `PUT /api/progression/:uniteId/lecons/:leconId`. Le serveur borne les valeurs
  au contenu réel de la leçon et ne retient que la meilleure tentative — le client
  ne peut pas s'attribuer d'XP.
- **Reprise** : le parcours affiche par leçon les XP déjà acquis et le nombre de
  tentatives, lus depuis `GET /api/progression/:uniteId`.
- **Outils admin** : visibles seulement si `utilisateur.role === 'admin'`,
  avec la remise à zéro de l'unité (`DELETE /api/progression/:uniteId`).

## Écrans

| Écran | Contenu |
|---|---|
| Connexion | formulaire, message d'erreur de l'API |
| Accueil | résumé de l'unité, carte « Ma progression » (XP, leçons réussies, avancement), objectifs, parcours, outils admin |
| Théorie | les 6 types de blocs : `paragraphe`, `liste`, `tableau`, `definitions`, `divisions`, `note` |
| Exercice | les 6 types jouables, cœurs, barre de progression, correction commentée |
| Bilan | XP de la leçon et confirmation d'enregistrement côté serveur |
| Cartes | révision recto/verso |

## Fichiers

| Fichier | Rôle |
|---|---|
| `index.html` | structure des 6 écrans |
| `style.css` | thème sombre |
| `session.js` | client de l'API : connexion JWT, progression, entête de session |
| `app.js` | chargement de l'unité, rendu, correction, contrôle des invariants |

## Limites assumées

- Une seule unité affichée à la fois (la première de `GET /api/unites`)
- Pas de répétition espacée réelle : les cartes défilent simplement
- Si l'API est injoignable, le JSON est relu en statique et rien n'est enregistré
