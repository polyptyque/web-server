#!/bin/bash

Color_Off='\033[0m'       # Text Reset
Red='\033[0;31m'          # Red
Green='\033[0;32m'        # Green

echo -e "$Green> Pull the last commit from current branch... $Color_Off"

git pull

echo -e "$Green> Build the docker image, with latest modifictions... $Color_Off"

docker build -t polyptyque:latest .

echo -e "$Red> Stop and remove the container... $Color_Off"

docker rm -f polyptyque.photo

echo -e "$Green> Run the container... $Color_Off"

docker run -d --link gramme2-mysql:mysql -e VIRTUAL_HOST=polyptyque.photo --name polyptyque.photo --restart=always -v $(pwd)/uploads:/usr/src/app/uploads -v $(pwd)/mixes:/usr/src/app/mixes polyptyque:latest

echo -e "$Green> Done.$Color_Off"