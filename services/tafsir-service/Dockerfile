# Build stage
FROM oven/bun:1 AS builder
WORKDIR /app

COPY shared/package.json ./shared/
COPY tafsir-service/package.json ./tafsir-service/

WORKDIR /app/shared
RUN bun install
WORKDIR /app/tafsir-service
RUN bun install

COPY shared/ ../shared/
COPY tafsir-service/ .

RUN bun build src/index.ts --outdir dist

# Production stage
FROM oven/bun:1-slim
WORKDIR /app

COPY --from=builder /app/tafsir-service/dist ./dist
COPY --from=builder /app/tafsir-service/node_modules ./node_modules

ENV NODE_ENV=production
ENV PORT=3004

EXPOSE 3004

CMD ["bun", "run", "dist/index.js"]
