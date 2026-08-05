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
- **Liste des waypoints** : chaque carte affiche un aperçu (📷 si une photo est associée), le nom, le commentaire.
  - **Réordonner** : saisir la poignée **⠿** à gauche de la carte et glisser vers le haut/bas. L'ordre choisi ici pilote aussi l'ordre de défilement du diaporama (onglet Visite).
- **Charger un fond MBtiles** : sélectionner un fichier `.mbtiles` généré dans l'onglet 🛰️ Générer MBtiles (ou produit par un autre outil, type MOBAC). Une fois chargé, il devient sélectionnable comme fond de carte, y compris sans réseau.
- **💾 Sauvegarder la session en KMZ** : exporte les waypoints et la trace actuels dans un fichier KMZ autonome (photos incluses), pour partage ou sauvegarde.
- **Statistiques** : nombre de waypoints, distance, D+ / D- (dénivelé positif/négatif), calculés automatiquement à partir de la trace.

---

## Onglet 📷 Création

Créer un waypoint à partir d'une photo géolocalisée (fonctionnalité héritée de photo2waypoint).

1. Choisir une photo JPEG (glisser-déposer ou clic).
2. **Lecture automatique des coordonnées GPS** contenues dans les métadonnées EXIF de la photo.
   - Si trouvées : passage direct à l'étape de vérification.
   - Si absentes : deux choix — saisir les coordonnées manuellement, ou **🗺️ Pointer sur la carte** (bascule sur l'onglet Édition en mode « clic pour placer »).
3. **Bloc de vérification** : la photo affichée en entier (non recadrée), une mini-carte avec le marqueur à la position trouvée et le choix du fond (OSM / IGN Plan / IGN Ortho) pour confirmer visuellement que la position est cohérente.
4. Renseigner **nom** et **commentaire**, puis :
   - **➕ Ajouter à la liste** : intègre le waypoint à la session en cours (onglet Édition).
   - **💾 Enregistrer en KMZ** : exporte ce seul waypoint (photo + commentaire) en fichier KMZ autonome, indépendamment de son ajout ou non à la liste.

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

- **▶ Lancer la visite** : dans l'application elle-même, avec narration vocale (TTS) du nom et du commentaire de chaque waypoint (bouton 🔊 Voix TTS pour choisir la voix).
- **⬇ Exporter HTML** : génère un **fichier HTML autonome**, à conserver sur le smartphone et à ouvrir sans avoir besoin de l'application — utile pour partager la visite ou l'emporter sur le terrain.
  - **📴 Inclure le fond MBtiles pour un usage hors-ligne** (case à cocher, active seulement si un MBtiles est chargé dans Édition) : embarque directement dans le fichier HTML exporté le fond de carte MBtiles, sql.js et Leaflet — **le fichier fonctionne alors intégralement sans réseau**, y compris son fond de carte. Sans cette case, le diaporama exporté utilise le fond IGN en ligne (nécessite du réseau à l'ouverture).
  - Le fichier exporté affiche aussi un **marqueur GPS pulsant** suivant la position réelle de l'utilisateur (si le navigateur l'autorise), pour comparer sur le terrain sa position avec celle des waypoints.
  - Nom du fichier : `<nom>-visite.html` (fond en ligne) ou `<nom>-visite-horsligne.html` (fond MBtiles embarqué).

⚠️ Point de vigilance non encore vérifié en conditions réelles : la géolocalisation (marqueur GPS) peut être bloquée par certains navigateurs sur un fichier ouvert directement en double-clic (`file://`), qui n'est pas considéré comme un contexte sécurisé. Firefox l'autorise généralement ; Chrome peut être plus restrictif selon la plateforme (notamment Android). Si le marqueur GPS reste bloqué sur « indisponible », c'est la piste à explorer.

---

## Onglet 📦 Déploiement

Génère un paquet complet (fichiers KML/GPX/JSON + page HTML de consultation avec carte, sans les fonctionnalités d'édition) prêt à héberger sur un site statique, avec un bouton **🔍 Agrandir** pour les photos.

---

## Historique du projet

GeoTour est reparti directement du code source réel de **randonneur8** (et non d'une réécriture), pour en conserver l'ergonomie et l'esthétique éprouvées, puis a intégré :

- l'onglet **Création** (apport de photo2waypoint : lecture EXIF, randonneur8 ne le faisait pas nativement) ;
- l'onglet **Générer MBtiles** (apport d'ign2mbt) ;
- la case à cocher d'export hors-ligne du diaporama, le marqueur GPS, et le réordonnancement des waypoints par glisser-déposer, ajoutés au fil des retours d'usage.

Le projet s'est un temps appelé *geotour2* le temps de stabiliser ces ajouts sans risquer de régression sur la version en cours d'usage ; il reprend maintenant son nom définitif **GeoTour**.

### Limites connues

- Le fond MBtiles doit être généré à l'avance (réseau requis) ; son usage en Édition et dans le diaporama exporté est lui hors-ligne.
- L'assistant IA de génération de commentaires (hérité de randonneur8) nécessite une connexion réseau et une clé d'API du service concerné.
- Testé principalement en logique (imports/exports, calculs, absence de collisions de code) ; les tests de terrain (GPS, tactile, autonomie) restent à mener.
