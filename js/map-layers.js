// Module partagé : fonds de carte Leaflet — migré depuis randonneur8 (carte
// principale : OSM / IGN Plan V2 / IGN Ortho / mbtiles local) et photo2waypoint
// (carte de pointage manuel : OSM / IGN Plan / IGN Ortho).
//
// Toutes les couches IGN utilisent la Géoplateforme (data.geopf.fr), sans clé API.

const FONDS_DE_CARTE = {
  osm: () =>
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    }),

  'ign-plan': () =>
    L.tileLayer(
      'https://data.geopf.fr/wmts?SERVICE=WMTS&VERSION=1.0.0&REQUEST=GetTile' +
        '&LAYER=GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2&STYLE=normal&TILEMATRIXSET=PM' +
        '&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&FORMAT=image/png',
      { maxZoom: 19, attribution: 'IGN-F/Géoportail' }
    ),

  'ign-ortho': () =>
    L.tileLayer(
      'https://data.geopf.fr/wmts?SERVICE=WMTS&VERSION=1.0.0&REQUEST=GetTile' +
        '&LAYER=ORTHOIMAGERY.ORTHOPHOTOS&STYLE=normal&TILEMATRIXSET=PM' +
        '&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&FORMAT=image/jpeg',
      { maxZoom: 19, attribution: 'IGN-F/Géoportail' }
    ),
};

/**
 * Crée une carte Leaflet de base dans le conteneur donné, avec le fond
 * demandé (par défaut OSM), centrée sur les coordonnées fournies ou sur la
 * France si aucune n'est donnée.
 * @param {string} conteneurId - id de l'élément DOM cible
 * @param {{fond?: string, centre?: [number,number], zoom?: number}} options
 * @returns {L.Map}
 */
function creerCarteBase(conteneurId, options = {}) {
  const fond = options.fond || 'osm';
  const centre = options.centre || [46.6, 2.4]; // centre approximatif de la France
  const zoom = options.zoom || (options.centre ? 15 : 6);

  const carte = L.map(conteneurId).setView(centre, zoom);
  const creerCouche = FONDS_DE_CARTE[fond] || FONDS_DE_CARTE.osm;
  creerCouche().addTo(carte);
  carte._coucheFondActuelle = fond;
  return carte;
}

/**
 * Change le fond de carte affiché sur une carte déjà créée par creerCarteBase().
 * @param {L.Map} carte
 * @param {string} fond - 'osm' | 'ign-plan' | 'ign-ortho'
 */
function changerFondDeCarte(carte, fond) {
  carte.eachLayer((couche) => carte.removeLayer(couche));
  const creerCouche = FONDS_DE_CARTE[fond] || FONDS_DE_CARTE.osm;
  creerCouche().addTo(carte);
  carte._coucheFondActuelle = fond;
}

// TODO migration (randonneur8 uniquement) : chargement d'un fond .mbtiles
// local via sql.js, en 4ᵉ option de FONDS_DE_CARTE ('mbtiles').
