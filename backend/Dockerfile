# ---- Build Stage ----
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root package.json & lockfile for Yarn workspaces
COPY package.json yarn.lock ./

# Copy backend package.json
COPY backend/package.json backend/

# Install all dependencies
RUN yarn install --frozen-lockfile

# Copy backend source files
COPY backend ./backend

# Copy prisma files
COPY backend/prisma ./backend/prisma

# Generate Prisma Client
RUN cd backend && npx prisma generate

# Build the backend
RUN yarn workspace backend build

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

# Copy backend package.json
COPY --from=builder /app/backend/package.json ./

# Copy node_modules from builder
COPY --from=builder /app/node_modules ./node_modules

# Change ownership to nodejs user
RUN chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Set environment
ENV NODE_ENV=production
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start backend with dumb-init
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/main.js"]
