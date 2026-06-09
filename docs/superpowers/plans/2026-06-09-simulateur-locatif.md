# Simulateur d'investissement locatif — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter le module "Investissement locatif" à l'application multi-fichiers issue de la refonte UI/architecture — moteur de calcul complet (3 régimes fiscaux), sidebar 9 sections, zone résultats (KPIs, histogramme, graphiques, tableaux, détail fiscal annuel).

**Architecture:** `locatif/engine.js` (fonctions pures, appelle `calcAmortissement` de credit/engine.js) + `locatif/ui.js` (sidebar HTML + rendu résultats). `index.html` reçoit les conteneurs de montage et les balises `<script>`. `app.js` gère le routage entre modes. `persistence.js` étend le chargement/sauvegarde au mode locatif.

**Tech Stack:** Vanilla JS/HTML/CSS statique, Chart.js 4.4.0 (CDN UMD), `localStorage`, `npx serve -l 5500 .` — aucun bundler, aucun build step.

---

## Prérequis

La branche `refonte-ui-architecture` doit être **fusionnée sur `master`** avant de démarrer ce plan. Les fichiers `shared/calc-utils.js`, `shared/persistence.js`, `credit/engine.js`, `credit/ui.js`, `app.js`, `styles.css` doivent exister et l'application doit fonctionner en mode crédit.

Créer la branche de travail :
```bash
git checkout master && git pull && git checkout -b feature/simulateur-locatif
```

---

## Carte des fichiers

| Fichier | Action | Responsabilité |
|---------|--------|---------------|
| `locatif/engine.js` | Créer | `calcFiscaliteLocatif`, `calcSimulationLocatif` |
| `locatif/ui.js` | Créer | Sidebar HTML, `lireParamsLocatif`, `onInputLocatif`, tous les rendus |
| `index.html` | Modifier | Conteneurs locatif, balises `<script>` |
| `app.js` | Modifier | Routage onglets crédit ↔ locatif |
| `shared/persistence.js` | Modifier | Sauvegarde/chargement projets locatif |
| `styles.css` | Modifier | Classes spécifiques locatif (minimal) |

---

## Task 1 — locatif/engine.js : calcFiscaliteLocatif

**Files:**
- Create: `locatif/engine.js`

- [ ] **Step 1 : Créer le fichier avec calcFiscaliteLocatif**

```js
// Moteur de calcul du simulateur d'investissement locatif.
// Dépend de : shared/calc-utils.js (calcMensualite, calcTAEG), credit/engine.js (calcAmortissement)

function calcFiscaliteLocatif(regime, base) {
  const {
    loyerAnnuelNet, loyerAnnuelBrut,
    interetsAnnee, assuranceAnnee,
    chargesCopro, taxeFonciere, assurancePNO,
    garantieLoyersEur, gestionLocativeEur, entretien,
    comptabilite, cfe, travauxAnnualises,
    amortissementBien, amortissementMobilier,
    tmi
  } = base;

  let baseImposable, impots, prelevementsSociaux;

  if (regime === 'nu_micro') {
    baseImposable = loyerAnnuelBrut * 0.70;
    impots = baseImposable * tmi / 100;
    prelevementsSociaux = baseImposable * 0.172;
  } else {
    let chargesDeductibles = interetsAnnee + assuranceAnnee
      + chargesCopro + taxeFonciere + assurancePNO
      + garantieLoyersEur + gestionLocativeEur + entretien;

    if (regime === 'lmnp_reel') {
      chargesDeductibles += comptabilite + cfe
        + amortissementBien + amortissementMobilier;
      baseImposable = loyerAnnuelNet - chargesDeductibles;
    } else { // nu_reel
      chargesDeductibles += travauxAnnualises;
      baseImposable = loyerAnnuelNet - chargesDeductibles;
    }

    const baseTaxable = Math.max(0, baseImposable);
    impots = baseTaxable * tmi / 100;
    prelevementsSociaux = baseTaxable * 0.172;
  }

  return {
    baseImposable: Math.round(baseImposable),
    impots: Math.round(impots),
    prelevementsSociaux: Math.round(prelevementsSociaux),
    fiscaliteAnnuelle: Math.round(impots + prelevementsSociaux)
  };
}
```

- [ ] **Step 2 : Vérifier dans la console du navigateur**

Ouvrir l'app (`npx serve -l 5500 .`, `http://localhost:5500`), ouvrir DevTools → Console, coller :

```js
// LMNP réel avec déficit fiscal — impôts = 0
const r1 = calcFiscaliteLocatif('lmnp_reel', {
  loyerAnnuelNet: 10157, loyerAnnuelBrut: 11040,
  interetsAnnee: 6840, assuranceAnnee: 540,
  chargesCopro: 800, taxeFonciere: 900, assurancePNO: 200,
  garantieLoyersEur: 276, gestionLocativeEur: 711, entretien: 300,
  comptabilite: 350, cfe: 200,
  travauxAnnualises: 0,
  amortissementBien: 5100, amortissementMobilier: 800,
  tmi: 30
});
console.assert(r1.impots === 0, 'LMNP déficit : impôts attendus = 0, got ' + r1.impots);
console.assert(r1.baseImposable < 0, 'base imposable doit être négative');

// Nu micro — abattement 30%
const r2 = calcFiscaliteLocatif('nu_micro', {
  loyerAnnuelNet: 10157, loyerAnnuelBrut: 11040,
  interetsAnnee: 0, assuranceAnnee: 0,
  chargesCopro: 0, taxeFonciere: 0, assurancePNO: 0,
  garantieLoyersEur: 0, gestionLocativeEur: 0, entretien: 0,
  comptabilite: 0, cfe: 0, travauxAnnualises: 0,
  amortissementBien: 0, amortissementMobilier: 0,
  tmi: 30
});
// base = 11040 * 0.70 = 7728 ; impots = 7728 * 0.30 = 2318 ; PS = 7728 * 0.172 = 1329
console.assert(r2.baseImposable === 7728, 'nu_micro base: ' + r2.baseImposable);
console.assert(r2.impots === 2318, 'nu_micro impôts: ' + r2.impots);
console.assert(r2.prelevementsSociaux === 1329, 'nu_micro PS: ' + r2.prelevementsSociaux);

console.log('calcFiscaliteLocatif OK', r1, r2);
```

Attendu : aucune assertion ne lève, message "calcFiscaliteLocatif OK" en console.

- [ ] **Step 3 : Commit**

```bash
git add locatif/engine.js
git commit -m "feat(locatif): calcFiscaliteLocatif — 3 régimes fiscaux (LMNP réel, nu micro, nu réel)"
```

---

## Task 2 — locatif/engine.js : calcSimulationLocatif

**Files:**
- Modify: `locatif/engine.js`

- [ ] **Step 1 : Ajouter calcSimulationLocatif après calcFiscaliteLocatif**

```js
function calcSimulationLocatif(p) {
  const rows = calcAmortissement(p);
  if (!rows.length) return null;

  // ── Financement ──────────────────────────────────────────────────────────
  const totalBorrowed = (p.tranches || []).reduce((s, t) => s + (t.montant || 0), 0) || p.capital || 0;
  const postDiffereRow = rows[p.differeMois] || rows[0];
  const mensualite = postDiffereRow.mensualite;
  const taeg = calcTAEG(Math.max(totalBorrowed, 1), rows);

  const coutTotalAcquisition = (p.prixProjet || 0) + (p.travaux || 0) + (p.mobilier || 0)
    + (p.fraisNotaire || 0) + (p.fraisAgence || 0)
    + (p.fraisGarantie || 0) + (p.fraisDossier || 0);

  // ── Revenus ──────────────────────────────────────────────────────────────
  const loyerAnnuelBrut = (p.loyerMensuel || 0) * 12;
  const loyerAnnuelNet  = loyerAnnuelBrut * (1 - (p.vacanceLocative || 0) / 100);

  // ── Charges annuelles ────────────────────────────────────────────────────
  const garantieLoyersEur  = (p.garantieLoyers || 0) / 100 * loyerAnnuelBrut;
  const gestionLocativeEur = (p.gestionLocative || 0) / 100 * loyerAnnuelBrut;
  let chargesAnnuelles = (p.chargesCopro || 0) + (p.taxeFonciere || 0)
    + (p.assurancePNO || 0) + garantieLoyersEur + gestionLocativeEur + (p.entretien || 0);
  if (p.regimeFiscal === 'lmnp_reel') {
    chargesAnnuelles += (p.comptabilite || 0) + (p.cfe || 0);
  }

  // ── Amortissements fiscaux ───────────────────────────────────────────────
  // Terrain forfaitaire 15% du prix, bien amortissable à 3%/an
  const amortissementBien = p.regimeFiscal === 'lmnp_reel'
    ? Math.round((p.prixProjet || 0) * 0.85 * 0.03) : 0;
  const travauxAnnualises = (p.travaux || 0) / 10; // nu_reel : travaux annualisés 10 ans
  const assuranceMensuelle = totalBorrowed * (p.tauxAssurance || 0) / 12 / 100;

  // ── Détail fiscal annuel ─────────────────────────────────────────────────
  const horizonAns = Math.max(1, Math.min(p.horizonAns || p.duree || 20, Math.ceil(rows.length / 12)));
  const fiscalDetail = [];

  for (let an = 1; an <= horizonAns; an++) {
    const anRows = rows.filter(r => r.annee === an);
    if (!anRows.length) break;

    const interetsAnnee     = anRows.reduce((s, r) => s + r.interets, 0);
    const assuranceAnnee    = assuranceMensuelle * anRows.length;
    const amortissementMobilier = (an <= 5 && p.regimeFiscal === 'lmnp_reel')
      ? (p.mobilier || 0) * 0.20 : 0;
    const amortissementFiscal = amortissementBien + amortissementMobilier;

    const fiscal = calcFiscaliteLocatif(p.regimeFiscal || 'lmnp_reel', {
      loyerAnnuelNet, loyerAnnuelBrut,
      interetsAnnee, assuranceAnnee,
      chargesCopro: p.chargesCopro || 0,
      taxeFonciere: p.taxeFonciere || 0,
      assurancePNO: p.assurancePNO || 0,
      garantieLoyersEur, gestionLocativeEur,
      entretien: p.entretien || 0,
      comptabilite: p.comptabilite || 0,
      cfe: p.cfe || 0,
      travauxAnnualises,
      amortissementBien,
      amortissementMobilier,
      tmi: p.tmi || 0
    });

    const mensualiteAn  = anRows.reduce((s, r) => s + r.mensualite, 0);
    const cashFlowNet   = loyerAnnuelNet - mensualiteAn - chargesAnnuelles - fiscal.fiscaliteAnnuelle;

    fiscalDetail.push({
      annee: an,
      loyersNets:           Math.round(loyerAnnuelNet),
      mensualite:           Math.round(mensualiteAn),
      charges:              Math.round(chargesAnnuelles),
      interetsDeductibles:  Math.round(interetsAnnee),
      amortissementFiscal:  Math.round(amortissementFiscal),
      baseImposable:        fiscal.baseImposable,
      impots:               fiscal.impots,
      prelevementsSociaux:  fiscal.prelevementsSociaux,
      fiscaliteAnnuelle:    fiscal.fiscaliteAnnuelle,
      cashFlowNet:          Math.round(cashFlowNet)
    });
  }

  // ── Séries annuelles ─────────────────────────────────────────────────────
  const labelsAns = [], loyersNetsParAn = [], mensualiteParAn = [], chargesParAn = [];
  const fiscaliteParAn = [], cashFlowParAn = [];
  const capitalRestantParAn = [], capitalRembourseParAn = [];
  const valeurBienParAn = [], plusValuePotentielleParAn = [], patrimoineNetParAn = [];
  let totalCapRemb = 0;

  for (const fd of fiscalDetail) {
    const anRows = rows.filter(r => r.annee === fd.annee);
    const lastRow = anRows[anRows.length - 1] || rows[rows.length - 1];
    totalCapRemb += anRows.reduce((s, r) => s + r.capital, 0);

    labelsAns.push(`An ${fd.annee}`);
    loyersNetsParAn.push(fd.loyersNets);
    mensualiteParAn.push(fd.mensualite);
    chargesParAn.push(fd.charges);
    fiscaliteParAn.push(fd.fiscaliteAnnuelle);
    cashFlowParAn.push(fd.cashFlowNet);
    capitalRestantParAn.push(Math.round(lastRow.capitalRestant));
    capitalRembourseParAn.push(Math.round(totalCapRemb));
    valeurBienParAn.push(Math.round(lastRow.valeurBien));
    plusValuePotentielleParAn.push(Math.round(lastRow.valeurBien - coutTotalAcquisition));
    patrimoineNetParAn.push(Math.round(lastRow.valeurBien - lastRow.capitalRestant));
  }

  // ── Cash-flow détaillé (mois, basé sur an 1) ────────────────────────────
  const fd0 = fiscalDetail[0] || {};
  const cashFlowDetail = {
    revenus:   Math.round(loyerAnnuelNet / 12),
    mensualite: Math.round(mensualite),
    charges:   Math.round(chargesAnnuelles / 12),
    impots:    Math.round((fd0.fiscaliteAnnuelle || 0) / 12),
    net:       Math.round(
      loyerAnnuelNet / 12 - mensualite
      - chargesAnnuelles / 12 - (fd0.fiscaliteAnnuelle || 0) / 12
    )
  };

  // ── Rendements ───────────────────────────────────────────────────────────
  const rnd = (n, d = 2) => Math.round(n * Math.pow(10, d)) / Math.pow(10, d);
  const rendementBrut    = coutTotalAcquisition > 0
    ? rnd(loyerAnnuelBrut / coutTotalAcquisition * 100) : 0;
  const rendementNet     = coutTotalAcquisition > 0
    ? rnd((loyerAnnuelNet - chargesAnnuelles) / coutTotalAcquisition * 100) : 0;
  const rendementNetNet  = coutTotalAcquisition > 0
    ? rnd((loyerAnnuelNet - chargesAnnuelles - (fd0.fiscaliteAnnuelle || 0)) / coutTotalAcquisition * 100) : 0;

  // ── Intérêts/assurance totaux sur horizon ────────────────────────────────
  const rowsHorizon    = rows.slice(0, horizonAns * 12);
  const interetsTotaux = rowsHorizon.reduce((s, r) => s + r.interets, 0);
  const assuranceTotale= rowsHorizon.reduce((s, r) => s + r.assurance, 0);
  const coutTotalOperation = coutTotalAcquisition + interetsTotaux + assuranceTotale;

  const horizonIdx = fiscalDetail.length - 1;

  return {
    mensualite:           Math.round(mensualite),
    taeg,
    coutTotalAcquisition: Math.round(coutTotalAcquisition),
    coutTotalOperation:   Math.round(coutTotalOperation),
    interetsTotaux:       Math.round(interetsTotaux),
    assuranceTotale:      Math.round(assuranceTotale),
    amortissement:        rows,
    loyerAnnuelBrut:      Math.round(loyerAnnuelBrut),
    loyerAnnuelNet:       Math.round(loyerAnnuelNet),
    chargesAnnuelles:     Math.round(chargesAnnuelles),
    cashFlowDetail,
    effortEpargne:        Math.max(0, -cashFlowDetail.net),
    rendementBrut, rendementNet, rendementNetNet,
    labelsAns, loyersNetsParAn, mensualiteParAn, chargesParAn,
    fiscaliteParAn, cashFlowParAn,
    capitalRestantParAn, capitalRembourseParAn,
    valeurBienParAn, plusValuePotentielleParAn, patrimoineNetParAn,
    fiscalDetail,
    patrimoineNetHorizon: patrimoineNetParAn[horizonIdx] || 0,
    horizonAns
  };
}
```

- [ ] **Step 2 : Vérifier dans la console**

```js
// Scénario minimal : prêt 200k à 3.5% / 20 ans, loyer 900/mois, LMNP réel TMI 30%
const testParams = {
  prixProjet: 200000, apport: 30000, travaux: 0, mobilier: 4000,
  fraisNotaire: 15000, fraisAgence: 5000, fraisGarantie: 1800, fraisDossier: 1000,
  tranches: [{ id: 'principal', isPrincipal: true, isPTZ: false,
    taux: 3.5, duree: 20, montant: 192800 }],
  differeMois: 0, differeType: 'partiel',
  tauxAssurance: 0.33, valeurBien: 200000, tauxApprec: 1.5, duree: 20,
  horizonAns: 15,
  loyerMensuel: 1000, chargesRecuperables: 80, vacanceLocative: 8,
  chargesCopro: 1200, taxeFonciere: 1000, assurancePNO: 200,
  garantieLoyers: 2.5, gestionLocative: 7, entretien: 500,
  comptabilite: 350, cfe: 200,
  regimeFiscal: 'lmnp_reel', tmi: 30
};
const res = calcSimulationLocatif(testParams);
console.assert(res !== null, 'résultat non null');
console.assert(res.fiscalDetail.length === 15, 'fiscalDetail 15 ans: ' + res.fiscalDetail.length);
console.assert(res.fiscalDetail[0].impots === 0, 'an 1 impôts = 0 (déficit LMNP)');
console.assert(res.rendementBrut > 0, 'rendement brut > 0');
console.assert(res.cashFlowDetail.net < 0, 'cash-flow négatif (effort épargne)');
console.log('calcSimulationLocatif OK', res);
```

Attendu : assertions OK, `fiscalDetail` de longueur 15, `impots` = 0 en an 1.

- [ ] **Step 3 : Commit**

```bash
git add locatif/engine.js
git commit -m "feat(locatif): calcSimulationLocatif — amortissement, séries annuelles, detail fiscal"
```

---

## Task 3 — index.html : conteneurs locatif + chargement scripts

**Files:**
- Modify: `index.html`

- [ ] **Step 1 : Ajouter les conteneurs locatif dans index.html**

Dans le `<body>`, après le conteneur du mode crédit, ajouter :

```html
<!-- Mode Investissement locatif -->
<div id="locatif-mode" style="display:none">
  <div class="app-layout">
    <div id="locatif-params-panel" class="params-panel">
      <!-- injecté par locatif/ui.js → buildLocatifSidebarHTML() -->
    </div>
    <div id="locatif-results" class="results-panel">
      <!-- injecté par locatif/ui.js → renderAllLocatif() -->
    </div>
  </div>
</div>
```

- [ ] **Step 2 : Ajouter les balises `<script>` dans le bon ordre**

Après `<script src="credit/ui.js"></script>`, ajouter :

```html
<script src="locatif/engine.js"></script>
<script src="locatif/ui.js"></script>
```

- [ ] **Step 3 : Vérifier que l'app crédit fonctionne toujours**

Lancer `npx serve -l 5500 .`, ouvrir `http://localhost:5500`. Le mode crédit doit fonctionner sans erreur console. Le conteneur locatif doit être présent mais invisible (`display:none`).

- [ ] **Step 4 : Commit**

```bash
git add index.html
git commit -m "feat(locatif): ajouter conteneurs locatif et chargement scripts dans index.html"
```

---

## Task 4 — locatif/ui.js : sidebar HTML + lireParamsLocatif

**Files:**
- Create: `locatif/ui.js`

> **Pattern collapsible (ajusté post-brainstorming) :** les cartes paramètres utilisent
> `sidebar-group-title` avec `onclick="toggleSidebarGroup(this.parentElement)"` et `data-index="0N"`,
> plus un `sidebar-group-summary` (résumé 1 ligne affiché quand replié) — même structure que le mode
> crédit dans `index.html`. Remplacer `sidebar-group-header` par ce pattern dans toutes les cartes
> ci-dessous. `toggleSidebarGroup` est déjà défini dans `credit/ui.js` et disponible globalement.

- [ ] **Step 1 : Créer locatif/ui.js avec la sidebar HTML et les tranches**

```js
// Rendu de l'interface du mode Investissement locatif (paramètres, résultats, graphiques, tableaux).

// ── Tranches locatif ─────────────────────────────────────────────────────
let tranchesLoc = [
  { id: 'principal', label: 'Prêt principal', isPrincipal: true, isPTZ: false,
    taux: 3.5, duree: 20, montant: 0 }
];

const PRESETS_LOC = {
  ancien: { notairePct: 7.5, showTravaux: true,  ptzDefaut: 0 },
  neuf:   { notairePct: 2.5, showTravaux: false, ptzDefaut: 40000 },
  vefa:   { notairePct: 2.5, showTravaux: false, ptzDefaut: 40000 }
};

function buildLocatifSidebarHTML() {
  return `
<div class="sidebar-section-title">Acquisition</div>

<div class="sidebar-group" id="loc-group-type">
  <div class="sidebar-group-title" data-index="01" onclick="toggleSidebarGroup(this.parentElement)">Type de projet</div>
  <div class="sidebar-group-summary" id="loc-summary-projet"></div>
  <div class="sidebar-group-body">
    <label>Type
      <select id="loc-type-projet" onchange="onTypeChangeLocatif()">
        <option value="ancien">Ancien</option>
        <option value="neuf">Neuf</option>
        <option value="vefa">VEFA</option>
      </select>
    </label>
  </div>
</div>

<div class="sidebar-group" id="loc-group-prix">
  <div class="sidebar-group-title" data-index="02" onclick="toggleSidebarGroup(this.parentElement)">Prix &amp; frais</div>
  <div class="sidebar-group-summary" id="loc-summary-prix"></div>
  <div class="sidebar-group-body">
    <label>Prix du bien (€) <input type="number" id="loc-prix-projet" value="200000" min="0" oninput="onInputLocatif()"></label>
    <label>Apport (€) <input type="number" id="loc-apport" value="30000" min="0" oninput="onInputLocatif()"></label>
    <label>Frais de notaire (%) <input type="number" id="loc-notaire" value="7.5" step="0.1" min="0" max="15" oninput="onInputLocatif()"></label>
    <label>Frais d'agence (€) <input type="number" id="loc-agence" value="5000" min="0" oninput="onInputLocatif()"></label>
    <label>Garantie (%) <input type="number" id="loc-garantie-pct" value="1.5" step="0.1" min="0" max="3" oninput="onInputLocatif()"></label>
    <label>Frais de dossier (€) <input type="number" id="loc-dossier" value="1000" min="0" oninput="onInputLocatif()"></label>
  </div>
</div>

<div class="sidebar-group" id="loc-group-travaux">
  <div class="sidebar-group-title" data-index="03" onclick="toggleSidebarGroup(this.parentElement)">Travaux &amp; mobilier</div>
  <div class="sidebar-group-summary" id="loc-summary-travaux"></div>
  <div class="sidebar-group-body">
    <label>Travaux (€) <input type="number" id="loc-travaux-total" value="0" min="0" oninput="onInputLocatif()"></label>
    <label>Mobilier (€) <input type="number" id="loc-mobilier" value="0" min="0" oninput="onInputLocatif()" title="Amortissable en LMNP réel (20%/an sur 5 ans)"></label>
  </div>
</div>

<div class="sidebar-section-title">Financement</div>

<div class="sidebar-group" id="loc-group-emprunts">
  <div class="sidebar-group-title" data-index="04" onclick="toggleSidebarGroup(this.parentElement)">Emprunts</div>
  <div class="sidebar-group-summary" id="loc-summary-emprunts"></div>
  <div class="sidebar-group-body">
    <div id="loc-tranches-container"></div>
    <button class="btn-add-tranche" onclick="addTrancheLoc()">+ Ajouter un prêt</button>
    <label>Assurance emprunteur (%) <input type="number" id="loc-assurance" value="0.33" step="0.01" min="0" oninput="onInputLocatif()"></label>
  </div>
</div>

<div class="sidebar-group" id="loc-group-differe">
  <div class="sidebar-group-title" data-index="05" onclick="toggleSidebarGroup(this.parentElement)">Différé</div>
  <div class="sidebar-group-summary" id="loc-summary-differe"></div>
  <div class="sidebar-group-body">
    <label>Durée différé (mois) <input type="number" id="loc-differe-mois" value="0" min="0" max="24" oninput="onInputLocatif()"></label>
    <label>Type
      <select id="loc-differe-type" onchange="onInputLocatif()">
        <option value="partiel">Partiel (intérêts seuls)</option>
        <option value="total">Total (intérêts capitalisés)</option>
      </select>
    </label>
  </div>
</div>

<div class="sidebar-section-title">Exploitation</div>

<div class="sidebar-group" id="loc-group-revenus">
  <div class="sidebar-group-title" data-index="06" onclick="toggleSidebarGroup(this.parentElement)">Revenus locatifs</div>
  <div class="sidebar-group-summary" id="loc-summary-revenus"></div>
  <div class="sidebar-group-body">
    <label>Loyer mensuel HC (€) <input type="number" id="loc-loyer" value="900" min="0" oninput="onInputLocatif()"></label>
    <label>Charges récupérables (€/mois) <input type="number" id="loc-charges-recup" value="80" min="0" oninput="onInputLocatif()"></label>
    <label>Vacance locative (%) <input type="number" id="loc-vacance" value="8" step="0.5" min="0" max="50" oninput="onInputLocatif()"></label>
  </div>
</div>

<div class="sidebar-group" id="loc-group-charges">
  <div class="sidebar-group-title" data-index="07" onclick="toggleSidebarGroup(this.parentElement)">Charges récurrentes</div>
  <div class="sidebar-group-summary" id="loc-summary-charges"></div>
  <div class="sidebar-group-body">
    <label>Charges de copro (€/an) <input type="number" id="loc-charges-copro" value="1200" min="0" oninput="onInputLocatif()"></label>
    <label>Taxe foncière (€/an) <input type="number" id="loc-taxe-fonciere" value="1000" min="0" oninput="onInputLocatif()"></label>
    <label>Assurance PNO (€/an) <input type="number" id="loc-assurance-pno" value="200" min="0" oninput="onInputLocatif()"></label>
    <label>Garantie loyers impayés (% loyer) <input type="number" id="loc-garantie-loyers" value="2.5" step="0.1" min="0" oninput="onInputLocatif()"></label>
    <label>Gestion locative (% loyer) <input type="number" id="loc-gestion" value="7" step="0.5" min="0" oninput="onInputLocatif()"></label>
    <label>Entretien (€/an) <input type="number" id="loc-entretien" value="500" min="0" oninput="onInputLocatif()"></label>
    <label id="loc-label-comptabilite">Comptabilité (€/an) <input type="number" id="loc-comptabilite" value="350" min="0" oninput="onInputLocatif()"></label>
    <label id="loc-label-cfe">CFE (€/an) <input type="number" id="loc-cfe" value="200" min="0" oninput="onInputLocatif()"></label>
  </div>
</div>

<div class="sidebar-group" id="loc-group-fiscal">
  <div class="sidebar-group-title" data-index="08" onclick="toggleSidebarGroup(this.parentElement)">Fiscalité</div>
  <div class="sidebar-group-summary" id="loc-summary-fiscal"></div>
  <div class="sidebar-group-body">
    <label>Régime fiscal
      <select id="loc-regime-fiscal" onchange="onRegimeChangeLocatif()">
        <option value="lmnp_reel">LMNP réel (meublé)</option>
        <option value="nu_micro">Location nue — micro-foncier</option>
        <option value="nu_reel">Location nue — régime réel</option>
      </select>
    </label>
    <label>TMI (%)
      <select id="loc-tmi" onchange="onInputLocatif()">
        <option value="0">0 %</option>
        <option value="11">11 %</option>
        <option value="30" selected>30 %</option>
        <option value="41">41 %</option>
        <option value="45">45 %</option>
      </select>
    </label>
  </div>
</div>

<div class="sidebar-section-title">Valorisation</div>

<div class="sidebar-group" id="loc-group-valori">
  <div class="sidebar-group-title" data-index="09" onclick="toggleSidebarGroup(this.parentElement)">Valorisation &amp; horizon</div>
  <div class="sidebar-group-summary" id="loc-summary-valori"></div>
  <div class="sidebar-group-body">
    <label>Appréciation annuelle (%) <input type="number" id="loc-apprec" value="1.5" step="0.1" oninput="onInputLocatif()"></label>
    <label>Horizon d'investissement (ans)
      <input type="range" id="loc-horizon" min="5" max="30" value="20" oninput="onHorizonChange()">
      <span id="loc-horizon-display">20 ans</span>
    </label>
  </div>
</div>`;
}
```

- [ ] **Step 2 : Ajouter les fonctions de gestion des tranches locatif**

```js
function renderTranchesLoc() {
  const container = document.getElementById('loc-tranches-container');
  if (!container) return;
  container.innerHTML = tranchesLoc.map((t, i) => {
    const isPrincipal = t.isPrincipal;
    const isPTZ = t.isPTZ;
    return `
<div class="tranche-card" id="loc-tranche-${t.id}">
  <div class="tranche-header">
    <span class="tranche-label">${t.label}</span>
    ${!isPrincipal ? `<button onclick="removeTrancheLoc('${t.id}')" title="Supprimer">×</button>` : ''}
  </div>
  <div class="tranche-body">
    ${isPrincipal
      ? `<div class="tranche-derived">Montant : <span id="loc-tranche-montant-${t.id}">—</span></div>`
      : `<label>Montant (€) <input type="number" id="loc-tranche-montant-input-${t.id}" value="${t.montant||0}" min="0" oninput="updateTrancheLoc('${t.id}','montant',this.value)"></label>`
    }
    ${isPTZ ? '' : `<label>Taux (%) <input type="number" id="loc-tranche-taux-${t.id}" value="${t.taux}" step="0.01" min="0" oninput="updateTrancheLoc('${t.id}','taux',this.value)"></label>`}
    <label>Durée (ans) <input type="number" id="loc-tranche-duree-${t.id}" value="${t.duree}" min="1" max="30" oninput="updateTrancheLoc('${t.id}','duree',this.value)"></label>
  </div>
</div>`;
  }).join('');
  refreshTranchesLocDerived();
}

function refreshTranchesLocDerived() {
  const prix     = parseFloat(document.getElementById('loc-prix-projet')?.value) || 0;
  const travaux  = parseFloat(document.getElementById('loc-travaux-total')?.value) || 0;
  const notPct   = parseFloat(document.getElementById('loc-notaire')?.value) || 0;
  const agence   = parseFloat(document.getElementById('loc-agence')?.value) || 0;
  const garPct   = parseFloat(document.getElementById('loc-garantie-pct')?.value) || 0;
  const dossier  = parseFloat(document.getElementById('loc-dossier')?.value) || 0;
  const apport   = parseFloat(document.getElementById('loc-apport')?.value) || 0;

  const fraisNotaire  = prix * notPct / 100;
  const fraisGarantie = prix * garPct / 100;
  const capitalTotal  = prix + travaux + fraisNotaire + agence + fraisGarantie + dossier - apport;
  const autresMontant = tranchesLoc.filter(t => !t.isPrincipal).reduce((s, t) => s + (t.montant || 0), 0);
  const principal     = Math.max(0, capitalTotal - autresMontant);

  const principalTranche = tranchesLoc.find(t => t.isPrincipal);
  if (principalTranche) principalTranche.montant = principal;

  const el = document.getElementById(`loc-tranche-montant-principal`);
  if (el) el.textContent = fmt(principal);
}

function updateTrancheLoc(id, field, value) {
  const t = tranchesLoc.find(t => t.id === id);
  if (t) t[field] = field === 'montant' || field === 'duree'
    ? parseInt(value) || 0 : parseFloat(value) || 0;
  refreshTranchesLocDerived();
  onInputLocatif();
}

function addTrancheLoc() {
  const newId = 'extra-' + Date.now();
  tranchesLoc.push({ id: newId, label: 'Prêt complémentaire', isPrincipal: false, isPTZ: false,
    taux: 3.5, duree: 15, montant: 10000 });
  renderTranchesLoc();
  onInputLocatif();
}

function removeTrancheLoc(id) {
  tranchesLoc = tranchesLoc.filter(t => t.id !== id);
  renderTranchesLoc();
  onInputLocatif();
}

function initTranchesLoc(typeProjet) {
  const hasPTZ = typeProjet === 'neuf' || typeProjet === 'vefa';
  tranchesLoc = [
    { id: 'principal', label: 'Prêt principal', isPrincipal: true, isPTZ: false,
      taux: 3.5, duree: 20, montant: 0 }
  ];
  if (hasPTZ) {
    tranchesLoc.push({ id: 'ptz', label: 'PTZ', isPrincipal: false, isPTZ: true,
      taux: 0, duree: 10, montant: 40000 });
  }
  renderTranchesLoc();
}
```

- [ ] **Step 3 : Ajouter lireParamsLocatif**

```js
function lireParamsLocatif() {
  const g  = id => parseFloat(document.getElementById(id)?.value) || 0;
  const gs = id => document.getElementById(id)?.value || '';

  const prixProjet      = g('loc-prix-projet');
  const fraisNotairePct = g('loc-notaire');
  const fraisNotaire    = prixProjet * fraisNotairePct / 100;
  const tauxGarantie    = g('loc-garantie-pct');
  const fraisGarantie   = prixProjet * tauxGarantie / 100;

  refreshTranchesLocDerived();

  const duree = tranchesLoc.find(t => t.isPrincipal)?.duree || 20;
  const horizonRaw = parseInt(document.getElementById('loc-horizon')?.value) || duree;
  const horizonAns = Math.max(5, Math.min(30, horizonRaw));

  return {
    typeProjet:     gs('loc-type-projet') || 'ancien',
    prixProjet,
    apport:         g('loc-apport'),
    travaux:        g('loc-travaux-total'),
    mobilier:       g('loc-mobilier'),
    fraisNotaire,   fraisNotairePct,
    fraisAgence:    g('loc-agence'),
    fraisGarantie,  tauxGarantie,
    fraisDossier:   g('loc-dossier'),
    tranches:       JSON.parse(JSON.stringify(tranchesLoc)),
    differeMois:    Math.round(g('loc-differe-mois')),
    differeType:    gs('loc-differe-type') || 'partiel',
    tauxAssurance:  g('loc-assurance'),
    valeurBien:     prixProjet + g('loc-travaux-total'),
    tauxApprec:     g('loc-apprec'),
    duree,
    horizonAns,
    loyerMensuel:       g('loc-loyer'),
    chargesRecuperables:g('loc-charges-recup'),
    vacanceLocative:    g('loc-vacance'),
    chargesCopro:       g('loc-charges-copro'),
    taxeFonciere:       g('loc-taxe-fonciere'),
    assurancePNO:       g('loc-assurance-pno'),
    garantieLoyers:     g('loc-garantie-loyers'),
    gestionLocative:    g('loc-gestion'),
    entretien:          g('loc-entretien'),
    comptabilite:       g('loc-comptabilite'),
    cfe:                g('loc-cfe'),
    regimeFiscal:       gs('loc-regime-fiscal') || 'lmnp_reel',
    tmi:                g('loc-tmi')
  };
}
```

- [ ] **Step 4 : Ajouter onTypeChangeLocatif et onRegimeChangeLocatif**

```js
function onTypeChangeLocatif() {
  const type = document.getElementById('loc-type-projet')?.value || 'ancien';
  const preset = PRESETS_LOC[type] || PRESETS_LOC.ancien;
  const notaireEl = document.getElementById('loc-notaire');
  if (notaireEl) notaireEl.value = preset.notairePct;
  const travauxGroup = document.getElementById('loc-group-travaux');
  if (travauxGroup) travauxGroup.style.display = preset.showTravaux ? '' : 'none';
  initTranchesLoc(type);
  onInputLocatif();
}

function onRegimeChangeLocatif() {
  const regime = document.getElementById('loc-regime-fiscal')?.value || 'lmnp_reel';
  const isLMNP = regime === 'lmnp_reel';
  ['loc-label-comptabilite', 'loc-label-cfe'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = isLMNP ? '' : 'none';
  });
  onInputLocatif();
}

function onHorizonChange() {
  const val = document.getElementById('loc-horizon')?.value || '20';
  const display = document.getElementById('loc-horizon-display');
  if (display) display.textContent = val + ' ans';
  onInputLocatif();
}
```

- [ ] **Step 5 : Vérifier visuellement**

Dans `app.js`, appeler temporairement `mountLocatif()` (défini à la tâche 10) pour afficher la sidebar. Vérifier dans le navigateur : les 9 groupes s'affichent, le changement de régime masque/affiche Comptabilité/CFE, le type de projet change les frais de notaire.

- [ ] **Step 6 : Commit**

```bash
git add locatif/ui.js
git commit -m "feat(locatif): sidebar HTML 9 sections, lireParamsLocatif, tranches, onTypeChange, onRegimeChange"
```

---

## Task 5 — locatif/ui.js : renderKPIsLocatif + décomposition cash-flow

**Files:**
- Modify: `locatif/ui.js`

- [ ] **Step 1 : Ajouter renderKPIsLocatif**

```js
function renderKPIsLocatif(r) {
  const cfNet = r.cashFlowDetail.net;
  const cfLabel = cfNet >= 0 ? 'cash-flow positif' : 'effort d\'épargne';
  const cfClass = cfNet >= 0 ? 'kpi-pos' : 'kpi-neg';

  document.getElementById('loc-results').innerHTML = `
<div id="loc-kpis" class="kpis-grid">
  <div class="kpi-card">
    <div class="kpi-label">Cash-flow net</div>
    <div class="kpi-value ${cfClass}">${fmt(Math.abs(cfNet))}/mois</div>
    <div class="kpi-sub">${cfLabel}</div>
  </div>
  <div class="kpi-card">
    <div class="kpi-label">Mensualité crédit</div>
    <div class="kpi-value">${fmt(r.mensualite)}/mois</div>
    <div class="kpi-sub">assurance incluse</div>
  </div>
  <div class="kpi-card">
    <div class="kpi-label">Patrimoine net (an ${r.horizonAns})</div>
    <div class="kpi-value kpi-pos">${fmt(r.patrimoineNetHorizon)}</div>
    <div class="kpi-sub">valeur − dette restante</div>
  </div>
  <div class="kpi-card">
    <div class="kpi-label">Impôt annuel estimé</div>
    <div class="kpi-value">${fmt(r.fiscalDetail[0]?.fiscaliteAnnuelle || 0)}</div>
    <div class="kpi-sub">dont PS ${fmt(r.fiscalDetail[0]?.prelevementsSociaux || 0)}</div>
  </div>
  <div class="kpi-card">
    <div class="kpi-label">TAEG</div>
    <div class="kpi-value">${fmtPct(r.taeg)}</div>
    <div class="kpi-sub">assurance comprise</div>
  </div>
</div>

<div id="loc-cashflow-detail" class="cf-breakdown">
  <div class="cf-section-title">Décomposition cash-flow mensuel</div>
  <div class="cf-row"><span>+ Loyer net de vacance</span><span class="cf-pos">${fmt(r.cashFlowDetail.revenus)}</span></div>
  <div class="cf-row"><span>− Mensualité crédit</span><span class="cf-neg">−${fmt(r.cashFlowDetail.mensualite)}</span></div>
  <div class="cf-row"><span>− Charges récurrentes</span><span class="cf-neg">−${fmt(r.cashFlowDetail.charges)}</span></div>
  <div class="cf-row"><span>− Impôt estimé</span><span class="cf-neg">−${fmt(r.cashFlowDetail.impots)}</span></div>
  <div class="cf-row cf-total"><span>= Cash-flow net mensuel</span><span class="${cfClass}">${cfNet >= 0 ? '+' : ''}${fmt(cfNet)}</span></div>
</div>

<div id="loc-histo-section" class="histo-section">
  <div class="cf-section-title">Répartition annuelle coûts vs loyers</div>
  <div class="histo-horizon-wrapper">
    <canvas id="loc-chart-histo" height="120"></canvas>
    <div class="horizon-panel">
      <div class="horizon-label">Horizon</div>
      <div id="loc-horizon-big">${r.horizonAns} ans</div>
    </div>
  </div>
</div>

<div id="loc-rendements" class="rendements-grid">
  <div class="rdt-card"><div class="rdt-label">Rendement brut</div><div class="rdt-value">${fmtPct(r.rendementBrut)}</div><div class="rdt-desc">Loyers bruts / coût acquisition</div></div>
  <div class="rdt-card"><div class="rdt-label">Rendement net</div><div class="rdt-value">${fmtPct(r.rendementNet)}</div><div class="rdt-desc">Après charges, avant impôts</div></div>
  <div class="rdt-card"><div class="rdt-label">Rendement net-net</div><div class="rdt-value">${fmtPct(r.rendementNetNet)}</div><div class="rdt-desc">Après charges et fiscalité</div></div>
</div>

<div id="loc-charts-section" class="charts-section">
  <div class="charts-grid">
    <div class="chart-block"><div class="chart-title">Cash-flow annuel</div><canvas id="loc-chart-cashflow" height="140"></canvas></div>
    <div class="chart-block"><div class="chart-title">Création de patrimoine</div><canvas id="loc-chart-patrimoine" height="140"></canvas></div>
  </div>
</div>

<div id="loc-tables-section" class="tables-section"></div>
<div id="loc-fiscal-annuel-section" class="fiscal-annuel-section"></div>
<div id="loc-fiscal-detail-section" class="fiscal-detail-section"></div>
`;
}
```

- [ ] **Step 2 : Ajouter les classes CSS manquantes dans styles.css**

```css
/* ── Locatif KPIs ── */
.kpis-grid { display: grid; grid-template-columns: repeat(5,1fr); gap: .6rem; margin-bottom: 1rem; }
.kpi-card { background: var(--parchment-light); border: 1px solid var(--parchment-dark); border-radius: 6px; padding: .6rem .7rem; text-align: center; }
.kpi-label { font-size: .62rem; text-transform: uppercase; letter-spacing: .06em; color: var(--parchment-muted); margin-bottom: .2rem; }
.kpi-value { font-size: 1rem; font-weight: 700; }
.kpi-sub { font-size: .63rem; color: var(--parchment-muted); margin-top: .1rem; }
.kpi-pos { color: var(--moss); }
.kpi-neg { color: var(--brick); }

/* ── Cash-flow breakdown ── */
.cf-breakdown { background: var(--parchment-light); border: 1px solid var(--parchment-dark); border-radius: 6px; padding: .75rem 1rem; margin-bottom: 1rem; }
.cf-section-title { font-size: .68rem; font-weight: 700; text-transform: uppercase; letter-spacing: .08em; color: var(--parchment-muted); margin-bottom: .5rem; }
.cf-row { display: flex; justify-content: space-between; font-size: .82rem; padding: .22rem 0; border-bottom: 1px dashed var(--parchment-dark); }
.cf-row:last-child { border-bottom: none; }
.cf-row.cf-total { font-weight: 700; border-top: 2px solid var(--parchment-dark); margin-top: .3rem; padding-top: .4rem; }
.cf-pos { color: var(--moss); font-weight: 600; font-family: var(--font-mono); }
.cf-neg { color: var(--brick); font-weight: 600; font-family: var(--font-mono); }

/* ── Histogramme ── */
.histo-section { margin-bottom: 1rem; }
.histo-horizon-wrapper { display: grid; grid-template-columns: 1fr 160px; gap: 1rem; align-items: start; }
.horizon-panel { background: var(--parchment-light); border: 1px solid var(--parchment-dark); border-radius: 6px; padding: .8rem; text-align: center; }
.horizon-label { font-size: .65rem; text-transform: uppercase; letter-spacing: .07em; color: var(--parchment-muted); margin-bottom: .3rem; }
#loc-horizon-big { font-size: 2rem; font-weight: 700; color: var(--ink); }

/* ── Rendements ── */
.rendements-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: .6rem; margin-bottom: 1rem; }
.rdt-card { background: var(--parchment-light); border: 1px solid var(--parchment-dark); border-radius: 6px; padding: .6rem .8rem; text-align: center; }
.rdt-label { font-size: .63rem; text-transform: uppercase; letter-spacing: .06em; color: var(--parchment-muted); margin-bottom: .2rem; }
.rdt-value { font-size: 1.05rem; font-weight: 700; }
.rdt-desc { font-size: .65rem; color: var(--parchment-muted); margin-top: .1rem; }

/* ── Charts ── */
.charts-section { margin-bottom: 1rem; }
.charts-grid { display: grid; grid-template-columns: 1fr 1fr; gap: .8rem; }
.chart-block { border: 1.5px solid var(--parchment-dark); border-radius: 6px; overflow: hidden; }
.chart-title { background: var(--parchment-light); padding: .4rem .8rem; font-size: .69rem; font-weight: 700; text-transform: uppercase; letter-spacing: .07em; color: var(--ink-muted); border-bottom: 1px solid var(--parchment-dark); }
```

- [ ] **Step 3 : Commit**

```bash
git add locatif/ui.js styles.css
git commit -m "feat(locatif): renderKPIsLocatif, décomposition cash-flow, structure HTML résultats"
```

---

## Task 6 — locatif/ui.js : histogramme empilé + graphiques patrimoine et cash-flow

**Files:**
- Modify: `locatif/ui.js`

- [ ] **Step 1 : Déclarer les instances Chart.js locatif en tête de fichier**

Ajouter en haut de `locatif/ui.js`, avant `buildLocatifSidebarHTML` :

```js
let locChartHisto = null;
let locChartCashflow = null;
let locChartPatrimoine = null;
```

- [ ] **Step 2 : Ajouter renderChartsLocatif**

```js
function renderChartsLocatif(r) {
  // ── Histogramme empilé coûts vs loyers ──────────────────────────────────
  const histoCanvas = document.getElementById('loc-chart-histo');
  if (histoCanvas) {
    if (locChartHisto) locChartHisto.destroy();
    locChartHisto = new Chart(histoCanvas, {
      type: 'bar',
      data: {
        labels: r.labelsAns,
        datasets: [
          {
            label: 'Mensualité crédit',
            data: r.mensualiteParAn,
            backgroundColor: 'rgba(184,64,64,.8)',
            stack: 'costs'
          },
          {
            label: 'Charges récurrentes',
            data: r.chargesParAn,
            backgroundColor: 'rgba(216,160,96,.9)',
            stack: 'costs'
          },
          {
            label: 'Impôts + PS',
            data: r.fiscaliteParAn,
            backgroundColor: 'rgba(154,138,200,.9)',
            stack: 'costs'
          },
          {
            label: 'Loyer net',
            data: r.loyersNetsParAn,
            type: 'line',
            borderColor: 'rgba(46,122,46,.9)',
            borderWidth: 2,
            borderDash: [5, 3],
            pointRadius: 0,
            fill: false,
            // ne pas stacker la ligne
            order: 0
          }
        ]
      },
      options: {
        responsive: true,
        plugins: { legend: { labels: { font: { size: 10 } } } },
        scales: {
          x: { stacked: true, ticks: { font: { size: 9 } } },
          y: { stacked: true, beginAtZero: true,
            ticks: { font: { size: 9 },
              callback: v => v >= 1000 ? (v/1000).toFixed(0)+'k' : v } }
        }
      }
    });
  }

  // ── Cash-flow annuel (barres) ────────────────────────────────────────────
  const cfCanvas = document.getElementById('loc-chart-cashflow');
  if (cfCanvas) {
    if (locChartCashflow) locChartCashflow.destroy();
    locChartCashflow = new Chart(cfCanvas, {
      type: 'bar',
      data: {
        labels: r.labelsAns,
        datasets: [{
          label: 'Cash-flow net annuel',
          data: r.cashFlowParAn,
          backgroundColor: r.cashFlowParAn.map(v => v >= 0
            ? 'rgba(46,122,46,.8)' : 'rgba(184,64,64,.8)')
        }]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { font: { size: 9 } } },
          y: { ticks: { font: { size: 9 },
            callback: v => v >= 1000 || v <= -1000
              ? (v/1000).toFixed(1)+'k' : v } }
        }
      }
    });
  }

  // ── Création de patrimoine (lignes + aire) ────────────────────────────────
  const patCanvas = document.getElementById('loc-chart-patrimoine');
  if (patCanvas) {
    if (locChartPatrimoine) locChartPatrimoine.destroy();
    locChartPatrimoine = new Chart(patCanvas, {
      type: 'line',
      data: {
        labels: r.labelsAns,
        datasets: [
          {
            label: 'Capital restant dû',
            data: r.capitalRestantParAn,
            borderColor: 'rgba(184,64,64,.8)',
            borderWidth: 2, pointRadius: 0, fill: false
          },
          {
            label: 'Capital remboursé',
            data: r.capitalRembourseParAn,
            borderColor: 'rgba(154,138,100,.6)',
            borderWidth: 1.5, pointRadius: 0,
            fill: 'origin',
            backgroundColor: 'rgba(200,185,154,.15)'
          },
          {
            label: 'Valeur du bien',
            data: r.valeurBienParAn,
            borderColor: 'rgba(46,122,46,.85)',
            borderWidth: 2, pointRadius: 0, fill: false
          },
          {
            label: 'Patrimoine net',
            data: r.patrimoineNetParAn,
            borderColor: 'rgba(46,122,46,.4)',
            borderWidth: 1.5, pointRadius: 0,
            fill: 'origin',
            backgroundColor: 'rgba(46,122,46,.08)'
          }
        ]
      },
      options: {
        responsive: true,
        plugins: { legend: { labels: { font: { size: 9 } } } },
        scales: {
          x: { ticks: { font: { size: 9 } } },
          y: { ticks: { font: { size: 9 },
            callback: v => v >= 1000 ? (v/1000).toFixed(0)+'k €' : v+'€' } }
        }
      }
    });
  }
}
```

- [ ] **Step 3 : Vérifier visuellement**

Déclencher `onInputLocatif()` dans la console après montage du mode locatif. Les 3 graphiques doivent s'afficher. L'histogramme doit avoir les barres empilées (mensualité/charges/impôts) avec une ligne verte pour le loyer. Les impôts doivent apparaître sur les années tardives seulement (LMNP réel avec les paramètres de test).

- [ ] **Step 4 : Commit**

```bash
git add locatif/ui.js
git commit -m "feat(locatif): renderChartsLocatif — histogramme empilé, cash-flow annuel, patrimoine"
```

---

## Task 7 — locatif/ui.js : tableaux projet/financement + tableau fiscal annuel

**Files:**
- Modify: `locatif/ui.js`

- [ ] **Step 1 : Ajouter renderTablesLocatif**

```js
function renderTablesLocatif(r, p) {
  const el = document.getElementById('loc-tables-section');
  if (!el) return;

  el.innerHTML = `
<div class="tables-duo">
  <table class="recap-table">
    <caption>Coûts du projet</caption>
    <tbody>
      <tr><td>Prix du bien</td><td>${fmt(p.prixProjet)}</td></tr>
      <tr class="sub"><td>Frais de notaire</td><td>${fmt(p.fraisNotaire)}</td></tr>
      <tr class="sub"><td>Frais d'agence</td><td>${fmt(p.fraisAgence)}</td></tr>
      <tr class="sub"><td>Frais de garantie</td><td>${fmt(p.fraisGarantie)}</td></tr>
      <tr class="sub"><td>Frais de dossier</td><td>${fmt(p.fraisDossier)}</td></tr>
      ${p.travaux > 0 ? `<tr><td>Travaux</td><td>${fmt(p.travaux)}</td></tr>` : ''}
      ${p.mobilier > 0 ? `<tr><td>Mobilier</td><td>${fmt(p.mobilier)}</td></tr>` : ''}
      <tr class="total"><td>Coût total d'acquisition</td><td>${fmt(r.coutTotalAcquisition)}</td></tr>
      <tr><td>Intérêts totaux (horizon)</td><td>${fmt(r.interetsTotaux)}</td></tr>
      <tr><td>Assurance emprunteur (horizon)</td><td>${fmt(r.assuranceTotale)}</td></tr>
      <tr class="total"><td>Coût total de l'opération</td><td>${fmt(r.coutTotalOperation)}</td></tr>
    </tbody>
  </table>

  <table class="recap-table">
    <caption>Financement</caption>
    <tbody>
      <tr><td>Apport personnel</td><td>${fmt(p.apport)}</td></tr>
      ${p.tranches.map(t => `
        <tr><td>${t.label} (${t.isPTZ ? '0' : fmtPct(t.taux)} / ${t.duree} ans)</td><td>${fmt(t.montant || 0)}</td></tr>
        <tr class="sub"><td>Mensualité</td><td>${fmt(calcMensualite(t.montant || 0, t.taux, t.duree))}/mois</td></tr>
      `).join('')}
      <tr class="total"><td>Total emprunté</td><td>${fmt(p.tranches.reduce((s,t) => s+(t.montant||0), 0))}</td></tr>
      <tr class="total"><td>Mensualité totale</td><td>${fmt(r.mensualite)}/mois</td></tr>
      <tr class="total"><td>TAEG</td><td>${fmtPct(r.taeg)}</td></tr>
    </tbody>
  </table>
</div>`;
}
```

- [ ] **Step 2 : Ajouter renderTableauFiscalAnnuel**

```js
function renderTableauFiscalAnnuel(r) {
  const el = document.getElementById('loc-fiscal-annuel-section');
  if (!el) return;

  // Trouver le premier an avec imposition (falaise fiscale)
  const falaisAn = r.fiscalDetail.findIndex(fd => fd.baseImposable > 0);

  const rows = r.fiscalDetail.map((fd, i) => {
    const isCliff = i === falaisAn;
    const baseClass = fd.baseImposable > 0 ? 'base-pos' : 'base-neg';
    return `<tr${isCliff ? ' class="fiscal-cliff"' : ''}>
      <td>${fd.annee}${isCliff ? ' ⚑' : ''}</td>
      <td>${fmtRaw(fd.loyersNets)}</td>
      <td class="neg-cell">${fmtRaw(fd.mensualite)}</td>
      <td class="neg-cell">${fmtRaw(fd.charges)}</td>
      <td class="neg-cell">${fmtRaw(fd.interetsDeductibles)}</td>
      <td class="neg-cell">${fmtRaw(fd.amortissementFiscal)}</td>
      <td class="${baseClass}">${fd.baseImposable > 0 ? '+' : ''}${fmtRaw(fd.baseImposable)}</td>
      <td${fd.impots > 0 ? ' class="tax-pos"' : ''}>${fmtRaw(fd.fiscaliteAnnuelle)}</td>
      <td class="${fd.cashFlowNet >= 0 ? 'cf-pos-cell' : 'cf-neg-cell'}">${fd.cashFlowNet >= 0 ? '+' : ''}${fmtRaw(fd.cashFlowNet)}</td>
    </tr>`;
  }).join('');

  el.innerHTML = `
<div class="section-block">
  <div class="section-block-title">Évolution annuelle — ${r.fiscalDetail[0] ? regimeLabel(r.fiscalDetail) : ''}</div>
  <div style="overflow-x:auto">
  <table class="annuel-table">
    <thead>
      <tr>
        <th>An</th><th>Loyers nets</th><th>Mensualité</th><th>Charges</th>
        <th>Intérêts déd.</th><th>Amort. fiscal</th><th>Base imposable</th>
        <th>Impôts + PS</th><th>Cash-flow net</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
    <tfoot>
      <tr>
        <td>Total</td>
        <td>${fmtRaw(r.fiscalDetail.reduce((s,f)=>s+f.loyersNets,0))}</td>
        <td>${fmtRaw(r.fiscalDetail.reduce((s,f)=>s+f.mensualite,0))}</td>
        <td>${fmtRaw(r.fiscalDetail.reduce((s,f)=>s+f.charges,0))}</td>
        <td>—</td><td>—</td><td>—</td>
        <td>${fmtRaw(r.fiscalDetail.reduce((s,f)=>s+f.fiscaliteAnnuelle,0))}</td>
        <td>${fmtRaw(r.fiscalDetail.reduce((s,f)=>s+f.cashFlowNet,0))}</td>
      </tr>
    </tfoot>
  </table>
  </div>
  ${falaisAn >= 0 ? `<div class="cliff-note">⚑ <strong>Falaise fiscale à l'an ${r.fiscalDetail[falaisAn].annee}</strong> — les intérêts d'emprunt déductibles s'épuisent, la base imposable bascule positive. L'imposition augmente progressivement chaque année.</div>` : ''}
</div>`;
}

function regimeLabel(fiscalDetail) {
  // utilisé pour le titre du tableau — on lit depuis le DOM
  const sel = document.getElementById('loc-regime-fiscal');
  const map = { lmnp_reel: 'LMNP réel', nu_micro: 'Location nue micro-foncier', nu_reel: 'Location nue réel' };
  return map[sel?.value] || '';
}
```

- [ ] **Step 3 : Ajouter les styles CSS nécessaires**

Dans `styles.css` :

```css
/* ── Tables récap locatif ── */
.tables-duo { display: grid; grid-template-columns: 1fr 1fr; gap: .8rem; margin-bottom: 1rem; }
.recap-table { width: 100%; border-collapse: collapse; font-size: .8rem; }
.recap-table caption { font-size: .68rem; font-weight: 700; text-transform: uppercase; letter-spacing: .07em; color: var(--ink-muted); text-align: left; padding-bottom: .4rem; }
.recap-table tr { border-bottom: 1px solid var(--parchment-dark); }
.recap-table td { padding: .28rem 0; color: var(--ink-muted); }
.recap-table td:last-child { text-align: right; font-family: var(--font-mono); font-weight: 600; color: var(--ink); }
.recap-table tr.sub td { font-size: .75rem; padding-left: .7rem; color: var(--parchment-muted); }
.recap-table tr.total td { font-weight: 700; border-top: 1.5px solid var(--parchment-dark); }

/* ── Tableau fiscal annuel ── */
.section-block { margin-bottom: 1rem; }
.section-block-title { font-size: .68rem; font-weight: 700; text-transform: uppercase; letter-spacing: .08em; color: var(--parchment-muted); margin-bottom: .5rem; padding-bottom: .35rem; border-bottom: 1px solid var(--parchment-dark); }
.annuel-table { width: 100%; border-collapse: collapse; font-size: .76rem; }
.annuel-table thead tr { background: var(--parchment-light); }
.annuel-table th { padding: .35rem .5rem; text-align: right; font-size: .63rem; text-transform: uppercase; letter-spacing: .05em; color: var(--ink-muted); border-bottom: 2px solid var(--parchment-dark); white-space: nowrap; }
.annuel-table th:first-child { text-align: center; }
.annuel-table td { padding: .26rem .5rem; text-align: right; border-bottom: 1px solid #f0e8d8; font-family: var(--font-mono); font-size: .74rem; }
.annuel-table td:first-child { text-align: center; font-family: var(--font-sans); font-weight: 600; color: var(--ink-muted); }
.annuel-table tr:hover { background: #faf7f0; }
.annuel-table tr.fiscal-cliff { background: #fff8e8; }
.annuel-table tfoot td { font-weight: 700; border-top: 2px solid var(--parchment-dark); background: var(--parchment-light); }
.annuel-table .neg-cell { color: var(--brick); }
.annuel-table .base-neg { color: var(--moss); font-style: italic; }
.annuel-table .base-pos { color: #b87020; font-weight: 600; }
.annuel-table .tax-pos  { color: var(--brick); }
.annuel-table .cf-pos-cell { color: var(--moss); font-weight: 600; }
.annuel-table .cf-neg-cell { color: var(--brick); }
.cliff-note { font-size: .72rem; color: #7a6050; background: #fff8e8; border: 1px solid #e8c878; border-radius: 5px; padding: .5rem .75rem; margin-top: .6rem; }
```

- [ ] **Step 4 : Commit**

```bash
git add locatif/ui.js styles.css
git commit -m "feat(locatif): tableaux projet/financement, tableau d'évolution fiscale annuelle"
```

---

## Task 8 — locatif/ui.js : section fiscalité détaillée + donut

**Files:**
- Modify: `locatif/ui.js`

- [ ] **Step 1 : Déclarer locChartDonut en tête de fichier**

```js
let locChartDonut = null;
```

- [ ] **Step 2 : Ajouter renderFiscalDetailLocatif**

```js
function renderFiscalDetailLocatif(r, p) {
  const el = document.getElementById('loc-fiscal-detail-section');
  if (!el) return;

  const fd = r.fiscalDetail[0];
  if (!fd) return;

  const regime = p.regimeFiscal;
  const regimeNames = { lmnp_reel: 'LMNP réel', nu_micro: 'Location nue micro-foncier', nu_reel: 'Location nue régime réel' };

  const avantageEstime = fd.impots === 0 && fd.baseImposable < 0
    ? Math.abs(fd.baseImposable) * (p.tmi + 17.2) / 100 : 0;

  const chargesRows = regime === 'nu_micro' ? '' : `
    <div class="fd-row indent"><span>Intérêts d'emprunt</span><span>−${fmtRaw(fd.interetsDeductibles)}</span></div>
    <div class="fd-row indent"><span>Assurance emprunteur</span><span>−${fmtRaw(Math.round(p.tranches.reduce((s,t)=>s+(t.montant||0),0) * p.tauxAssurance / 100))}</span></div>
    <div class="fd-row indent"><span>Charges de copropriété</span><span>−${fmtRaw(p.chargesCopro)}</span></div>
    <div class="fd-row indent"><span>Taxe foncière</span><span>−${fmtRaw(p.taxeFonciere)}</span></div>
    <div class="fd-row indent"><span>Assurance PNO</span><span>−${fmtRaw(p.assurancePNO)}</span></div>
    <div class="fd-row indent"><span>Garantie loyers impayés</span><span>−${fmtRaw(Math.round(p.garantieLoyers/100*r.loyerAnnuelBrut))}</span></div>
    <div class="fd-row indent"><span>Gestion locative</span><span>−${fmtRaw(Math.round(p.gestionLocative/100*r.loyerAnnuelBrut))}</span></div>
    <div class="fd-row indent"><span>Entretien</span><span>−${fmtRaw(p.entretien)}</span></div>
    ${regime === 'lmnp_reel' ? `
    <div class="fd-row indent"><span>Comptabilité</span><span>−${fmtRaw(p.comptabilite)}</span></div>
    <div class="fd-row indent"><span>CFE</span><span>−${fmtRaw(p.cfe)}</span></div>
    <div class="fd-row indent"><span>Amort. bien (${fmtPct(3)} / 33 ans)</span><span>−${fmtRaw(fd.amortissementFiscal - (p.mobilier*0.20))}</span></div>
    ${p.mobilier > 0 ? `<div class="fd-row indent"><span>Amort. mobilier (20% / 5 ans)</span><span>−${fmtRaw(p.mobilier*0.20)}</span></div>` : ''}
    ` : ''}
    ${regime === 'nu_reel' ? `
    <div class="fd-row indent"><span>Travaux annualisés (÷10)</span><span>−${fmtRaw(Math.round(p.travaux/10))}</span></div>
    ` : ''}`;

  const microNote = regime === 'nu_micro'
    ? `<div class="fd-row"><span>Abattement forfaitaire 30 %</span><span>−${fmtRaw(Math.round(r.loyerAnnuelBrut*0.30))}</span></div>` : '';

  el.innerHTML = `
<div class="section-block">
  <div class="section-block-title">Fiscalité détaillée — ${regimeNames[regime]} — TMI ${p.tmi} %</div>
  <div class="fiscal-detail-grid">
    <div class="fiscal-calc">
      <div class="fd-row section-row"><span>Revenus</span></div>
      <div class="fd-row"><span>Loyers bruts annuels</span><span class="pos-amt">+${fmtRaw(r.loyerAnnuelBrut)}</span></div>
      <div class="fd-row indent"><span>− Vacance locative (${p.vacanceLocative} %)</span><span class="neg-amt">−${fmtRaw(r.loyerAnnuelBrut - r.loyerAnnuelNet)}</span></div>
      <div class="fd-row"><span>= Loyers nets</span><span style="font-family:var(--font-mono);font-weight:700">${fmtRaw(r.loyerAnnuelNet)}</span></div>
      ${microNote}
      <div class="fd-row section-row" style="margin-top:.5rem"><span>Charges déductibles</span></div>
      ${chargesRows}
      <div class="fd-row result-row" style="margin-top:.3rem">
        <span>Base imposable</span>
        <span style="font-family:var(--font-mono);font-weight:700;color:${fd.baseImposable > 0 ? '#b87020' : 'var(--moss)'}">
          ${fd.baseImposable > 0 ? '+' : ''}${fmtRaw(fd.baseImposable)}
        </span>
      </div>
      <div class="fd-row"><span>Impôt sur le revenu (${p.tmi} %)</span><span style="font-family:var(--font-mono);font-weight:600;color:${fd.impots>0?'var(--brick)':'var(--moss)'}">${fd.impots > 0 ? fmtRaw(fd.impots) : '0 € ✓'}</span></div>
      <div class="fd-row"><span>Prélèvements sociaux (17,2 %)</span><span style="font-family:var(--font-mono);font-weight:600">${fmtRaw(fd.prelevementsSociaux)}</span></div>
      ${avantageEstime > 0 ? `
      <div class="fd-row avantage-row">
        <span>Avantage fiscal annuel estimé</span>
        <span style="font-family:var(--font-mono);font-weight:700;color:var(--moss)">+${fmtRaw(Math.round(avantageEstime))}</span>
      </div>` : ''}
    </div>
    <div class="fiscal-donut-block">
      <div class="donut-title">Charge annuelle totale</div>
      <canvas id="loc-chart-donut" height="160"></canvas>
    </div>
  </div>
</div>`;

  // Donut chart
  const donutCanvas = document.getElementById('loc-chart-donut');
  if (donutCanvas) {
    if (locChartDonut) locChartDonut.destroy();
    locChartDonut = new Chart(donutCanvas, {
      type: 'doughnut',
      data: {
        labels: ['Mensualité', 'Charges récurrentes', 'Impôts + PS', 'Loyers nets'],
        datasets: [{
          data: [
            r.mensualite * 12,
            r.chargesAnnuelles,
            fd.fiscaliteAnnuelle,
            r.loyerAnnuelNet
          ],
          backgroundColor: [
            'rgba(184,64,64,.8)',
            'rgba(216,160,96,.9)',
            'rgba(154,138,200,.9)',
            'rgba(46,122,46,.75)'
          ]
        }]
      },
      options: {
        responsive: true,
        plugins: { legend: { position: 'bottom', labels: { font: { size: 10 }, padding: 8 } } }
      }
    });
  }
}
```

- [ ] **Step 3 : Ajouter les styles CSS pour la section fiscalité**

Dans `styles.css` :

```css
/* ── Section fiscalité détaillée ── */
.fiscal-detail-grid { display: grid; grid-template-columns: 1fr 220px; gap: 1rem; align-items: start; }
.fiscal-calc { font-size: .8rem; }
.fd-row { display: flex; justify-content: space-between; padding: .22rem 0; border-bottom: 1px dashed var(--parchment-dark); }
.fd-row:last-child { border-bottom: none; }
.fd-row.section-row { font-weight: 700; font-size: .72rem; text-transform: uppercase; letter-spacing: .05em; color: var(--ink-muted); border-bottom: none; margin-top: .4rem; }
.fd-row.indent span:first-child { padding-left: .7rem; color: var(--parchment-muted); }
.fd-row.result-row { font-weight: 700; border-top: 2px solid var(--parchment-dark); margin-top: .3rem; padding-top: .4rem; border-bottom: none; }
.fd-row.avantage-row { background: #eef4ee; padding: .3rem .5rem; border-radius: 4px; border: 1px solid #7aaa7a; margin-top: .4rem; }
.pos-amt { font-family: var(--font-mono); font-weight: 600; color: var(--moss); }
.neg-amt { font-family: var(--font-mono); color: var(--brick); }
.fiscal-donut-block { background: var(--parchment-light); border: 1px solid var(--parchment-dark); border-radius: 6px; padding: .8rem; }
.donut-title { font-size: .68rem; font-weight: 700; text-transform: uppercase; letter-spacing: .07em; color: var(--ink-muted); margin-bottom: .5rem; text-align: center; }
```

- [ ] **Step 4 : Commit**

```bash
git add locatif/ui.js styles.css
git commit -m "feat(locatif): section fiscalité détaillée et donut répartition annuelle"
```

---

## Task 9 — locatif/ui.js : onInputLocatif + mountLocatif

**Files:**
- Modify: `locatif/ui.js`

- [ ] **Step 1 : Ajouter onInputLocatif et mountLocatif**

```js
function onInputLocatif() {
  const p = lireParamsLocatif();
  const r = calcSimulationLocatif(p);
  if (!r) return;

  renderKPIsLocatif(r);       // injecte le HTML résultats + placeholders canvas
  renderChartsLocatif(r);     // remplit les canvas Chart.js
  renderTablesLocatif(r, p);  // tableaux projet/financement
  renderTableauFiscalAnnuel(r); // tableau d'évolution fiscale
  renderFiscalDetailLocatif(r, p); // détail fiscal an 1 + donut
}

function mountLocatif() {
  const panel = document.getElementById('locatif-params-panel');
  if (panel && !panel.querySelector('#loc-group-type')) {
    panel.innerHTML = buildLocatifSidebarHTML();
    initTranchesLoc('ancien');
    renderTranchesLoc();
    onRegimeChangeLocatif(); // masque comptabilite/CFE selon régime initial
  }
  onInputLocatif();
}
```

- [ ] **Step 2 : Vérifier le cycle complet dans le navigateur**

Appeler `mountLocatif()` dans la console, puis vérifier :
- La sidebar affiche les 9 sections.
- Les résultats s'affichent (KPIs, cash-flow, graphiques, tableaux).
- Modifier le loyer recalcule immédiatement tout.
- Changer de régime fiscal (LMNP → nu micro → nu réel) change la base imposable dans le tableau annuel.
- Les champs Comptabilité/CFE disparaissent en location nue.

- [ ] **Step 3 : Commit**

```bash
git add locatif/ui.js
git commit -m "feat(locatif): onInputLocatif, mountLocatif — cycle de rendu complet"
```

---

## Task 10 — app.js + index.html : routage des modes

**Files:**
- Modify: `app.js`
- Modify: `index.html`

- [ ] **Step 1 : Ajouter le routage dans app.js**

```js
// Bootstrap de l'application : sélecteur de mode, init au chargement.

let currentMode = 'credit';

function switchMode(mode) {
  currentMode = mode;
  document.getElementById('credit-mode').style.display  = mode === 'credit'  ? '' : 'none';
  document.getElementById('locatif-mode').style.display = mode === 'locatif' ? '' : 'none';

  document.querySelectorAll('.mode-tab').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.mode === mode);
  });

  if (mode === 'locatif') mountLocatif();
  if (mode === 'credit')  onInput();
}

window.addEventListener('DOMContentLoaded', () => {
  switchMode('credit');
});
```

- [ ] **Step 2 : Ajouter les onglets dans index.html**

Dans le `<header>` (masthead), ajouter les onglets de mode :

```html
<nav class="mode-switcher">
  <button class="mode-tab active" data-mode="credit" onclick="switchMode('credit')">
    Crédit immobilier
  </button>
  <button class="mode-tab" data-mode="locatif" onclick="switchMode('locatif')">
    Investissement locatif
  </button>
</nav>
```

- [ ] **Step 3 : Ajouter les styles des onglets dans styles.css**

```css
.mode-switcher { display: flex; gap: .5rem; margin: .5rem 0; }
.mode-tab { background: none; border: 1.5px solid var(--parchment-dark); border-radius: 4px; padding: .35rem .8rem; font-family: var(--font-sans); font-size: .8rem; cursor: pointer; color: var(--ink-muted); }
.mode-tab.active { background: var(--ink); color: var(--parchment); border-color: var(--ink); }
.mode-tab:hover:not(.active) { background: var(--parchment-light); }
```

- [ ] **Step 4 : Vérifier la navigation**

Cliquer sur "Investissement locatif" → le mode locatif s'affiche avec la sidebar et les résultats. Cliquer sur "Crédit immobilier" → retour au mode crédit, tout fonctionne. Aucune erreur console.

- [ ] **Step 5 : Commit**

```bash
git add app.js index.html styles.css
git commit -m "feat: routage onglets Crédit ↔ Investissement locatif dans app.js"
```

---

## Task 11 — persistence.js : sauvegarde et chargement projets locatif

**Files:**
- Modify: `shared/persistence.js`

- [ ] **Step 1 : Ajouter sauvegarderProjetLocatif**

Dans `persistence.js`, ajouter après `sauvegarderProjet` :

```js
function sauvegarderProjetLocatif() {
  const nom = document.getElementById('projet-nom')?.value?.trim();
  if (!nom) { showToast('Entrez un nom pour le projet'); return; }

  const urlAnnonce = document.getElementById('projet-url')?.value?.trim() || '';
  const params = lireParamsLocatif();
  const res    = calcSimulationLocatif(params);

  const projet = {
    id:         genId(),
    nom,
    urlAnnonce,
    typeProjet: params.typeProjet,
    mode:       'locatif',
    date:       new Date().toLocaleDateString('fr-FR'),
    mensualite: res ? res.mensualite : 0,
    params
  };

  const projets = chargerProjets();
  projets.unshift(projet);
  sauvegarderProjets(projets);
  renderProjetsList();
  document.getElementById('projet-nom').value = '';
  if (document.getElementById('projet-url')) document.getElementById('projet-url').value = '';
  showToast(`Projet "${nom}" sauvegardé`);
}
```

- [ ] **Step 2 : Modifier chargerProjet pour gérer le mode locatif**

Dans la fonction `chargerProjet(id)` existante, ajouter la branche locatif après la récupération du projet :

```js
function chargerProjet(id) {
  const projets = chargerProjets();
  const projet  = projets.find(p => p.id === id);
  if (!projet) return;

  if (projet.mode === 'locatif') {
    switchMode('locatif');
    chargerProjetLocatif(projet);
    return;
  }

  // … code existant pour le mode crédit …
```

- [ ] **Step 3 : Ajouter chargerProjetLocatif**

```js
function chargerProjetLocatif(projet) {
  const p   = projet.params;
  const set = (id, val) => {
    const el = document.getElementById(id);
    if (el && val !== undefined) el.value = val;
  };

  set('loc-type-projet',   p.typeProjet   || 'ancien');
  set('loc-prix-projet',   p.prixProjet);
  set('loc-apport',        p.apport);
  set('loc-notaire',       p.fraisNotairePct);
  set('loc-agence',        p.fraisAgence);
  set('loc-garantie-pct',  p.tauxGarantie ?? 1.5);
  set('loc-dossier',       p.fraisDossier);
  set('loc-travaux-total', p.travaux);
  set('loc-mobilier',      p.mobilier);
  set('loc-assurance',     p.tauxAssurance);
  set('loc-apprec',        p.tauxApprec);
  set('loc-differe-mois',  p.differeMois);
  set('loc-horizon',       p.horizonAns || p.duree || 20);

  const dtEl = document.getElementById('loc-differe-type');
  if (dtEl) dtEl.value = p.differeType || 'partiel';

  // Tranches
  if (p.tranches && Array.isArray(p.tranches) && p.tranches.length > 0) {
    tranchesLoc = JSON.parse(JSON.stringify(p.tranches));
  } else {
    tranchesLoc = [{ id: 'principal', label: 'Prêt principal', isPrincipal: true, isPTZ: false,
      taux: p.tranches?.[0]?.taux ?? 3.5, duree: p.duree ?? 20, montant: 0 }];
  }
  renderTranchesLoc();

  // Revenus & charges
  set('loc-loyer',          p.loyerMensuel);
  set('loc-charges-recup',  p.chargesRecuperables);
  set('loc-vacance',        p.vacanceLocative);
  set('loc-charges-copro',  p.chargesCopro);
  set('loc-taxe-fonciere',  p.taxeFonciere);
  set('loc-assurance-pno',  p.assurancePNO);
  set('loc-garantie-loyers',p.garantieLoyers);
  set('loc-gestion',        p.gestionLocative);
  set('loc-entretien',      p.entretien);
  set('loc-comptabilite',   p.comptabilite);
  set('loc-cfe',            p.cfe);

  // Fiscalité
  const regEl = document.getElementById('loc-regime-fiscal');
  if (regEl) regEl.value = p.regimeFiscal || 'lmnp_reel';
  const tmiEl = document.getElementById('loc-tmi');
  if (tmiEl) tmiEl.value = String(p.tmi || 30);

  // Mise à jour affichage horizon
  const horizDisplay = document.getElementById('loc-horizon-display');
  if (horizDisplay) horizDisplay.textContent = (p.horizonAns || p.duree || 20) + ' ans';

  onRegimeChangeLocatif();
  closeProjetsPanel();
  showToast(`Projet "${projet.nom}" chargé`);
}
```

- [ ] **Step 4 : Mettre à jour renderProjetsList pour distinguer les modes**

Dans la fonction existante `renderProjetsList`, modifier le template de la carte projet pour afficher le badge de mode :

```js
// Remplacer la ligne du kpi dans renderProjetsList :
// Avant :
//   <div class="projet-card-kpi">${fmt(p.mensualite)}/mois · ${p.date}</div>
// Après :
    <div class="projet-card-kpi">
      <span class="projet-mode-badge projet-mode-${p.mode || 'credit'}">${p.mode === 'locatif' ? 'Locatif' : 'Crédit'}</span>
      ${fmt(p.mensualite)}/mois · ${p.date}
    </div>
```

Ajouter dans `styles.css` :

```css
.projet-mode-badge { font-size: .6rem; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; padding: .1rem .35rem; border-radius: 3px; margin-right: .3rem; }
.projet-mode-credit  { background: var(--parchment-light); color: var(--ink-muted); border: 1px solid var(--parchment-dark); }
.projet-mode-locatif { background: #eef4ee; color: var(--moss); border: 1px solid #7aaa7a; }
```

- [ ] **Step 5 : Ajouter le bouton "Sauvegarder" dans la sidebar locatif**

Dans `buildLocatifSidebarHTML()`, ajouter en bas avant le return :

```html
<div class="sidebar-group" id="loc-group-save">
  <div class="sidebar-group-body">
    <label>Nom du projet <input type="text" id="loc-projet-nom" placeholder="Ex : Appart Lyon T2"></label>
    <button onclick="sauvegarderProjetLocatif()">Sauvegarder ce projet</button>
    <button onclick="openProjetsPanel()">Projets sauvegardés</button>
  </div>
</div>
```

- [ ] **Step 6 : Vérifier la persistance**

1. Saisir des paramètres locatif, entrer un nom, cliquer "Sauvegarder".
2. Ouvrir "Projets sauvegardés" → le projet apparaît avec badge "Locatif".
3. Passer en mode Crédit, ouvrir les projets → le projet locatif est visible.
4. Cliquer "Charger" sur le projet locatif → l'app bascule en mode locatif et restaure tous les champs.

- [ ] **Step 7 : Commit**

```bash
git add shared/persistence.js locatif/ui.js styles.css
git commit -m "feat(locatif): sauvegarde/chargement projets locatif, badge mode dans liste projets"
```

---

## Task 12 — Validation manuelle complète

**Files:** aucun (vérification)

Lancer `npx serve -l 5500 .` et ouvrir `http://localhost:5500`.

- [ ] **Checklist mode locatif — moteur**

  - [ ] LMNP réel, TMI 30 % : vérifier dans le tableau fiscal que les impôts = 0 en an 1 (déficit), puis croissent à partir de l'an où la base imposable devient positive.
  - [ ] Nu micro : vérifier `baseImposable = loyerBrut × 0.70`, impôts = base × TMI, PS = base × 17,2 %.
  - [ ] Nu réel : vérifier que les charges sont déduites (pas d'amortissement bien/mobilier), base imposable calculée.
  - [ ] Changer le taux de vacance de 0 % à 20 % : le loyer net et le cash-flow changent en temps réel.
  - [ ] Changer l'horizon de 10 à 25 ans : le tableau fiscal et les graphiques s'allongent.

- [ ] **Checklist UI**

  - [ ] Type "neuf" → frais notaire passe à 2,5 %, PTZ apparaît dans les tranches.
  - [ ] Type "ancien" → frais notaire passe à 7,5 %, PTZ disparaît.
  - [ ] Changer le régime → Comptabilité/CFE apparaissent/disparaissent.
  - [ ] Ajouter un prêt complémentaire → montant du prêt principal se recalcule.
  - [ ] Histogramme : les barres impôts (violet) n'apparaissent que quand la base imposable est positive.
  - [ ] Tableau fiscal : la ligne "falaise fiscale" est surlignée, note explicative présente.
  - [ ] Donut : 4 segments (mensualité, charges, impôts, loyer net).

- [ ] **Checklist non-régression mode crédit**

  - [ ] Passer en mode Crédit → tous les champs, KPIs, graphiques et tableaux fonctionnent comme avant.
  - [ ] Créer un projet crédit, sauvegarder, recharger → valeurs restaurées correctement.
  - [ ] Créer un projet locatif, sauvegarder, charger depuis le mode crédit → bascule en mode locatif avec les bons paramètres.

- [ ] **Commit final si tout est vert**

```bash
git add -A
git commit -m "feat(locatif): validation complète — module investissement locatif V1 prêt pour merge"
```

---

## Récapitulatif des commits attendus

```
feat(locatif): calcFiscaliteLocatif — 3 régimes fiscaux
feat(locatif): calcSimulationLocatif — amortissement, séries annuelles, detail fiscal
feat(locatif): ajouter conteneurs locatif et chargement scripts dans index.html
feat(locatif): sidebar HTML 9 sections, lireParamsLocatif, tranches, onTypeChange, onRegimeChange
feat(locatif): renderKPIsLocatif, décomposition cash-flow, structure HTML résultats
feat(locatif): renderChartsLocatif — histogramme empilé, cash-flow annuel, patrimoine
feat(locatif): tableaux projet/financement, tableau d'évolution fiscale annuelle
feat(locatif): section fiscalité détaillée et donut répartition annuelle
feat(locatif): onInputLocatif, mountLocatif — cycle de rendu complet
feat: routage onglets Crédit ↔ Investissement locatif dans app.js
feat(locatif): sauvegarde/chargement projets locatif, badge mode dans liste projets
feat(locatif): validation complète — module investissement locatif V1 prêt pour merge
```
