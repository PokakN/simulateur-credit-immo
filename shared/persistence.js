// Sauvegarde/chargement des projets (localStorage) et notifications toast, partagés entre les modes.

const STORAGE_KEY = 'simulateur_projets';

function chargerProjets() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
  catch { return []; }
}

function sauvegarderProjets(projets) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projets));
}

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function sauvegarderProjet() {
  const nom = document.getElementById('projet-nom')?.value?.trim();
  if (!nom) { showToast('Entrez un nom pour le projet'); return; }

  const urlAnnonce = document.getElementById('projet-url')?.value?.trim() || '';
  const params = lireParams('a');
  const res = calcSimulation(params);

  const projet = {
    id: genId(),
    nom,
    urlAnnonce,
    typeProjet: params.typeProjet,
    date: new Date().toLocaleDateString('fr-FR'),
    mensualite: res ? res.mensualite : 0,
    params
  };

  const projets = chargerProjets();
  projets.unshift(projet);
  sauvegarderProjets(projets);
  renderProjetsList();
  document.getElementById('projet-nom').value = '';
  document.getElementById('projet-url').value = '';
  showToast(`Projet "${nom}" sauvegardé`);
}

function mettreAJourProjet(id) {
  const projets = chargerProjets();
  const idx = projets.findIndex(p => p.id === id);
  if (idx === -1) return;

  const nomSaisi = document.getElementById('projet-nom')?.value?.trim();
  const urlSaisie = document.getElementById('projet-url')?.value?.trim();
  const params = lireParams('a');
  const res = calcSimulation(params);
  const projet = projets[idx];

  projets[idx] = {
    ...projet,
    nom: nomSaisi || projet.nom,
    urlAnnonce: urlSaisie || projet.urlAnnonce,
    typeProjet: params.typeProjet,
    date: new Date().toLocaleDateString('fr-FR'),
    mensualite: res ? res.mensualite : 0,
    params
  };

  sauvegarderProjets(projets);
  renderProjetsList();
  document.getElementById('projet-nom').value = '';
  document.getElementById('projet-url').value = '';
  showToast(`Projet "${projets[idx].nom}" mis à jour`);
}

function chargerProjet(id) {
  const projets = chargerProjets();
  const projet = projets.find(p => p.id === id);
  if (!projet) return;

  const p = projet.params;
  const set = (suffix, val) => {
    const el = document.getElementById(`a-${suffix}`);
    if (el !== null && val !== undefined) el.value = val;
  };

  set('type-projet',    p.typeProjet  || 'ancien');
  set('prix-projet',    p.prixProjet);
  set('apport',         p.apport);
  set('assurance',      p.tauxAssurance);
  set('notaire',        p.fraisNotairePct);
  set('dossier',        p.fraisDossier);
  set('garantie-pct',   p.tauxGarantie ?? 1.5);
  set('differe-mois',   p.differeMois);
  set('travaux-m2',     0);
  set('travaux-prix-m2', 0);
  set('travaux-total',  p.travaux);
  set('apprec',         p.tauxApprec);

  const dtEl = document.getElementById('a-differe-type');
  if (dtEl) dtEl.value = p.differeType || 'partiel';

  // Restore tranches (with backward compat for old saved projects)
  if (p.tranches && Array.isArray(p.tranches) && p.tranches.length > 0) {
    setTranches('a', JSON.parse(JSON.stringify(p.tranches)));
  } else {
    const fallback = [{ id: 'principal', label: 'Prêt principal', isPrincipal: true, isPTZ: false, taux: p.tauxNominal ?? 3.40, duree: p.duree ?? 20 }];
    if ((p.ptzMontant || 0) > 0) fallback.push({ id: 'ptz', label: 'PTZ', isPrincipal: false, isPTZ: true, taux: 0, duree: p.ptzDuree ?? 10, montant: p.ptzMontant });
    setTranches('a', fallback);
  }

  closeProjetsPanel();
  onTypeChange('a');
  showToast(`Projet "${projet.nom}" chargé`);
}

function supprimerProjet(id) {
  const projets = chargerProjets().filter(p => p.id !== id);
  sauvegarderProjets(projets);
  renderProjetsList();
}

function exporterProjets() {
  const projets = chargerProjets();
  const blob = new Blob([JSON.stringify(projets, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'projets-immo.json';
  a.click();
  URL.revokeObjectURL(a.href);
}

function importerProjets(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const imported = JSON.parse(e.target.result);
      if (!Array.isArray(imported)) throw new Error('Format invalide');
      const existing = chargerProjets();
      const existingIds = new Set(existing.map(p => p.id));
      const newOnes = imported.filter(p => !existingIds.has(p.id));
      const ignores = imported.length - newOnes.length;
      sauvegarderProjets([...existing, ...newOnes]);
      renderProjetsList();
      if (newOnes.length === 0 && ignores > 0) {
        showToast(`Aucun nouveau projet : ${ignores} déjà présent(s)`);
      } else if (ignores > 0) {
        showToast(`${newOnes.length} projet(s) importé(s), ${ignores} déjà présent(s) (ignorés)`);
      } else {
        showToast(`${newOnes.length} projet(s) importé(s)`);
      }
    } catch {
      showToast('Erreur : fichier JSON invalide');
    }
  };
  reader.readAsText(file);
  event.target.value = '';
}

function renderProjetsList() {
  const projets = chargerProjets();
  const el = document.getElementById('projets-list');
  if (!el) return;
  if (!projets.length) {
    el.innerHTML = '<p style="font-family:var(--font-mono);color:var(--parchment-muted);font-size:12px;letter-spacing:.06em;text-transform:uppercase;text-align:center;padding:24px">Aucun projet sauvegardé</p>';
    return;
  }
  el.innerHTML = projets.map(p => `
    <div class="projet-card">
      <div class="projet-card-header">
        <span class="projet-card-name">${p.nom}</span>
        <span class="projet-card-type">${p.typeProjet || ''}</span>
      </div>
      <div class="projet-card-kpi">${fmt(p.mensualite)}/mois · ${p.date}</div>
      ${p.urlAnnonce ? `<div class="projet-card-url"><a href="${p.urlAnnonce}" target="_blank" rel="noopener">→ Voir l'annonce</a></div>` : ''}
      <div class="projet-card-actions">
        <button onclick="chargerProjet('${p.id}')">Charger</button>
        <button onclick="mettreAJourProjet('${p.id}')">Mettre à jour</button>
        <button onclick="supprimerProjet('${p.id}')" style="color:var(--brick);border-color:var(--brick)">Suppr.</button>
      </div>
    </div>`).join('');
}

function openProjetsPanel() {
  renderProjetsList();
  document.getElementById('projets-overlay').classList.add('open');
}

function closeProjetsPanel(event) {
  if (event && event.target !== document.getElementById('projets-overlay')) return;
  document.getElementById('projets-overlay').classList.remove('open');
}

function showToast(message) {
  const el = document.getElementById('toast');
  el.textContent = message;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 2500);
}
