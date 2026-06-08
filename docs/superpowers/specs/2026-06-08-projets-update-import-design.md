# Projets : mise à jour, import clarifié, suppression du partage

## Contexte

Le panneau "Mes projets" (`#projets-overlay`) permet de sauvegarder, charger,
supprimer, exporter et importer des simulations dans `localStorage`
(`STORAGE_KEY = 'simulateur_projets'`). Trois problèmes à corriger :

1. Impossible de mettre à jour un projet existant : sauvegarder crée toujours
   une nouvelle entrée (`sauvegarderProjet` → `genId()` + `unshift`).
2. L'import affiche parfois "0 projet(s) importé(s)" sans explication. Cause
   identifiée : `importerProjets` filtre silencieusement les projets dont
   l'`id` existe déjà localement (cas typique : ré-import d'un export du même
   navigateur). Le filtrage est correct (on ne veut pas écraser les données
   locales), mais le message ne dit pas pourquoi rien n'a été importé.
3. La fonctionnalité de partage par URL (`?state=...`) n'est pas souhaitée et
   doit être retirée entièrement (bouton, génération et restauration).

## 1. Mise à jour d'un projet existant

Ajouter un bouton **"Mettre à jour"** sur chaque carte de `renderProjetsList`,
entre "Charger" et "Suppr." :

```html
<button onclick="mettreAJourProjet('${p.id}')">Mettre à jour</button>
```

Nouvelle fonction `mettreAJourProjet(id)` :
- Retrouve le projet par `id` dans `chargerProjets()`.
- Lit `params = lireParams('a')` et `res = calcSimulation(params)`, comme
  `sauvegarderProjet`.
- Lit les champs du panneau de sauvegarde (`#projet-nom`, `#projet-url`) :
  - s'ils sont non vides (après `trim()`), ils remplacent `nom`/`urlAnnonce`
    du projet ;
  - s'ils sont vides, le `nom`/`urlAnnonce` existants sont conservés.
- Remplace dans le tableau (même `id`, même position) : `params`,
  `typeProjet`, `mensualite`, `date` (nouvelle date du jour), et
  `nom`/`urlAnnonce` selon la règle ci-dessus.
- Sauvegarde via `sauvegarderProjets`, ré-affiche la liste
  (`renderProjetsList`), vide les champs `#projet-nom`/`#projet-url`, et
  affiche un toast `Projet "X" mis à jour`.

`sauvegarderProjet` (création d'une nouvelle entrée) reste inchangée.

## 2. Message d'import clarifié

`importerProjets` garde sa logique actuelle de filtrage par `id` (ne jamais
écraser une entrée locale existante — comportement plus sûr), mais calcule
aussi le nombre d'entrées ignorées et adapte le toast :

- Aucune collision : `${n} projet(s) importé(s)`
- Import partiel : `${n} projet(s) importé(s), ${m} déjà présent(s) (ignorés)`
- Tout est en collision (n = 0, m > 0) :
  `Aucun nouveau projet : ${m} déjà présent(s)`

Le cas d'erreur de parsing JSON (`catch` → "Erreur : fichier JSON invalide")
ne change pas.

## 3. Suppression complète du partage par URL

Retirer entièrement :
- Le bouton `Partager` dans `renderProjetsList` (template de carte).
- Les fonctions `genererStateURL`, `partagerProjet`, `restaurerDepuisURL`.
- L'appel `restaurerDepuisURL();` dans le bloc d'init en bas du fichier.

Aucune autre référence à `?state=` ne subsiste dans le code après ce
nettoyage (vérifié par recherche : lignes 1886, 1911, 1918, 1922, 1930, 1974
sont les seules occurrences).

## Hors-scope

- Pas de renommage/modification de `chargerProjet`, `supprimerProjet`,
  `exporterProjets`, `chargerProjets`, `sauvegarderProjets`.
- Pas de changement du format de stockage (`{ id, nom, urlAnnonce,
  typeProjet, date, mensualite, params }`).
