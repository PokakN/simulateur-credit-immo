// Bootstrap de l'application : sélecteur de mode, init au chargement.

let currentMode = 'credit';

function switchMode(mode) {
  if (mode === currentMode) return;
  currentMode = mode;
  document.querySelectorAll('.mode-btn').forEach(b => b.classList.toggle('active', b.dataset.mode === mode));
}

function initApp() {
  const mastheadDateEl = document.getElementById('masthead-date');
  if (mastheadDateEl) mastheadDateEl.textContent = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  // Start with default tranches for Ancien
  if (tranchesA.length === 0) {
    setTranches('a', [{ id: 'principal', label: 'Prêt principal', isPrincipal: true, isPTZ: false, taux: 3.40, duree: 20 }]);
  }
  onTypeChange('a');
}

initApp();
