#!/bin/bash

git pull

docker build -t polyptyque:latest .

docker rm -f polyptyque.photo

docker run -d -e VIRTUAL_HOST=polyptyque.photo --name polyptyque.photo --restart=always polyptyque:latest