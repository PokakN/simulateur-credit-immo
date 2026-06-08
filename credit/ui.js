// Rendu de l'interface du mode Crédit immobilier (paramètres, résultats, graphiques, tableaux).

  // ==================== INTERFACE & RENDU ====================

  let chartPrincipal = null;
  let chartSecondaire = null;
  let chartDonut = null;
  let modeGraphique = 'A';
  let modeChartPrincipal = 'gain';
  let modeTableau = 'mois';
  let scenarioBActif = false;
  let tranchesA = [];
  let tranchesB = [];

  function getTranches(prefix) { return prefix === 'a' ? tranchesA : tranchesB; }
  function setTranches(prefix, arr) { if (prefix === 'a') tranchesA = arr; else tranchesB = arr; }

  function initTranches(prefix, type) {
    const existing = getTranches(prefix);
    const principal = existing.find(t => t.isPrincipal);
    const newPrincipal = {
      id: 'principal', label: 'Prêt principal', isPrincipal: true, isPTZ: false,
      taux: principal?.taux ?? 3.40, duree: principal?.duree ?? 20
    };
    if (type === 'ancien') {
      // Keep extra non-PTZ tranches, remove PTZ
      const extras = existing.filter(t => !t.isPrincipal && !t.isPTZ);
      setTranches(prefix, [newPrincipal, ...extras]);
    } else {
      const existingPTZ = existing.find(t => t.isPTZ);
      const ptzTranche = {
        id: 'ptz', label: 'PTZ', isPrincipal: false, isPTZ: true,
        taux: 0, duree: 10, montant: existingPTZ?.montant ?? 30000
      };
      const extras = existing.filter(t => !t.isPrincipal && !t.isPTZ);
      setTranches(prefix, [newPrincipal, ptzTranche, ...extras]);
    }
    renderTranchesUI(prefix);
  }

  function renderTranchesUI(prefix) {
    const el = document.getElementById(`${prefix}-tranches-list`);
    if (!el) return;
    const tranches = getTranches(prefix);

    // Compute derived principal montant
    const pv = id => parseFloat(document.getElementById(`${prefix}-${id}`)?.value) || 0;
    const prixProjet   = pv('prix-projet');
    const apport       = pv('apport');
    const tauxNotaire  = pv('notaire');
    const fraisDossier = Math.max(500, Math.min(1500, pv('dossier')));
    const tauxGarantie = Math.max(1, Math.min(2, pv('garantie-pct')));
    const travaux      = pv('travaux-total');
    const fraisNotaire = prixProjet * tauxNotaire / 100;
    const base         = prixProjet + fraisNotaire + fraisDossier + travaux - apport;
    const fraisGarantie = Math.max(0, base) * tauxGarantie / 100;
    const capitalTotal  = Math.max(0, base + fraisGarantie);
    const montantAutres = tranches.filter(t => !t.isPrincipal).reduce((s, t) => s + (t.montant || 0), 0);
    const montantPrincipal = Math.max(0, capitalTotal - montantAutres);

    el.innerHTML = tranches.map(t => {
      const canDelete = !t.isPrincipal && !t.isPTZ;
      const delBtn = canDelete
        ? `<button class="tranche-del" onclick="removeTranche('${prefix}','${t.id}')" title="Supprimer">×</button>`
        : '';

      if (t.isPrincipal) {
        return `<div class="tranche-card">
          <div class="tranche-header">
            <span class="tranche-label-text">${t.label}</span>
          </div>
          <div class="sidebar-field" style="margin-bottom:5px">
            <label>Taux (%)</label>
            <input type="number" value="${t.taux}" min="0" max="30" step="0.01"
              oninput="onTrancheChange('${prefix}','${t.id}','taux',this.value)">
          </div>
          <div class="sidebar-field" style="margin-bottom:5px">
            <label>Durée (ans)</label>
            <input type="number" value="${t.duree}" min="1" max="30" step="1"
              oninput="onTrancheChange('${prefix}','${t.id}','duree',this.value)">
          </div>
          <div class="tranche-montant-calc" id="${prefix}-tranche-montant-${t.id}">${fmtRaw(montantPrincipal)}<span class="tranche-badge">calculé</span></div>
        </div>`;
      } else if (t.isPTZ) {
        const ptzMens = (t.montant || 0) > 0 ? Math.round((t.montant || 0) / (t.duree * 12)) : 0;
        return `<div class="tranche-card">
          <div class="tranche-header">
            <span class="tranche-label-text">${t.label}<span class="tranche-badge">0 % · ${t.duree} ans fixe</span></span>
          </div>
          <div class="sidebar-field" style="margin-bottom:5px">
            <label>Montant (€)</label>
            <input type="number" value="${t.montant || 0}" min="0" step="1000"
              oninput="onTrancheChange('${prefix}','${t.id}','montant',this.value)">
          </div>
          <div class="tranche-info" id="${prefix}-tranche-info-${t.id}" style="${ptzMens > 0 ? '' : 'display:none'}">${ptzMens > 0 ? fmtRaw(ptzMens) + '/mois pendant ' + t.duree + ' ans · puis libéré' : ''}</div>
        </div>`;
      } else {
        return `<div class="tranche-card">
          <div class="tranche-header">
            <input type="text" value="${t.label}" style="background:transparent;border:none;border-bottom:1px solid var(--ink-line);color:var(--parchment);font-family:var(--font-display);font-style:italic;font-size:15px;font-weight:500;width:calc(100% - 24px);outline:none;padding:2px 0"
              oninput="onTrancheChange('${prefix}','${t.id}','label',this.value)">
            ${delBtn}
          </div>
          <div class="sidebar-field" style="margin-bottom:5px">
            <label>Taux (%)</label>
            <input type="number" value="${t.taux}" min="0" max="30" step="0.01"
              oninput="onTrancheChange('${prefix}','${t.id}','taux',this.value)">
          </div>
          <div class="sidebar-field" style="margin-bottom:5px">
            <label>Durée (ans)</label>
            <input type="number" value="${t.duree}" min="1" max="30" step="1"
              oninput="onTrancheChange('${prefix}','${t.id}','duree',this.value)">
          </div>
          <div class="sidebar-field" style="margin-bottom:5px">
            <label>Montant (€)</label>
            <input type="number" value="${t.montant || 0}" min="0" step="1000"
              oninput="onTrancheChange('${prefix}','${t.id}','montant',this.value)">
          </div>
        </div>`;
      }
    }).join('');
  }

  // Met à jour uniquement les valeurs calculées affichées dans les tranches
  // (montant du prêt principal, mensualité PTZ) sans reconstruire le HTML —
  // évite de perdre le focus / curseur pendant la saisie
  function refreshTrancheDerivedValues(prefix) {
    const tranches = getTranches(prefix);
    if (!tranches.length) return;

    const pv = id => parseFloat(document.getElementById(`${prefix}-${id}`)?.value) || 0;
    const prixProjet   = pv('prix-projet');
    const apport       = pv('apport');
    const tauxNotaire  = pv('notaire');
    const fraisDossier = Math.max(500, Math.min(1500, pv('dossier')));
    const tauxGarantie = Math.max(1, Math.min(2, pv('garantie-pct')));
    const travaux      = pv('travaux-total');
    const fraisNotaire = prixProjet * tauxNotaire / 100;
    const base         = prixProjet + fraisNotaire + fraisDossier + travaux - apport;
    const fraisGarantie = Math.max(0, base) * tauxGarantie / 100;
    const capitalTotal  = Math.max(0, base + fraisGarantie);
    const montantAutres = tranches.filter(t => !t.isPrincipal).reduce((s, t) => s + (t.montant || 0), 0);
    const montantPrincipal = Math.max(0, capitalTotal - montantAutres);

    const principal = tranches.find(t => t.isPrincipal);
    if (principal) {
      const el = document.getElementById(`${prefix}-tranche-montant-${principal.id}`);
      if (el) el.innerHTML = `${fmtRaw(montantPrincipal)}<span class="tranche-badge">calculé</span>`;
    }
    const ptz = tranches.find(t => t.isPTZ);
    if (ptz) {
      const el = document.getElementById(`${prefix}-tranche-info-${ptz.id}`);
      if (el) {
        const ptzMens = (ptz.montant || 0) > 0 ? Math.round((ptz.montant || 0) / (ptz.duree * 12)) : 0;
        if (ptzMens > 0) {
          el.style.display = '';
          el.textContent = `${fmtRaw(ptzMens)}/mois pendant ${ptz.duree} ans · puis libéré`;
        } else {
          el.style.display = 'none';
          el.textContent = '';
        }
      }
    }
  }

  function onTrancheChange(prefix, id, field, value) {
    const t = getTranches(prefix).find(t => t.id === id);
    if (!t) return;
    t[field] = (field === 'label') ? value : (parseFloat(value) || 0);
    refreshTrancheDerivedValues(prefix);
    onInput();
  }

  function addTranche(prefix) {
    getTranches(prefix).push({
      id: 'extra-' + Date.now(), label: 'Prêt complémentaire',
      isPrincipal: false, isPTZ: false, taux: 3.40, duree: 10, montant: 0
    });
    renderTranchesUI(prefix);
    onInput();
  }

  function removeTranche(prefix, id) {
    setTranches(prefix, getTranches(prefix).filter(t => t.id !== id));
    renderTranchesUI(prefix);
    onInput();
  }

  const PRESETS = {
    neuf:   { notaire: 2.5, notaireMin: 2,   notaireMax: 3,   notaireBadge: '[2–3 %]',   ptz: 30000, travaux: true  },
    vefa:   { notaire: 2.5, notaireMin: 2,   notaireMax: 3,   notaireBadge: '[2–3 %]',   ptz: 30000, travaux: false },
    ancien: { notaire: 7.5, notaireMin: 7,   notaireMax: 8.5, notaireBadge: '[7–8,5 %]', ptz: 0,     travaux: true  }
  };

  function selectTypeProjet(prefix, type) {
    const sel = document.getElementById(`${prefix}-type-projet`);
    if (sel) sel.value = type;
    onTypeChange(prefix);
  }

  function syncTypeSegment(prefix, type) {
    const seg = document.getElementById(`${prefix}-type-segment`);
    if (!seg) return;
    seg.querySelectorAll('.type-seg-btn').forEach(b => b.classList.toggle('active', b.dataset.type === type));
  }

  function onTypeChange(prefix) {
    const type = document.getElementById(`${prefix}-type-projet`)?.value || 'ancien';
    const p = PRESETS[type] || PRESETS.ancien;
    syncTypeSegment(prefix, type);

    // Frais de notaire : min/max/valeur + badge
    const notaireEl = document.getElementById(`${prefix}-notaire`);
    if (notaireEl) {
      notaireEl.min   = p.notaireMin;
      notaireEl.max   = p.notaireMax;
      notaireEl.value = p.notaire;
    }
    const badgeEl = document.getElementById(`${prefix}-notaire-badge`);
    if (badgeEl) badgeEl.textContent = p.notaireBadge;

    // Travaux : visible pour neuf et ancien, caché et remis à 0 pour vefa
    const travauxEl = document.getElementById(`${prefix}-travaux-section`);
    if (travauxEl) travauxEl.style.display = p.travaux ? 'block' : 'none';
    if (!p.travaux) {
      ['travaux-m2','travaux-prix-m2','travaux-total'].forEach(id => {
        const el = document.getElementById(`${prefix}-${id}`);
        if (el) el.value = 0;
      });
    }

    // Update tranches for type (add/remove PTZ line)
    const currentTranches = getTranches(prefix);
    const hasPTZ = currentTranches.some(t => t.isPTZ);
    const needsPTZ = type !== 'ancien';
    if (currentTranches.length === 0 || (needsPTZ && !hasPTZ) || (!needsPTZ && hasPTZ)) {
      initTranches(prefix, type);
    } else {
      renderTranchesUI(prefix);
    }
    onInput();
  }

  function onTravauxInput(prefix, champ) {
    const m2     = parseFloat(document.getElementById(`${prefix}-travaux-m2`)?.value)      || 0;
    const prixM2 = parseFloat(document.getElementById(`${prefix}-travaux-prix-m2`)?.value) || 0;

    if (champ === 'm2' || champ === 'prix-m2') {
      const el = document.getElementById(`${prefix}-travaux-total`);
      if (el) el.value = Math.round(m2 * prixM2);
    } else if (champ === 'total') {
      const total = parseFloat(document.getElementById(`${prefix}-travaux-total`)?.value) || 0;
      if (m2 > 0) {
        const el = document.getElementById(`${prefix}-travaux-prix-m2`);
        if (el) el.value = Math.round(total / m2);
      }
    }
    onInput();
  }

  function lireParams(prefix) {
    const v = id => parseFloat(document.getElementById(`${prefix}-${id}`)?.value) || 0;
    const s = id => document.getElementById(`${prefix}-${id}`)?.value || 'ancien';

    const prixProjet    = v('prix-projet');
    const apport        = v('apport');
    const tauxNotaire   = v('notaire');
    const fraisDossier  = Math.max(500, Math.min(1500, v('dossier')));
    const tauxGarantie  = Math.max(1,   Math.min(2,    v('garantie-pct')));
    const travaux       = v('travaux-total');

    const fraisNotaire  = prixProjet * tauxNotaire / 100;
    const base          = prixProjet + fraisNotaire + fraisDossier + travaux - apport;
    const fraisGarantie = Math.max(0, base) * tauxGarantie / 100;
    const capitalTotal  = Math.max(0, base + fraisGarantie);

    // Build resolved tranches (principal montant = capitalTotal - sum of others)
    const rawTranches   = getTranches(prefix);
    const montantAutres = rawTranches.filter(t => !t.isPrincipal).reduce((s, t) => s + (t.montant || 0), 0);
    const montantPrincipal = Math.max(0, capitalTotal - montantAutres);
    const tranches = rawTranches.map(t =>
      t.isPrincipal ? { ...t, montant: montantPrincipal } : { ...t, montant: t.montant || 0 }
    );

    const principalTranche = tranches.find(t => t.isPrincipal);
    const ptzTranche       = tranches.find(t => t.isPTZ);

    return {
      capital:         capitalTotal,
      prixProjet,
      tauxNominal:     principalTranche?.taux ?? 3.40,
      duree:           principalTranche?.duree ?? 20,
      tauxAssurance:   v('assurance'),
      apport,
      fraisNotairePct: tauxNotaire,
      fraisNotaire,
      fraisDossier,
      fraisGarantie,
      tauxGarantie,
      differeMois:     v('differe-mois'),
      differeType:     s('differe-type'),
      ptzMontant:      ptzTranche?.montant ?? 0,
      ptzDuree:        ptzTranche?.duree ?? 10,
      ptzDiffere:      0,
      valeurBien:      prixProjet || 1,
      tauxApprec:      v('apprec'),
      travaux,
      typeProjet:      s('type-projet'),
      tranches
    };
  }

  function updateCapitalDisplay(prefix, params) {
    const el = document.getElementById(`${prefix}-capital-display`);
    if (!el) return;
    const frais = params.fraisNotaire + params.fraisDossier + params.fraisGarantie;
    const totalBorrowed = (params.tranches || []).reduce((s, t) => s + (t.montant || 0), 0) || params.capital;
    el.innerHTML = `<div class="capital-display">
      <span class="capital-label">Total emprunté</span>
      <span class="capital-value">${fmt(totalBorrowed)}</span>
      <span class="capital-sub">dont frais : ${fmt(frais)}</span>
    </div>`;
  }

  function _kpiHTML(res, prefix) {
    const pvClass = res.plusValueNette >= 0 ? 'kpi-value--green' : 'kpi-value--red';
    const duree = res.duree || 20;
    const tauxApprec = res.tauxApprec || 0;
    return `
      <div class="kpi-card">
        <div class="kpi-label">Mensualité${res.mensualitePhase2 ? ' (an 1–10)' : ''}</div>
        <div class="kpi-value">${fmt(res.mensualite)}</div>
        ${res.mensualitePhase2
          ? `<div class="kpi-sub" style="color:var(--sage);font-weight:600">↓ ${fmt(res.mensualitePhase2)} dès an 11</div>
             <div class="kpi-sub">économie : ${fmt(res.mensualite - res.mensualitePhase2)}/mois</div>`
          : `<div class="kpi-sub">dont assurance : ${fmt(res.mensualiteAssurance)}</div>`
        }
      </div>
      <div class="kpi-card kpi-card--accent">
        <div class="kpi-label">TAEG global</div>
        <div class="kpi-value kpi-value--mono">${fmtPct(res.taeg)}</div>
        <div class="kpi-sub">toutes lignes de prêt + assurance</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Coût crédit</div>
        <div class="kpi-value kpi-value--red">${fmt(res.coutCredit)}</div>
        <div class="kpi-sub">intérêts + assurance</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Valeur estimée</div>
        <div class="kpi-value kpi-value--green">${fmt(res.valeurBienTerme)}</div>
        <div class="kpi-sub">dans ${duree} ans à ${fmtPct(tauxApprec)}/an</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Plus-value nette</div>
        <div class="kpi-value ${pvClass}">${res.plusValueNette >= 0 ? '+' : ''}${fmt(res.plusValueNette)}</div>
        <div class="kpi-sub">valeur − coût total op.</div>
      </div>`;
  }

  function renderKPIs(res) {
    document.getElementById('kpis').innerHTML = `<div class="kpis">${_kpiHTML(res, 'a')}</div>`;
  }

  function onInput() {
    const pA = lireParams('a');
    if (pA.capital <= 0 || pA.duree < 1) return;
    const resA = calcSimulation(pA);
    if (!resA) return;

    if (scenarioBActif) {
      const pB = lireParams('b');
      if (pB.capital <= 0 || pB.duree < 1) return;
      const resB = calcSimulation(pB);
      if (!resB) return;
      updateCapitalDisplay('a', pA);
      updateCapitalDisplay('b', pB);
      refreshTrancheDerivedValues('a');
      refreshTrancheDerivedValues('b');
      document.getElementById('kpis').innerHTML = `
        <div class="comparison-grid">
          <div>
            <div class="scenario-label scenario-a-label">Scénario A</div>
            <div class="kpis">${_kpiHTML(resA, 'a')}</div>
          </div>
          <div>
            <div class="scenario-label scenario-b-label">Scénario B</div>
            <div class="kpis">${_kpiHTML(resB, 'b')}</div>
          </div>
        </div>`;
      renderGraphiquePrincipal(resA, resB);
      renderGraphiqueSecondaire(resA);
      renderDonut(resA);
      renderRecapFrais(pA);
      renderRecapFinancement(pA, resA);
      renderTableau(resA.amortissement, pA.duree);
    } else {
      updateCapitalDisplay('a', pA);
      refreshTrancheDerivedValues('a');
      renderKPIs(resA);
      renderGraphiquePrincipal(resA, null);
      renderGraphiqueSecondaire(resA);
      renderDonut(resA);
      renderRecapFrais(pA);
      renderRecapFinancement(pA, resA);
      renderTableau(resA.amortissement, pA.duree);
    }
  }

  function renderGraphiquePrincipal(res, resB) {
    const ctx = document.getElementById('chart-principal').getContext('2d');

    let titleBase, cross = '', datasets;

    if (modeChartPrincipal === 'gain') {
      titleBase = 'Gain net potentiel à la revente (hors apport)';
      datasets = [
        {
          label: 'Gain net' + (resB ? ' — A' : ''),
          data: res.gainNetReventeParMois,
          borderColor: '#5b80a8',
          backgroundColor: 'rgba(91,128,168,0.14)',
          fill: 'origin', tension: 0.3, borderWidth: 2, pointRadius: 0
        },
        {
          label: 'Seuil de rentabilité (0 €)',
          data: res.gainNetReventeParMois.map(() => 0),
          borderColor: 'rgba(193,101,47,.6)',
          borderDash: [4, 4],
          fill: false, tension: 0, borderWidth: 1.5, pointRadius: 0
        }
      ];
      if (resB) {
        datasets.push({
          label: 'Gain net — B',
          data: resB.gainNetReventeParMois,
          borderColor: '#c1652f',
          borderDash: [4, 2],
          fill: false, tension: 0.3, borderWidth: 2, pointRadius: 0
        });
      }
      if (res.moisRentabilite === 1) {
        cross = ' — ✓ Rentable dès le 1ᵉʳ mois';
      } else if (res.moisRentabilite) {
        cross = ` — Rentable à partir de l'an ${Math.ceil(res.moisRentabilite / 12)} (mois ${res.moisRentabilite})`;
      } else {
        cross = ' — Pas encore rentable sur la durée du prêt';
      }
    } else {
      titleBase = 'Capital restant dû vs Valeur du bien';
      datasets = [
        {
          label: 'Capital restant dû' + (resB ? ' — A' : ''),
          data: res.capitalRestantParMois,
          borderColor: '#5b80a8',
          backgroundColor: 'rgba(91,128,168,0.10)',
          fill: true, tension: 0.3, borderWidth: 2, pointRadius: 0
        },
        {
          label: 'Valeur du bien' + (resB ? ' — A' : ''),
          data: res.valeurBienParMois,
          borderColor: '#71956b',
          borderDash: [6, 3],
          fill: false, tension: 0.3, borderWidth: 2, pointRadius: 0
        }
      ];
      if (resB) {
        datasets.push({
          label: 'Capital restant dû — B',
          data: resB.capitalRestantParMois,
          borderColor: '#c1652f',
          borderDash: [4, 2],
          fill: false, tension: 0.3, borderWidth: 2, pointRadius: 0
        });
        datasets.push({
          label: 'Valeur du bien — B',
          data: resB.valeurBienParMois,
          borderColor: '#9b6fa3',
          borderDash: [6, 3],
          fill: false, tension: 0.3, borderWidth: 2, pointRadius: 0
        });
      }
      if (res.moisCroisement === 1) {
        cross = ' — ✓ Bien déjà supérieur à la dette';
      } else if (res.moisCroisement) {
        cross = ` — Croisement : An ${Math.ceil(res.moisCroisement / 12)}, mois ${res.moisCroisement}`;
      }
    }

    const data = { labels: res.labelsParMois, datasets };

    const options = {
      responsive: true, maintainAspectRatio: true,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } },
        tooltip: {
          callbacks: {
            label: c => ` ${c.dataset.label} : ${new Intl.NumberFormat('fr-FR').format(c.parsed.y)} €`
          }
        }
      },
      scales: {
        x: { ticks: { maxTicksLimit: 10, font: { size: 10 } }, grid: { display: false } },
        y: {
          ticks: {
            font: { size: 10 },
            callback: v => new Intl.NumberFormat('fr-FR', { notation: 'compact' }).format(v) + ' €'
          }
        }
      }
    };

    if (!chartPrincipal) {
      chartPrincipal = new Chart(ctx, { type: 'line', data, options });
    } else {
      chartPrincipal.data = data;
      chartPrincipal.update();
    }

    const titleEl = document.getElementById('title-principal');
    if (titleEl) titleEl.textContent = titleBase + cross;
  }

  function toggleGraphiquePrincipalMode(mode) {
    modeChartPrincipal = mode;
    document.getElementById('btn-principal-gain').classList.toggle('active', mode === 'gain');
    document.getElementById('btn-principal-capital').classList.toggle('active', mode === 'capital');
    if (chartPrincipal) { chartPrincipal.destroy(); chartPrincipal = null; }
    onInput();
  }
  function renderGraphiqueSecondaire(res) {
  const ctx = document.getElementById('chart-secondaire').getContext('2d');
  const newType = modeGraphique === 'A' ? 'bar' : 'line';

  let data;
  if (modeGraphique === 'A') {
    data = {
      labels: res.labelsAns,
      datasets: [
        {
          label: 'Capital remboursé',
          data: res.capitalParAn,
          backgroundColor: 'rgba(91,128,168,0.85)',
          stack: 'stack'
        },
        {
          label: 'Intérêts payés',
          data: res.interetsParAn,
          backgroundColor: 'rgba(177,80,63,0.75)',
          stack: 'stack'
        }
      ]
    };
  } else {
    data = {
      labels: res.labelsAns,
      datasets: [
        {
          label: 'Capital cumulé',
          data: res.capitalCumule,
          borderColor: '#5b80a8',
          backgroundColor: 'rgba(91,128,168,0.14)',
          fill: true, tension: 0.3, borderWidth: 2, pointRadius: 0
        },
        {
          label: 'Intérêts cumulés',
          data: res.interetsCumules,
          borderColor: '#b1503f',
          backgroundColor: 'rgba(177,80,63,0.10)',
          fill: true, tension: 0.3, borderWidth: 2, pointRadius: 0
        }
      ]
    };
  }

  const options = {
    responsive: true, maintainAspectRatio: true,
    plugins: {
      legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } },
      tooltip: {
        callbacks: {
          label: c => ` ${c.dataset.label} : ${new Intl.NumberFormat('fr-FR').format(c.parsed.y)} €`
        }
      }
    },
    scales: {
      x: { stacked: modeGraphique === 'A', ticks: { font: { size: 10 } }, grid: { display: false } },
      y: {
        stacked: modeGraphique === 'A',
        ticks: {
          font: { size: 10 },
          callback: v => new Intl.NumberFormat('fr-FR', { notation: 'compact' }).format(v) + ' €'
        }
      }
    }
  };

  if (!chartSecondaire || chartSecondaire.config.type !== newType) {
    if (chartSecondaire) chartSecondaire.destroy();
    chartSecondaire = new Chart(ctx, { type: newType, data, options });
  } else {
    chartSecondaire.data = data;
    chartSecondaire.update();
  }
}

function toggleGraphiqueMode(mode) {
  modeGraphique = mode;
  document.getElementById('btn-mode-a').classList.toggle('active', mode === 'A');
  document.getElementById('btn-mode-b').classList.toggle('active', mode === 'B');
  if (chartSecondaire) { chartSecondaire.destroy(); chartSecondaire = null; }
  onInput();
}
  function renderDonut(res) {
  const ctx = document.getElementById('chart-donut').getContext('2d');
  const pA = lireParams('a');
  const capitalTotal = res.amortissement.reduce((s, r) => s + r.capital, 0);
  const fraisTotal = res.fraisNotaire + pA.fraisDossier + pA.fraisGarantie;

  const labels = ['Capital', 'Intérêts', 'Assurance', 'Frais'];
  const values = [Math.round(capitalTotal), res.interetsTotaux, res.assuranceTotale, Math.round(fraisTotal)];
  const colors = ['#5b80a8', '#b1503f', '#c1652f', '#71956b'];
  if (pA.travaux > 0) {
    labels.push('Travaux');
    values.push(Math.round(pA.travaux));
    colors.push('#9b6fa3');
  }

  const data = {
    labels,
    datasets: [{
      data: values,
      backgroundColor: colors,
      borderWidth: 2, borderColor: '#f6efe0'
    }]
  };

  const options = {
    responsive: true, maintainAspectRatio: true,
    cutout: '62%',
    plugins: {
      legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } },
      tooltip: {
        callbacks: {
          label: c => {
            const total = c.dataset.data.reduce((a, b) => a + b, 0);
            const pct = ((c.parsed / total) * 100).toFixed(1);
            return ` ${c.label} : ${new Intl.NumberFormat('fr-FR').format(c.parsed)} € (${pct} %)`;
          }
        }
      }
    }
  };

  if (!chartDonut) {
    chartDonut = new Chart(ctx, { type: 'doughnut', data, options });
  } else {
    chartDonut.data = data;
    chartDonut.update();
  }
}

  function renderRecapFrais(p) {
    const el = document.getElementById('recap-frais');
    if (!el) return;
    const prix = p.prixProjet || 1;
    const lignes = [
      { label: `Frais de notaire (${fmtPct(p.fraisNotairePct)} du prix)`, montant: p.fraisNotaire },
      { label: 'Frais de dossier', montant: p.fraisDossier },
      { label: `Frais de garantie (${fmtPct(p.tauxGarantie)} du capital financé)`, montant: p.fraisGarantie }
    ];
    const totalFrais = lignes.reduce((s, l) => s + l.montant, 0);
    const travaux = p.travaux || 0;
    const totalProjet = prix + totalFrais + travaux;
    const rows = lignes.map(l => `<tr>
      <td>${l.label}</td>
      <td>${fmtPct(l.montant / prix * 100)}</td>
      <td>${fmt(l.montant)}</td>
    </tr>`).join('');
    const travauxRow = travaux > 0 ? `<tr>
      <td>Travaux</td>
      <td>${fmtPct(travaux / prix * 100)}</td>
      <td>${fmt(travaux)}</td>
    </tr>` : '';
    el.innerHTML = `<table><thead><tr>
      <th>Poste</th><th>% du prix du bien</th><th>Montant</th>
    </tr></thead><tbody>
      <tr><td><strong>Prix du bien</strong></td><td><strong>${fmtPct(100)}</strong></td><td><strong>${fmt(prix)}</strong></td></tr>
      ${rows}
      ${travauxRow}
      <tr><td>Total des frais</td><td>${fmtPct(totalFrais / prix * 100)}</td><td>${fmt(totalFrais)}</td></tr>
      <tr class="recap-total"><td><strong>Total : Prix du projet</strong></td><td><strong>${fmtPct(totalProjet / prix * 100)}</strong></td><td><strong>${fmt(totalProjet)}</strong></td></tr>
    </tbody></table>`;
  }

  function renderRecapFinancement(p, res) {
    const el = document.getElementById('recap-financement');
    if (!el) return;
    const tranches = p.tranches || [];
    const totalEmprunte = tranches.reduce((s, t) => s + (t.montant || 0), 0);
    const totalProjet = p.apport + totalEmprunte;
    const rows = tranches.map(t => `<tr>
      <td>${t.label}</td>
      <td>${t.isPTZ ? '0 % (PTZ)' : fmtPct(t.taux)}</td>
      <td>${t.duree} ans</td>
      <td>${fmt(t.montant || 0)}</td>
    </tr>`).join('');
    el.innerHTML = `<table><thead><tr>
      <th>Source</th><th>Taux</th><th>Durée</th><th>Montant</th>
    </tr></thead><tbody>
      <tr><td><strong>Apport personnel</strong></td><td>—</td><td>—</td><td><strong>${fmt(p.apport)}</strong></td></tr>
      ${rows}
      <tr class="recap-total"><td><strong>Total : Prix du projet</strong></td><td><strong>${fmtPct(res.taeg)}</strong><br><span style="font-size:9px;text-transform:uppercase;letter-spacing:.06em;opacity:.75">TAEG global</span></td><td>—</td><td><strong>${fmt(totalProjet)}</strong></td></tr>
    </tbody></table>`;
  }

  function renderTableau(rows, duree) {
  const hasPTZ = rows.some(r => r.ptz > 0);

  const ptzTh = hasPTZ ? '<th>PTZ</th>' : '';
  const headers = `<tr>
    <th>${modeTableau === 'mois' ? 'Mois' : 'Année'}</th>
    <th>Mensualité</th>
    <th>Capital</th>
    <th>Intérêts</th>
    <th>Assurance</th>
    ${ptzTh}
    <th>Capital restant</th>
    <th>Valeur bien</th>
  </tr>`;

  let bodyRows;
  if (modeTableau === 'mois') {
    bodyRows = rows.map(r => {
      const ptzTd = hasPTZ ? `<td class="col-assurance">${fmt(r.ptz)}</td>` : '';
      return `<tr>
        <td>${r.mois}</td>
        <td>${fmt(r.mensualite)}</td>
        <td class="col-capital">${fmt(r.capital)}</td>
        <td class="col-interets">${fmt(r.interets)}</td>
        <td class="col-assurance">${fmt(r.assurance)}</td>
        ${ptzTd}
        <td>${fmt(r.capitalRestant)}</td>
        <td class="col-valeur">${fmt(r.valeurBien)}</td>
      </tr>`;
    }).join('');
  } else {
    const years = [];
    for (let an = 1; an <= (duree || 20); an++) {
      const anRows = rows.filter(r => r.annee === an);
      if (!anRows.length) continue;
      years.push({
        annee:        an,
        mensualite:   anRows[0].mensualite,
        capital:      anRows.reduce((s, r) => s + r.capital,   0),
        interets:     anRows.reduce((s, r) => s + r.interets,  0),
        assurance:    anRows.reduce((s, r) => s + r.assurance, 0),
        ptz:          anRows.reduce((s, r) => s + r.ptz,       0),
        capitalRestant: anRows[anRows.length - 1].capitalRestant,
        valeurBien:   anRows[anRows.length - 1].valeurBien
      });
    }
    bodyRows = years.map(y => {
      const ptzTd = hasPTZ ? `<td class="col-assurance">${fmt(y.ptz)}</td>` : '';
      return `<tr>
        <td>An ${y.annee}</td>
        <td>${fmt(y.mensualite)}/mois</td>
        <td class="col-capital">${fmt(y.capital)}</td>
        <td class="col-interets">${fmt(y.interets)}</td>
        <td class="col-assurance">${fmt(y.assurance)}</td>
        ${ptzTd}
        <td>${fmt(y.capitalRestant)}</td>
        <td class="col-valeur">${fmt(y.valeurBien)}</td>
      </tr>`;
    }).join('');
  }

  document.getElementById('tableau').innerHTML =
    `<table><thead>${headers}</thead><tbody>${bodyRows}</tbody></table>`;
}

function toggleTableauMode(mode) {
  modeTableau = mode;
  document.getElementById('btn-t-mois').classList.toggle('active', mode === 'mois');
  document.getElementById('btn-t-an').classList.toggle('active', mode === 'annee');
  onInput();
}
  function toggleScenarioB() {
  scenarioBActif = !scenarioBActif;
  document.getElementById('sidebar-b').style.display = scenarioBActif ? 'flex' : 'none';

  if (scenarioBActif) {
    // Pré-remplir B avec les valeurs de A
    const ids = ['prix-projet','assurance','apport','notaire',
                 'dossier','garantie-pct','differe-mois',
                 'travaux-m2','travaux-prix-m2','travaux-total','apprec'];
    ids.forEach(id => {
      const src = document.getElementById(`a-${id}`);
      const dst = document.getElementById(`b-${id}`);
      if (src && dst) dst.value = src.value;
    });
    ['differe-type','type-projet'].forEach(id => {
      const src = document.getElementById(`a-${id}`);
      const dst = document.getElementById(`b-${id}`);
      if (src && dst) dst.value = src.value;
    });
    // Copy tranches from A to B
    setTranches('b', JSON.parse(JSON.stringify(tranchesA)));
    renderTranchesUI('b');
    // Apply type presets (notaire badge etc) without reiniting tranches
    const type = document.getElementById('b-type-projet')?.value || 'ancien';
    const pr = PRESETS[type] || PRESETS.ancien;
    const notaireEl = document.getElementById('b-notaire');
    if (notaireEl) { notaireEl.min = pr.notaireMin; notaireEl.max = pr.notaireMax; notaireEl.value = pr.notaire; }
    const badgeEl = document.getElementById('b-notaire-badge');
    if (badgeEl) badgeEl.textContent = pr.notaireBadge;
    const travauxEl = document.getElementById('b-travaux-section');
    if (travauxEl) travauxEl.style.display = pr.travaux ? 'block' : 'none';
  } else {
    [chartPrincipal, chartSecondaire, chartDonut].forEach(c => { if (c) c.destroy(); });
    chartPrincipal = null; chartSecondaire = null; chartDonut = null;
  }
  onInput();
}
