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

# Copy built backend and Prisma client
COPY --from=builder /app/backend/dist ./dist
COPY --from=builder /app/backend/prisma ./prisma
COPY --from=builder /app/backend/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules

# Regenerate Prisma Client in the runtime container to ensure proper bindings
RUN npx prisma generate --schema=./prisma/schema.prisma

# Create uploads directory
RUN mkdir -p /app/uploads && chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

EXPOSE 3000

# Healthcheck for Docker
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', r => process.exit(r.statusCode === 200 ? 0 : 1))"

# Run migrations and start server
ENTRYPOINT ["dumb-init", "--"]
CMD ["sh", "-c", "npx prisma generate && node dist/src/main.js"]
