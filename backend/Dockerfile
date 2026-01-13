# ---- Build Stage ----
FROM node:20-slim AS builder

WORKDIR /app

COPY package.json yarn.lock ./
COPY packages ./packages
COPY backend/package.json backend/

RUN yarn install --frozen-lockfile --production

COPY backend ./backend

RUN cd backend && npx prisma generate
RUN cd backend && yarn build

# ---- Runtime Stage ----
FROM node:20-slim

WORKDIR /app

# Install required libs for Prisma + proper signal handling
RUN apt-get update && apt-get install -y \
    dumb-init \
    openssl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Non-root user
RUN groupadd -r nodejs && useradd -r -g nodejs nodejs

COPY --from=builder /app/backend/dist ./dist
COPY --from=builder /app/backend/prisma ./prisma
COPY --from=builder /app/backend/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules

RUN mkdir -p /app/uploads && chown -R nodejs:nodejs /app

USER nodejs

ENV NODE_ENV=production
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', r => process.exit(r.statusCode === 200 ? 0 : 1))"

CMD ["dumb-init", "--", "sh", "-c", "npx prisma migrate deploy && node dist/src/main.js"]
