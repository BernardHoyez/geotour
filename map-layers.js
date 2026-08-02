// Module partagé : fonds de carte Leaflet.
// À migrer depuis randonneur8 (OSM / IGN Plan V2 / IGN Ortho via data.geopf.fr,
// + fond .mbtiles local lu client-side avec sql.js) et depuis photo2waypoint
// (carte de pointage manuel OSM/IGN Plan/IGN Ortho pour le repli sans GPS).
//
// TODO migration :
// - fonction creerCarteBase(conteneurId, options) -> instance Leaflet
// - définitions des couches OSM / IGN Plan V2 / IGN Ortho (WMTS, data.geopf.fr, sans clé API)
// - chargement d'un fond .mbtiles via sql.js (randonneur8 uniquement)
// - sélecteur de fond de carte réutilisable dans les deux modes
