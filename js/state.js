// État global partagé entre le mode "Créer" et le mode "Randonnée".
// Un seul objet en mémoire pour toute la session : c'est ce qui permet
// l'injection directe d'un waypoint créé vers la randonnée en cours,
// sans passer par un fichier KMZ.

const state = {
  mode: 'accueil', // 'accueil' | 'creer' | 'randonnee'

  // -- Mode Créer --
  waypointEnCours: null, // { name, comment, lat, lon, photoBlob, photoName }

  // -- Mode Randonnée --
  trackCoords: [],   // [[lat, lon], ...] de la trace importée
  waypoints: [],     // [{ name, comment, lat, lon, photoBlob, photoName }, ...]
  basemap: 'osm',    // 'osm' | 'ign-plan' | 'ign-ortho' | 'mbtiles'
};

/**
 * Ajoute un waypoint créé en mode "Créer" directement à la session
 * de randonnée en cours (sans export/import de fichier), puis bascule
 * l'affichage sur l'écran Randonnée.
 */
function injecterWaypointDansRandonnee(waypoint) {
  state.waypoints.push(waypoint);
  changerEcran('randonnee'); // affiche l'écran en premier : le conteneur carte doit être visible avant init Leaflet
  if (typeof onWaypointAjoute === 'function') {
    onWaypointAjoute(waypoint); // implémenté dans mode-randonnee.js
  }
}
