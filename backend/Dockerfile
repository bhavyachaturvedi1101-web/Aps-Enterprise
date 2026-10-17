# ============================================================
# APS Enterprise Backend — Multi-Stage Production Dockerfile
# Base: Node 20 LTS Alpine (minimal attack surface, non-root user)
# ============================================================

# ─── Stage 1: Dependency Installation & Build ───────────────
FROM node:20-alpine AS deps
WORKDIR /app

# Install build dependencies if native addons needed
RUN apk add --no-cache python3 make g++

COPY package*.json ./
RUN npm ci --omit=dev

# ─── Stage 2: Production Runtime ────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

# Security: Set production environment
ENV NODE_ENV=production \
    PORT=5000

# Install curl/wget for container health check
RUN apk add --no-cache wget

# Create non-root application user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy production node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY package*.json ./
COPY src/ ./src/
COPY *.json ./

# Create log directory and assign ownership
RUN mkdir -p logs && chown -R nodejs:nodejs /app

USER nodejs

EXPOSE 5000

# Health check against deep diagnostics endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5000/api/health || exit 1

CMD ["node", "src/app.js"]
