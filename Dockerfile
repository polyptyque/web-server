FROM node:latest

# Installe les packages requis (pour node-canvas)
RUN apt-get update \
    && apt-get install -qq libcairo2-dev libjpeg-dev libpango1.0-dev libgif-dev build-essential g++


# Créé les dossiers de l'app
RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

# Marque les volumes
VOLUME /usr/src/app/uploads
VOLUME /usr/src/app/mixes

# Installe les packages npm
COPY package.json /usr/src/app/
RUN npm install

# Copie les sources
COPY ./config-default.json /usr/src/app/
COPY ./public /usr/src/app/public
COPY ./views /usr/src/app/views
COPY ./index.js /usr/src/app/

# Expose des ports réseaux
EXPOSE 80
EXPOSE 7777
# Démarre l'application
CMD [ "npm", "start" ]