# Build stage with ffmpeg
FROM oven/bun:1 AS builder
WORKDIR /app

# Install ffmpeg for audio processing
RUN apt-get update && apt-get install -y ffmpeg && rm -rf /var/lib/apt/lists/*

COPY shared/package.json ./shared/
COPY audio-service/package.json ./audio-service/

WORKDIR /app/shared
RUN bun install
WORKDIR /app/audio-service
RUN bun install

COPY shared/ ../shared/
COPY audio-service/ .

RUN bun build src/index.ts --outdir dist

# Production stage
FROM oven/bun:1-slim
WORKDIR /app

# Install ffmpeg in production
RUN apt-get update && apt-get install -y ffmpeg && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/audio-service/dist ./dist
COPY --from=builder /app/audio-service/node_modules ./node_modules

ENV NODE_ENV=production
ENV PORT=3002

EXPOSE 3002

CMD ["bun", "run", "dist/index.js"]
