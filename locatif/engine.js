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
