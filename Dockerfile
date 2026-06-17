FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

ARG CACHEBUST=dev
ARG TOPAZ_BUILD=dev
ENV TOPAZ_BUILD=$TOPAZ_BUILD

COPY . .

RUN npm run build:web \
  && test -f dist-web/index.html \
  && grep -q "Next Level Notes" dist-web/assets/*.js

ENV TOPAZ_DATA_DIR=/data PORT=3921 TOPAZ_HUB=true TOPAZ_NO_BONJOUR=true

EXPOSE 3921

COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

CMD ["/docker-entrypoint.sh"]
