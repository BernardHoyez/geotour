// Module partagé : construction et lecture de KML/KMZ.
// Remplace les implémentations dupliquées de randonneur8 et photo2waypoint
// par une seule, en conservant les correctifs déjà validés dans les deux apps :
//
// - Échappement XML : &, <, > ne sont échappés QUE dans le texte d'élément
//   brut (ex. <name>). À l'intérieur d'un bloc CDATA, les entités ne sont
//   jamais décodées par les lecteurs KML : on n'y échappe donc rien, on se
//   contente de protéger le terminateur "]]>" s'il apparaît dans le texte.
// - Détection de la photo d'un waypoint à l'import : uniquement via un
//   <img src="..."> présent dans le <description> du Placemark (jamais dans
//   BalloonStyle/text), puis rapprochement par nom de fichier avec les
//   fichiers embarqués dans le KMZ (dossier files/).
// - Le commentaire d'un waypoint importé est TOUJOURS dérivé du texte de
//   <description> (balises HTML retirées), jamais laissé vide par défaut.

// ---------- Échappement ----------

function echapperTexteXml(texte) {
  return String(texte)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function protegerCDATA(texte) {
  // Seul le terminateur "]]>" doit être neutralisé à l'intérieur d'un CDATA.
  return String(texte).replace(/]]>/g, ']]]]><![CDATA[>');
}

// ---------- Construction ----------

/**
 * Construit la <description> d'un Placemark : commentaire en texte libre
 * + référence <img> vers la photo embarquée (si présente), le tout en CDATA
 * pour ne jamais échapper les apostrophes/guillemets du commentaire.
 */
function construireDescriptionWaypoint(waypoint) {
  let contenu = waypoint.comment ? waypoint.comment : '';
  if (waypoint.photoName) {
    contenu += `\n<img src="files/${waypoint.photoName}">`;
  }
  return `<description><![CDATA[${protegerCDATA(contenu)}]]></description>`;
}

function construirePlacemarkWaypoint(waypoint) {
  const nom = echapperTexteXml(waypoint.name || 'Waypoint');
  const description = construireDescriptionWaypoint(waypoint);
  return `  <Placemark>
    <name>${nom}</name>
    ${description}
    <Point>
      <coordinates>${waypoint.lon},${waypoint.lat},0</coordinates>
    </Point>
  </Placemark>`;
}

function construirePlacemarkTrace(trackCoords) {
  if (!trackCoords || trackCoords.length < 2) return '';
  const coords = trackCoords.map(([lat, lon]) => `${lon},${lat},0`).join(' ');
  return `  <Placemark>
    <name>Trace</name>
    <LineString>
      <tessellate>1</tessellate>
      <coordinates>${coords}</coordinates>
    </LineString>
  </Placemark>`;
}

/**
 * Construit le document KML complet (contenu de doc.kml).
 * @param {Array} waypoints - [{ name, comment, lat, lon, photoName }, ...]
 * @param {Array} trackCoords - [[lat, lon], ...] (optionnel)
 * @returns {string} XML KML
 */
function buildKML(waypoints, trackCoords) {
  const placemarksWaypoints = (waypoints || []).map(construirePlacemarkWaypoint).join('\n');
  const placemarkTrace = construirePlacemarkTrace(trackCoords);
  return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
<Document>
${placemarkTrace ? placemarkTrace + '\n' : ''}${placemarksWaypoints}
</Document>
</kml>`;
}

/**
 * Construit un KMZ (Blob) : doc.kml + photos embarquées dans files/.
 * Nécessite JSZip (vendorisé dans vendor/jszip.min.js, à charger avant ce module).
 * @param {Array} waypoints - [{ name, comment, lat, lon, photoBlob, photoName }, ...]
 * @param {Array} trackCoords
 * @returns {Promise<Blob>}
 */
async function buildKMZ(waypoints, trackCoords) {
  if (typeof JSZip === 'undefined') {
    throw new Error('JSZip non chargé — voir vendor/jszip.min.js');
  }
  const zip = new JSZip();
  zip.file('doc.kml', buildKML(waypoints, trackCoords));

  const dossierFiles = zip.folder('files');
  for (const wp of waypoints || []) {
    if (wp.photoBlob && wp.photoName) {
      dossierFiles.file(wp.photoName, wp.photoBlob);
    }
  }
  return zip.generateAsync({ type: 'blob' });
}

// ---------- Lecture ----------

/**
 * Retire les balises HTML d'un texte de <description> pour ne garder que
 * le commentaire (retire notamment le <img> de la photo).
 */
function extraireCommentaireDeDescription(descriptionTexte) {
  if (!descriptionTexte) return '';
  return descriptionTexte
    .replace(/<img[^>]*>/gi, '')
    .replace(/<[^>]+>/g, '')
    .trim();
}

/**
 * Extrait le nom de fichier photo référencé dans un <description>, s'il y en a un.
 * Ne regarde QUE le texte de <description> (jamais BalloonStyle/text).
 */
function extrairePhotoDeDescription(descriptionTexte) {
  if (!descriptionTexte) return null;
  const match = descriptionTexte.match(/<img[^>]+src=["']([^"']+)["']/i);
  if (!match) return null;
  const chemin = match[1];
  return chemin.split('/').pop(); // basename, pour rapprochement avec files/
}

/**
 * Parse un document KML (string) en waypoints + trace.
 * @param {string} xmlString
 * @returns {{ waypoints: Array, trackCoords: Array }}
 */
function parseKML(xmlString) {
  const doc = new DOMParser().parseFromString(xmlString, 'text/xml');
  const placemarks = Array.from(doc.getElementsByTagName('Placemark'));

  const waypoints = [];
  let trackCoords = [];

  for (const placemark of placemarks) {
    const nameEl = placemark.getElementsByTagName('name')[0];
    const descriptionEl = placemark.getElementsByTagName('description')[0];
    const pointEl = placemark.getElementsByTagName('Point')[0];
    const lineStringEl = placemark.getElementsByTagName('LineString')[0];

    const descriptionTexte = descriptionEl ? descriptionEl.textContent : '';

    if (pointEl) {
      const coordsEl = pointEl.getElementsByTagName('coordinates')[0];
      const coordsTexte = coordsEl ? coordsEl.textContent.trim() : '';
      if (coordsTexte) {
        const [lon, lat] = coordsTexte.split(',').map(Number);
        waypoints.push({
          name: nameEl ? nameEl.textContent : 'Waypoint',
          comment: extraireCommentaireDeDescription(descriptionTexte),
          lat,
          lon,
          photoName: extrairePhotoDeDescription(descriptionTexte),
          photoBlob: null, // rempli par parseKMZ si le KMZ contient la photo
        });
      }
    } else if (lineStringEl) {
      const coordsEl = lineStringEl.getElementsByTagName('coordinates')[0];
      const coordsTexte = coordsEl ? coordsEl.textContent.trim() : '';
      if (coordsTexte) {
        trackCoords = coordsTexte
          .split(/\s+/)
          .filter(Boolean)
          .map((triplet) => {
            const [lon, lat] = triplet.split(',').map(Number);
            return [lat, lon];
          });
      }
    }
  }

  return { waypoints, trackCoords };
}

// ---------- GPX ----------

/**
 * Parse un fichier GPX (string) en waypoints + trace.
 * Lit les <wpt> (name/cmt ou desc) et concatène tous les <trkpt> de tous
 * les <trkseg> rencontrés en une seule trace.
 * @param {string} xmlString
 * @returns {{ waypoints: Array, trackCoords: Array }}
 */
function parseGPX(xmlString) {
  const doc = new DOMParser().parseFromString(xmlString, 'text/xml');

  const waypoints = Array.from(doc.getElementsByTagName('wpt')).map((wpt) => {
    const nameEl = wpt.getElementsByTagName('name')[0];
    const cmtEl = wpt.getElementsByTagName('cmt')[0] || wpt.getElementsByTagName('desc')[0];
    return {
      name: nameEl ? nameEl.textContent : 'Waypoint',
      comment: cmtEl ? cmtEl.textContent : '',
      lat: parseFloat(wpt.getAttribute('lat')),
      lon: parseFloat(wpt.getAttribute('lon')),
      photoName: null,
      photoBlob: null,
    };
  });

  const trackCoords = Array.from(doc.getElementsByTagName('trkpt')).map((trkpt) => [
    parseFloat(trkpt.getAttribute('lat')),
    parseFloat(trkpt.getAttribute('lon')),
  ]);

  return { waypoints, trackCoords };
}

/**
 * Parse un KMZ (Blob/File) : dézippe, lit doc.kml (ou le premier .kml trouvé),
 * puis rattache les photos embarquées aux waypoints par nom de fichier.
 * @param {Blob} fileBlob
 * @returns {Promise<{ waypoints: Array, trackCoords: Array }>}
 */
async function parseKMZ(fileBlob) {
  if (typeof JSZip === 'undefined') {
    throw new Error('JSZip non chargé — voir vendor/jszip.min.js');
  }
  const zip = await JSZip.loadAsync(fileBlob);

  const kmlEntry = Object.values(zip.files).find((f) => f.name.toLowerCase().endsWith('.kml'));
  if (!kmlEntry) {
    throw new Error('Aucun fichier .kml trouvé dans le KMZ');
  }
  const xmlString = await kmlEntry.async('string');
  const { waypoints, trackCoords } = parseKML(xmlString);

  // Rattachement des photos par nom de fichier (basename), où qu'elles soient dans le zip.
  for (const wp of waypoints) {
    if (!wp.photoName) continue;
    const entree = Object.values(zip.files).find(
      (f) => !f.dir && f.name.split('/').pop() === wp.photoName
    );
    if (entree) {
      wp.photoBlob = await entree.async('blob');
    }
  }

  return { waypoints, trackCoords };
}
