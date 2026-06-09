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
