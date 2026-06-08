// Bootstrap de l'application : sélecteur de mode, init au chargement.

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
