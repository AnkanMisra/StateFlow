# Dockerfile for StateFlow Backend
# Multi-stage build for smaller image size

# Stage 1: Build
FROM node:20-alpine AS builder

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9 --activate

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install dependencies (skip postinstall for build)
RUN pnpm install --frozen-lockfile --ignore-scripts

# Run motia install manually (since we skipped postinstall)
RUN npx motia install || true

# Copy source code
COPY . .

# Generate types
RUN npx motia generate-types

# Stage 2: Production
FROM node:20-alpine AS production

# Install pnpm and curl for healthcheck
RUN corepack enable && corepack prepare pnpm@9 --activate && \
    apk add --no-cache curl

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install production dependencies only
RUN pnpm install --frozen-lockfile --prod --ignore-scripts

# Copy built files from builder
COPY --from=builder /app/src ./src
COPY --from=builder /app/types.d.ts ./
COPY --from=builder /app/motia.config.ts ./
COPY --from=builder /app/tsconfig.json ./

# Expose Motia default port
EXPOSE 3000

# Health check disabled until /health endpoint is added to motia.config.ts
# HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
#     CMD curl -f http://localhost:3000/health || exit 1

# Start Motia
CMD ["pnpm", "start"]
