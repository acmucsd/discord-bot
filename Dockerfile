FROM node:14-alpine AS builder
WORKDIR /usr/src/bot
COPY package*.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src src
RUN npm run build

FROM node:14-alpine
ENV NODE_ENV=production
RUN apk add --no-cache tini curl
WORKDIR /usr/src/bot
COPY package*.json ./
RUN npm install
COPY --from=builder /usr/src/bot/dist dist
RUN chown -R node:node .
USER node
WORKDIR /usr/src/bot/dist
CMD ["tini", "--", "node", "src/index.js"]
