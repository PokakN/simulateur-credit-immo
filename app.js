// Bootstrap de l'application : sélecteur de mode, init au chargement.

let currentMode = 'credit';

function switchMode(mode) {
  if (mode === currentMode) return;
  currentMode = mode;
  document.querySelectorAll('.mode-btn').forEach(b => b.classList.toggle('active', b.dataset.mode === mode));
}

const PARAMS_COLLAPSED_KEY = 'simulateur_params_collapsed';

function toggleParamsSection() {
  const section = document.getElementById('params-section-a');
  if (!section) return;
  const collapsed = section.classList.toggle('collapsed');
  localStorage.setItem(PARAMS_COLLAPSED_KEY, collapsed ? '1' : '0');
  section.querySelector('.params-toggle').setAttribute('aria-expanded', collapsed ? 'false' : 'true');
}

function restoreParamsSectionState() {
  const section = document.getElementById('params-section-a');
  if (!section) return;
  if (localStorage.getItem(PARAMS_COLLAPSED_KEY) === '1') {
    section.classList.add('collapsed');
    section.querySelector('.params-toggle').setAttribute('aria-expanded', 'false');
  }
}

function initApp() {
  const mastheadDateEl = document.getElementById('masthead-date');
  if (mastheadDateEl) mastheadDateEl.textContent = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  restoreParamsSectionState();
  if (tranchesA.length === 0) {
    setTranches('a', [{ id: 'principal', label: 'Prêt principal', isPrincipal: true, isPTZ: false, taux: 3.40, duree: 20 }]);
  }
  onTypeChange('a');
}

initApp();
