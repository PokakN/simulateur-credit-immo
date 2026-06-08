# Refonte UI & architecture — préparer l'arrivée du module "Investissement locatif"

Date : 2026-06-08
Statut : proposé

## Contexte et objectif

Le simulateur de crédit immobilier (`index.html`, ~2000 lignes, fichier unique sans build) doit
accueillir un second outil : un simulateur d'investissement locatif (achat, revenus, charges,
fiscalité simplifiée LMNP/nu, cash-flow, rentabilité...). Plutôt que de greffer ce nouvel outil sur
la structure actuelle (sidebar étroite de 320px, fichier monolithique), on choisit de **restructurer
d'abord l'UI et l'architecture du fichier**, pour que le module locatif vienne s'y brancher
proprement, sans double travail ni période avec deux UI incohérentes.

Cette spec couvre **uniquement** la refonte structurelle (disposition, organisation des fichiers,
préparation à la cohabitation de deux outils) appliquée à l'outil crédit existant. Le modèle
financier locatif (calculs, champs, fiscalité) fera l'objet d'une spec séparée, une fois cette base
en place.

## Hors scope

- Le moteur de calcul et les KPIs du simulateur crédit (`calcMensualite`, `calcAmortissement`,
  `calcTAEG`, `calcSimulation`) ne sont **pas modifiés** — seule leur intégration dans la nouvelle
  structure de fichiers change.
- L'identité visuelle (palette encre/parchemin, typographies Fraunces / IBM Plex Mono / IBM Plex
  Sans, ambiance "cahier d'architecte") est **conservée telle quelle**. Seules la disposition et
  l'organisation du code changent.
- Le contenu fonctionnel du module "Investissement locatif" (champs, calculs, fiscalité, KPIs) :
  traité dans une spec ultérieure. Cette refonte prépare seulement la structure d'accueil (onglet,
  emplacement de montage).

## Architecture : split en fichiers par domaine

Le fichier unique est éclaté en plusieurs fichiers statiques, chargés via balises `<script src=...>`
classiques en séquence (pas de bundler, pas de `package.json`, pas d'étape de build — `npx serve`
continue de fonctionner tel quel) :

```
index.html              → coquille : masthead, sélecteur de mode, conteneurs de montage
shared/
  calc-utils.js         → fmt, fmtPct, fmtRaw, calcMensualite, calcTAEG, helpers génériques
  persistence.js        → projets localStorage (sauvegarde/chargement/export/import),
                          état d'URL partageable (?state=)
  ui-components.js      → rendu de la section paramètres (cartes thématiques, collapse),
                          setup des graphiques Chart.js, overlay/panel générique, toasts
credit/
  engine.js             → calcAmortissement, calcSimulation (spécifiques crédit)
  ui.js                 → rendu params/résultats spécifiques au mode crédit (KPIs, tableau
                          d'amortissement, recaps frais/financement, tranches, PTZ...)
locatif/                → (créé dans la spec suivante) engine.js + ui.js, même forme
styles.css              → l'ensemble du bloc <style> actuel
app.js                  → bootstrap, routage entre modes, wiring des event listeners globaux
```

**Pourquoi ce découpage plutôt que par couche technique uniquement** (`engine.js` / `ui.js` /
`persistence.js`) : avec deux outils, un découpage par couche ferait cohabiter dans les mêmes
fichiers le code crédit et le code locatif, recréant le problème de fichier-fourre-tout qu'on
cherche à éviter. Le découpage par domaine (`shared/`, `credit/`, `locatif/`) isole chaque outil et
ne fait remonter dans `shared/` que ce qui est réellement commun (formatage, persistance, rendu
générique de la section paramètres).

**Pourquoi pas de bundler/ES modules** : l'outil ne va pas évoluer en plateforme complexe (l'usager
prévoit d'ajouter des modes de fiscalité et des paramètres au module locatif, pas une refonte
massive). Un bundler (Vite/esbuild) apporterait une charge d'outillage disproportionnée ; les
modules ES (`type="module"`) ajoutent des contraintes de chargement (CORS sur `file://`, ordre
strict) sans bénéfice réel à cette échelle. Des scripts classiques chargés en séquence suffisent et
préservent la promesse "zéro install, on ouvre et ça marche".

## Sélecteur de mode (Crédit ↔ Investissement locatif)

Le masthead accueille un sélecteur à deux entrées : **"Crédit immobilier"** (actif, fonctionnel) et
**"Investissement locatif"** (visible mais désactivé, badge "bientôt"). Cela :

- prépare la structure technique de routage entre modes (chaque mode monte ses propres sections
  paramètres/résultats dans un conteneur dédié, géré par `app.js`),
- signale dès maintenant à l'utilisateur que le second outil arrive,
- ne nécessite aucun contenu fonctionnel pour le mode locatif dans cette spec — juste l'onglet et
  l'état "désactivé".

Quand la spec du module locatif sera implémentée, son onglet s'active et son contenu se monte dans
le conteneur déjà prévu, sans toucher au mode crédit.

## Nouvelle "section paramètres du projet"

Remplace la sidebar étroite (320px, colonne unique) par un panneau plus large et collapsable,
affiché côte à côte avec les résultats (préserve la vue simultanée — effet immédiat de chaque
changement de paramètre) :

- **Regroupement thématique inchangé** : Type de projet, Emprunts, Frais, Travaux, Différé,
  Valorisation — mais affiché en grille de 2-3 colonnes par groupe plutôt qu'en colonne unique
  étroite, pour une meilleure lisibilité des libellés et valeurs.
- **Collapsable** : une barre d'en-tête avec chevron permet de réduire la section à une bande fine
  une fois les paramètres ajustés, libérant l'espace pour les résultats. L'état (ouvert/réduit) est
  persisté (`localStorage`) et restauré au chargement.
- **Recalcul en direct inchangé** : même flux `onInput()` → `lireParams()` → `calcSimulation()` →
  re-rendu KPIs/graphiques/tableaux, simplement repointé vers la nouvelle structure DOM. Pas de
  bouton "valider" introduit.

## Comparaison de scénarios A/B repensée

Le point de friction actuel (formulaire B = jumeau caché complet de A, occupant beaucoup de place et
dupliquant graphiques/tableaux) est résolu ainsi :

- Une action **"Comparer un scénario B"** ouvre un **panneau overlay à la demande** (réutilise le
  pattern slide-over existant `#projets-overlay`) contenant la section paramètres du scénario B —
  mêmes cartes thématiques que A. L'utilisateur ajuste, ferme le panneau ; B reste actif en arrière-
  plan.
- Les résultats n'affichent plus deux jeux complets de graphiques/tableaux. À la place, un
  **bandeau de comparaison KPI compact** (en haut de la zone résultats) présente les indicateurs
  clés de A et B côte à côte (mensualité, coût total de l'opération, plus-value nette, TAEG, mois de
  rentabilité) — sous forme de paires A/B ou d'écarts (deltas).
- Les graphiques et tableaux détaillés restent ceux du scénario A uniquement ; B sert à la
  comparaison rapide des indicateurs, pas à un second tableau de bord complet (une vue B détaillée
  pourrait faire l'objet d'une itération future si le besoin se confirme — hors scope ici).
- Le code existant de lecture/calcul pour B (`lireParams('b')`, `getTranches`/`setTranches`,
  `tranchesB`, copie de champs dans `toggleScenarioB`) est conservé ; seule sa **surface de rendu**
  change (overlay + bandeau compact au lieu de formulaire jumeau + double dashboard).

## Persistance et compatibilité ascendante

- **Projets sauvegardés** (`localStorage`, `STORAGE_KEY = 'simulateur_projets'`) : les entrées
  existantes n'ont pas de champ `mode`. Au chargement, une entrée sans `mode` est traitée comme
  `mode: 'credit'` — entièrement rétrocompatible, aucune migration de données nécessaire. Les
  nouvelles sauvegardes enregistrent `mode: 'credit'` (ou `'locatif'` une fois ce mode disponible).
- **État d'URL partageable** (`?state=`, base64) : même principe — l'objet encodé gagne un champ
  `mode`, traité comme `'credit'` par défaut à la restauration si absent.
- **Scénario B** : la forme des données (`tranchesB`, params B) ne change pas ; seule sa
  présentation change (voir section précédente). Les fonctions de lecture/écriture existantes
  restent valables telles quelles.
- **Branches de compatibilité existantes** (reconstruction de `tranches` depuis les anciens champs
  `tauxNominal`/`ptzMontant` dans `chargerProjet`/`restaurerDepuisURL`) : conservées sans changement
  — elles continuent de fonctionner indépendamment du découpage en fichiers.

## Stratégie de non-régression

Cette refonte est structurelle (réorganisation de fichiers + disposition), pas additive — le risque
principal est de casser une fonctionnalité existante en la déplaçant. Pour le maîtriser :

- Travail sur une branche dédiée.
- Les fonctions pures du moteur de calcul (`calcMensualite`, `calcAmortissement`, `calcTAEG`,
  `calcSimulation`) sont déplacées **sans modification de leur logique interne** — seul leur fichier
  d'hébergement change. Elles restent vérifiables en comparant les sorties avant/après sur les mêmes
  entrées.
- Avant fusion, validation manuelle complète via les skills `verify`/`run` (pas de suite de tests
  automatisés dans ce projet) : chaque champ de saisie, les trois graphiques, les deux tableaux
  récapitulatifs, le tableau d'amortissement, le flux complet de sauvegarde/chargement/export/
  import/partage de projets, et la nouvelle comparaison A/B en overlay — sur le scénario crédit
  existant, pour confirmer que rien n'a régressé par rapport au comportement actuel.

## Notes pour la suite

- La spec du module "Investissement locatif" (prochaine itération) viendra : activer l'onglet
  préparé ici, créer `locatif/engine.js` + `locatif/ui.js`, et définir le modèle financier (achat,
  revenus locatifs, charges, fiscalité simplifiée LMNP/nu, KPIs cash-flow/rentabilité/patrimoine).
