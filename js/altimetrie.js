// Module partagé : profil altimétrique (D+/D-) via le service Altimétrie
// de la Géoplateforme IGN (data.geopf.fr, sans clé API, limité à 5 requêtes/s).
// Migré/adapté depuis randonneur8.

const ALTI_URL = 'https://data.geopf.fr/altimetrie/1.0/calcul/alti/rest/elevationLine.json';
const ALTI_NB_POINTS_MAX_ENVOYES = 200; // limite raisonnable pour la requête
const ALTI_ECHANTILLONNAGE = 300; // nombre de points du profil renvoyé (max 5000 côté service)

function distanceHaversine(lat1, lon1, lat2, lon2) {
  const R = 6371000; // rayon terrestre moyen, en mètres
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Réduit un tableau de points à `max` éléments maximum, en conservant le
 * premier et le dernier, répartis uniformément (la géométrie de la trace
 * reste fidèle ; le service ré-échantillonne ensuite via `sampling`).
 */
function reduirePoints(coords, max) {
  if (coords.length <= max) return coords;
  const pas = (coords.length - 1) / (max - 1);
  const reduit = [];
  for (let i = 0; i < max; i++) reduit.push(coords[Math.round(i * pas)]);
  return reduit;
}

/**
 * Calcule le profil altimétrique d'une trace (distance cumulée + altitude)
 * ainsi que le dénivelé positif (D+) et négatif (D-).
 * @param {Array<[number,number]>} trackCoords - [[lat, lon], ...]
 * @returns {Promise<{ profil: Array<{distance:number, altitude:number, lat:number, lon:number}>, dPlus: number, dMoins: number, distanceTotale: number }>}
 */
async function calculerProfilAltimetrique(trackCoords) {
  if (!trackCoords || trackCoords.length < 2) {
    throw new Error('Trace trop courte pour calculer un profil altimétrique.');
  }

  const pointsEnvoyes = reduirePoints(trackCoords, ALTI_NB_POINTS_MAX_ENVOYES);
  const lonStr = pointsEnvoyes.map(([, lon]) => lon).join('|');
  const latStr = pointsEnvoyes.map(([lat]) => lat).join('|');
  const echantillonnage = Math.min(5000, Math.max(pointsEnvoyes.length, ALTI_ECHANTILLONNAGE));

  const reponse = await fetch(ALTI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      lon: lonStr,
      lat: latStr,
      resource: 'ign_rge_alti_wld',
      delimiter: '|',
      indent: 'false',
      measures: 'false',
      sampling: String(echantillonnage),
    }),
  });

  if (!reponse.ok) {
    throw new Error('Service altimétrique IGN indisponible (HTTP ' + reponse.status + ')');
  }

  const donnees = await reponse.json();
  const points = donnees.elevations || [];
  if (points.length < 2) {
    throw new Error('Réponse altimétrique vide ou invalide.');
  }

  let distanceCumulee = 0;
  let dPlus = 0;
  let dMoins = 0;
  const profil = [];

  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    if (i > 0) {
      const precedent = points[i - 1];
      distanceCumulee += distanceHaversine(precedent.lat, precedent.lon, p.lat, p.lon);
      const delta = p.z - precedent.z;
      if (delta > 0) dPlus += delta;
      else dMoins += -delta;
    }
    profil.push({ distance: distanceCumulee, altitude: p.z, lat: p.lat, lon: p.lon });
  }

  return {
    profil,
    dPlus: Math.round(dPlus),
    dMoins: Math.round(dMoins),
    distanceTotale: Math.round(distanceCumulee),
  };
}

/**
 * Construit un SVG (chaîne) représentant le profil altimétrique.
 * @param {Array<{distance:number, altitude:number}>} profil
 * @param {{largeur?:number, hauteur?:number}} options
 * @returns {string} SVG
 */
function construireSVGProfil(profil, options = {}) {
  const largeur = options.largeur || 600;
  const hauteur = options.hauteur || 160;
  const marge = 30;

  const distances = profil.map((p) => p.distance);
  const altitudes = profil.map((p) => p.altitude);
  const distanceMax = Math.max(...distances) || 1;
  const altMin = Math.min(...altitudes);
  const altMax = Math.max(...altitudes);
  const altSpan = altMax - altMin || 1;

  const x = (d) => marge + (d / distanceMax) * (largeur - 2 * marge);
  const y = (alt) => hauteur - marge - ((alt - altMin) / altSpan) * (hauteur - 2 * marge);

  const pointsLigne = profil.map((p) => `${x(p.distance).toFixed(1)},${y(p.altitude).toFixed(1)}`).join(' ');
  const pointsAire = `${x(0).toFixed(1)},${(hauteur - marge).toFixed(1)} ${pointsLigne} ${x(distanceMax).toFixed(1)},${(hauteur - marge).toFixed(1)}`;

  return `<svg viewBox="0 0 ${largeur} ${hauteur}" xmlns="http://www.w3.org/2000/svg">
  <polygon points="${pointsAire}" fill="#175e48" fill-opacity="0.15" />
  <polyline points="${pointsLigne}" fill="none" stroke="#175e48" stroke-width="2" />
  <text x="${marge}" y="14" font-size="11" fill="#333">${Math.round(altMax)} m</text>
  <text x="${marge}" y="${hauteur - marge + 14}" font-size="11" fill="#333">${Math.round(altMin)} m</text>
  <text x="${largeur - marge}" y="${hauteur - 6}" font-size="11" fill="#333" text-anchor="end">${(distanceMax / 1000).toFixed(1)} km</text>
</svg>`;
}
