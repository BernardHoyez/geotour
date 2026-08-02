// Module partagé : construction et lecture de KML/KMZ.
// Fusionne buildKML/parseKML de randonneur8 et de photo2waypoint pour n'avoir
// plus qu'une seule implémentation (jusqu'ici dupliquée et corrigée séparément
// dans chaque app).
//
// TODO migration — reporter ces correctifs déjà validés dans les deux apps sources :
// - Échappement XML : n'échapper &, <, > que dans le texte d'élément brut ;
//   ne jamais échapper à l'intérieur d'un bloc CDATA (seul le terminateur ]]>
//   doit être protégé). Bug initial : apostrophes/guillemets dans les commentaires
//   ressortaient en &apos;/&quot; même en CDATA, où les entités ne sont jamais décodées.
// - Détection de la photo d'un waypoint à l'import : uniquement via un <img src="...">
//   trouvé dans le <description> du Placemark (pas dans BalloonStyle/text), puis
//   rapprochement par nom de fichier avec les fichiers embarqués dans le KMZ.
// - parseKML doit dériver le commentaire du texte de <description> (tags HTML retirés),
//   ne jamais le hardcoder à vide.
//
// TODO fonctions à fournir :
// - buildKML(waypoints, trackCoords) -> string
// - buildKMZ(waypoints, trackCoords) -> Blob (via JSZip vendorisé)
// - parseKML(xmlString) -> { waypoints, trackCoords }
// - parseKMZ(fileBlob) -> { waypoints, trackCoords } (dézippe puis parseKML)
