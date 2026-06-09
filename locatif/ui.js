// Rendu de l'interface du mode Investissement locatif (paramètres, résultats, graphiques, tableaux).

// ── Chart instances ───────────────────────────────────────────────────────
let locChartHisto = null;
let locChartCashflow = null;
let locChartPatrimoine = null;
let locChartDonut = null;

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
    <div class="type-segment" id="loc-type-segment">
      <button type="button" class="type-seg-btn" data-type="ancien" onclick="selectTypeProjetLocatif('ancien')">Ancien</button>
      <button type="button" class="type-seg-btn" data-type="neuf" onclick="selectTypeProjetLocatif('neuf')">Neuf</button>
      <button type="button" class="type-seg-btn" data-type="vefa" onclick="selectTypeProjetLocatif('vefa')">VEFA</button>
    </div>
    <select id="loc-type-projet" style="display:none" onchange="onTypeChangeLocatif()">
      <option value="ancien">Ancien</option>
      <option value="neuf">Neuf</option>
      <option value="vefa">VEFA</option>
    </select>
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
    <div class="sidebar-field">
      <label>Taux assurance annuel (%)</label>
      <input type="number" id="loc-assurance" value="0.33" step="0.01" min="0" oninput="onInputLocatif()">
    </div>
    <div id="loc-tranches-container"></div>
    <button class="btn-add-tranche" onclick="addTrancheLoc()">+ Ajouter un prêt</button>
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
</div>

<div class="sidebar-group" id="loc-group-save">
  <div class="sidebar-group-body">
    <label>Nom du projet <input type="text" id="loc-projet-nom" placeholder="Ex : Appart Lyon T2"></label>
    <button onclick="sauvegarderProjetLocatif()">Sauvegarder ce projet</button>
    <button onclick="openProjetsPanel()">Projets sauvegardés</button>
  </div>
</div>`;
}

function renderTranchesLoc() {
  const container = document.getElementById('loc-tranches-container');
  if (!container) return;
  container.innerHTML = tranchesLoc.map((t, i) => {
    const isPrincipal = t.isPrincipal;
    const isPTZ = t.isPTZ;
    const delBtn = !isPrincipal && !isPTZ
      ? `<button class="tranche-del" onclick="removeTrancheLoc('${t.id}')" title="Supprimer">×</button>` : '';

    if (isPrincipal) {
      return `<div class="tranche-card" id="loc-tranche-${t.id}">
  <div class="tranche-header"><span class="tranche-label-text">${t.label}</span></div>
  <div class="sidebar-field" style="margin-bottom:5px">
    <label>Taux (%)</label>
    <input type="number" value="${t.taux}" min="0" max="30" step="0.01" oninput="updateTrancheLoc('${t.id}','taux',this.value)">
  </div>
  <div class="sidebar-field" style="margin-bottom:5px">
    <label>Durée (ans)</label>
    <input type="number" value="${t.duree}" min="1" max="30" step="1" oninput="updateTrancheLoc('${t.id}','duree',this.value)">
  </div>
  <div class="tranche-montant-calc" id="loc-tranche-montant-${t.id}">—<span class="tranche-badge">calculé</span></div>
</div>`;
    } else if (isPTZ) {
      const ptzMens = (t.montant||0) > 0 ? Math.round((t.montant||0)/(t.duree*12)) : 0;
      return `<div class="tranche-card" id="loc-tranche-${t.id}">
  <div class="tranche-header"><span class="tranche-label-text">${t.label}<span class="tranche-badge">0 % · ${t.duree} ans fixe</span></span></div>
  <div class="sidebar-field" style="margin-bottom:5px">
    <label>Montant (€)</label>
    <input type="number" value="${t.montant||0}" min="0" step="1000" oninput="updateTrancheLoc('${t.id}','montant',this.value)">
  </div>
  <div class="tranche-info" id="loc-tranche-info-${t.id}" style="${ptzMens>0?'':'display:none'}">${ptzMens>0?fmt(ptzMens)+'/mois pendant '+t.duree+' ans · puis libéré':''}</div>
</div>`;
    } else {
      return `<div class="tranche-card" id="loc-tranche-${t.id}">
  <div class="tranche-header">
    <input type="text" value="${t.label}" style="background:transparent;border:none;border-bottom:1px solid var(--ink-line);color:var(--parchment);font-family:var(--font-display);font-style:italic;font-size:15px;font-weight:500;width:calc(100% - 24px);outline:none;padding:2px 0" oninput="updateTrancheLoc('${t.id}','label',this.value)">
    ${delBtn}
  </div>
  <div class="sidebar-field" style="margin-bottom:5px">
    <label>Taux (%)</label>
    <input type="number" value="${t.taux}" min="0" max="30" step="0.01" oninput="updateTrancheLoc('${t.id}','taux',this.value)">
  </div>
  <div class="sidebar-field" style="margin-bottom:5px">
    <label>Durée (ans)</label>
    <input type="number" value="${t.duree}" min="1" max="30" step="1" oninput="updateTrancheLoc('${t.id}','duree',this.value)">
  </div>
  <div class="sidebar-field" style="margin-bottom:5px">
    <label>Montant (€)</label>
    <input type="number" value="${t.montant||0}" min="0" step="1000" oninput="updateTrancheLoc('${t.id}','montant',this.value)">
  </div>
</div>`;
    }
  }).join('');
  refreshTranchesLocDerived();
}

function refreshTranchesLocDerived() {
  const prix     = parseFloat(document.getElementById('loc-prix-projet')?.value) || 0;
  const travaux  = parseFloat(document.getElementById('loc-travaux-total')?.value) || 0;
  const mobilier = parseFloat(document.getElementById('loc-mobilier')?.value) || 0;
  const notPct   = parseFloat(document.getElementById('loc-notaire')?.value) || 0;
  const agence   = parseFloat(document.getElementById('loc-agence')?.value) || 0;
  const garPct   = parseFloat(document.getElementById('loc-garantie-pct')?.value) || 0;
  const dossier  = parseFloat(document.getElementById('loc-dossier')?.value) || 0;
  const apport   = parseFloat(document.getElementById('loc-apport')?.value) || 0;

  const fraisNotaire  = prix * notPct / 100;
  const fraisGarantie = prix * garPct / 100;
  const capitalTotal  = prix + travaux + mobilier + fraisNotaire + agence + fraisGarantie + dossier - apport;
  const autresMontant = tranchesLoc.filter(t => !t.isPrincipal).reduce((s, t) => s + (t.montant || 0), 0);
  const principal     = Math.max(0, capitalTotal - autresMontant);

  const principalTranche = tranchesLoc.find(t => t.isPrincipal);
  if (principalTranche) principalTranche.montant = principal;

  const el = document.getElementById(`loc-tranche-montant-principal`);
  if (el) el.innerHTML = `${fmt(principal)}<span class="tranche-badge">calculé</span>`;
}

function updateTrancheLoc(id, field, value) {
  const t = tranchesLoc.find(t => t.id === id);
  if (!t) return;
  if (field === 'label') t[field] = value;
  else if (field === 'duree') t[field] = parseInt(value) || 0;
  else t[field] = parseFloat(value) || 0;
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

function selectTypeProjetLocatif(type) {
  const sel = document.getElementById('loc-type-projet');
  if (sel) sel.value = type;
  onTypeChangeLocatif();
}

function syncTypeSegmentLoc(type) {
  const seg = document.getElementById('loc-type-segment');
  if (!seg) return;
  seg.querySelectorAll('.type-seg-btn').forEach(b => b.classList.toggle('active', b.dataset.type === type));
}

function onTypeChangeLocatif() {
  const type = document.getElementById('loc-type-projet')?.value || 'ancien';
  syncTypeSegmentLoc(type);
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

function renderKPIsLocatif(r) {
  const cfNet = r.cashFlowDetail.net;
  const cfLabel = cfNet >= 0 ? 'cash-flow positif' : 'effort d\'épargne';
  const cfClass = cfNet >= 0 ? 'kpi-pos' : 'kpi-neg';

  document.getElementById('loc-results').innerHTML = `
<div id="loc-kpis" class="kpis kpis-grid">
  <div class="kpi-card kpi-card--accent">
    <div class="kpi-label">Cash-flow net</div>
    <div class="kpi-value ${cfClass}">${fmt(Math.abs(cfNet))}/mois</div>
    <div class="kpi-sub">${cfLabel}</div>
  </div>
  <div class="kpi-card">
    <div class="kpi-label">Mensualité crédit</div>
    <div class="kpi-value kpi-value--mono">${fmt(r.mensualite)}/mois</div>
    <div class="kpi-sub">assurance incluse</div>
  </div>
  <div class="kpi-card">
    <div class="kpi-label">Patrimoine net (an ${r.horizonAns})</div>
    <div class="kpi-value kpi-value--green">${fmt(r.patrimoineNetHorizon)}</div>
    <div class="kpi-sub">valeur − dette restante</div>
  </div>
  <div class="kpi-card">
    <div class="kpi-label">Impôt annuel estimé</div>
    <div class="kpi-value kpi-value--mono">${fmt(r.fiscalDetail[0]?.fiscaliteAnnuelle || 0)}</div>
    <div class="kpi-sub">dont PS ${fmt(r.fiscalDetail[0]?.prelevementsSociaux || 0)}</div>
  </div>
  <div class="kpi-card">
    <div class="kpi-label">TAEG</div>
    <div class="kpi-value kpi-value--mono">${fmtPct(r.taeg)}</div>
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
    <div class="chart-canvas-wrap"><canvas id="loc-chart-histo" height="120"></canvas></div>
    <div class="horizon-panel">
      <div class="horizon-label">Horizon</div>
      <div id="loc-horizon-big">${r.horizonAns} ans</div>
    </div>
  </div>
</div>

<div id="loc-rendements" class="rendements-grid rendements-grid--4">
  <div class="rdt-card"><div class="rdt-label">Rendement brut</div><div class="rdt-value">${fmtPct(r.rendementBrut)}</div><div class="rdt-desc">Loyers bruts / coût acquisition</div></div>
  <div class="rdt-card"><div class="rdt-label">Rendement net</div><div class="rdt-value">${fmtPct(r.rendementNet)}</div><div class="rdt-desc">Après charges, avant impôts</div></div>
  <div class="rdt-card"><div class="rdt-label">Rendement net-net</div><div class="rdt-value">${fmtPct(r.rendementNetNet)}</div><div class="rdt-desc">Après charges et fiscalité</div></div>
  <div class="rdt-card ${r.cashOnCash >= 0 ? '' : 'rdt-card--neg'}"><div class="rdt-label">Cash-on-cash</div><div class="rdt-value ${r.cashOnCash >= 0 ? '' : 'rdt-value--neg'}">${r.cashOnCash >= 0 ? '+' : ''}${fmtPct(r.cashOnCash)}</div><div class="rdt-desc">Cash-flow annuel / apport</div></div>
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
            order: 0
          }
        ]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { labels: { font: { size: 10 } } },
          tooltip: { callbacks: {
            label: c => ` ${c.dataset.label} : ${new Intl.NumberFormat('fr-FR').format(Math.round(c.parsed.y))} €`
          }}
        },
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
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: {
            label: c => ` Cash-flow net : ${new Intl.NumberFormat('fr-FR').format(Math.round(c.parsed.y))} €`
          }}
        },
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
        plugins: {
          legend: { labels: { font: { size: 9 } } },
          tooltip: { callbacks: {
            label: c => ` ${c.dataset.label} : ${new Intl.NumberFormat('fr-FR').format(Math.round(c.parsed.y))} €`
          }}
        },
        scales: {
          x: { ticks: { font: { size: 9 } } },
          y: { ticks: { font: { size: 9 },
            callback: v => v >= 1000 ? (v/1000).toFixed(0)+'k €' : v+'€' } }
        }
      }
    });
  }
}

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

function renderTableauFiscalAnnuel(r) {
  const el = document.getElementById('loc-fiscal-annuel-section');
  if (!el) return;

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
  <div class="section-block-title">Évolution annuelle — ${regimeLabel()}</div>
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

function regimeLabel() {
  const sel = document.getElementById('loc-regime-fiscal');
  const map = { lmnp_reel: 'LMNP réel', nu_micro: 'Location nue micro-foncier', nu_reel: 'Location nue réel' };
  return map[sel?.value] || '';
}

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
    <div class="fd-row indent"><span>Amort. bien (${fmtPct(3)} / 33 ans)</span><span>−${fmtRaw(fd.amortissementFiscal - Math.round(p.mobilier*0.20))}</span></div>
    ${p.mobilier > 0 ? `<div class="fd-row indent"><span>Amort. mobilier (20% / 5 ans)</span><span>−${fmtRaw(Math.round(p.mobilier*0.20))}</span></div>` : ''}
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
        <span style="font-family:var(--font-mono);font-weight:700;color:${fd.baseImposable > 0 ? 'var(--rust)' : 'var(--sage)'}">
          ${fd.baseImposable > 0 ? '+' : ''}${fmtRaw(fd.baseImposable)}
        </span>
      </div>
      <div class="fd-row"><span>Impôt sur le revenu (${p.tmi} %)</span><span style="font-family:var(--font-mono);font-weight:600;color:${fd.impots>0?'var(--brick)':'var(--sage)'}">${fd.impots > 0 ? fmtRaw(fd.impots) : '0 € ✓'}</span></div>
      <div class="fd-row"><span>Prélèvements sociaux (17,2 %)</span><span style="font-family:var(--font-mono);font-weight:600">${fmtRaw(fd.prelevementsSociaux)}</span></div>
      ${avantageEstime > 0 ? `
      <div class="fd-row avantage-row">
        <span>Avantage fiscal annuel estimé</span>
        <span style="font-family:var(--font-mono);font-weight:700;color:var(--sage)">+${fmtRaw(Math.round(avantageEstime))}</span>
      </div>` : ''}
    </div>
    <div class="fiscal-donut-block">
      <div class="donut-title">Charge annuelle totale</div>
      <canvas id="loc-chart-donut" height="160"></canvas>
    </div>
  </div>
</div>`;

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
        plugins: {
          legend: { position: 'bottom', labels: { font: { size: 10 }, padding: 8 } },
          tooltip: { callbacks: {
            label: c => {
              const total = c.dataset.data.reduce((a, b) => a + b, 0);
              const pct = total > 0 ? (c.parsed * 100 / total).toFixed(1) : 0;
              return ` ${c.label} : ${new Intl.NumberFormat('fr-FR').format(Math.round(c.parsed))} € (${pct} %)`;
            }
          }}
        }
      }
    });
  }
}

function renderSidebarGroupSummariesLocatif() {
  function line(key, val) {
    return `<div class="sg-line"><span class="sg-key">${key ? key + ' ' : ''}</span><span class="sg-val">${val}</span></div>`;
  }
  function set(id, html) { const el = document.getElementById(id); if (el) el.innerHTML = html; }
  function gn(id) { return parseFloat(document.getElementById(id)?.value) || 0; }
  function gv(id) { return document.getElementById(id)?.value || ''; }
  function pct(v) { return fmtRaw(v) + ' %'; }

  const typeLabels = { ancien: 'Ancien', neuf: 'Neuf', vefa: 'VEFA' };
  set('loc-summary-projet',
    line('Type', typeLabels[gv('loc-type-projet')] || '—') +
    line('Prix', fmt(gn('loc-prix-projet'))) +
    line('Apport', fmt(gn('loc-apport')))
  );

  set('loc-summary-prix',
    line('Notaire', pct(gn('loc-notaire'))) +
    line('Agence', fmt(gn('loc-agence'))) +
    line('Dossier', fmt(gn('loc-dossier')))
  );

  const travauxTotal = gn('loc-travaux-total');
  set('loc-summary-travaux', travauxTotal > 0
    ? line('Travaux', fmt(travauxTotal)) + (gn('loc-mobilier') > 0 ? line('Mobilier', fmt(gn('loc-mobilier'))) : '')
    : line('', '—')
  );

  set('loc-summary-emprunts',
    line('Assurance', pct(gn('loc-assurance'))) +
    tranchesLoc.map(t =>
      line(t.label, t.isPTZ ? '0 % — ' + t.duree + ' ans' : pct(t.taux) + ' — ' + t.duree + ' ans')
    ).join('')
  );

  const differeMois = gn('loc-differe-mois');
  set('loc-summary-differe', differeMois > 0
    ? line('Durée', differeMois + ' mois') + line('Type', gv('loc-differe-type') === 'total' ? 'Total' : 'Partiel')
    : line('', '—')
  );

  set('loc-summary-revenus',
    line('Loyer', fmt(gn('loc-loyer')) + '/mois') +
    line('Vacance', pct(gn('loc-vacance')))
  );

  set('loc-summary-charges',
    line('Copro', fmt(gn('loc-charges-copro')) + '/an') +
    line('Foncière', fmt(gn('loc-taxe-fonciere')) + '/an')
  );

  const regimeMap = { lmnp_reel: 'LMNP réel', nu_micro: 'Micro-foncier', nu_reel: 'Nu réel' };
  set('loc-summary-fiscal',
    line('Régime', regimeMap[gv('loc-regime-fiscal')] || '—') +
    line('TMI', pct(gn('loc-tmi')))
  );

  set('loc-summary-valori', line('Appréciation', pct(gn('loc-apprec')) + ' / an'));
}

function onInputLocatif() {
  const p = lireParamsLocatif();
  const r = calcSimulationLocatif(p);
  if (!r) return;

  refreshTranchesLocDerived();
  renderSidebarGroupSummariesLocatif();
  renderKPIsLocatif(r);
  renderChartsLocatif(r);
  renderTablesLocatif(r, p);
  renderTableauFiscalAnnuel(r);
  renderFiscalDetailLocatif(r, p);
}

function mountLocatif() {
  // Create #loc-results first so renderKPIsLocatif can write to it
  const resultsPanel = document.getElementById('locatif-results');
  if (resultsPanel && !document.getElementById('loc-results')) {
    resultsPanel.innerHTML = '<div id="loc-results"></div>';
  }

  const panel = document.getElementById('locatif-params-panel');
  if (panel && !panel.querySelector('#loc-group-type')) {
    panel.innerHTML = buildLocatifSidebarHTML();
    syncTypeSegmentLoc('ancien');
    initTranchesLoc('ancien');
    renderTranchesLoc();
    onRegimeChangeLocatif();
  }

  onInputLocatif();
}
