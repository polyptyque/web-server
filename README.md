# Web server

Serveur web accueillant les photos envoyées par l’installation *polyptyque*.

## Installation

Installer les packages node, via npm.
    
    npm install
    
Copier le fichier de configuration `config.json`, à partir du fichier de config par défaut `config-default.json` (et l'éditer si besoin.)    

    cp config-default.json config.json
    
## Démarrage

C’est simple !

    npm start
    > Server listening on: http://localhost:7777
    
## Docker
    
Un Dockerfile permet d'utiliser *Docker* rapidement. 
    
## Structure

```
app/
├── index.js                      ← Point d'entrée — bootstrap minimal
├── config.json                   ← Configuration (à créer depuis config-default.json)
├── config-default.json           ← Configuration par défaut
├── Dockerfile
├── package.json
│
├── src/                          ← Logique métier (Separation of Concerns)
│   ├── config.js                 ← Chargement config + constantes (_24H_, _1MONTH_, PORT…)
│   ├── db.js                     ← Connexion MySQL avec reconnexion automatique
│   ├── cache.js                  ← Middleware cache mémoire + gestion des slots images
│   ├── canvas.js                 ← Lazy loading du module canvas (natif C++)
│   ├── mail.js                   ← Lazy loading nodemailer + envoi d'e-mails
│   ├── middleware/
│   │   └── handlebars.js         ← Configuration du moteur de templates Handlebars
│   └── routes/
│       ├── upload.js             ← POST /upload — réception des archives photos
│       ├── images.js             ← GET /mixes/** — génération canvas (MixImages, ThumbsPreview)
│       ├── pages.js              ← Pages HTML (Home, Demo, Preview, Polypoto, Legals, /:uid)
│       └── static.js            ← Fichiers statiques publics + handler 404
│
├── public/                       ← Assets statiques (CSS, JS, images, fonts)
├── views/                        ← Templates Handlebars
│   ├── layouts/
│   └── mails/
├── uploads/                      ← Photos reçues (généré automatiquement)
├── mixes/                        ← Images mixées générées (généré automatiquement)
│   └── thumbs/
└── cache/                        ← Cache WebP (généré automatiquement)
    └── webp/
```

> **Note :** Les dossiers `uploads/`, `mixes/` et `cache/` sont créés automatiquement au démarrage si absents.
