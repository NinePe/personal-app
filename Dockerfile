FROM node:20-alpine AS build
WORKDIR /app

# Layer 1: install deps (cacheable)
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

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
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
