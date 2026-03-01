# Build stage
FROM oven/bun:1 AS builder
WORKDIR /app

COPY shared/package.json ./shared/
COPY users-service/package.json ./users-service/

WORKDIR /app/shared
RUN bun install
WORKDIR /app/users-service
RUN bun install

COPY shared/ ../shared/
COPY users-service/ .

RUN bun build src/index.ts --outdir dist

# Production stage
FROM oven/bun:1-slim
WORKDIR /app

COPY --from=builder /app/users-service/dist ./dist
COPY --from=builder /app/users-service/node_modules ./node_modules

ENV NODE_ENV=production
ENV PORT=3005

EXPOSE 3005

CMD ["bun", "run", "dist/index.js"]
