# Frontend d'aperçu — Learn-Cobol

Petite interface **statique** (HTML/CSS/JS, aucune dépendance) servant à
visualiser et tester les unités JSON de `backend/data/`.
Ce n'est pas le client définitif : c'est un banc d'essai du format `schema_version 2.0`.

## Lancer

Depuis la **racine du projet** (`Learn-Cobol/`) :

```
docker compose up -d
```

puis ouvrir <http://localhost:3000/frontend/>. L'API sert la page et le JSON,
et `/` redirige vers `/frontend/`.

Un serveur statique suffit aussi (`python -m http.server 8000` **depuis la racine**,
pas dans `frontend/` : la page lit `../backend/data/COBOL/1-introduction.json`),
mais sans l'API la progression n'est pas enregistrée.

En ouvrant `index.html` directement (`file://`), `fetch` est bloqué par le
navigateur — un sélecteur de fichier apparaît alors pour charger un JSON à la main.

## Ce que ça permet

- Sommaire de l'unité : résumé, objectifs, badge, compteurs, liste des leçons
- Théorie rendue par type de bloc : `paragraphe`, `liste`, `tableau`, `definitions`, `divisions`, `note`
- Les 6 types d'exercices jouables : `qcm`, `vrai_faux`, `association`, `remise_en_ordre`, `texte_a_trous`, `saisie_libre`
- Cœurs, XP, barre de progression, bilan de fin de leçon
- Cartes de révision (recto/verso, clic pour retourner)
- Bouton **Vérifier le JSON** : contrôle les invariants (xp_total, durées, concepts, lecon_id)

## Limites assumées

- Aucune persistance : la progression est perdue au rechargement — l'API
  `/api/progression` existe mais n'est pas encore appelée par cette page
- Une seule unité à la fois, pas de déverrouillage entre unités
- Pas de répétition espacée réelle (les cartes défilent simplement)

## Fichiers

| Fichier | Rôle |
|---|---|
| `index.html` | Structure des 5 écrans |
| `style.css` | Thème sombre |
| `app.js` | Chargement, rendu, correction, contrôle des invariants |
