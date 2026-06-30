# ──────────────────────────────────────────────────────────────────────────────
# Uni AI API — Production Dockerfile
# Multi-stage build for a lean, secure production image
# ──────────────────────────────────────────────────────────────────────────────

FROM node:22-alpine AS builder
RUN npm install -g pnpm

WORKDIR /app

# Copy workspace config
COPY package.json pnpm-workspace.yaml turbo.json ./

# Copy all source packages and the API app only (no dashboard)
COPY packages ./packages
COPY apps/api ./apps/api

# Install all workspace dependencies
RUN pnpm install --frozen-lockfile

# Build the API (TypeScript → JavaScript)
RUN pnpm --filter api run build

# Generate Prisma Client for the production runtime
RUN pnpm --filter database exec prisma generate

# ──────────────────────────────────────────────────────────────────────────────
FROM node:22-alpine AS runner
RUN npm install -g pnpm

WORKDIR /app

# Copy the entire built workspace from builder
COPY --from=builder /app ./

# Set working directory to the API app
WORKDIR /app/apps/api

# Expose HTTP port
EXPOSE 3000

# Health check so DigitalOcean knows when the container is ready
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1

# Start the compiled server
CMD ["pnpm", "start"]
