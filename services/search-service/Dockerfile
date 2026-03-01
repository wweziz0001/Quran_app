# Build stage
FROM oven/bun:1 AS builder
WORKDIR /app

COPY shared/package.json ./shared/
COPY search-service/package.json ./search-service/

WORKDIR /app/shared
RUN bun install
WORKDIR /app/search-service
RUN bun install

COPY shared/ ../shared/
COPY search-service/ .

RUN bun build src/index.ts --outdir dist

# Production stage
FROM oven/bun:1-slim
WORKDIR /app

COPY --from=builder /app/search-service/dist ./dist
COPY --from=builder /app/search-service/node_modules ./node_modules

ENV NODE_ENV=production
ENV PORT=3003

EXPOSE 3003

CMD ["bun", "run", "dist/index.js"]
