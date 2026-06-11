# Bun + Elysia API. Uses the official Bun image so `bun:sqlite` works natively.
FROM oven/bun:1 AS base
WORKDIR /app

# Install deps first so this layer is cached unless the lockfile changes.
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

# Copy the rest of the source.
COPY . .

ENV NODE_ENV=production
# SQLite lives on the mounted Fly volume so it survives redeploys.
ENV DB_PATH=/data/weather.db
ENV PORT=3000
EXPOSE 3000

CMD ["bun", "run", "src/index.ts"]
