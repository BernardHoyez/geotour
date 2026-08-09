# GeoTour

Application web progressive (PWA) de préparation et de restitution de randonnées : édition de traces et de waypoints géolocalisés, création de waypoints à partir de photos, génération de fonds de carte hors-ligne, et diaporama de visite avec narration vocale.

Déployée sur : `bernardhoyez.github.io/geotour`

GeoTour réunit les fonctionnalités de trois applications précédentes (**randonneur8**, **photo2waypoint**, **ign2mbt**) en une seule PWA, sous forme d'onglets.

---

## Installation sur smartphone

1. Ouvrir `bernardhoyez.github.io/geotour` dans le navigateur.
2. Menu du navigateur → **Ajouter à l'écran d'accueil** (Android/Chrome) ou **Partager → Sur l'écran d'accueil** (iOS/Safari).
3. L'application fonctionne ensuite hors-ligne pour tout ce qui ne nécessite pas de fond de carte en ligne (voir onglet MBtiles ci-dessous pour le cas hors-ligne complet).

---

## Onglet 🗺 Édition

Écran principal : carte, waypoints, trace.

- **Importer un fichier** : glisser un fichier `.kmz`, `.kml` ou `.gpx` dans la zone prévue, ou cliquer pour parcourir.
  - **🔄 Remplacer** : le fichier importé remplace entièrement la session en cours (trace + waypoints).
  - **➕ Ajouter** : les waypoints du fichier s'ajoutent à la liste existante, sans toucher à la trace déjà chargée.
- **Fond de carte** : OSM, IGN Plan, IGN Ortho, ou **MBtiles** (fichier local chargé au préalable — voir plus bas). Les fonds IGN Plan/Ortho nécessitent une connexion réseau.
- **Ajouter un waypoint manuellement** : cliquer sur la carte, ou utiliser le bouton dédié, pour ouvrir la fiche waypoint (photo optionnelle, nom, commentaire).
- **Liste des waypoints** : chaque carte affiche un aperçu (📷 si une photo est associée, 🎵/🎬 si un audio/vidéo est associé), le nom, le commentaire.
  - **Réordonner** : saisir la poignée **⠿** à gauche de la carte et glisser vers le haut/bas. L'ordre choisi ici pilote aussi l'ordre de défilement du diaporama (onglet Visite).
- **Charger un fond MBtiles** : sélectionner un fichier `.mbtiles` généré dans l'onglet 🛰️ Générer MBtiles (ou produit par un autre outil, type MOBAC). Une fois chargé, il devient sélectionnable comme fond de carte, y compris sans réseau.
- **💾 Sauvegarder la session en KMZ** : exporte les waypoints et la trace actuels dans un fichier KMZ autonome (photos, audio et vidéo inclus), pour partage ou sauvegarde.
- **Statistiques** : nombre de waypoints, distance, D+ / D- (dénivelé positif/négatif), calculés automatiquement à partir de la trace.

---

## Onglet 📷 Création

Créer un waypoint, avec le choix explicite entre 3 modes de localisation (fonctionnalités inspirées de **kmzmanager**) :

1. **📷 Photo** — choisir une photo JPEG géolocalisée : lecture automatique des coordonnées GPS depuis les métadonnées EXIF.
   - Si absentes : saisir les coordonnées manuellement, ou **🗺️ Pointer sur la carte**.
2. **🗺️ Carte** — bascule sur l'onglet Édition en mode « clic pour placer » (mode crosshair existant).
3. **✍️ Coord.** — saisie directe de la latitude/longitude, sans passer par une photo.

Dans les trois cas, un **bloc de vérification** s'affiche ensuite : mini-carte avec le marqueur à la position trouvée et choix du fond (OSM / IGN Plan / IGN Ortho) pour confirmer visuellement la position, puis :

- **Nom** du waypoint.
- **Commentaire enrichi** : petite barre d'outils (gras, italique, souligné, liste, lien) au-dessus d'une zone de texte éditable.
- **Audio (mp3)** et **Vidéo (mp4)**, tous deux optionnels.

Puis au choix :
- **➕ Ajouter à la liste** : intègre le waypoint (avec son audio/vidéo) à la session en cours (onglet Édition) ; le commentaire est alors conservé en texte brut, pour rester compatible avec le reste de l'application (zone de saisie de la liste, aide IA, export KML principal).
- **💾 Enregistrer en KMZ** : exporte ce seul waypoint (photo + commentaire enrichi + audio + vidéo) en fichier KMZ autonome, indépendamment de son ajout ou non à la liste. Le commentaire garde alors sa mise en forme complète.

**Cas particulier du mode 🗺️ Carte** : ce mode bascule directement sur la grande carte de l'onglet Édition (mode « clic pour placer », sans passer par le bloc de vérification décrit ci-dessus) et ouvre la fenêtre **Nouveau waypoint** au clic — celle-ci propose les mêmes champs (nom, commentaire enrichi avec sa barre d'outils, photo, audio, vidéo).

Dans les deux cas (bloc de vérification ou fenêtre Nouveau waypoint), la règle est la même : la mise en forme du commentaire (gras, italique, liste, lien…) n'est conservée telle quelle que dans l'export KMZ autonome du volet Création (« 💾 Enregistrer en KMZ », disponible uniquement depuis le bloc de vérification). Dès qu'un waypoint est ajouté à la liste principale — que ce soit via « ➕ Ajouter à la liste » ou via la fenêtre Nouveau waypoint —, son commentaire redevient du texte brut, pour rester compatible avec le reste de l'application (édition dans la liste, aide IA, export KML principal, session KMZ).

---

---

## Onglet 🛰️ Générer MBtiles

Générer un fond de carte téléchargeable pour un usage hors-ligne (fonctionnalité héritée d'ign2mbt), à partir de la Géoplateforme IGN.

1. **Couche WMTS** : Plan IGN V2 ou Orthophotos (publiques, sans clé) — ou Scan IGN / Scan25 Tour (privées, nécessitent une **clé API IGN** personnelle, à renseigner en haut de la sidebar).
2. **Zone à couvrir** : dessiner un rectangle sur la carte (glisser-déposer à la souris, ou bouton **✏️ Sélectionner** puis glisser un doigt sur mobile).
3. **Niveaux de zoom** (min/max) : l'estimation du nombre de tuiles s'affiche automatiquement — au-delà de 200 000 tuiles, une confirmation est demandée (fichier volumineux, génération longue).
4. **Générer .mbtiles** : télécharge les tuiles puis produit un fichier `.mbtiles` (base SQLite), téléchargé sur l'appareil.
5. Ce fichier peut ensuite être chargé dans l'onglet Édition (bouton fond de carte MBtiles) **et/ou** embarqué dans un diaporama exporté (voir plus bas).

⚠️ La génération nécessite une connexion réseau (téléchargement des tuiles IGN) — c'est une opération à faire **avant** de partir sur le terrain.

---

## Onglet 🎬 Visite

Diaporama guidé des waypoints, dans l'ordre de la liste de l'onglet Édition.

- **▶ Lancer la visite** : dans l'application elle-même, avec narration vocale (TTS) du nom et du commentaire de chaque waypoint (bouton 🔊 Voix TTS pour choisir la voix), et lecture de l'**audio**/la **vidéo** associés au waypoint (si présents), affichés sous le commentaire.
- **⬇ Exporter HTML** : génère un **fichier HTML autonome**, à conserver sur le smartphone et à ouvrir sans avoir besoin de l'application — utile pour partager la visite ou l'emporter sur le terrain.
  - **📴 Inclure le fond MBtiles pour un usage hors-ligne** (case à cocher, active seulement si un MBtiles est chargé dans Édition) : embarque directement dans le fichier HTML exporté le fond de carte MBtiles, sql.js et Leaflet — **le fichier fonctionne alors intégralement sans réseau**, y compris son fond de carte. Sans cette case, le diaporama exporté utilise le fond IGN en ligne (nécessite du réseau à l'ouverture).
  - Le fichier exporté affiche aussi un **marqueur GPS pulsant** suivant la position réelle de l'utilisateur (si le navigateur l'autorise), pour comparer sur le terrain sa position avec celle des waypoints.
  - Nom du fichier : `<nom>-visite.html` (fond en ligne) ou `<nom>-visite-horsligne.html` (fond MBtiles embarqué).

⚠️ Point de vigilance non encore vérifié en conditions réelles : la géolocalisation (marqueur GPS) peut être bloquée par certains navigateurs sur un fichier ouvert directement en double-clic (`file://`), qui n'est pas considéré comme un contexte sécurisé. Firefox l'autorise généralement ; Chrome peut être plus restrictif selon la plateforme (notamment Android). Si le marqueur GPS reste bloqué sur « indisponible », c'est la piste à explorer.

---

## Onglet 📦 Déploiement

Génère un paquet complet (fichiers KML/GPX/JSON + page HTML de consultation avec carte, sans les fonctionnalités d'édition) prêt à héberger sur un site statique. Les popups de la carte incluent la photo (avec bouton **🔍 Agrandir**), ainsi que l'audio et la vidéo de chaque waypoint quand ils sont présents (dossiers `audio/` et `video/` du paquet ; référencés aussi dans le KML via `ExtendedData` et dans le GPX via des balises `<link>`). Le fichier `<nom_dossier>.json` du paquet (nom, vignette, liste des waypoints avec photo/audio/vidéo, trace) est prévu pour être exploité par un site tiers qui référencerait plusieurs coupes/randonnées (voir le site **Falaises de craie**).

---

## Historique du projet

GeoTour est reparti directement du code source réel de **randonneur8** (et non d'une réécriture), pour en conserver l'ergonomie et l'esthétique éprouvées, puis a intégré :

- l'onglet **Création** (apport de photo2waypoint : lecture EXIF, randonneur8 ne le faisait pas nativement) ;
- l'onglet **Générer MBtiles** (apport d'ign2mbt) ;
- la case à cocher d'export hors-ligne du diaporama, le marqueur GPS, et le réordonnancement des waypoints par glisser-déposer, ajoutés au fil des retours d'usage ;
- un sélecteur explicite à 3 modes de localisation dans le volet Création (Photo EXIF / Carte / Coordonnées), un commentaire enrichi (gras/italique/souligné/liste/lien), et des pièces jointes audio/vidéo par waypoint — propagées jusqu'aux exports KMZ, à la session, au diaporama Visite et au paquet Déploiement — fonctionnalités inspirées de **kmzmanager**, une autre PWA de création/visualisation de KMZ.

Chacun de ces ajouts a d'abord été testé sur une copie du projet (temporairement nommée *geotour2*) avant d'être reporté ici, pour ne pas risquer de régression sur la version en cours d'usage.

### Limites connues

- Le fond MBtiles doit être généré à l'avance (réseau requis) ; son usage en Édition et dans le diaporama exporté est lui hors-ligne.
- L'assistant IA de génération de commentaires (hérité de randonneur8) nécessite une connexion réseau et une clé d'API du service concerné.
- Le commentaire enrichi (gras/italique/souligné/liste/lien) n'est conservé tel quel que dans l'export KMZ autonome du volet Création (« 💾 Enregistrer en KMZ ») ; une fois le waypoint ajouté à la liste principale (« ➕ Ajouter à la liste »), le commentaire redevient du texte brut pour rester compatible avec le reste de l'application (édition dans la liste, aide IA, export KML principal, session KMZ).
- Testé principalement en logique (imports/exports, calculs, absence de collisions de code) ; les tests de terrain (GPS, tactile, autonomie) restent à mener.
