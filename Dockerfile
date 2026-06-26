# WaterMart Production Dockerfile
# Multi-stage build for the Next.js storefront with standalone output.
#
# Build:
#   docker build -t watermart-storefront .
# Run:
#   docker run -p 3000:3000 --env-file .env watermart-storefront

# ─── Stage 1: Dependencies ────────────────────────────────────────────────────
FROM node:22-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Enable Corepack for pnpm
RUN corepack enable && corepack prepare pnpm@10.32.0 --activate

# Copy root package files for workspace resolution
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY tooling/tsconfig/package.json ./tooling/tsconfig/package.json
COPY tooling/tsconfig/base.json ./tooling/tsconfig/base.json
COPY tooling/tsconfig/nextjs.json ./tooling/tsconfig/nextjs.json
COPY packages/core/package.json ./packages/core/package.json
COPY packages/modules/product/package.json ./packages/modules/product/package.json
COPY packages/modules/cart/package.json ./packages/modules/cart/package.json
COPY packages/modules/order/package.json ./packages/modules/order/package.json
COPY packages/modules/payment/package.json ./packages/modules/payment/package.json
COPY packages/modules/customer/package.json ./packages/modules/customer/package.json
COPY apps/storefront/package.json ./apps/storefront/package.json

RUN pnpm install --frozen-lockfile

# ─── Stage 2: Builder ─────────────────────────────────────────────────────────
FROM node:22-alpine AS builder
RUN apk add --no-cache libc6-compat
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10.32.0 --activate

# Copy installed dependencies and all source
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/core/node_modules ./packages/core/node_modules
COPY --from=deps /app/packages/modules/product/node_modules ./packages/modules/product/node_modules
COPY --from=deps /app/packages/modules/cart/node_modules ./packages/modules/cart/node_modules
COPY --from=deps /app/packages/modules/order/node_modules ./packages/modules/order/node_modules
COPY --from=deps /app/packages/modules/payment/node_modules ./packages/modules/payment/node_modules
COPY --from=deps /app/packages/modules/customer/node_modules ./packages/modules/customer/node_modules
COPY --from=deps /app/apps/storefront/node_modules ./apps/storefront/node_modules

COPY . .

# Build the Prisma client and generate types
RUN npx prisma generate --schema=packages/core/src/database/schema.prisma

# Build the application
RUN pnpm build

# ─── Stage 3: Runner ──────────────────────────────────────────────────────────
FROM node:22-alpine AS runner
RUN apk add --no-cache libc6-compat
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy standalone output
COPY --from=builder /app/apps/storefront/.next/standalone ./
COPY --from=builder /app/apps/storefront/.next/static ./apps/storefront/.next/static
COPY --from=builder /app/apps/storefront/public ./apps/storefront/public

# Copy Prisma artifacts needed at runtime
COPY --from=builder /app/node_modules/.pnpm/@prisma+client* ./node_modules/.pnpm/
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

USER nextjs

EXPOSE 3000

CMD ["node", "apps/storefront/.next/standalone/server.js"]
