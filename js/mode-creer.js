// Mode "Créer un waypoint" — migré de photo2waypoint.
//
// Flux : import photo -> lecture EXIF (exif.js) -> si pas de GPS, repli
// manuel (saisie ou pointage carte via map-layers.js) -> formulaire nom/
// commentaire -> "Ajouter à la randonnée en cours" (injection directe,
// state.js) ou "Exporter en KMZ" (kml.js).

const elPhoto = document.getElementById('input-photo');
const elApercu = document.getElementById('apercu-photo-conteneur');
const elStatutGps = document.getElementById('statut-gps');
const elRepliManuel = document.getElementById('repli-manuel');
const elBtnRepliSaisie = document.getElementById('btn-repli-saisie');
const elBtnRepliCarte = document.getElementById('btn-repli-carte');
const elRepliSaisie = document.getElementById('repli-saisie');
const elRepliCarte = document.getElementById('repli-carte');
const elInputLat = document.getElementById('input-lat');
const elInputLon = document.getElementById('input-lon');
const elInputNom = document.getElementById('input-nom');
const elInputCommentaire = document.getElementById('input-commentaire');
const elBtnAjouter = document.getElementById('btn-ajouter-a-randonnee');
const elBtnExport = document.getElementById('btn-export-kmz-creer');

let cartePointage = null;
let marqueurPointage = null;

function reinitialiserFormulaireCreer() {
  state.waypointEnCours = null;
  elPhoto.value = '';
  elApercu.innerHTML = '';
  elStatutGps.textContent = '';
  elRepliManuel.hidden = true;
  elRepliSaisie.hidden = true;
  elRepliCarte.hidden = true;
  elInputLat.value = '';
  elInputLon.value = '';
  elInputNom.value = '';
  elInputCommentaire.value = '';
  majEtatBoutons();
}

function majEtatBoutons() {
  const pret =
    !!state.waypointEnCours &&
    Number.isFinite(state.waypointEnCours.lat) &&
    Number.isFinite(state.waypointEnCours.lon) &&
    elInputNom.value.trim().length > 0;
  elBtnAjouter.disabled = !pret;
  elBtnExport.disabled = !pret;
}

function definirCoordonnees(lat, lon) {
  if (!state.waypointEnCours) return;
  state.waypointEnCours.lat = lat;
  state.waypointEnCours.lon = lon;
  majEtatBoutons();
}

/**
 * Construit un nom de fichier sûr pour la photo embarquée dans le KMZ,
 * à partir du nom d'origine (extension conservée).
 */
function nomFichierSur(nomOriginal) {
  const extension = (nomOriginal.match(/\.[a-zA-Z0-9]+$/) || ['.jpg'])[0].toLowerCase();
  const horodatage = Date.now();
  return `photo_${horodatage}${extension}`;
}

elPhoto.addEventListener('change', async () => {
  const fichier = elPhoto.files[0];
  if (!fichier) return;

  elApercu.innerHTML = '';
  const img = document.createElement('img');
  img.src = URL.createObjectURL(fichier);
  elApercu.appendChild(img);

  state.waypointEnCours = {
    name: '',
    comment: '',
    lat: null,
    lon: null,
    photoBlob: fichier,
    photoName: nomFichierSur(fichier.name),
  };

  elStatutGps.textContent = 'Lecture des données GPS de la photo…';
  elRepliManuel.hidden = true;
  elRepliSaisie.hidden = true;
  elRepliCarte.hidden = true;

  let coords = null;
  try {
    coords = await lireCoordonneesGPS(fichier);
  } catch (e) {
    coords = null;
  }

  if (coords) {
    definirCoordonnees(coords.lat, coords.lon);
    elStatutGps.textContent = `📍 Position trouvée dans la photo : ${coords.lat.toFixed(5)}, ${coords.lon.toFixed(5)}`;
  } else {
    elStatutGps.textContent = '';
    elRepliManuel.hidden = false;
  }

  majEtatBoutons();
});

elBtnRepliSaisie.addEventListener('click', () => {
  elRepliSaisie.hidden = false;
  elRepliCarte.hidden = true;
});

elBtnRepliCarte.addEventListener('click', () => {
  elRepliCarte.hidden = false;
  elRepliSaisie.hidden = true;

  if (!cartePointage) {
    cartePointage = creerCarteBase('carte-pointage', { fond: 'osm' });
    cartePointage.on('click', (e) => {
      const { lat, lng } = e.latlng;
      if (marqueurPointage) {
        marqueurPointage.setLatLng(e.latlng);
      } else {
        marqueurPointage = L.marker(e.latlng).addTo(cartePointage);
      }
      definirCoordonnees(lat, lng);
      elStatutGps.textContent = `📍 Point placé sur la carte : ${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    });
  } else {
    // Le conteneur était masqué (hidden) lors de la création : Leaflet a besoin
    // d'être notifié de sa taille réelle une fois affiché.
    setTimeout(() => cartePointage.invalidateSize(), 0);
  }
});

elInputLat.addEventListener('input', () => {
  const lat = parseFloat(elInputLat.value);
  const lon = parseFloat(elInputLon.value);
  if (Number.isFinite(lat) && Number.isFinite(lon)) definirCoordonnees(lat, lon);
});

elInputLon.addEventListener('input', () => {
  const lat = parseFloat(elInputLat.value);
  const lon = parseFloat(elInputLon.value);
  if (Number.isFinite(lat) && Number.isFinite(lon)) definirCoordonnees(lat, lon);
});

elInputNom.addEventListener('input', () => {
  if (state.waypointEnCours) state.waypointEnCours.name = elInputNom.value.trim();
  majEtatBoutons();
});

elInputCommentaire.addEventListener('input', () => {
  if (state.waypointEnCours) state.waypointEnCours.comment = elInputCommentaire.value;
});

elBtnAjouter.addEventListener('click', () => {
  if (!state.waypointEnCours) return;
  injecterWaypointDansRandonnee({ ...state.waypointEnCours });
  reinitialiserFormulaireCreer();
});

elBtnExport.addEventListener('click', async () => {
  if (!state.waypointEnCours) return;
  const blob = await buildKMZ([state.waypointEnCours], []);
  const nomFichier = (state.waypointEnCours.name || 'waypoint').replace(/[^a-zA-Z0-9_-]+/g, '_') + '.kmz';

  if (window.showSaveFilePicker) {
    try {
      const poignee = await window.showSaveFilePicker({
        suggestedName: nomFichier,
        types: [{ description: 'KMZ', accept: { 'application/vnd.google-earth.kmz': ['.kmz'] } }],
      });
      const flux = await poignee.createWritable();
      await flux.write(blob);
      await flux.close();
      return;
    } catch (e) {
      // L'utilisateur a annulé, ou l'API a échoué : on retombe sur le téléchargement classique.
    }
  }

  const lien = document.createElement('a');
  lien.href = URL.createObjectURL(blob);
  lien.download = nomFichier;
  lien.click();
  URL.revokeObjectURL(lien.href);
});
