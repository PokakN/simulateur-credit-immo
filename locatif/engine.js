// Moteur de calcul du simulateur d'investissement locatif.
// Dépend de : shared/calc-utils.js (calcMensualite, calcTAEG), credit/engine.js (calcAmortissement)

// regime ∈ { 'lmnp_reel', 'lmnp_micro', 'nu_micro', 'nu_reel' }
function calcFiscaliteLocatif(regime, base) {
  const {
    loyerAnnuelNet,           // loyers + charges récupérables, nets de vacance
    loyerHCAnnuelNet,         // loyers hors charges, nets de vacance (recettes micro-foncier)
    interetsAnnee, assuranceAnnee,
    chargesCopro, taxeFonciere, assurancePNO,
    garantieLoyersEur, gestionLocativeEur, entretien,
    comptabilite, cfe, travauxAnnee,
    amortissementBien, amortissementMobilier,
    reportAmortissement = 0,  // amortissements LMNP non imputés (art. 39 C), report illimité
    reportDeficitFoncier = 0, // déficit foncier reporté (simplification : pas de péremption 10 ans)
    tmi
  } = base;

  const PS = 0.172;
  let baseImposable = 0, impots = 0, prelevementsSociaux = 0;
  let amortissementReporte = reportAmortissement;
  let deficitReportable = reportDeficitFoncier;
  let economieImpotGlobal = 0; // déficit foncier imputé sur le revenu global (≤ 10 700 €/an)

  if (regime === 'nu_micro') {
    // Micro-foncier : abattement forfaitaire 30 % sur les loyers HC encaissés.
    // Les provisions pour charges récupérables ne sont pas des recettes.
    baseImposable = loyerHCAnnuelNet * 0.70;
    impots = baseImposable * tmi / 100;
    prelevementsSociaux = baseImposable * PS;

  } else if (regime === 'lmnp_micro') {
    // Micro-BIC meublé : abattement forfaitaire 50 % sur les recettes
    // (loyers charges comprises) effectivement encaissées.
    baseImposable = loyerAnnuelNet * 0.50;
    impots = baseImposable * tmi / 100;
    prelevementsSociaux = baseImposable * PS;

  } else if (regime === 'lmnp_reel') {
    const chargesHorsAmort = interetsAnnee + assuranceAnnee
      + chargesCopro + taxeFonciere + assurancePNO
      + garantieLoyersEur + gestionLocativeEur + entretien
      + comptabilite + cfe;
    const baseAvantAmort = loyerAnnuelNet - chargesHorsAmort;
    // Art. 39 C CGI : l'amortissement ne peut pas créer ni aggraver un déficit
    // BIC non professionnel. L'excédent se reporte sans limite de durée.
    const amortDisponible = amortissementBien + amortissementMobilier + reportAmortissement;
    const amortUtilise = Math.max(0, Math.min(baseAvantAmort, amortDisponible));
    amortissementReporte = amortDisponible - amortUtilise;
    baseImposable = baseAvantAmort - amortUtilise;
    const baseTaxable = Math.max(0, baseImposable);
    impots = baseTaxable * tmi / 100;
    prelevementsSociaux = baseTaxable * PS;

  } else { // nu_reel
    const chargesHorsInterets = chargesCopro + taxeFonciere + assurancePNO
      + garantieLoyersEur + gestionLocativeEur + entretien + travauxAnnee;
    const interets = interetsAnnee + assuranceAnnee;
    // Les intérêts d'emprunt ne s'imputent que sur les revenus fonciers ;
    // le déficit issu des autres charges est imputable sur le revenu global
    // dans la limite de 10 700 €/an, l'excédent est reporté sur 10 ans
    // (simplification : pas de suivi de péremption).
    const apresInterets = loyerAnnuelNet - interets;
    if (apresInterets < 0) {
      const imputable = Math.min(10700, chargesHorsInterets);
      economieImpotGlobal = imputable * tmi / 100;
      deficitReportable += (-apresInterets) + (chargesHorsInterets - imputable);
      baseImposable = apresInterets - chargesHorsInterets; // négatif, pour affichage
    } else {
      let solde = apresInterets - chargesHorsInterets;
      if (solde >= 0) {
        const consomme = Math.min(solde, reportDeficitFoncier);
        deficitReportable = reportDeficitFoncier - consomme;
        solde -= consomme;
        baseImposable = solde;
        impots = solde * tmi / 100;
        prelevementsSociaux = solde * PS;
      } else {
        const imputable = Math.min(10700, -solde);
        economieImpotGlobal = imputable * tmi / 100;
        deficitReportable += (-solde) - imputable;
        baseImposable = solde; // négatif, pour affichage
      }
    }
  }

  return {
    baseImposable: Math.round(baseImposable),
    impots: Math.round(impots),
    prelevementsSociaux: Math.round(prelevementsSociaux),
    economieImpotGlobal: Math.round(economieImpotGlobal),
    fiscaliteAnnuelle: Math.round(impots + prelevementsSociaux - economieImpotGlobal),
    amortissementReporte: Math.round(amortissementReporte),
    deficitFoncierReporte: Math.round(deficitReportable)
  };
}

function calcSimulationLocatif(p) {
  const rows = calcAmortissement(p);
  if (!rows.length) return null;

  // Extend rows beyond the loan term if horizon exceeds it (post-payoff years)
  const requestedHorizon = Math.max(1, Math.min(p.horizonAns || p.duree || 20, 30));
  if (rows.length < requestedHorizon * 12) {
    const valBienBase = p.valeurBien || p.prixProjet || 0;
    const tauxApprec  = p.tauxApprec || 0;
    for (let i = rows.length; i < requestedHorizon * 12; i++) {
      const mois = i + 1;
      rows.push({
        mois, annee: Math.ceil(mois / 12),
        mensualite: 0, capital: 0, interets: 0,
        assurance: 0, ptz: 0, capitalRestant: 0,
        valeurBien: valBienBase * Math.pow(1 + tauxApprec / 100, mois / 12)
      });
    }
  }

  // ── Financement ──────────────────────────────────────────────────────────
  const totalBorrowed = (p.tranches || []).reduce((s, t) => s + (t.montant || 0), 0) || p.capital || 0;
  const postDiffereRow = rows[p.differeMois] || rows[0];
  const mensualite = postDiffereRow.mensualite;
  // Les lignes étendues au-delà du prêt ont mensualite = 0 : leur contribution
  // à la somme actualisée est nulle, donc le résultat du TAEG est inchangé.
  const capitalNetTAEG = Math.max(1, totalBorrowed - (p.fraisDossier || 0) - (p.fraisGarantie || 0));
  const taeg = calcTAEG(capitalNetTAEG, rows);

  const coutTotalAcquisition = (p.prixProjet || 0) + (p.travaux || 0) + (p.mobilier || 0)
    + (p.fraisNotaire || 0) + (p.fraisAgence || 0)
    + (p.fraisGarantie || 0) + (p.fraisDossier || 0);

  // ── Revenus ──────────────────────────────────────────────────────────────
  // loyerAnnuelBrut = loyer HC + charges récupérables (total encaissé par le bailleur)
  // Les charges récupérables reçues sont déjà compensées par chargesCopro côté dépenses.
  const loyerAnnuelBrut = ((p.loyerMensuel || 0) + (p.chargesRecuperables || 0)) * 12;
  const loyerAnnuelNet  = loyerAnnuelBrut * (1 - (p.vacanceLocative || 0) / 100);
  const loyerHCAnnuelNet = (p.loyerMensuel || 0) * 12 * (1 - (p.vacanceLocative || 0) / 100);

  // ── Charges annuelles ────────────────────────────────────────────────────
  const garantieLoyersEur  = (p.garantieLoyers || 0) / 100 * loyerAnnuelBrut;
  const gestionLocativeEur = (p.gestionLocative || 0) / 100 * loyerAnnuelBrut;
  let chargesAnnuelles = (p.chargesCopro || 0) + (p.taxeFonciere || 0)
    + (p.assurancePNO || 0) + garantieLoyersEur + gestionLocativeEur + (p.entretien || 0);
  if (p.regimeFiscal === 'lmnp_reel') chargesAnnuelles += (p.comptabilite || 0);
  if (p.regimeFiscal === 'lmnp_reel' || p.regimeFiscal === 'lmnp_micro') chargesAnnuelles += (p.cfe || 0);

  // ── Amortissements fiscaux ───────────────────────────────────────────────
  // Terrain forfaitaire 15% du prix, bien amortissable à 3%/an
  const amortissementBien = p.regimeFiscal === 'lmnp_reel'
    ? Math.round((p.prixProjet || 0) * 0.85 * 0.03) : 0;
  const assuranceMensuelle = totalBorrowed * (p.tauxAssurance || 0) / 12 / 100;

  // ── Détail fiscal annuel ─────────────────────────────────────────────────
  const horizonAns = requestedHorizon;
  const fiscalDetail = [];

  let reportAmortissement = 0;
  let reportDeficitFoncier = 0;

  for (let an = 1; an <= horizonAns; an++) {
    const anRows = rows.filter(r => r.annee === an);
    if (!anRows.length) break;

    const interetsAnnee     = anRows.reduce((s, r) => s + r.interets, 0);
    const assuranceAnnee    = assuranceMensuelle * anRows.length;
    const amortissementMobilier = (an <= 5 && p.regimeFiscal === 'lmnp_reel')
      ? (p.mobilier || 0) * 0.20 : 0;
    const amortissementFiscal = amortissementBien + amortissementMobilier;

    const travauxAnnee = (an === 1) ? (p.travaux || 0) : 0; // nu_reel : déduits l'année des dépenses

    const fiscal = calcFiscaliteLocatif(p.regimeFiscal || 'lmnp_reel', {
      loyerAnnuelNet, loyerHCAnnuelNet,
      interetsAnnee, assuranceAnnee,
      chargesCopro: p.chargesCopro || 0,
      taxeFonciere: p.taxeFonciere || 0,
      assurancePNO: p.assurancePNO || 0,
      garantieLoyersEur, gestionLocativeEur,
      entretien: p.entretien || 0,
      comptabilite: p.comptabilite || 0,
      cfe: p.cfe || 0,
      travauxAnnee,
      amortissementBien,
      amortissementMobilier,
      reportAmortissement, reportDeficitFoncier,
      tmi: p.tmi || 0
    });
    reportAmortissement  = fiscal.amortissementReporte;
    reportDeficitFoncier = fiscal.deficitFoncierReporte;

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
      economieImpotGlobal:  fiscal.economieImpotGlobal,
      amortissementReporte: fiscal.amortissementReporte,
      deficitFoncierReporte: fiscal.deficitFoncierReporte,
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
    patrimoineNetParAn.push(Math.round(lastRow.valeurBien - lastRow.capitalRestant - (p.apport || 0)));
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
  // Cash-on-cash : retour annuel sur capital investi (apport), after ALL costs including loan
  const cashFlowAnnuel = cashFlowDetail.net * 12;
  const cashOnCash = (p.apport || 0) > 0
    ? rnd(cashFlowAnnuel / (p.apport || 1) * 100) : 0;

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
    loyerHCAnnuelNet:     Math.round(loyerHCAnnuelNet),
    plafondMicroFoncierDepasse: (p.regimeFiscal === 'nu_micro') && loyerHCAnnuelNet > 15000,
    plafondMicroBICDepasse:     (p.regimeFiscal === 'lmnp_micro') && loyerAnnuelNet > 77700,
    chargesAnnuelles:     Math.round(chargesAnnuelles),
    cashFlowDetail,
    effortEpargne:        Math.max(0, -cashFlowDetail.net),
    rendementBrut, rendementNet, rendementNetNet, cashOnCash,
    labelsAns, loyersNetsParAn, mensualiteParAn, chargesParAn,
    fiscaliteParAn, cashFlowParAn,
    capitalRestantParAn, capitalRembourseParAn,
    valeurBienParAn, plusValuePotentielleParAn, patrimoineNetParAn,
    fiscalDetail,
    patrimoineNetHorizon: patrimoineNetParAn[horizonIdx] || 0,
    horizonAns
  };
}
