# ---- Build Stage ----
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root package.json & lockfile for Yarn workspaces
COPY package.json yarn.lock ./

# Copy workspace packages
COPY packages ./packages

# Copy backend package.json
COPY backend/package.json backend/

# Install all dependencies (including devDependencies for build)
RUN yarn install --frozen-lockfile

# Copy backend source files
COPY backend ./backend

# Generate Prisma Client
RUN cd backend && yarn prisma generate

# Verify Prisma client was generated
RUN find /app -name ".prisma" -type d || echo "Prisma client not found - checking alternative locations" && \
    ls -la /app/node_modules/.prisma 2>/dev/null || \
    ls -la /app/backend/node_modules/.prisma 2>/dev/null || \
    echo "WARNING: Prisma client location unknown"

# Build the backend - explicitly run nest build in backend directory
RUN cd backend && yarn build

# Verify dist folder was created
RUN ls -la /app/backend/dist || (echo "Build failed - dist folder not found" && exit 1)

# ---- Runtime Stage ----
FROM node:20-alpine

WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001

# Copy built backend code
COPY --from=builder /app/backend/dist ./dist
COPY --from=builder /app/backend/prisma ./prisma

# Copy package.json files
COPY --from=builder /app/backend/package.json ./package.json

# Copy production node_modules from root (Yarn workspaces installs everything here)
COPY --from=builder /app/node_modules ./node_modules

# Create uploads directory for local file storage
RUN mkdir -p /app/uploads

# Change ownership to nodejs user
RUN chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Set environment
ENV NODE_ENV=production
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/v1/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start backend with dumb-init
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/src/main.js"]

