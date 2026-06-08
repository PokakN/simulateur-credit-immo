# Simulateur d'investissement locatif — spec fonctionnelle

Date : 2026-06-09
Statut : proposé

## Contexte

Le projet ajoute un second outil à l'application statique (`index.html` → multi-fichiers après la
refonte UI/architecture). Ce document spécifie le contenu fonctionnel du module **Investissement
locatif** : calculs, paramètres, fiscalité, résultats. La refonte structurelle qui prépare l'accueil
du module (onglet, conteneurs de montage, `locatif/engine.js` + `locatif/ui.js`) est couverte par la
spec `2026-06-08-refonte-ui-architecture-design.md`.

## Hors scope V1

- Projection long terme (§8) : durée de détention variable, inflation loyers, revalorisation du bien,
  augmentation des charges, TRI — itération suivante.
- Analyse de sensibilité (§9) : taux ±1 %, loyer ±10 %, vacance, travaux imprévus, revente
  optimiste/pessimiste — itération suivante.
- Scénario B (comparaison A/B) — itération suivante.
- Régimes fiscaux supplémentaires (SCI, LMNP professionnel, Pinel…) — itération suivante.

## Architecture des fichiers

```
locatif/
  engine.js   → calcFiscaliteLocatif(regime, base)
                calcSimulationLocatif(params)
  ui.js       → lireParamsLocatif()
                renderKPIsLocatif(result)
                renderChartsLocatif(result)
                renderTableauLocatif(result)
                onInputLocatif()
```

**Dépendances** :
- `locatif/engine.js` appelle `calcAmortissement` (credit/engine.js) et `calcMensualite` /
  `calcTAEG` (shared/calc-utils.js). Il n'appelle **pas** `calcSimulation` — couplage limité à la
  couche basse (`calcAmortissement`).
- `calcFiscaliteLocatif` est isolée dans sa propre fonction : ajouter un régime = ajouter un `case`.
- `app.js` monte le bon module selon l'onglet actif.

## Modèle de données — paramètres

### Financement (réutilisés du mode crédit — même logique, mêmes IDs préfixés `loc-`)

```js
typeProjet      // 'ancien' | 'neuf' | 'vefa'
prixProjet      // € — prix d'acquisition
apport          // €
travaux         // €
mobilier        // € — amortissable en LMNP (non compté dans valeurBien)
fraisNotaire    // € — calculé selon typeProjet (taux 2,5–8 %)
fraisAgence     // €
fraisGarantie   // €
fraisDossier    // €
tranches[]      // même structure que le mode crédit
differeMois     // mois de différé
differeType     // 'partiel' | 'total'
tauxAssurance   // % annuel sur capital emprunté
valeurBien      // € — prix + travaux (base de la plus-value)
tauxApprec      // % d'appréciation annuelle du bien
duree           // durée du prêt principal (ans)
```

Le type de projet commande l'affichage du PTZ et les frais de notaire par défaut, exactement comme
en mode crédit. L'utilisateur peut ajouter des lignes de prêt supplémentaires (même UI tranches).

### Revenus locatifs

```js
loyerMensuel          // € HC/mois
chargesRecuperables   // € charges locataire/mois (non imposables, non déductibles)
vacanceLocative       // % annuel (défaut 8 % ≈ ~1 mois/an)
```

### Charges récurrentes annuelles

```js
// Tous régimes
chargesCopro          // €/an  (défaut 1 200)
taxeFonciere          // €/an  (défaut 1 000)
assurancePNO          // €/an  (défaut 200)
garantieLoyers        // % du loyer annuel (défaut 2,5 %, optionnel — 0 = désactivé)
gestionLocative       // % du loyer annuel (défaut 7 %)
entretien             // €/an  (défaut 500)

// LMNP uniquement (masqués en location nue)
comptabilite          // €/an  (défaut 350)
cfe                   // €/an  (défaut 200)
```

Toutes les valeurs par défaut sont modifiables. Les champs `comptabilite` et `cfe` n'apparaissent que
si `regimeFiscal === 'lmnp_reel'`.

### Fiscalité

```js
regimeFiscal   // 'lmnp_reel' | 'nu_micro' | 'nu_reel'
tmi            // 0 | 11 | 30 | 41 | 45  (%)
```

### Horizon et valorisation

```js
horizonAns     // durée de détention souhaitée (5–30 ans, défaut = duree du prêt)
               // peut être < duree (revente avec capital restant dû)
tauxApprec     // % réutilisé du financement
```

## Modèle de données — résultats

### calcSimulationLocatif(params) → result

```js
// Financement (issus de calcAmortissement + calcTAEG)
mensualite              // €/mois — post-différé, assurance incluse
taeg                    // % — assurance comprise (réglementaire)
coutTotalAcquisition    // prix + travaux + mobilier + tous frais
coutTotalOperation      // coutTotalAcquisition + intérêts + assurance emprunteur
amortissement[]         // rows mensuels de calcAmortissement (capital, intérêts, CR, valeurBien…)

// Revenus & charges annualisés
loyerAnnuelBrut         // loyerMensuel × 12
loyerAnnuelNet          // brut × (1 − vacanceLocative/100)
chargesAnnuelles        // somme des 6 (ou 8 en LMNP) postes

// Cash-flow détaillé (mensuel)
cashFlowDetail: {
  revenus,      // loyerAnnuelNet / 12
  mensualite,   // crédit assurance incluse
  charges,      // chargesAnnuelles / 12
  impots,       // fiscaliteAnnuelle[0] / 12  (an 1)
  net           // revenus − mensualite − charges − impots
}
effortEpargne           // abs(net) si net < 0, sinon 0

// Rendements
rendementBrut           // loyerAnnuelBrut / coutTotalAcquisition × 100
rendementNet            // (loyerAnnuelNet − chargesAnnuelles) / coutTotalAcquisition × 100
rendementNetNet         // (loyerAnnuelNet − chargesAnnuelles − fiscaliteAnnuelle[0]) / coutTotalAcquisition × 100

// Séries annuelles (longueur = horizonAns)
labelsAns[]
loyersNetsParAn[]
mensualiteParAn[]
chargesParAn[]
fiscaliteParAn[]            // impôts + PS chaque année
cashFlowParAn[]             // = loyers − mensualité − charges − impôts
capitalRestantParAn[]
capitalRembourseParAn[]
valeurBienParAn[]
plusValuePotentielleParAn[] // valeurBien − coutTotalAcquisition
patrimoineNetParAn[]        // valeurBien − capitalRestant

// Détail fiscal annuel (tableau d'amortissement locatif)
fiscalDetail[]: {
  annee,
  loyersNets,
  mensualite,
  charges,
  interetsDeductibles,   // intérêts de l'année issus de amortissement[]
  amortissementFiscal,   // bien + mobilier
  baseImposable,         // peut être négative (déficit non reportable en LMNP)
  impots,
  prelevementsSociaux,
  fiscaliteAnnuelle,
  cashFlowNet
}

// Patrimoine à l'horizon
patrimoineNetHorizon    // valeurBien(horizonAns) − capitalRestant(horizonAns)
```

## Moteur fiscal — calcFiscaliteLocatif(regime, base)

### Charges déductibles communes à tous les régimes réels

- Intérêts d'emprunt de l'année (extraits de `amortissement[]`)
- Assurance emprunteur de l'année
- Charges de copropriété
- Taxe foncière
- Assurance PNO
- Garantie loyers impayés
- Gestion locative
- Entretien

### LMNP réel (`lmnp_reel`)

Charges déductibles supplémentaires : comptabilité, CFE.

Amortissement fiscal déductible :
- **Bien** : `(valeurBien − valeurTerrain) × tauxAmortBien / 100` par an
  - `valeurTerrain` : forfaitaire 15 % du prix d'acquisition (non amortissable)
  - `tauxAmortBien` : 3 % par an (durée 33 ans) — valeur fixe non configurable en V1
- **Mobilier** : `mobilier × 20 %` par an (durée 5 ans)

Calcul annuel :
```
baseImposable = loyersNets − chargesDeductibles − amortissements
// si baseImposable < 0 : déficit → impôt = 0 (déficit non reportable en LMNP)
impots = max(0, baseImposable) × tmi / 100
prelevementsSociaux = max(0, baseImposable) × 17.2 / 100
```

### Location nue micro-foncier (`nu_micro`)

Applicable si loyers bruts annuels ≤ 15 000 €. Abattement forfaitaire 30 %.

```
baseImposable = loyerAnnuelBrut × 0.70
impots = baseImposable × tmi / 100
prelevementsSociaux = baseImposable × 17.2 / 100
```

Aucune déduction de charges réelles. Les charges récurrentes impactent le cash-flow mais pas la
base imposable.

### Location nue régime réel (`nu_reel`)

Charges déductibles : intérêts d'emprunt, assurance emprunteur, charges de copropriété, taxe
foncière, assurance PNO, garantie loyers impayés, gestion locative, entretien, travaux (annualisés
sur 10 ans). Pas d'amortissement du bien ni du mobilier.

```
baseImposable = loyersNets − chargesDeductibles
// si baseImposable < 0 : déficit foncier reportable 10 ans (simplifié : 0 impôt l'année du déficit)
impots = max(0, baseImposable) × tmi / 100
prelevementsSociaux = max(0, baseImposable) × 17.2 / 100
```

## Organisation des sections paramètres (UI)

9 groupes dans le panneau paramètres, divisés en 4 blocs :

| # | Groupe | Statut |
|---|--------|--------|
| 1 | Type de projet (ancien / neuf / VEFA) | Réutilisé crédit |
| 2 | Prix & frais (prix, apport, notaire, agence, garantie, dossier) | Réutilisé crédit |
| 3 | Travaux & mobilier | Réutilisé crédit + champ mobilier |
| 4 | Emprunts (tranches, PTZ, assurance) | Réutilisé crédit |
| 5 | Différé | Réutilisé crédit |
| 6 | Revenus locatifs (loyer HC, charges récup., vacance %) | Nouveau |
| 7 | Charges récurrentes (copro, taxe foncière, PNO, GLI, gestion, entretien, compta*, CFE*) | Nouveau |
| 8 | Fiscalité (régime, TMI) | Nouveau |
| 9 | Valorisation (taux d'appréciation) + Horizon | Réutilisé + horizon |

`*` = affiché uniquement si régime LMNP réel.

## Organisation de la zone résultats (UI)

De haut en bas :

1. **KPI cards** (5) : cash-flow net mensuel · mensualité crédit · patrimoine net à l'horizon ·
   impôt annuel estimé (avec sous-ligne PS) · TAEG (assurance comprise)

2. **Décomposition cash-flow mensuel** : panneau ligné +loyer / −mensualité / −charges / −impôts /
   = cash-flow net

3. **Histogramme coûts vs loyers** + **curseur horizon** (5–30 ans) : barres empilées annuelles
   (mensualité rouge + charges orange + impôts violet croissants) avec ligne pointillée verte
   (loyer net). Le premier an avec imposition est marqué d'un ⚑. Le curseur horizon contrôle le
   nombre de barres affichées et met à jour tous les résultats.

4. **Indicateurs de rentabilité** (3 cards) : rendement brut · rendement net · rendement net-net

5. **Graphiques** (2 côte à côte) :
   - Cash-flow annuel cumulé (barres rouge/vert)
   - Création de patrimoine (lignes : capital restant dû, valeur du bien, patrimoine net ; aire : capital remboursé)

6. **Tableaux** Coûts du projet & Financement — même structure que le mode crédit

7. **Tableau d'évolution annuelle (fiscal)** : une ligne par an jusqu'à l'horizon, colonnes :
   An · Loyers nets · Mensualité · Charges · Intérêts déductibles · Amortissement fiscal · Base
   imposable · Impôts + PS · Cash-flow net. La colonne "Base imposable" est colorée en vert
   italique si négative (déficit, 0 impôt) et en orange/rouge si positive. La première ligne à
   imposition positive est surlignée avec une note "falaise fiscale".

8. **Détail fiscalité** (section basse) : récapitulatif du calcul pour l'an 1 (charges déductibles
   détaillées, amortissements, base imposable, impôt IR, PS, avantage fiscal) + donut répartition
   de la charge annuelle (mensualité / charges / impôts / loyers).

## Recalcul en direct

Même flux que le mode crédit : chaque modification d'un champ appelle `onInputLocatif()` →
`lireParamsLocatif()` → `calcSimulationLocatif()` → re-rendu KPIs / graphiques / tableaux. Pas de
bouton "Valider".

Changement de régime fiscal (`regimeFiscal`) : masque/affiche les champs comptabilité et CFE, puis
déclenche `onInputLocatif()`.

## Persistance

Les projets locatifs sont sauvegardés dans le même `localStorage` (`STORAGE_KEY`) avec
`mode: 'locatif'`. Le panneau "Projets" existant liste et charge les projets des deux modes.
`chargerProjet` détecte le `mode` et monte le bon module avant de restaurer les champs.

## Stratégie de non-régression

- Développement sur branche dédiée (après fusion de `refonte-ui-architecture`).
- Le mode crédit n'est pas modifié — les nouveaux fichiers `locatif/` sont additifs.
- Validation manuelle via `verify`/`run` avant fusion : tous les champs locatif, les 3 régimes
  fiscaux, les graphiques, les tableaux, la sauvegarde/chargement de projets locatifs, et
  l'absence de régression sur le mode crédit.

## Notes pour les itérations suivantes

- **§8 Projection long terme** : durée de détention, inflation loyers, revalorisation, augmentation
  des charges → cash-flow cumulé, patrimoine net, TRI, valeur nette à la revente.
- **§9 Analyse de sensibilité** : taux ±1 %, loyer ±10 %, vacance, travaux imprévus,
  revente optimiste/pessimiste.
- **Scénario B** : comparaison overlay + bandeau KPI compact (même pattern que mode crédit).
- **Régimes fiscaux supplémentaires** : chaque nouveau régime = un `case` dans
  `calcFiscaliteLocatif`.
