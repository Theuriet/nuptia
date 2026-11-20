# NUPTIA — prototype initial

Cette version est un prototype web statique, pensé pour être testé depuis un téléphone ou un ordinateur.

## Contenu
- `index.html` : application complète (interface, styles et logique).
- Plusieurs espaces de mariage indépendants dans le navigateur.
- Tableau de bord, gestion des invités, tables et contrôle manuel des entrées.
- Invitation publique et invitation personnalisée par code.
- QR code généré dans le navigateur (connexion Internet nécessaire pour charger la bibliothèque QR).
- Partage manuel par WhatsApp classique (pas de WhatsApp Business).
- Interface français / anglais.

## Lancer le prototype
Ouvrir `index.html` dans un navigateur moderne. Pour partager les invitations par de vrais liens, publier le dossier sur GitHub Pages, Netlify ou Vercel.

## Important — limites de cette première version
- Les données sont enregistrées dans le `localStorage` du navigateur utilisé. Elles ne sont pas encore synchronisées entre plusieurs téléphones ou utilisateurs.
- Ce n'est pas encore une application multi-clients sécurisée : les rôles administrateur / organisateur / protocole, l'authentification, une base de données distante, les sauvegardes et la synchronisation hors ligne devront être ajoutés avant un usage réel.
- Le QR est un identifiant de démonstration ; le contrôle d'accès devra être validé côté serveur dans la version de production.
- Les liens de partage ne fonctionneront publiquement qu'après publication sur un hébergement web.
- La date de mariage est facultative : le compte à rebours n'est pas affiché tant qu'elle n'est pas définie.

## Prochaine étape
Publier ce prototype sur GitHub Pages ou Vercel, puis le tester sur Android. Ensuite, construire la base de données et l'authentification pour permettre le partage réel des données entre plusieurs appareils.
