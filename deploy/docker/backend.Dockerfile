FROM node:20-alpine

WORKDIR /app

COPY backend/package*.json ./
RUN npm ci --omit=dev

COPY backend/ ./

ENV NODE_ENV=production
EXPOSE 5000
RUN chmod +x ./deploy/docker/entrypoint.sh

ENTRYPOINT ["/bin/sh", "./deploy/docker/entrypoint.sh"]
