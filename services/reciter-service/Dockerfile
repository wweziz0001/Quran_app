# Build stage
FROM oven/bun:1 AS builder
WORKDIR /app

COPY shared/package.json ./shared/
COPY reciter-service/package.json ./reciter-service/

WORKDIR /app/shared
RUN bun install
WORKDIR /app/reciter-service
RUN bun install

COPY shared/ ../shared/
COPY reciter-service/ .

RUN bun build src/index.ts --outdir dist

# Production stage
FROM oven/bun:1-slim
WORKDIR /app

COPY --from=builder /app/reciter-service/dist ./dist
COPY --from=builder /app/reciter-service/node_modules ./node_modules

ENV NODE_ENV=production
ENV PORT=3006

EXPOSE 3006

CMD ["bun", "run", "dist/index.js"]
