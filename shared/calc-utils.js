// Formatage et calculs financiers génériques, partagés entre les modes Crédit et Investissement locatif.

  function fmt(n) {
    return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(Math.round(n)) + ' €';
  }
  function fmtPct(n) { return parseFloat((+n).toFixed(2)) + ' %'; }

  function fmtRaw(n) {
    return new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(n);
  }

  function calcMensualite(capital, tauxAnnuel, dureeAns) {
    if (tauxAnnuel === 0) return capital / (dureeAns * 12);
    const t = tauxAnnuel / 12 / 100;
    const n = dureeAns * 12;
    return capital * t / (1 - Math.pow(1 + t, -n));
  }

  function calcTAEG(capitalNet, rows) {
    // Bisection: trouver le taux mensuel r tel que capitalNet = Σ flux_i / (1+r)^i
    const flux = rows.map(r => r.mensualite);
    let lo = 0, hi = 1;
    for (let iter = 0; iter < 100; iter++) {
      const mid = (lo + hi) / 2;
      const pv = flux.reduce((s, f, i) => s + f / Math.pow(1 + mid, i + 1), 0);
      if (pv > capitalNet) lo = mid; else hi = mid;
    }
    const rMensuel = (lo + hi) / 2;
    return Math.round((Math.pow(1 + rMensuel, 12) - 1) * 10000) / 100;
  }
