FROM node:20-alpine
WORKDIR /app

# Install git (for clone) and wget (for healthcheck)
RUN apk add --no-cache git wget

# Clone repo and extract backend
RUN git clone https://github.com/NinePe/personal-app.git /tmp/repo
RUN cp /tmp/repo/backend/package.json /tmp/repo/backend/package-lock.json ./
RUN npm ci --omit=dev
RUN cp -r /tmp/repo/backend/src ./src
RUN rm -rf /tmp/repo

EXPOSE 3000

# Run as non-root user for security
USER node

CMD ["node", "src/index.js"]