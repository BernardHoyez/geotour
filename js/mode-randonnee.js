// Mode "Randonnée" — migré de randonneur8.
// Cette première étape couvre le socle : import KMZ/KML/GPX, carte
// principale (fonds OSM/IGN Plan/IGN Ortho), affichage de la trace en
// "marching ants", marqueurs de waypoints avec popup photo, liste des
// waypoints synchronisée avec la carte.
//
// Restent à migrer dans une étape suivante : profil altimétrique D+/D-,
// mode Visite (TTS), export diaporama HTML, export "Sauvegarder la session
// en KMZ", export "Déploiement" (package zip).

const elInputImport = document.getElementById('input-import-trace');
const elSelectFond = document.getElementById('select-fond-carte');
const elStatsBar = document.getElementById('stats-bar');
const elListeWaypoints = document.getElementById('liste-waypoints');
const elBtnCalculerProfil = document.getElementById('btn-calculer-profil');
const elProfilStats = document.getElementById('profil-stats');
const elProfilConteneur = document.getElementById('profil-conteneur');
const elBtnExportDiaporama = document.getElementById('btn-export-diaporama');
const elBtnExportSessionKmz = document.getElementById('btn-export-session-kmz');
const elBtnExportDeploiement = document.getElementById('btn-export-deploiement');

let carteRandonnee = null;
let coucheTrace = null;
let marqueursWaypoints = []; // [{ waypoint, marker }]
let animationMarchingAntsId = null;

function initCarteRandonneeSiBesoin() {
  if (carteRandonnee) return;
  carteRandonnee = creerCarteBase('carte-randonnee', { fond: elSelectFond.value });
}

/**
 * Ajuste la vue de la carte sur la trace et/ou les waypoints.
 * Correctif reporté depuis randonneur8 : quand il n'y a pas de trace
 * continue (trackCoords.length <= 1 -- cas d'un waypoint créé sans trace,
 * ex. via le mode Créer), il faut un repli sur les waypoints, sinon la
 * carte reste sans vue définie (tuiles grises).
 */
function ajusterVueCarte() {
  const points = [];
  if (state.trackCoords.length > 1) {
    points.push(...state.trackCoords);
  }
  state.waypoints.forEach((wp) => points.push([wp.lat, wp.lon]));

  if (points.length === 0) return;
  if (points.length === 1) {
    carteRandonnee.setView(points[0], 15);
  } else {
    carteRandonnee.fitBounds(points, { padding: [30, 30] });
  }
}

function dessinerTrace() {
  if (coucheTrace) {
    carteRandonnee.removeLayer(coucheTrace);
    coucheTrace = null;
  }
  if (animationMarchingAntsId) {
    clearInterval(animationMarchingAntsId);
    animationMarchingAntsId = null;
  }
  if (state.trackCoords.length < 2) return;

  coucheTrace = L.polyline(state.trackCoords, {
    color: '#d66036',
    weight: 4,
    dashArray: '10, 10',
  }).addTo(carteRandonnee);

  let offset = 0;
  animationMarchingAntsId = setInterval(() => {
    offset = (offset + 1) % 20;
    coucheTrace.setStyle({ dashOffset: String(offset) });
  }, 80);
}

function construireContenuPopup(waypoint) {
  const conteneur = document.createElement('div');
  conteneur.className = 'popup-waypoint';
  if (waypoint.photoBlob) {
    const img = document.createElement('img');
    img.src = URL.createObjectURL(waypoint.photoBlob);
    conteneur.appendChild(img);
  }
  const titre = document.createElement('strong');
  titre.textContent = waypoint.name || 'Waypoint';
  conteneur.appendChild(titre);
  if (waypoint.comment) {
    const p = document.createElement('p');
    p.textContent = waypoint.comment;
    conteneur.appendChild(p);
  }
  return conteneur;
}

function dessinerWaypoints() {
  marqueursWaypoints.forEach(({ marker }) => carteRandonnee.removeLayer(marker));
  marqueursWaypoints = [];

  state.waypoints.forEach((waypoint) => {
    if (!Number.isFinite(waypoint.lat) || !Number.isFinite(waypoint.lon)) return;
    const marker = L.marker([waypoint.lat, waypoint.lon]).addTo(carteRandonnee);
    marker.bindPopup(construireContenuPopup(waypoint));
    marqueursWaypoints.push({ waypoint, marker });
  });
}

function rafraichirListeWaypoints() {
  elListeWaypoints.innerHTML = '';
  state.waypoints.forEach((waypoint, index) => {
    const item = document.createElement('div');
    item.className = 'item-waypoint';

    if (waypoint.photoBlob) {
      const img = document.createElement('img');
      img.src = URL.createObjectURL(waypoint.photoBlob);
      item.appendChild(img);
    }

    const texte = document.createElement('div');
    texte.className = 'item-texte';
    const nom = document.createElement('div');
    nom.className = 'item-nom';
    nom.textContent = waypoint.name || 'Waypoint';
    const commentaire = document.createElement('div');
    commentaire.className = 'item-commentaire';
    commentaire.textContent = waypoint.comment || '';
    texte.appendChild(nom);
    texte.appendChild(commentaire);
    item.appendChild(texte);

    item.addEventListener('click', () => {
      const entree = marqueursWaypoints[index];
      if (entree) {
        carteRandonnee.setView([waypoint.lat, waypoint.lon], Math.max(carteRandonnee.getZoom(), 15));
        entree.marker.openPopup();
      }
    });

    elListeWaypoints.appendChild(item);
  });
}

function rafraichirStats() {
  const nb = state.waypoints.length;
  elStatsBar.textContent = nb > 0 ? `${nb} waypoint${nb > 1 ? 's' : ''}` : '';
  const elBtnModeVisite = document.getElementById('btn-mode-visite');
  if (elBtnModeVisite) elBtnModeVisite.disabled = nb === 0;
  elBtnExportDiaporama.disabled = nb === 0;
  elBtnExportSessionKmz.disabled = nb === 0;
  elBtnExportDeploiement.disabled = nb === 0;
}

function rafraichirAffichageComplet() {
  initCarteRandonneeSiBesoin();
  dessinerTrace();
  dessinerWaypoints();
  rafraichirListeWaypoints();
  rafraichirStats();
  ajusterVueCarte();
}

elSelectFond.addEventListener('change', () => {
  if (!carteRandonnee) return;
  changerFondDeCarte(carteRandonnee, elSelectFond.value);
});

elBtnCalculerProfil.addEventListener('click', async () => {
  if (state.trackCoords.length < 2) {
    elProfilStats.textContent = 'Aucune trace continue à profiler (importez un KML/KMZ/GPX avec une trace).';
    return;
  }
  elBtnCalculerProfil.disabled = true;
  elProfilStats.textContent = 'Calcul du profil altimétrique en cours…';
  elProfilConteneur.innerHTML = '';
  try {
    const { profil, dPlus, dMoins, distanceTotale } = await calculerProfilAltimetrique(state.trackCoords);
    elProfilConteneur.innerHTML = construireSVGProfil(profil);
    elProfilStats.textContent =
      `Distance : ${(distanceTotale / 1000).toFixed(1)} km — D+ : ${dPlus} m — D- : ${dMoins} m`;
  } catch (e) {
    elProfilStats.textContent = 'Erreur lors du calcul du profil : ' + e.message;
  } finally {
    elBtnCalculerProfil.disabled = false;
  }
});

async function lancerExport(bouton, libelleEnCours, fonctionExport) {
  const libelleInitial = bouton.textContent;
  bouton.disabled = true;
  bouton.textContent = libelleEnCours;
  try {
    await fonctionExport();
  } catch (e) {
    elStatsBar.textContent = "Erreur à l'export : " + e.message;
  } finally {
    bouton.disabled = state.waypoints.length === 0;
    bouton.textContent = libelleInitial;
  }
}

elBtnExportDiaporama.addEventListener('click', () =>
  lancerExport(elBtnExportDiaporama, 'Génération…', exporterDiaporamaHTML)
);

elBtnExportSessionKmz.addEventListener('click', () =>
  lancerExport(elBtnExportSessionKmz, 'Génération…', exporterSessionKMZ)
);

elBtnExportDeploiement.addEventListener('click', () =>
  lancerExport(elBtnExportDeploiement, 'Génération…', exporterDeploiement)
);

elInputImport.addEventListener('change', async () => {
  const fichier = elInputImport.files[0];
  if (!fichier) return;

  const extension = fichier.name.split('.').pop().toLowerCase();
  elStatsBar.textContent = 'Import en cours…';

  try {
    let resultat;
    if (extension === 'kmz') {
      resultat = await parseKMZ(fichier);
    } else if (extension === 'kml') {
      resultat = parseKML(await fichier.text());
    } else if (extension === 'gpx') {
      resultat = parseGPX(await fichier.text());
    } else {
      elStatsBar.textContent = 'Format non reconnu (KML/KMZ/GPX attendu).';
      return;
    }

    state.waypoints = resultat.waypoints;
    state.trackCoords = resultat.trackCoords;
    elProfilStats.textContent = '';
    elProfilConteneur.innerHTML = '';
    if (typeof reinitialiserVisitePourNouvelleTrace === 'function') reinitialiserVisitePourNouvelleTrace();
    rafraichirAffichageComplet();
  } catch (e) {
    elStatsBar.textContent = "Erreur à l'import : " + e.message;
  }
});

/**
 * Appelé par changerEcran() (app.js) à chaque fois que l'écran Randonnée
 * devient visible : initialise la carte si besoin (elle ne peut pas être
 * créée pendant que son conteneur est caché) et corrige sa taille.
 */
function onEcranRandonneeAffiche() {
  initCarteRandonneeSiBesoin();
  setTimeout(() => {
    carteRandonnee.invalidateSize();
    ajusterVueCarte();
  }, 0);
}

/**
 * Appelé par injecterWaypointDansRandonnee() (state.js) quand un waypoint
 * arrive depuis le mode Créer, pour rafraîchir l'affichage carte/liste
 * sans repasser par un import de fichier.
 */
function onWaypointAjoute(waypoint) {
  if (typeof reinitialiserVisitePourNouvelleTrace === 'function') reinitialiserVisitePourNouvelleTrace();
  rafraichirAffichageComplet();
}
