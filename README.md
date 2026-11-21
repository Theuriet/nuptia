# NUPTIA — prototype enrichi (V2)

NUPTIA est un prototype mobile-first de gestion d'invitations de mariage.

## Fonctionnalités conservées
- Tableau de bord et espaces de mariage multiples
- Liste des invités, nombre de places et statut RSVP
- Attribution des invités aux tables avec contrôle de capacité
- Accueil / check-in des invités
- Liens d'invitation publique et personnalisée
- QR code pour l'invitation individuelle
- Partage par WhatsApp standard et copie du lien
- Interface français / anglais

## Nouveaux ajouts V2
Dans la rubrique **Personnaliser** (menu de gauche), l'organisateur peut ajouter :
- Photo des mariés (sélection depuis le téléphone, optimisation automatique)
- Histoire du couple et message d'invitation
- Date du mariage
- Lieu de cérémonie et lieu de réception
- Lien Google Maps
- Lien direct vers une musique audio (MP3 ou autre fichier audio accessible)
- Dress code, note et programme de la journée
- Prévisualisation de l'invitation

## Installation sur GitHub Pages
1. Décompresser l'archive.
2. Ouvrir le dépôt GitHub `nuptia`.
3. Remplacer le fichier `index.html` à la racine par celui du dossier `NUPTIA`.
4. Remplacer également `README.md` si souhaité.
5. Commit les modifications. GitHub Pages republiera le site.

## Limites importantes du prototype
- Les données sont conservées dans le `localStorage` du navigateur de l'appareil utilisé.
- La photo est optimisée puis conservée dans ce stockage local. Éviter les photos très lourdes.
- La musique doit être fournie par une URL directe vers un fichier audio accessible ; un lien vers une page YouTube ou Spotify ne suffit pas.
- Les données ne sont pas encore synchronisées entre plusieurs téléphones ou comptes.
- Les liens d'invitation personnalisés ne deviennent réellement partageables entre appareils qu'après mise en place d'une base de données et d'un stockage en ligne.
- Il n'y a pas encore de véritable authentification, de rôles organisateur, ni de sécurité multi-utilisateur.

Cette V2 est un prototype enrichi et non une plateforme de production. La prochaine phase doit intégrer une authentification et un backend (base de données + stockage des photos et médias) avant une utilisation commerciale ou la gestion de vrais événements.
