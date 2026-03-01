# Build stage
FROM oven/bun:1 AS builder
WORKDIR /app

COPY shared/package.json ./shared/
COPY admin-service/package.json ./admin-service/

WORKDIR /app/shared
RUN bun install
WORKDIR /app/admin-service
RUN bun install

COPY shared/ ../shared/
COPY admin-service/ .

RUN bun build src/index.ts --outdir dist

# Production stage
FROM oven/bun:1-slim
WORKDIR /app

COPY --from=builder /app/admin-service/dist ./dist
COPY --from=builder /app/admin-service/node_modules ./node_modules

ENV NODE_ENV=production
ENV PORT=3008

EXPOSE 3008

CMD ["bun", "run", "dist/index.js"]
