FROM node:20-alpine AS base

# ── Stage 1: Install dependencies ──────────────────────────────────────
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json .npmrc ./
RUN npm ci

# ── Stage 2: Build the application ─────────────────────────────────────
FROM base AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npx prisma generate

ENV NEXT_TELEMETRY_DISABLED=1
# Dummy env vars for build-time page data collection (replaced at runtime)
ARG META_ACCESS_TOKEN=build_placeholder
ARG CRON_SECRET=build_placeholder
ARG DATABASE_URL=postgresql://placeholder:placeholder@localhost:5432/placeholder
ARG WHATSAPP_PHONE_NUMBER_ID=build_placeholder
ARG WHATSAPP_ACCESS_TOKEN=build_placeholder
ARG YOUTUBE_CLIENT_ID=build_placeholder
ARG YOUTUBE_CLIENT_SECRET=build_placeholder
ARG YOUTUBE_REDIRECT_URI=build_placeholder
ENV NEXT_PUBLIC_APP_URL=https://ads.metrixbr.com
ENV NEXT_PUBLIC_META_APP_ID=build_placeholder
RUN npm run build

# ── Stage 3: Production runner ─────────────────────────────────────────
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# OpenSSL required by Prisma
RUN apk add --no-cache openssl

# Copy public assets
COPY --from=builder /app/public ./public

# Copy Next.js standalone build
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy Prisma files (schema + generated client + CLI for db push)
COPY --from=builder /app/prisma/schema.prisma ./prisma/schema.prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma

# Copy bcryptjs for seed script
COPY --from=builder /app/node_modules/bcryptjs ./node_modules/bcryptjs

# Copy seed script
COPY --from=builder /app/scripts/seed-admin.mjs ./scripts/seed-admin.mjs

# Copy entrypoint
COPY --chmod=755 entrypoint.sh ./

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3000/ || exit 1

ENTRYPOINT ["./entrypoint.sh"]
