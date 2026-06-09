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
