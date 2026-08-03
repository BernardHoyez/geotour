// Module partagé : lecture EXIF — parseur binaire custom, sans dépendance,
// migré depuis photo2waypoint.
//
// Fournit :
// - lireCoordonneesGPS(fileBlob) -> Promise<{ lat, lon } | null>
// - lireDateHeure(fileBlob) -> Promise<Date | null>

function lireUInt16(view, offset, little) {
  return view.getUint16(offset, little);
}

function lireUInt32(view, offset, little) {
  return view.getUint32(offset, little);
}

// Taille en octets d'une valeur EXIF selon son type.
const TAILLE_PAR_TYPE = { 1: 1, 2: 1, 3: 2, 4: 4, 5: 8, 7: 1, 9: 4, 10: 8 };

/**
 * Lit une entrée d'IFD (12 octets) à l'offset donné et retourne
 * { tag, type, count, valeur } où valeur est un nombre, une chaîne,
 * ou un tableau de rationnels [num, den] selon le type.
 */
function lireEntreeIFD(view, tiffStart, entryOffset, little) {
  const tag = lireUInt16(view, entryOffset, little);
  const type = lireUInt16(view, entryOffset + 2, little);
  const count = lireUInt32(view, entryOffset + 4, little);
  const tailleUnite = TAILLE_PAR_TYPE[type] || 1;
  const tailleTotale = tailleUnite * count;

  // Si la valeur tient dans 4 octets, elle est stockée directement ;
  // sinon les 4 octets contiennent un offset vers la donnée réelle.
  const dataOffset = tailleTotale <= 4 ? entryOffset + 8 : tiffStart + lireUInt32(view, entryOffset + 8, little);

  let valeur;
  if (type === 2) {
    // ASCII : chaîne terminée par \0
    const octets = [];
    for (let i = 0; i < count; i++) octets.push(view.getUint8(dataOffset + i));
    valeur = String.fromCharCode(...octets).replace(/\0+$/, '');
  } else if (type === 5 || type === 10) {
    // RATIONAL / SRATIONAL : count paires [num, den]
    valeur = [];
    for (let i = 0; i < count; i++) {
      const num = type === 5
        ? lireUInt32(view, dataOffset + i * 8, little)
        : view.getInt32(dataOffset + i * 8, little);
      const den = type === 5
        ? lireUInt32(view, dataOffset + i * 8 + 4, little)
        : view.getInt32(dataOffset + i * 8 + 4, little);
      valeur.push([num, den]);
    }
  } else if (type === 3) {
    const vals = [];
    for (let i = 0; i < count; i++) vals.push(view.getUint16(dataOffset + i * 2, little));
    valeur = count === 1 ? vals[0] : vals;
  } else if (type === 4 || type === 9) {
    const vals = [];
    for (let i = 0; i < count; i++) {
      vals.push(type === 4 ? lireUInt32(view, dataOffset + i * 4, little) : view.getInt32(dataOffset + i * 4, little));
    }
    valeur = count === 1 ? vals[0] : vals;
  } else {
    // BYTE / autres : on lit tel quel, peu utile ici
    valeur = lireUInt32(view, entryOffset + 8, little);
  }

  return { tag, type, count, valeur };
}

/**
 * Parse un IFD complet à l'offset donné et retourne une Map tag -> valeur,
 * ainsi que l'offset du prochain IFD (0 si aucun).
 */
function lireIFD(view, tiffStart, ifdOffset, little) {
  const nbEntrees = lireUInt16(view, ifdOffset, little);
  const entrees = new Map();
  for (let i = 0; i < nbEntrees; i++) {
    const entryOffset = ifdOffset + 2 + i * 12;
    const { tag, valeur } = lireEntreeIFD(view, tiffStart, entryOffset, little);
    entrees.set(tag, valeur);
  }
  const nextIfdOffset = lireUInt32(view, ifdOffset + 2 + nbEntrees * 12, little);
  return { entrees, nextIfdOffset };
}

/**
 * Convertit un triplet de rationnels [degrés, minutes, secondes] en degrés décimaux.
 */
function rationnelsVersDegresDecimaux(triplet) {
  const [deg, min, sec] = triplet.map(([num, den]) => (den === 0 ? 0 : num / den));
  return deg + min / 60 + sec / 3600;
}

/**
 * Localise le segment APP1 "Exif" d'un JPEG et retourne le DataView positionné
 * sur le début du header TIFF, ou null si absent.
 */
function trouverSegmentExif(arrayBuffer) {
  const view = new DataView(arrayBuffer);
  if (view.getUint16(0, false) !== 0xffd8) return null; // pas un JPEG

  let offset = 2;
  while (offset < view.byteLength) {
    const marker = view.getUint16(offset, false);
    if (marker === 0xffd9) break; // EOI

    if ((marker & 0xff00) !== 0xff00) break; // marqueur invalide

    // Marqueurs sans segment de longueur (rare en pratique dans nos JPEG)
    if (marker === 0xffd8 || (marker >= 0xffd0 && marker <= 0xffd7) || marker === 0xff01) {
      offset += 2;
      continue;
    }

    const length = view.getUint16(offset + 2, false);

    if (marker === 0xffe1) {
      // Vérifie l'en-tête "Exif\0\0"
      const exifHeaderOffset = offset + 4;
      const estExif =
        view.getUint32(exifHeaderOffset, false) === 0x45786966 && // "Exif"
        view.getUint16(exifHeaderOffset + 4, false) === 0x0000;
      if (estExif) {
        const tiffStart = exifHeaderOffset + 6;
        return { view, tiffStart };
      }
    }

    if (marker === 0xffda) break; // début des données image (Start Of Scan) : plus d'EXIF après

    offset += 2 + length;
  }
  return null;
}

async function chargerArrayBuffer(fileBlob) {
  if (fileBlob.arrayBuffer) return fileBlob.arrayBuffer();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(fileBlob);
  });
}

/**
 * Lit les coordonnées GPS d'une photo (fichier/Blob JPEG).
 * @param {Blob|File} fileBlob
 * @returns {Promise<{lat:number, lon:number}|null>}
 */
async function lireCoordonneesGPS(fileBlob) {
  const arrayBuffer = await chargerArrayBuffer(fileBlob);
  const segment = trouverSegmentExif(arrayBuffer);
  if (!segment) return null;
  const { view, tiffStart } = segment;

  const little = view.getUint16(tiffStart, false) === 0x4949;
  if (little === undefined) return null;

  const ifd0Offset = lireUInt32(view, tiffStart + 4, little);
  const { entrees: entreesIFD0 } = lireIFD(view, tiffStart, tiffStart + ifd0Offset, little);

  const gpsIfdOffsetRelatif = entreesIFD0.get(0x8825); // GPSInfo IFD pointer
  if (gpsIfdOffsetRelatif === undefined) return null;

  const { entrees: entreesGPS } = lireIFD(view, tiffStart, tiffStart + gpsIfdOffsetRelatif, little);

  const latRef = entreesGPS.get(1); // 'N' ou 'S'
  const latTriplet = entreesGPS.get(2);
  const lonRef = entreesGPS.get(3); // 'E' ou 'W'
  const lonTriplet = entreesGPS.get(4);

  if (!latTriplet || !lonTriplet) return null;

  let lat = rationnelsVersDegresDecimaux(latTriplet);
  let lon = rationnelsVersDegresDecimaux(lonTriplet);
  if (latRef === 'S') lat = -lat;
  if (lonRef === 'W') lon = -lon;

  return { lat, lon };
}

/**
 * Lit la date/heure de prise de vue (tag DateTimeOriginal ou DateTime).
 * @param {Blob|File} fileBlob
 * @returns {Promise<Date|null>}
 */
async function lireDateHeure(fileBlob) {
  const arrayBuffer = await chargerArrayBuffer(fileBlob);
  const segment = trouverSegmentExif(arrayBuffer);
  if (!segment) return null;
  const { view, tiffStart } = segment;
  const little = view.getUint16(tiffStart, false) === 0x4949;

  const ifd0Offset = lireUInt32(view, tiffStart + 4, little);
  const { entrees: entreesIFD0 } = lireIFD(view, tiffStart, tiffStart + ifd0Offset, little);

  // Tag 0x0132 = DateTime (IFD0). Le DateTimeOriginal (0x9003) est dans le sous-IFD Exif (0x8769),
  // non systématiquement lu ici pour rester simple ; DateTime suffit dans la grande majorité des cas.
  const dateTimeStr = entreesIFD0.get(0x0132);
  if (!dateTimeStr) return null;

  // Format EXIF : "YYYY:MM:DD HH:MM:SS"
  const m = dateTimeStr.match(/^(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})$/);
  if (!m) return null;
  const [, annee, mois, jour, heure, minute, seconde] = m.map(Number);
  return new Date(annee, mois - 1, jour, heure, minute, seconde);
}
