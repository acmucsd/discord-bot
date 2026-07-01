FROM node:18-alpine AS builder

# Needed for the canvas package binaries
RUN apk add --no-cache \ 
    python3 \
    make \
    g++ \
    pkgconf \
    pixman-dev \
    cairo-dev \
    pango-dev \
    jpeg-dev \
    giflib-dev

WORKDIR /usr/src/bot

COPY package*.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src src

RUN npm run build

RUN npm prune --production


FROM node:18-alpine

ENV NODE_ENV=production

RUN apk add --no-cache \
    tini \
    curl \
    cairo \
    pango \
    jpeg \
    giflib \
    pixman

WORKDIR /usr/src/bot

COPY --from=builder /usr/src/bot/node_modules ./node_modules
COPY --from=builder /usr/src/bot/package*.json ./
COPY --from=builder /usr/src/bot/dist ./dist
COPY --from=builder /usr/src/bot/src ./src

RUN chown -R node:node /usr/src/bot

USER node

CMD ["tini", "--", "node", "dist/src/index.js"]