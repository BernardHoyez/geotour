// Contrôleur principal de la SPA geotour : bascule entre les écrans.

function changerEcran(nomMode) {
  document.querySelectorAll('.screen').forEach((el) => el.classList.remove('active'));
  const cible = document.getElementById('screen-' + nomMode);
  if (cible) cible.classList.add('active');
  state.mode = nomMode;

  const titres = { accueil: 'GeoTour', creer: 'Créer un waypoint', randonnee: 'Randonnée' };
  document.getElementById('app-title').textContent = titres[nomMode] || 'GeoTour';

  if (nomMode === 'randonnee' && typeof onEcranRandonneeAffiche === 'function') {
    onEcranRandonneeAffiche();
  }
}

document.querySelectorAll('.carte-mode').forEach((bouton) => {
  bouton.addEventListener('click', () => changerEcran(bouton.dataset.mode));
});

document.getElementById('btn-home').addEventListener('click', () => changerEcran('accueil'));

// Enregistrement du service worker (brise-cache)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js');
  });
}
