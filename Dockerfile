# ──────────────────────────────────────────────────────────────────────────────
# Uni AI API — Production Dockerfile
# Multi-stage build for a lean, secure production image
# ──────────────────────────────────────────────────────────────────────────────

FROM node:22-bookworm-slim AS builder
RUN corepack enable && corepack prepare pnpm@11.5.2 --activate
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy workspace config and lockfile
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./

# Copy all source packages and the API app only (no dashboard)
COPY packages ./packages
COPY apps/api ./apps/api

# Install dependencies, then explicitly run approved native build scripts.
RUN pnpm install --frozen-lockfile --ignore-scripts
RUN pnpm approve-builds --all && pnpm rebuild --pending

# Build the full workspace so shared packages and generated clients are ready
RUN pnpm build

# ──────────────────────────────────────────────────────────────────────────────
FROM node:22-bookworm-slim AS runner
RUN corepack enable && corepack prepare pnpm@11.5.2 --activate
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy the entire built workspace from builder
COPY --from=builder /app ./

# Set working directory to the API app
WORKDIR /app/apps/api

# Expose HTTP port
EXPOSE 3000

# Health check so DigitalOcean knows when the container is ready
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://localhost:3000/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

# Start the server using tsx (handles BAML .ts files at runtime)
CMD ["npx", "tsx", "src/index.ts"]
