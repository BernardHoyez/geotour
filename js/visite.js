// Mode "Visite" — migré de randonneur8. Navigation manuelle (◀/▶) d'un
// waypoint à l'autre avec narration TTS à la demande (le séquencement
// automatique avait été abandonné dans randonneur8 pour cause d'instabilité
// sur mobile — on reste donc ici aussi en mode manuel).

const elBtnModeVisite = document.getElementById('btn-mode-visite');
const elPanneauVisite = document.getElementById('panneau-visite');
const elBtnVisiteFermer = document.getElementById('btn-visite-fermer');
const elVisiteCompteur = document.getElementById('visite-compteur');
const elVisitePhotoConteneur = document.getElementById('visite-photo-conteneur');
const elVisiteNom = document.getElementById('visite-nom');
const elVisiteCommentaire = document.getElementById('visite-commentaire');
const elBtnVisitePrecedent = document.getElementById('btn-visite-precedent');
const elBtnVisiteSuivant = document.getElementById('btn-visite-suivant');
const elBtnVisiteLire = document.getElementById('btn-visite-lire');

let carteVisite = null;
let coucheTraceVisite = null;
let marqueursVisite = []; // un par waypoint, dans l'ordre de state.waypoints
let indexVisiteActuel = 0;

/**
 * Initialise la carte du Mode Visite (instance Leaflet séparée de la carte
 * principale). Ne dessine la trace/les marqueurs qu'une fois le conteneur
 * visible (le panneau est en `display:none` avant l'ouverture).
 */
function initVisiteMap() {
  if (carteVisite) return;
  carteVisite = creerCarteBase('carte-visite', { fond: elSelectFond ? elSelectFond.value : 'osm' });

  if (state.trackCoords.length > 1) {
    coucheTraceVisite = L.polyline(state.trackCoords, { color: '#175e48', weight: 3 }).addTo(carteVisite);
  }

  marqueursVisite = state.waypoints.map((wp) =>
    L.circleMarker([wp.lat, wp.lon], { radius: 6, color: '#175e48', fillColor: '#fff', fillOpacity: 1, weight: 2 }).addTo(
      carteVisite
    )
  );

  ajusterVueVisiteInitiale();
}

/**
 * Cadrage initial de la carte Visite. Correctif reporté depuis randonneur8 :
 * initVisiteMap() n'avait pas de repli fitBounds/setView quand
 * trackCoords.length <= 1 (waypoints sans trace continue, ex. créés via le
 * mode Créer) — flyTo plantait alors faute de vue initiale (carte grise).
 * Chaîne de repli : trace si dispo -> waypoints si dispo -> vue France.
 */
function ajusterVueVisiteInitiale() {
  if (state.trackCoords.length > 1) {
    carteVisite.fitBounds(state.trackCoords, { padding: [30, 30] });
    return;
  }
  if (state.waypoints.length > 1) {
    carteVisite.fitBounds(state.waypoints.map((wp) => [wp.lat, wp.lon]), { padding: [30, 30] });
    return;
  }
  if (state.waypoints.length === 1) {
    carteVisite.setView([state.waypoints[0].lat, state.waypoints[0].lon], 15);
    return;
  }
  carteVisite.setView([46.6, 2.4], 6);
}

function mettreEnValeurMarqueurActuel() {
  marqueursVisite.forEach((marqueur, i) => {
    marqueur.setStyle({
      color: i === indexVisiteActuel ? '#d66036' : '#175e48',
      radius: i === indexVisiteActuel ? 9 : 6,
    });
  });
}

/**
 * Affiche le waypoint à l'index donné : fiche (photo/nom/commentaire),
 * survol carte, mise en valeur du marqueur.
 */
function vShowSlide(index) {
  if (index < 0 || index >= state.waypoints.length) return;
  indexVisiteActuel = index;
  const waypoint = state.waypoints[index];

  elVisiteCompteur.textContent = `${index + 1} / ${state.waypoints.length}`;
  elVisiteNom.textContent = waypoint.name || 'Waypoint';
  elVisiteCommentaire.textContent = waypoint.comment || '';

  elVisitePhotoConteneur.innerHTML = '';
  if (waypoint.photoBlob) {
    const img = document.createElement('img');
    img.src = URL.createObjectURL(waypoint.photoBlob);
    elVisitePhotoConteneur.appendChild(img);
  }

  mettreEnValeurMarqueurActuel();

  // La vue initiale est déjà cadrée par ajusterVueVisiteInitiale() ; flyTo
  // est donc toujours sûr à ce stade (voir le correctif documenté ci-dessus).
  carteVisite.flyTo([waypoint.lat, waypoint.lon], Math.max(carteVisite.getZoom(), 16));

  arreterLecture();
  elBtnVisitePrecedent.disabled = index === 0;
  elBtnVisiteSuivant.disabled = index === state.waypoints.length - 1;
}

function lireWaypointActuel() {
  if (!('speechSynthesis' in window)) {
    elVisiteCommentaire.textContent += ' (lecture vocale non disponible sur cet appareil)';
    return;
  }
  const waypoint = state.waypoints[indexVisiteActuel];
  const texte = [waypoint.name, waypoint.comment].filter(Boolean).join('. ');
  if (!texte) return;

  const utterance = new SpeechSynthesisUtterance(texte);
  utterance.lang = 'fr-FR';
  utterance.onend = () => {
    elBtnVisiteLire.textContent = '🔊 Lire';
  };
  window.speechSynthesis.cancel(); // coupe une lecture précédente éventuelle
  window.speechSynthesis.speak(utterance);
  elBtnVisiteLire.textContent = '⏹ Arrêter';
}

function arreterLecture() {
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  elBtnVisiteLire.textContent = '🔊 Lire';
}

/**
 * Réinitialise le Mode Visite (à appeler quand state.waypoints/trackCoords
 * changent — nouvel import ou waypoint injecté) : la carte et les marqueurs
 * Visite seront reconstruits à la prochaine ouverture du panneau, pour ne
 * jamais rester désynchronisés avec les waypoints actuels.
 */
function reinitialiserVisitePourNouvelleTrace() {
  if (carteVisite) {
    carteVisite.remove();
    carteVisite = null;
  }
  coucheTraceVisite = null;
  marqueursVisite = [];
  indexVisiteActuel = 0;
}

elBtnModeVisite.addEventListener('click', () => {
  if (state.waypoints.length === 0) return;
  elPanneauVisite.hidden = false;
  setTimeout(() => {
    initVisiteMap();
    carteVisite.invalidateSize();
    vShowSlide(0);
  }, 0);
});

elBtnVisiteFermer.addEventListener('click', () => {
  arreterLecture();
  elPanneauVisite.hidden = true;
});

elBtnVisitePrecedent.addEventListener('click', () => vShowSlide(indexVisiteActuel - 1));
elBtnVisiteSuivant.addEventListener('click', () => vShowSlide(indexVisiteActuel + 1));

elBtnVisiteLire.addEventListener('click', () => {
  const enTrainDeLire = 'speechSynthesis' in window && window.speechSynthesis.speaking;
  if (enTrainDeLire) {
    arreterLecture();
  } else {
    lireWaypointActuel();
  }
});
