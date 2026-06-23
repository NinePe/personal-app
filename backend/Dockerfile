FROM node:20-alpine
WORKDIR /app

# Install wget for healthcheck
RUN apk add --no-cache wget

# Paths are relative to repo root (EasyPanel build context)
COPY backend/package.json backend/package-lock.json ./
RUN npm ci --omit=dev
COPY backend/src/ ./src/

EXPOSE 3000
USER node
CMD ["node", "src/index.js"]
