// Module partagé : exports du mode Randonnée — migré de randonneur8.
// - Export "Sauvegarder la session en KMZ" : réutilise buildKMZ (kml.js).
// - Export "Diaporama HTML" : fichier HTML unique et autonome (photos en
//   base64, Leaflet inline vendorisé) rejouant le Mode Visite hors-ligne.
// - Export "Déploiement" : paquet zip (index.html + photos en fichiers
//   séparés) prêt à héberger tel quel sur un site statique.

function blobEnDataURL(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

function telechargerBlob(blob, nomFichier) {
  const lien = document.createElement('a');
  lien.href = URL.createObjectURL(blob);
  lien.download = nomFichier;
  lien.click();
  URL.revokeObjectURL(lien.href);
}

/**
 * Génère le script JS embarqué (Mode Visite autonome) du diaporama exporté.
 * Reprend la logique de visite.js (navigation manuelle, TTS, correctif de
 * repli fitBounds/setView), mais lit les waypoints/la trace depuis la
 * variable DONNEES injectée dans la page plutôt que depuis l'état de l'app.
 */
function construireScriptDiaporama() {
  const lignes = [];
  lignes.push('var waypoints = DONNEES.waypoints;');
  lignes.push('var trackCoords = DONNEES.trackCoords;');
  lignes.push('var index = 0;');
  lignes.push('var carte = L.map("carte-diaporama");');
  lignes.push('L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "&copy; OpenStreetMap contributors" }).addTo(carte);');
  lignes.push('if (trackCoords.length > 1) { L.polyline(trackCoords, { color: "#175e48", weight: 3 }).addTo(carte); }');
  lignes.push('var marqueurs = waypoints.map(function (wp) { return L.circleMarker([wp.lat, wp.lon], { radius: 6, color: "#175e48", fillColor: "#fff", fillOpacity: 1, weight: 2 }).addTo(carte); });');
  // Cadrage initial : même chaîne de repli que le Mode Visite intégré (correctif documenté).
  lignes.push('if (trackCoords.length > 1) { carte.fitBounds(trackCoords, { padding: [30, 30] }); }');
  lignes.push('else if (waypoints.length > 1) { carte.fitBounds(waypoints.map(function (wp) { return [wp.lat, wp.lon]; }), { padding: [30, 30] }); }');
  lignes.push('else if (waypoints.length === 1) { carte.setView([waypoints[0].lat, waypoints[0].lon], 15); }');
  lignes.push('else { carte.setView([46.6, 2.4], 6); }');
  lignes.push('function majMarqueurs() { marqueurs.forEach(function (m, i) { m.setStyle({ color: i === index ? "#d66036" : "#175e48", radius: i === index ? 9 : 6 }); }); }');
  lignes.push('function afficher(i) {');
  lignes.push('  if (i < 0 || i >= waypoints.length) return;');
  lignes.push('  index = i;');
  lignes.push('  var wp = waypoints[i];');
  lignes.push('  document.getElementById("compteur").textContent = (i + 1) + " / " + waypoints.length;');
  lignes.push('  document.getElementById("nom").textContent = wp.name || "Waypoint";');
  lignes.push('  document.getElementById("commentaire").textContent = wp.comment || "";');
  lignes.push('  var conteneurPhoto = document.getElementById("photo-conteneur");');
  lignes.push('  conteneurPhoto.innerHTML = "";');
  lignes.push('  if (wp.photoDataUrl) { var img = document.createElement("img"); img.src = wp.photoDataUrl; conteneurPhoto.appendChild(img); }');
  lignes.push('  majMarqueurs();');
  lignes.push('  carte.flyTo([wp.lat, wp.lon], Math.max(carte.getZoom(), 16));');
  lignes.push('  window.speechSynthesis && window.speechSynthesis.cancel();');
  lignes.push('  document.getElementById("btn-lire").textContent = "\\uD83D\\uDD0A Lire";');
  lignes.push('  document.getElementById("btn-precedent").disabled = i === 0;');
  lignes.push('  document.getElementById("btn-suivant").disabled = i === waypoints.length - 1;');
  lignes.push('}');
  lignes.push('document.getElementById("btn-precedent").addEventListener("click", function () { afficher(index - 1); });');
  lignes.push('document.getElementById("btn-suivant").addEventListener("click", function () { afficher(index + 1); });');
  lignes.push('document.getElementById("btn-lire").addEventListener("click", function () {');
  lignes.push('  if (!("speechSynthesis" in window)) return;');
  lignes.push('  if (window.speechSynthesis.speaking) { window.speechSynthesis.cancel(); this.textContent = "\\uD83D\\uDD0A Lire"; return; }');
  lignes.push('  var wp = waypoints[index];');
  lignes.push('  var texte = [wp.name, wp.comment].filter(Boolean).join(". ");');
  lignes.push('  if (!texte) return;');
  lignes.push('  var u = new SpeechSynthesisUtterance(texte);');
  lignes.push('  u.lang = "fr-FR";');
  lignes.push('  var bouton = this;');
  lignes.push('  u.onend = function () { bouton.textContent = "\\uD83D\\uDD0A Lire"; };');
  lignes.push('  window.speechSynthesis.speak(u);');
  lignes.push('  this.textContent = "\\u23F9 Arr\\u00EAter";');
  lignes.push('});');
  lignes.push('afficher(0);');
  return lignes.join('\n');
}

function construireStyleDiaporama() {
  return [
    'body{margin:0;font-family:system-ui,sans-serif;background:#f4f6f5;color:#1c1c1c;}',
    '#carte-diaporama{height:45vh;min-height:260px;}',
    '.fiche{max-width:520px;margin:0 auto;padding:1rem;}',
    '.fiche img{width:100%;max-height:280px;object-fit:cover;border-radius:8px;}',
    '.fiche h2{color:#175e48;margin:0.4rem 0;}',
    '.controles{display:flex;gap:0.5rem;max-width:520px;margin:0 auto;padding:0 1rem 1rem;}',
    '.controles button{flex:1;padding:0.7rem;border-radius:8px;border:none;font-size:1rem;cursor:pointer;}',
    '#btn-lire{background:#d66036;color:#fff;}',
    '#btn-precedent,#btn-suivant{background:#eee;color:#333;}',
    '#btn-precedent:disabled,#btn-suivant:disabled{opacity:0.5;cursor:not-allowed;}',
    '#compteur{display:block;text-align:center;padding:0.4rem;color:#175e48;font-weight:600;}',
  ].join('\n');
}

/**
 * Construit le HTML complet du diaporama autonome (Leaflet inline vendorisé,
 * photos en base64, aucune dépendance réseau au chargement).
 * @param {Array} waypoints
 * @param {Array} trackCoords
 * @returns {Promise<string>}
 */
async function construireHTMLDiaporama(waypoints, trackCoords) {
  const [leafletCSS, leafletJS] = await Promise.all([
    fetch('vendor/leaflet/leaflet.css').then((r) => r.text()),
    fetch('vendor/leaflet/leaflet.js').then((r) => r.text()),
  ]);

  const waypointsSerialises = await Promise.all(
    waypoints.map(async (wp) => ({
      name: wp.name,
      comment: wp.comment,
      lat: wp.lat,
      lon: wp.lon,
      photoDataUrl: wp.photoBlob ? await blobEnDataURL(wp.photoBlob) : null,
    }))
  );

  const donnees = JSON.stringify({ waypoints: waypointsSerialises, trackCoords });

  return [
    '<!DOCTYPE html>',
    '<html lang="fr"><head><meta charset="UTF-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1.0">',
    '<title>Diaporama GeoTour</title>',
    '<style>' + leafletCSS + '</style>',
    '<style>' + construireStyleDiaporama() + '</style>',
    '</head><body>',
    '<span id="compteur"></span>',
    '<div id="carte-diaporama"></div>',
    '<div class="fiche"><div id="photo-conteneur"></div><h2 id="nom"></h2><p id="commentaire"></p></div>',
    '<div class="controles">',
    '<button id="btn-precedent">\u25C0 Pr\u00E9c\u00E9dent</button>',
    '<button id="btn-lire">\uD83D\uDD0A Lire</button>',
    '<button id="btn-suivant">Suivant \u25B6</button>',
    '</div>',
    '<script>' + leafletJS + '</script>',
    '<script>var DONNEES = ' + donnees + ';</script>',
    '<script>' + construireScriptDiaporama() + '</script>',
    '</body></html>',
  ].join('\n');
}

/**
 * Exporte la session en cours (waypoints + trace) en un fichier diaporama
 * HTML autonome, téléchargé directement.
 */
async function exporterDiaporamaHTML() {
  const html = await construireHTMLDiaporama(state.waypoints, state.trackCoords);
  const blob = new Blob([html], { type: 'text/html' });
  telechargerBlob(blob, 'diaporama_geotour.html');
}

/**
 * Exporte la session en cours (waypoints + trace) en KMZ autonome,
 * séparé du paquet de "Déploiement" (voir exporterDeploiement).
 */
async function exporterSessionKMZ() {
  const blob = await buildKMZ(state.waypoints, state.trackCoords);
  telechargerBlob(blob, 'session_geotour.kmz');
}

/**
 * Exporte un paquet "Déploiement" (zip) : le diaporama HTML, mais avec les
 * photos en fichiers séparés (files/) plutôt qu'en base64, prêt à être
 * déposé tel quel sur un hébergement statique (ex. Neocities).
 */
async function exporterDeploiement() {
  if (typeof JSZip === 'undefined') {
    throw new Error('JSZip non chargé — voir vendor/jszip.min.js');
  }
  const [leafletCSS, leafletJS] = await Promise.all([
    fetch('vendor/leaflet/leaflet.css').then((r) => r.text()),
    fetch('vendor/leaflet/leaflet.js').then((r) => r.text()),
  ]);

  const waypointsSerialises = state.waypoints.map((wp) => ({
    name: wp.name,
    comment: wp.comment,
    lat: wp.lat,
    lon: wp.lon,
    photoDataUrl: wp.photoBlob ? 'files/' + wp.photoName : null,
  }));

  const donnees = JSON.stringify({ waypoints: waypointsSerialises, trackCoords: state.trackCoords });

  const html = [
    '<!DOCTYPE html>',
    '<html lang="fr"><head><meta charset="UTF-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1.0">',
    '<title>Diaporama GeoTour</title>',
    '<style>' + leafletCSS + '</style>',
    '<style>' + construireStyleDiaporama() + '</style>',
    '</head><body>',
    '<span id="compteur"></span>',
    '<div id="carte-diaporama"></div>',
    '<div class="fiche"><div id="photo-conteneur"></div><h2 id="nom"></h2><p id="commentaire"></p></div>',
    '<div class="controles">',
    '<button id="btn-precedent">\u25C0 Pr\u00E9c\u00E9dent</button>',
    '<button id="btn-lire">\uD83D\uDD0A Lire</button>',
    '<button id="btn-suivant">Suivant \u25B6</button>',
    '</div>',
    '<script>' + leafletJS + '</script>',
    '<script>var DONNEES = ' + donnees + ';</script>',
    '<script>' + construireScriptDiaporama() + '</script>',
    '</body></html>',
  ].join('\n');

  const zip = new JSZip();
  zip.file('index.html', html);
  const dossierFiles = zip.folder('files');
  state.waypoints.forEach((wp) => {
    if (wp.photoBlob && wp.photoName) dossierFiles.file(wp.photoName, wp.photoBlob);
  });

  const blob = await zip.generateAsync({ type: 'blob' });
  telechargerBlob(blob, 'deploiement_geotour.zip');
}
