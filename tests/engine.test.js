// Math tests for crédit + locatif engines.
// Run with: node tests/engine.test.js
// No external dependencies — pure Node.js.

// ── Shims for browser globals used by the engines ────────────────────────────
global.Intl = Intl;

// Load shared utilities and engines into global scope via vm
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.join(__dirname, '..');

function load(rel) {
  const code = fs.readFileSync(path.join(root, rel), 'utf8');
  vm.runInThisContext(code, { filename: rel });
}

load('shared/calc-utils.js');
load('credit/engine.js');
load('locatif/engine.js');

// ── Tiny test runner ──────────────────────────────────────────────────────────
let passed = 0, failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✅  ${name}`);
    passed++;
  } catch (e) {
    console.log(`  ❌  ${name}`);
    console.log(`       ${e.message}`);
    failed++;
  }
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg || 'Assertion failed');
}

function assertClose(a, b, tol = 1, label = '') {
  if (Math.abs(a - b) > tol) throw new Error(`${label} Expected ≈${b}, got ${a} (diff ${Math.abs(a-b).toFixed(2)})`);
}

// ── calcMensualite ────────────────────────────────────────────────────────────
console.log('\ncalcMensualite');

test('Formule standard: 200 000 € à 3,5 % sur 20 ans', () => {
  const m = calcMensualite(200000, 3.5, 20);
  assertClose(m, 1159.93, 0.5, 'mensualite');
});

test('Taux 0 % → capital / (n*12)', () => {
  const m = calcMensualite(120000, 0, 10);
  assertClose(m, 1000, 0.01, 'mensualite taux 0');
});

test('Durée 1 an 6 % → remboursement quasi-total en 12 mois', () => {
  const m = calcMensualite(12000, 6, 1);
  assertClose(m * 12, 12000 * 1.03, 200, 'total remboursé');
});

// ── calcAmortissement ─────────────────────────────────────────────────────────
console.log('\ncalcAmortissement');

function makeParams(overrides = {}) {
  return {
    prixProjet: 200000, apport: 30000,
    tauxAssurance: 0.33, differeMois: 0, differeType: 'partiel',
    valeurBien: 200000, tauxApprec: 2,
    tranches: [{ id: 'principal', isPrincipal: true, isPTZ: false, taux: 3.5, duree: 20, montant: 170000 }],
    ...overrides
  };
}

test('Nombre de lignes = durée principale × 12', () => {
  const rows = calcAmortissement(makeParams());
  assert(rows.length === 240, `Expected 240 rows, got ${rows.length}`);
});

test('Capital restant ≈ 0 à la dernière ligne', () => {
  const rows = calcAmortissement(makeParams());
  assertClose(rows[rows.length - 1].capitalRestant, 0, 5, 'capitalRestant final');
});

test('Somme des capitaux remboursés = montant emprunté', () => {
  const montant = 170000;
  const rows = calcAmortissement(makeParams());
  const sumCap = rows.reduce((s, r) => s + r.capital, 0);
  assertClose(sumCap, montant, 1, 'somme capital');
});

test('Mensualité constante (hors différé, hors assurance)', () => {
  const rows = calcAmortissement(makeParams());
  const mens = rows.map(r => r.mensualite);
  const first = mens[0];
  // All should be within 1 € (floating point)
  assert(mens.every(m => Math.abs(m - first) < 1), 'mensualités non constantes');
});

test('Différé partiel : capital nul pendant la période', () => {
  const rows = calcAmortissement(makeParams({ differeMois: 6, differeType: 'partiel' }));
  for (let i = 0; i < 6; i++) {
    assert(rows[i].capital === 0, `capital non nul mois ${i+1} (différé partiel)`);
  }
  assert(rows[6].capital > 0, 'capital nul après différé');
});

test('Valorisation : valeurBien croît avec tauxApprec', () => {
  const rows = calcAmortissement(makeParams({ valeurBien: 200000, tauxApprec: 2 }));
  assert(rows[rows.length - 1].valeurBien > rows[0].valeurBien, 'valeurBien ne croît pas');
  assertClose(rows[rows.length - 1].valeurBien, 200000 * Math.pow(1.02, 20), 100, 'valeurBien an 20');
});

// ── Budget balance (locatif) ──────────────────────────────────────────────────
console.log('\nBudget locatif — apport + emprunts = coût acquisition');

function makeLocParams(overrides = {}) {
  const prix = 200000, apport = 30000, notPct = 7.5, agence = 5000, garPct = 1.5, dossier = 1000, travaux = 0, mobilier = 0;
  const fraisNotaire = prix * notPct / 100;
  const fraisGarantie = prix * garPct / 100;
  const capital = prix + travaux + mobilier + fraisNotaire + agence + fraisGarantie + dossier - apport;
  return {
    typeProjet: 'ancien', prixProjet: prix, apport,
    travaux, mobilier,
    fraisNotaire, fraisNotairePct: notPct,
    fraisAgence: agence, fraisGarantie, tauxGarantie: garPct, fraisDossier: dossier,
    tranches: [{ id: 'principal', isPrincipal: true, isPTZ: false, taux: 3.5, duree: 20, montant: capital }],
    differeMois: 0, differeType: 'partiel',
    tauxAssurance: 0.33, valeurBien: prix, tauxApprec: 1.5,
    duree: 20, horizonAns: 20,
    loyerMensuel: 900, chargesRecuperables: 80, vacanceLocative: 8,
    chargesCopro: 1200, taxeFonciere: 1000, assurancePNO: 200,
    garantieLoyers: 2.5, gestionLocative: 7, entretien: 500,
    comptabilite: 350, cfe: 200,
    regimeFiscal: 'lmnp_reel', tmi: 30,
    ...overrides
  };
}

test('apport + emprunts = coutTotalAcquisition (sans mobilier)', () => {
  const p = makeLocParams();
  const r = calcSimulationLocatif(p);
  const totalEmprunte = p.tranches.reduce((s, t) => s + (t.montant || 0), 0);
  assertClose(p.apport + totalEmprunte, r.coutTotalAcquisition, 1, 'budget');
});

test('apport + emprunts = coutTotalAcquisition (avec mobilier 10 000 €)', () => {
  const mobilier = 10000;
  const prix = 200000, apport = 30000, notPct = 7.5, agence = 5000, garPct = 1.5, dossier = 1000, travaux = 0;
  const fraisNotaire = prix * notPct / 100;
  const fraisGarantie = prix * garPct / 100;
  const capital = prix + travaux + mobilier + fraisNotaire + agence + fraisGarantie + dossier - apport;
  const p = makeLocParams({
    mobilier,
    tranches: [{ id: 'principal', isPrincipal: true, isPTZ: false, taux: 3.5, duree: 20, montant: capital }]
  });
  const r = calcSimulationLocatif(p);
  const totalEmprunte = p.tranches.reduce((s, t) => s + (t.montant || 0), 0);
  assertClose(p.apport + totalEmprunte, r.coutTotalAcquisition, 1, 'budget avec mobilier');
});

// ── Cash-flow locatif ─────────────────────────────────────────────────────────
console.log('\nCash-flow locatif');

test('cashFlowDetail.net = revenus - mensualite - charges - impôts', () => {
  const p = makeLocParams();
  const r = calcSimulationLocatif(p);
  const cf = r.cashFlowDetail;
  const recomputed = Math.round(cf.revenus - cf.mensualite - cf.charges - cf.impots);
  assertClose(cf.net, recomputed, 1, 'cashFlowDetail.net');
});

test('effortEpargne = max(0, -cashFlowDetail.net)', () => {
  const p = makeLocParams();
  const r = calcSimulationLocatif(p);
  const expected = Math.max(0, -r.cashFlowDetail.net);
  assert(r.effortEpargne === expected, `effortEpargne ${r.effortEpargne} ≠ ${expected}`);
});

test('loyer 10 000 €/mois couvre la mensualité → cash-flow positif', () => {
  const p = makeLocParams({ loyerMensuel: 10000 });
  const r = calcSimulationLocatif(p);
  assert(r.cashFlowDetail.net > 0, `cash-flow devrait être positif (${r.cashFlowDetail.net})`);
  assert(r.effortEpargne === 0, 'effortEpargne devrait être 0');
});

// ── Rendements ────────────────────────────────────────────────────────────────
console.log('\nRendements');

test('rendementBrut = loyerAnnuelBrut / coutTotalAcquisition * 100', () => {
  const p = makeLocParams();
  const r = calcSimulationLocatif(p);
  const expected = Math.round(r.loyerAnnuelBrut / r.coutTotalAcquisition * 10000) / 100;
  assertClose(r.rendementBrut, expected, 0.01, 'rendementBrut');
});

test('rendementNet ≤ rendementBrut (charges positives)', () => {
  const p = makeLocParams();
  const r = calcSimulationLocatif(p);
  assert(r.rendementNet <= r.rendementBrut, `rendementNet (${r.rendementNet}) > rendementBrut (${r.rendementBrut})`);
});

test('rendementNetNet ≤ rendementNet (impôts positifs)', () => {
  const p = makeLocParams({ tmi: 30 });
  const r = calcSimulationLocatif(p);
  assert(r.rendementNetNet <= r.rendementNet, `rendementNetNet (${r.rendementNetNet}) > rendementNet (${r.rendementNet})`);
});

test('cashOnCash négatif quand loyer < mensualité + charges', () => {
  const p = makeLocParams(); // 900€/mois loyer << 1178€ mensualite
  const r = calcSimulationLocatif(p);
  assert(r.cashOnCash < 0, `cashOnCash devrait être négatif (${r.cashOnCash})`);
});

test('cashOnCash positif quand loyer très élevé', () => {
  const p = makeLocParams({ loyerMensuel: 5000 });
  const r = calcSimulationLocatif(p);
  assert(r.cashOnCash > 0, `cashOnCash devrait être positif (${r.cashOnCash})`);
});

// ── Fiscalité ─────────────────────────────────────────────────────────────────
console.log('\nFiscalité');

test('LMNP réel : base imposable négative si amortissements couvrent loyers', () => {
  // Avec prix élevé, amortissement bien est élevé → base imposable négative
  const p = makeLocParams({ prixProjet: 1000000, loyerMensuel: 1000,
    tranches: [{ id: 'principal', isPrincipal: true, isPTZ: false, taux: 3.5, duree: 20,
      montant: 1000000 * 1.075 + 5000 + 1000 * 1.015 + 1000 - 30000 }] });
  const r = calcSimulationLocatif(p);
  assert(r.fiscalDetail[0].baseImposable < 0, 'base imposable devrait être négative');
  assert(r.fiscalDetail[0].impots === 0, 'impôts doivent être 0 si base négative');
});

test('nu_micro : abattement 30 % — base = (loyer + charges récup) × 12 × 0.70', () => {
  const p = makeLocParams({ regimeFiscal: 'nu_micro' });
  const r = calcSimulationLocatif(p);
  // loyerAnnuelBrut includes chargesRecuperables (default 0 in makeLocParams)
  const loyerBrut = (p.loyerMensuel + (p.chargesRecuperables || 0)) * 12;
  const expectedBase = Math.round(loyerBrut * 0.70);
  assertClose(r.fiscalDetail[0].baseImposable, expectedBase, 1, 'base imposable micro');
});

// ── Charges récupérables ──────────────────────────────────────────────────────
console.log('\nCharges récupérables');

test('chargesRecuperables augmente loyerAnnuelBrut', () => {
  const p0 = makeLocParams({ chargesRecuperables: 0 });
  const p1 = makeLocParams({ chargesRecuperables: 80 });
  const r0 = calcSimulationLocatif(p0);
  const r1 = calcSimulationLocatif(p1);
  assertClose(r1.loyerAnnuelBrut - r0.loyerAnnuelBrut, 80 * 12, 1, 'delta loyerAnnuelBrut');
});

test('chargesRecuperables améliore le cash-flow', () => {
  const p0 = makeLocParams({ chargesRecuperables: 0 });
  const p1 = makeLocParams({ chargesRecuperables: 80 });
  const r0 = calcSimulationLocatif(p0);
  const r1 = calcSimulationLocatif(p1);
  assert(r1.cashFlowDetail.net > r0.cashFlowDetail.net, 'cash-flow ne s\'améliore pas');
});

test('chargesRecuperables affecte la base imposable nu_micro', () => {
  const p0 = makeLocParams({ regimeFiscal: 'nu_micro', chargesRecuperables: 0 });
  const p1 = makeLocParams({ regimeFiscal: 'nu_micro', chargesRecuperables: 100 });
  const r0 = calcSimulationLocatif(p0);
  const r1 = calcSimulationLocatif(p1);
  assert(r1.fiscalDetail[0].baseImposable > r0.fiscalDetail[0].baseImposable,
    'base imposable micro ne change pas avec charges récup');
});

// ── calcTAEG ──────────────────────────────────────────────────────────────────
console.log('\ncalcTAEG');

test('TAEG ≥ taux nominal (frais inclus)', () => {
  const rows = calcAmortissement(makeParams());
  const taeg = calcTAEG(170000, rows);
  assert(taeg >= 3.5, `TAEG ${taeg} < taux nominal 3.5`);
});

test('TAEG = taux nominal si assurance = 0 et frais = 0', () => {
  const params = makeParams();
  params.tauxAssurance = 0;
  const rows = calcAmortissement(params);
  const taeg = calcTAEG(170000, rows);
  assertClose(taeg, 3.5, 0.1, 'TAEG sans frais');
});

test('TAEG : les frais de dossier/garantie financés augmentent le TAEG', () => {
  const base = {
    prixProjet: 200000, apport: 30000, tauxAssurance: 0,
    differeMois: 0, differeType: 'partiel',
    valeurBien: 200000, tauxApprec: 0,
    fraisNotaire: 0, fraisNotairePct: 0, fraisDossier: 0, fraisGarantie: 0,
    travaux: 0, ptzMontant: 0, ptzDuree: 0, duree: 20,
    tranches: [{ id: 'principal', isPrincipal: true, isPTZ: false, taux: 3.5, duree: 20, montant: 170000 }]
  };
  const sans = calcSimulation({ ...base });
  const avec = calcSimulation({ ...base, fraisDossier: 1000, fraisGarantie: 3000 });
  assertClose(sans.taeg, 3.5, 0.1, 'TAEG sans frais');
  assert(avec.taeg > sans.taeg + 0.1,
    `TAEG avec 4 000 € de frais (${avec.taeg}) devrait dépasser nettement ${sans.taeg}`);
});

test('TAEG locatif : les frais de dossier/garantie financés augmentent le TAEG', () => {
  const sans = makeLocParams({
    fraisDossier: 0, fraisGarantie: 0,
    tranches: [{ id: 'principal', isPrincipal: true, isPTZ: false, taux: 3.5, duree: 20, montant: 170000 }]
  });
  const avec = makeLocParams({
    fraisDossier: 1000, fraisGarantie: 3000,
    tranches: [{ id: 'principal', isPrincipal: true, isPTZ: false, taux: 3.5, duree: 20, montant: 170000 }]
  });
  const resSans = calcSimulationLocatif(sans);
  const resAvec = calcSimulationLocatif(avec);
  assert(resAvec.taeg > resSans.taeg + 0.1,
    `TAEG locatif avec frais (${resAvec.taeg}) devrait dépasser ${resSans.taeg} + 0.1`);
});

// ── Résumé ────────────────────────────────────────────────────────────────────
console.log(`\n${'─'.repeat(50)}`);
console.log(`Résultats : ${passed} ✅  ${failed} ❌  (${passed + failed} tests)`);
if (failed > 0) process.exit(1);
