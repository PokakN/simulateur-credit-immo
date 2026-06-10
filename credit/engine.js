// Moteur de calcul du simulateur de crédit immobilier (amortissement, KPIs).

  function calcAmortissement(p) {
    const { tauxAssurance, differeMois, differeType, valeurBien, tauxApprec } = p;

    // Build tranches list (backward compat: if no tranches array, use legacy fields)
    const tranches = p.tranches && p.tranches.length > 0 ? p.tranches : [{
      id: 'principal', isPrincipal: true, isPTZ: false,
      montant: p.capital, taux: p.tauxNominal, duree: p.duree
    }];

    const principalTranche = tranches.find(t => t.isPrincipal) || tranches[0];
    const n = (principalTranche.duree || 20) * 12;

    // Assurance on total capital borrowed
    const totalBorrowed = tranches.reduce((s, t) => s + (t.montant || 0), 0);
    const assuranceMensuelle = totalBorrowed * tauxAssurance / 12 / 100;

    // Compute per-tranche row schedules
    const trancheSchedules = tranches.map(tr => {
      const tt = tr.taux / 12 / 100;
      const nn = tr.duree * 12;
      const montant = tr.montant || 0;
      if (montant <= 0) return Array(n).fill(null).map(() => ({ cap: 0, int: 0, cr: 0, ptz: 0, mens: 0 }));

      let cr = montant;
      // For principal: apply deferral
      const applyDiffere = tr.isPrincipal && differeMois > 0;
      const capitalApresDiffere = applyDiffere && differeType === 'total'
        ? montant * Math.pow(1 + tt, differeMois) : montant;
      const dureeEff = applyDiffere ? nn - differeMois : nn;
      const mens = tt === 0
        ? montant / nn
        : capitalApresDiffere * tt / (1 - Math.pow(1 + tt, -dureeEff));

      return Array.from({ length: n }, (_, i) => {
        const mois = i + 1;
        const inDiffere = tr.isPrincipal && mois <= differeMois;

        if (inDiffere) {
          const intDiff = cr * tt;
          if (differeType === 'total') cr *= (1 + tt);
          return { cap: 0, int: inDiffere && differeType === 'partiel' ? intDiff : 0, cr, ptz: 0, mens: 0, inDiffere: true };
        }
        if (mois > nn || cr <= 0) return { cap: 0, int: 0, cr: 0, ptz: 0, mens: 0 };

        const intr = cr * tt;
        const capR = Math.min(mens - intr, cr);
        cr = Math.max(0, cr - capR);
        return {
          cap: capR,
          int: tr.isPTZ ? 0 : intr,
          cr,
          ptz: tr.isPTZ ? capR : 0,
          mens
        };
      });
    });

    // Merge per-month
    const rows = [];
    for (let i = 0; i < n; i++) {
      const mois = i + 1;
      let sumCap = 0, sumInt = 0, sumCR = 0, sumPTZ = 0, sumMens = 0;
      let enDiffere = false;
      let differeInt = 0;

      trancheSchedules.forEach((sched, j) => {
        const r = sched[i];
        sumCap += r.cap;
        sumInt += r.int;
        sumCR  += r.cr;
        sumPTZ += r.ptz;
        if (r.inDiffere) { enDiffere = true; differeInt += r.int; }
        else if (r.mens > 0) sumMens += r.mens;
      });

      const valeurBienMois = valeurBien * Math.pow(1 + tauxApprec / 100, mois / 12);

      const mensualiteLigne = enDiffere
        ? (differeType === 'partiel' ? differeInt : 0) + assuranceMensuelle + sumMens
        : sumMens + assuranceMensuelle;

      rows.push({
        mois, annee: Math.ceil(mois / 12),
        mensualite: mensualiteLigne,
        capital: sumCap,
        interets: sumInt,
        assurance: assuranceMensuelle,
        ptz: sumPTZ,
        capitalRestant: sumCR,
        valeurBien: valeurBienMois
      });
    }
    return rows;
  }

  function calcSimulation(p) {
    const rows = calcAmortissement(p);
    if (!rows.length) return null;

    const interetsTotaux = rows.reduce((s, r) => s + r.interets, 0);
    const assuranceTotale = rows.reduce((s, r) => s + r.assurance, 0);
    const fraisNotaire = p.fraisNotaire;   // déjà calculé dans lireParams
    const coutCredit = interetsTotaux + assuranceTotale;
    // total dépensé = prix d'acquisition + coût du financement
    const coutTotalOperation = (p.prixProjet || p.capital) + (p.travaux || 0)
      + p.fraisNotaire + p.fraisDossier + p.fraisGarantie
      + interetsTotaux + assuranceTotale;

    // Mensualité post-différé (première ligne hors période de différé)
    const postDiffereRow = rows[p.differeMois] || rows[0];
    const mensualite = postDiffereRow.mensualite;
    const totalBorrowed = (p.tranches || []).reduce((s, t) => s + (t.montant || 0), 0) || p.capital;
    const mensualiteAssurance = totalBorrowed * p.tauxAssurance / 12 / 100;

    // PTZ : deux phases (an 1–10 avec PTZ, an 11+ sans PTZ)
    const hasPTZ = p.ptzMontant > 0 && p.ptzDuree > 0;
    const ptzMensualiteM = hasPTZ ? Math.round(p.ptzMontant / (p.ptzDuree * 12)) : 0;
    const ptzFinMois = hasPTZ ? p.ptzDuree * 12 : 0;
    const mensualitePhase2 = hasPTZ && rows.length > ptzFinMois
      ? Math.round(rows[ptzFinMois].mensualite)
      : null;

    const valeurBienTerme = p.valeurBien * Math.pow(1 + p.tauxApprec / 100, p.duree);
    const plusValueNette = valeurBienTerme - coutTotalOperation;

    // TAEG réglementaire : on actualise les mensualités contre le montant
    // effectivement mis à disposition de l'emprunteur. Les frais de dossier et
    // de garantie sont des coûts du crédit (même financés) : ils se déduisent
    // de la base actuarielle, ce qui augmente le TAEG. Les frais de notaire
    // (frais d'acquisition, pas de financement) restent exclus.
    const capitalNetTAEG = Math.max(1, totalBorrowed - (p.fraisDossier || 0) - (p.fraisGarantie || 0));
    const taeg = calcTAEG(capitalNetTAEG, rows);

    // Données graphique principal (mensuel)
    const capitalRestantParMois = rows.map(r => Math.round(r.capitalRestant));
    const valeurBienParMois = rows.map(r => Math.round(r.valeurBien));
    const labelsParMois = rows.map((_, i) => (i % 12 === 0) ? `An ${Math.floor(i / 12) + 1}` : '');

    // Point de croisement
    let moisCroisement = null;
    for (let i = 0; i < rows.length; i++) {
      if (rows[i].valeurBien >= rows[i].capitalRestant) { moisCroisement = i + 1; break; }
    }

    // Gain net potentiel à la revente : ce qu'on récupère (valeur − dette restante)
    // moins ce qu'on a investi (apport + mensualités cumulées). L'apport est compté
    // des deux côtés — il a réduit le capital emprunté (donc augmente l'équité d'autant)
    // et il sort de la poche au départ — si bien qu'il s'annule mathématiquement :
    //   gain(m) = (valeurBien(m) − prixProjet) − fraisAcquisition − intérêts(m) − assurance(m)
    // i.e. la prise de valeur du bien doit compenser tous les coûts du financement.
    // L'omettre d'un seul côté (comme dans une version précédente) faisait apparaître
    // l'apport comme un profit immédiat — d'où un seuil de rentabilité toujours au mois 1.
    let cumulMensualites = 0;
    const gainNetReventeParMois = [];
    let moisRentabilite = null;
    for (let i = 0; i < rows.length; i++) {
      cumulMensualites += rows[i].mensualite;
      const gain = rows[i].valeurBien - rows[i].capitalRestant - p.apport - cumulMensualites;
      gainNetReventeParMois.push(Math.round(gain));
      if (moisRentabilite === null && gain >= 0) moisRentabilite = i + 1;
    }

    // Données graphique secondaire (annuel)
    const labelsAns = [];
    const capitalParAn = [], interetsParAn = [];
    const capitalCumule = [], interetsCumules = [];
    let cumCap = 0, cumInt = 0;
    for (let an = 1; an <= p.duree; an++) {
      labelsAns.push(`An ${an}`);
      const anRows = rows.filter(r => r.annee === an);
      const capAn = anRows.reduce((s, r) => s + r.capital, 0);
      const intAn = anRows.reduce((s, r) => s + r.interets, 0);
      capitalParAn.push(Math.round(capAn));
      interetsParAn.push(Math.round(intAn));
      cumCap += capAn; cumInt += intAn;
      capitalCumule.push(Math.round(cumCap));
      interetsCumules.push(Math.round(cumInt));
    }

    return {
      mensualite: Math.round(mensualite),
      mensualitePhase2,
      ptzMensualiteM,
      mensualiteAssurance: Math.round(mensualiteAssurance),
      interetsTotaux: Math.round(interetsTotaux),
      assuranceTotale: Math.round(assuranceTotale),
      fraisNotaire: Math.round(fraisNotaire),
      coutCredit: Math.round(coutCredit),
      coutTotalOperation: Math.round(coutTotalOperation),
      valeurBienTerme: Math.round(valeurBienTerme),
      plusValueNette: Math.round(plusValueNette),
      taeg,
      duree: p.duree,
      tauxApprec: p.tauxApprec,
      amortissement: rows,
      labelsParMois,
      capitalRestantParMois,
      valeurBienParMois,
      moisCroisement,
      gainNetReventeParMois,
      moisRentabilite,
      labelsAns,
      capitalParAn,
      interetsParAn,
      capitalCumule,
      interetsCumules
    };
  }
