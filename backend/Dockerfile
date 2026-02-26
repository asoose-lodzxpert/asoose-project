# ---- Build Stage ----
FROM node:20-slim AS builder

WORKDIR /app

# Copy root files for Yarn workspaces
COPY package.json yarn.lock ./
COPY packages ./packages
COPY backend/package.json backend/

# Install dependencies as root
RUN yarn install --frozen-lockfile

# Copy backend source code
COPY backend ./backend

# Generate Prisma client (use yarn workspace to ensure correct path)
RUN yarn workspace backend prisma generate

# Build the NestJS backend
RUN yarn workspace backend build

# ---- Runtime Stage ----
FROM node:20-slim

WORKDIR /app

# Install required libs + dumb-init for proper signal handling
RUN apt-get update && apt-get install -y \
    dumb-init \
    openssl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user and home directory
RUN groupadd -r nodejs && useradd -r -g nodejs -m -d /home/nodejs nodejs

# Set npm/yarn cache to writable dir
ENV NPM_CONFIG_CACHE=/home/nodejs/.npm
ENV NODE_ENV=production

# Copy workspace manifests and lockfile for a clean production-only install.
# This excludes Jest, ESLint, TypeScript, @types/*, ts-morph and all other devDeps.
COPY --from=builder /app/package.json /app/yarn.lock ./
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/backend/package.json ./backend/package.json
RUN yarn install --frozen-lockfile --production --ignore-scripts && yarn cache clean

# Copy the pre-generated Prisma client native binaries from the builder stage.
# The builder already ran `prisma generate` for the linux target, so there is
# no need to re-run it here — and prisma CLI is not available in a --production install.
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Copy built backend artifacts
COPY --from=builder /app/backend/dist ./dist
COPY --from=builder /app/backend/prisma ./prisma
COPY --from=builder /app/backend/package.json ./package.json

# Create uploads directory
RUN mkdir -p /app/uploads && chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

EXPOSE 3000

# Healthcheck for Docker — uses liveness probe (always 200 if process is alive).
# Readiness (/health/ready) is used by the load balancer, not Docker restart logic.
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/v1/health/live', r => process.exit(r.statusCode === 200 ? 0 : 1))"

# Migrations are run as a pre-deploy CI step (see .github/workflows/deploy.yml).
# The container only starts the server — no migration race on rolling deploys.
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/src/main.js"]
