// Bootstrap de l'application : sélecteur de mode, init au chargement.

let currentMode = 'credit';

function switchMode(mode) {
  currentMode = mode;
  const creditEl  = document.getElementById('app-credit');
  const locatifEl = document.getElementById('locatif-mode');
  if (creditEl)  creditEl.style.display  = mode === 'credit'  ? '' : 'none';
  if (locatifEl) locatifEl.style.display = mode === 'locatif' ? '' : 'none';

  document.querySelectorAll('.mode-tab').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.mode === mode);
  });

  if (mode === 'locatif') mountLocatif();
  if (mode === 'credit')  onInput();
}

const PARAMS_COLLAPSED_KEY = 'simulateur_params_collapsed';

function toggleSidebarGroup(groupEl) {
  groupEl.classList.toggle('collapsed');
}

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
  switchMode('credit');
}

initApp();
