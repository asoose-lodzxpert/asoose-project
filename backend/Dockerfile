# ---- Build Stage ----
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root package files for Yarn workspaces
COPY package.json yarn.lock ./
COPY packages ./packages
COPY backend/package.json backend/

# Install dependencies (devDependencies needed for build)
RUN yarn install --frozen-lockfile

# Copy backend source code
COPY backend ./backend

# Generate Prisma Client
RUN cd backend && npx prisma generate

# Build NestJS backend
RUN cd backend && yarn build

# ---- Runtime Stage ----
FROM node:20-alpine

WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup -S nodejs && adduser -S nodejs -G nodejs

# Copy build output from builder
COPY --from=builder /app/backend/dist ./dist
COPY --from=builder /app/backend/prisma ./prisma
COPY --from=builder /app/backend/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules

# Create uploads folder
RUN mkdir -p /app/uploads && chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Environment
ENV NODE_ENV=production
EXPOSE 3000

# Healthcheck (adjust if your route is different)
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start backend: run Prisma migrations first, then NestJS
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/src/main.js"]
