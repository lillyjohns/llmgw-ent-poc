FROM node:20-slim AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --production=false
COPY tsconfig.json ./
COPY src/ ./src/
COPY config/ ./config/
RUN npm run build

FROM node:20-slim AS runner

WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/config ./config
COPY package.json ./

ENV NODE_ENV=production
ENV PORT=4000

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD curl -f http://localhost:4000/health || exit 1

CMD ["node", "dist/proxy/server.js"]
