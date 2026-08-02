// Mode "Randonnée" — migration de randonneur8.
//
// TODO migration, briques principales à reporter :
// - Import KMZ/KML/GPX (kml.js) -> remplit state.waypoints / state.trackCoords
// - Carte principale Leaflet (map-layers.js) : rendu marching-ants de la trace,
//   marqueurs de waypoints avec photo
// - Profil altimétrique (calcul D+/D-)
// - Gestion des photos de waypoints
// - Mode "Visite" manuel (TTS) — ATTENTION : reporter le correctif de
//   initVisiteMap() (fitBounds/setView de repli quand trackCoords.length <= 1,
//   cas d'un waypoint créé sans trace continue, ex. via le mode Créer)
// - Export diaporama HTML (même correctif de vue de repli à reporter dans exportVisite())
// - Export "Sauvegarder la session en KMZ" (bouton dans la barre latérale)
// - Export "Déploiement" (package zip existant)

/**
 * Appelé par injecterWaypointDansRandonnee() (state.js) quand un waypoint
 * arrive depuis le mode Créer, pour rafraîchir l'affichage carte/liste
 * sans repasser par un import de fichier.
 */
function onWaypointAjoute(waypoint) {
  // TODO : ajouter le marqueur sur la carte, rafraîchir la liste des waypoints,
  // recalculer les bounds si trackCoords est vide (cf. correctif initVisiteMap)
}
