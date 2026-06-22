FROM node:20-alpine AS build
WORKDIR /app

RUN apk add --no-cache git
RUN git clone https://github.com/NinePe/personal-app.git /tmp/repo

# Copy only frontend files for npm ci
RUN cp /tmp/repo/frontend/package.json /tmp/repo/frontend/package-lock.json ./
RUN npm ci

# Copy frontend source and config files
RUN cp -r /tmp/repo/frontend/src ./src
RUN cp /tmp/repo/frontend/angular.json \
       /tmp/repo/frontend/tsconfig.json \
       /tmp/repo/frontend/tsconfig.app.json \
       /tmp/repo/frontend/tailwind.config.js \
       /tmp/repo/frontend/postcss.config.js \
       /tmp/repo/frontend/ngsw-config.json \
       ./
RUN mkdir -p public && cp -r /tmp/repo/frontend/public/* public/ 2>/dev/null || true
RUN cp /tmp/repo/frontend/nginx.conf /tmp/nginx.conf
RUN rm -rf /tmp/repo

ENV NODE_OPTIONS=--max_old_space_size=2048
RUN npx ng build --configuration production

FROM nginx:alpine
COPY --from=build /app/dist/frontend/browser /usr/share/nginx/html
COPY --from=build /tmp/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
