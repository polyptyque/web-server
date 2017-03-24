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
