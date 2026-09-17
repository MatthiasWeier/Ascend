FROM node:22-alpine AS base

FROM base AS deps
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY prisma ./prisma
RUN pnpm install --frozen-lockfile

FROM base AS builder
WORKDIR /app
RUN corepack enable
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Dummy value: schema generation needs the var to be set, but never connects to a database.
ENV DATABASE_URL="postgresql://user:password@localhost:5432/db"
RUN pnpm prisma generate
RUN pnpm build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

# Keep in sync with the "version" field in package.json - that file is the
# single source of truth the app itself reads at runtime; this just mirrors
# it onto the image so `docker inspect` / registries show it too. Override
# at build time once you have CI tagging releases, e.g.:
#   docker build --build-arg VERSION=$(node -p "require('./package.json').version") .
ARG VERSION=0.1.0
LABEL org.opencontainers.image.title="Ascend" \
      org.opencontainers.image.description="Train together. Push each other. Self-hostable workout tracker." \
      org.opencontainers.image.version="${VERSION}" \
      org.opencontainers.image.licenses="MIT"
# Once this is on GitHub, also add:
#   org.opencontainers.image.source="https://github.com/<you>/<repo>"

RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
RUN mkdir -p /app/uploads && chown nextjs:nodejs /app/uploads

USER nextjs
EXPOSE 3000
ENV PORT=3000
CMD ["node", "server.js"]
