# Build stage
FROM oven/bun:1 AS builder
WORKDIR /app

# Copy shared first
COPY shared/package.json ./shared/
COPY quran-service/package.json ./quran-service/

# Install dependencies
WORKDIR /app/shared
RUN bun install
WORKDIR /app/quran-service
RUN bun install

# Copy source
COPY shared/ ../shared/
COPY quran-service/ .

# Build
RUN bun build src/index.ts --outdir dist

# Production stage
FROM oven/bun:1-slim
WORKDIR /app

COPY --from=builder /app/quran-service/dist ./dist
COPY --from=builder /app/quran-service/node_modules ./node_modules
COPY --from=builder /app/shared ../shared

ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

CMD ["bun", "run", "dist/index.js"]
