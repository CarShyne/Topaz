FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build:web

ENV TOPAZ_DATA_DIR=/data PORT=3921 TOPAZ_HUB=true TOPAZ_NO_BONJOUR=true TOPAZ_BUILD=2025-06-17

EXPOSE 3921

COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

CMD ["/docker-entrypoint.sh"]
