FROM node:20-alpine AS base

WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM base AS dev

COPY . .
COPY docker/dev-entrypoint.sh /usr/local/bin/dev-entrypoint.sh
RUN chmod +x /usr/local/bin/dev-entrypoint.sh
EXPOSE 5173
ENTRYPOINT ["dev-entrypoint.sh"]

FROM base AS build

COPY . .
RUN npm run build

FROM nginx:1.27-alpine AS prod

COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
