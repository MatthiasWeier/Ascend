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

# Runs `prisma migrate deploy` against a real DATABASE_URL at container
# start, before the app comes up - reuses the builder stage since that
# already has the full node_modules (the `prisma` CLI is a devDependency,
# not something the standalone runner image below carries).
FROM builder AS migrator
WORKDIR /app
CMD ["pnpm", "prisma", "migrate", "deploy"]

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
# Docker sets HOSTNAME to the container ID for every container by default,
# and Next's standalone server.js binds to $HOSTNAME if set - without this
# override it silently binds to the container's bridge IP instead of all
# interfaces, which happens to still work from outside (port-forwarding
# doesn't care what interface it's on) but breaks any in-container
# connection to localhost, like the healthcheck below.
ENV HOSTNAME="0.0.0.0"
# Node's built-in fetch, not curl/wget - alpine doesn't ship either by
# default and this avoids adding them just for a healthcheck.
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://localhost:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server.js"]
