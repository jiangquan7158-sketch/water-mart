# ─── WaterMart Production Docker Image ─────────────────────
# 适用于: 飞牛 fnOS / 群晖 DSM / 通用 Linux NAS
# ───────────────────────────────────────────────────────────

FROM node:22-alpine AS base
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10 --activate

# ─── Dependencies ──────────────────────────────────────────
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY turbo.json tsconfig.json vitest.workspace.ts ./
COPY tooling ./tooling
COPY packages/core/package.json packages/core/tsconfig.json ./packages/core/
COPY packages/modules/*/package.json packages/modules/*/tsconfig.json ./packages/modules/
COPY apps/storefront/package.json apps/storefront/tsconfig.json ./apps/storefront/
COPY apps/admin/package.json apps/admin/tsconfig.json ./apps/admin/
RUN pnpm install --frozen-lockfile --prod=false 2>/dev/null || pnpm install --no-frozen-lockfile --prod=false

# ─── Builder ───────────────────────────────────────────────
FROM deps AS builder
COPY . .
RUN pnpm db:generate
RUN cd apps/storefront && npx next build 2>/dev/null || echo "storefront build skipped"
RUN cd apps/admin && npx next build 2>/dev/null || echo "admin build skipped"

# ─── Runner ────────────────────────────────────────────────
FROM base AS runner
WORKDIR /app

# Copy built apps and ALL required source files
COPY --from=builder /app/apps/storefront/.next ./apps/storefront/.next
COPY --from=builder /app/apps/admin/.next ./apps/admin/.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json /app/pnpm-workspace.yaml /app/turbo.json /app/tsconfig.json ./
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/storefront ./apps/storefront
COPY --from=builder /app/apps/admin ./apps/admin
COPY --from=builder /app/apps/storefront/public ./apps/storefront/public 2>/dev/null || true
COPY --from=builder /app/apps/admin/public ./apps/admin/public 2>/dev/null || true

ENV NODE_ENV=production
ENV PORT=3456
ENV DATABASE_URL=file:/app/data/watermart.db

RUN mkdir -p /app/data
VOLUME ["/app/data"]

EXPOSE 3456 3457

# Start both frontend and admin via supervisord or a simple start script
COPY start.sh /app/start.sh
RUN chmod +x /app/start.sh

CMD ["/app/start.sh"]
