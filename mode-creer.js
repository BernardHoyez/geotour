// Mode "Créer un waypoint" — migration de photo2waypoint.
//
// TODO migration, dans l'ordre suggéré :
// 1. Import photo + lecture EXIF (exif.js) -> pré-remplissage lat/lon
// 2. Repli manuel si pas de GPS : saisie de coordonnées OU pointage sur
//    carte Leaflet (map-layers.js, fonds OSM/IGN Plan/IGN Ortho)
// 3. Formulaire nom (≤40 car.) / commentaire (≤600 car.)
// 4. Construction du waypoint en mémoire : { name, comment, lat, lon, photoBlob, photoName }
// 5. Bouton "Ajouter à la randonnée en cours" -> injecterWaypointDansRandonnee(waypoint) (state.js)
// 6. Bouton "Exporter en KMZ" -> kml.js buildKMZ([waypoint], []) puis téléchargement
//    (via File System Access API si disponible, sinon <a download>)

// Une fois les éléments du formulaire migrés dans index.html, activer les boutons :
// document.getElementById('btn-ajouter-a-randonnee').disabled = false;
// document.getElementById('btn-export-kmz-creer').disabled = false;
