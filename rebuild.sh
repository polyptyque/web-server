#!/bin/bash

echo "Pull the last commit from current branch..."

git pull

echo "Build the docker image, with latest modifictions..."

docker build -t polyptyque:latest .

echo "Stop and remove the container..."

docker rm -f polyptyque.photo

echo "Run the container..."

docker run -d -e VIRTUAL_HOST=polyptyque.photo --name polyptyque.photo --restart=always polyptyque:latest

echo "Done."