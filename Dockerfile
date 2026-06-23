FROM node:20-alpine AS build
WORKDIR /app

# Cache buster
ARG GIT_SHA
RUN echo "GIT_SHA=${GIT_SHA}"

# Layer 1: install deps
COPY frontend/package.json frontend/package-lock.json ./
RUN npm install

# Layer 2: copy source and config
COPY frontend/src ./src
COPY frontend/angular.json \
     frontend/tsconfig.json \
     frontend/tsconfig.app.json \
     frontend/tailwind.config.js \
     frontend/postcss.config.js \
     frontend/ngsw-config.json \
     ./
RUN mkdir -p public && cp frontend/public/* public/ 2>/dev/null || true

# Layer 3: build
ENV NODE_OPTIONS=--max_old_space_size=2048
RUN npx ng build --configuration production

# Layer 4: serve
FROM nginx:alpine
COPY --from=build /app/dist/frontend/browser /usr/share/nginx/html

# Replace Service Worker with self-destruct version (unregisters itself)
RUN echo "self.addEventListener('install',function(){self.skipWaiting()});self.addEventListener('activate',function(){self.registration.unregister().then(function(){self.clients.matchAll({type:'window'}).then(function(clients){clients.forEach(function(c){c.navigate(c.url)})})})});" > /usr/share/nginx/html/ngsw-worker.js
RUN rm -f /usr/share/nginx/html/ngsw.json /usr/share/nginx/html/safety-worker.js /usr/share/nginx/html/worker-basic.min.js

COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
