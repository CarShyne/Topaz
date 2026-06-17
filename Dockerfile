FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build:web

ENV TOPAZ_DATA_DIR=/data PORT=3921 TOPAZ_HUB=true

EXPOSE 3921

CMD ["npx", "tsx", "server/hub-server.ts"]
