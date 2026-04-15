# ── Stage 1: Build client ────────────────────────────────────
FROM node:22-alpine AS client-builder
WORKDIR /client

COPY client/package.json ./
RUN npm install

COPY client/tsconfig.json client/vite.config.ts client/index.html ./
COPY client/src/ ./src/

RUN npm run build

# ── Stage 2: Build server ────────────────────────────────────
FROM node:22-alpine AS server-builder
WORKDIR /app

COPY server/package.json ./
RUN npm install

COPY server/tsconfig.json ./
COPY server/src/ ./src/
RUN npm run build

# ── Stage 3: Runtime ─────────────────────────────────────────
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY --from=server-builder /app/package.json ./
COPY --from=server-builder /app/node_modules ./node_modules
COPY --from=server-builder /app/dist ./dist

# Client build output served as static files at /app/public
COPY --from=client-builder /client/dist ./public

EXPOSE 3014

CMD ["node", "dist/index.js"]
