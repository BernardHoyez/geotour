// Mode "Randonnée" — migré de randonneur8, avec son ergonomie : zone de
// dépôt de fichier (glisser-déposer), choix explicite Remplacer/Ajouter,
// fonds de carte en boutons segmentés, grille de statistiques à icônes
// (Waypoints/Photos/Distance/D+/D-) recalculée automatiquement à l'import.

const elZoneImport = document.getElementById('zone-import');
const elInputImport = document.getElementById('input-import-trace');
const elZoneImportNom = document.getElementById('zone-import-nom');
const elBtnImportRemplacer = document.getElementById('btn-import-remplacer');
const elBtnImportAjouter = document.getElementById('btn-import-ajouter');
const elSegmentedFond = document.getElementById('segmented-fond');
const elListeWaypoints = document.getElementById('liste-waypoints');
const elProfilErreur = document.getElementById('profil-erreur');
const elProfilConteneur = document.getElementById('profil-conteneur');
const elStatWaypoints = document.getElementById('stat-waypoints');
const elStatPhotos = document.getElementById('stat-photos');
const elStatDistance = document.getElementById('stat-distance');
const elStatDPlus = document.getElementById('stat-dplus');
const elStatDMoins = document.getElementById('stat-dmoins');
const elBtnExportDiaporama = document.getElementById('btn-export-diaporama');
const elBtnExportSessionKmz = document.getElementById('btn-export-session-kmz');
const elBtnExportDeploiement = document.getElementById('btn-export-deploiement');

let carteRandonnee = null;
let coucheTrace = null;
let marqueursWaypoints = []; // [{ waypoint, marker }]
let animationMarchingAntsId = null;
let fichierEnAttente = null;
let fondActuel = 'osm';

function initCarteRandonneeSiBesoin() {
  if (carteRandonnee) return;
  carteRandonnee = creerCarteBase('carte-randonnee', { fond: fondActuel });
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

function rafraichirStatsDeBase() {
  const nb = state.waypoints.length;
  const nbPhotos = state.waypoints.filter((wp) => wp.photoBlob).length;
  elStatWaypoints.textContent = String(nb);
  elStatPhotos.textContent = String(nbPhotos);

  const elBtnModeVisite = document.getElementById('btn-mode-visite');
  if (elBtnModeVisite) elBtnModeVisite.disabled = nb === 0;
  elBtnExportDiaporama.disabled = nb === 0;
  elBtnExportSessionKmz.disabled = nb === 0;
  elBtnExportDeploiement.disabled = nb === 0;
}

/**
 * Calcule et affiche automatiquement le profil altimétrique (distance/D+/D-)
 * après chaque import, sans action supplémentaire de l'utilisateur.
 */
async function rafraichirProfilAutomatique() {
  elStatDistance.textContent = '—';
  elStatDPlus.textContent = '—';
  elStatDMoins.textContent = '—';
  elProfilErreur.textContent = '';
  elProfilConteneur.innerHTML = '';

  if (state.trackCoords.length < 2) return;

  try {
    const { profil, dPlus, dMoins, distanceTotale } = await calculerProfilAltimetrique(state.trackCoords);
    elStatDistance.textContent = (distanceTotale / 1000).toFixed(1) + ' km';
    elStatDPlus.textContent = dPlus + ' m';
    elStatDMoins.textContent = dMoins + ' m';
    elProfilConteneur.innerHTML = construireSVGProfil(profil);
  } catch (e) {
    elProfilErreur.textContent = 'Profil altimétrique indisponible : ' + e.message;
  }
}

function rafraichirAffichageComplet() {
  initCarteRandonneeSiBesoin();
  dessinerTrace();
  dessinerWaypoints();
  rafraichirListeWaypoints();
  rafraichirStatsDeBase();
  ajusterVueCarte();
  rafraichirProfilAutomatique();
}

// ---------- Fonds de carte (boutons segmentés) ----------

elSegmentedFond.querySelectorAll('.segment').forEach((bouton) => {
  bouton.addEventListener('click', () => {
    if (bouton.disabled) return;
    fondActuel = bouton.dataset.fond;
    elSegmentedFond.querySelectorAll('.segment').forEach((b) => b.classList.remove('actif'));
    bouton.classList.add('actif');
    if (carteRandonnee) changerFondDeCarte(carteRandonnee, fondActuel);
  });
});

// ---------- Import : zone de dépôt + Remplacer/Ajouter ----------

function extensionAutorisee(nomFichier) {
  return /\.(kmz|kml|gpx)$/i.test(nomFichier);
}

function selectionnerFichier(fichier) {
  if (!fichier || !extensionAutorisee(fichier.name)) {
    elZoneImportNom.textContent = 'Format non reconnu (KML/KMZ/GPX attendu).';
    fichierEnAttente = null;
    elBtnImportRemplacer.disabled = true;
    elBtnImportAjouter.disabled = true;
    return;
  }
  fichierEnAttente = fichier;
  elZoneImportNom.textContent = fichier.name;
  elBtnImportRemplacer.disabled = false;
  elBtnImportAjouter.disabled = false;
}

elZoneImport.addEventListener('click', () => elInputImport.click());
elZoneImport.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    elInputImport.click();
  }
});

elZoneImport.addEventListener('dragover', (e) => {
  e.preventDefault();
  elZoneImport.classList.add('survol');
});
elZoneImport.addEventListener('dragleave', () => elZoneImport.classList.remove('survol'));
elZoneImport.addEventListener('drop', (e) => {
  e.preventDefault();
  elZoneImport.classList.remove('survol');
  selectionnerFichier(e.dataTransfer.files[0]);
});

elInputImport.addEventListener('change', () => selectionnerFichier(elInputImport.files[0]));

async function parserFichierEnAttente() {
  const extension = fichierEnAttente.name.split('.').pop().toLowerCase();
  if (extension === 'kmz') return parseKMZ(fichierEnAttente);
  if (extension === 'kml') return parseKML(await fichierEnAttente.text());
  return parseGPX(await fichierEnAttente.text());
}

elBtnImportRemplacer.addEventListener('click', async () => {
  if (!fichierEnAttente) return;
  try {
    const resultat = await parserFichierEnAttente();
    state.waypoints = resultat.waypoints;
    state.trackCoords = resultat.trackCoords;
    if (typeof reinitialiserVisitePourNouvelleTrace === 'function') reinitialiserVisitePourNouvelleTrace();
    rafraichirAffichageComplet();
  } catch (e) {
    elZoneImportNom.textContent = "Erreur à l'import : " + e.message;
  }
});

elBtnImportAjouter.addEventListener('click', async () => {
  if (!fichierEnAttente) return;
  try {
    const resultat = await parserFichierEnAttente();
    state.waypoints = state.waypoints.concat(resultat.waypoints);
    // La trace n'est remplacée que si aucune trace n'existait déjà : fusionner
    // deux traces bout à bout produirait un trait aberrant reliant leurs deux
    // extrémités, sans lien avec le terrain.
    if (state.trackCoords.length < 2) state.trackCoords = resultat.trackCoords;
    if (typeof reinitialiserVisitePourNouvelleTrace === 'function') reinitialiserVisitePourNouvelleTrace();
    rafraichirAffichageComplet();
  } catch (e) {
    elZoneImportNom.textContent = "Erreur à l'import : " + e.message;
  }
});

// ---------- Exports ----------

async function lancerExport(bouton, libelleEnCours, fonctionExport) {
  const libelleInitial = bouton.textContent;
  bouton.disabled = true;
  bouton.textContent = libelleEnCours;
  try {
    await fonctionExport();
  } catch (e) {
    elProfilErreur.textContent = "Erreur à l'export : " + e.message;
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
