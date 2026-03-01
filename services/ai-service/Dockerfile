# Build stage
FROM oven/bun:1 AS builder
WORKDIR /app

COPY shared/package.json ./shared/
COPY ai-service/package.json ./ai-service/

WORKDIR /app/shared
RUN bun install
WORKDIR /app/ai-service
RUN bun install

COPY shared/ ../shared/
COPY ai-service/ .

RUN bun build src/index.ts --outdir dist

# Production stage
FROM oven/bun:1-slim
WORKDIR /app

COPY --from=builder /app/ai-service/dist ./dist
COPY --from=builder /app/ai-service/node_modules ./node_modules

ENV NODE_ENV=production
ENV PORT=3007

EXPOSE 3007

CMD ["bun", "run", "dist/index.js"]
