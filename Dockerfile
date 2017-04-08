FROM node:alpine

# Create app directory
RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

VOLUME /usr/src/app/uploads
VOLUME /usr/src/app/mixes

# Install app dependencies
COPY package.json /usr/src/app/
RUN npm install

# Bundle app source
COPY . /usr/src/app

EXPOSE 80
EXPOSE 7777
CMD [ "npm", "start" ]