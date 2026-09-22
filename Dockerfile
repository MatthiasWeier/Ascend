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
# Without a cap, V8 sizes its build-time heap off the *host's* total memory,
# which can spike well past what a small VM has free and hang it (swap
# thrashing, not an OOM kill - see git history). 2GB is comfortably enough
# for Next's build and leaves headroom for Postgres running alongside it.
ENV NODE_OPTIONS="--max-old-space-size=2048"
RUN pnpm build

# Runs `prisma migrate deploy` against a real DATABASE_URL at container
# start, before the app comes up. `migrate deploy` only ever touches
# prisma/schema+migrations - never the app's source, its build output, or
# any of its ~90 other runtime/dev dependencies - so this installs just the
# two packages it actually needs (prisma's CLI + the engine binary it pulls
# in, and dotenv for prisma.config.ts's `import "dotenv/config"`) instead of
# reusing `deps`/`builder`'s full ~1.4GB node_modules. Keep these versions
# in sync with package.json's `prisma`/`dotenv` entries.
FROM base AS migrator
WORKDIR /app
RUN corepack enable
# pnpm-workspace.yaml's allowBuilds is what lets prisma's postinstall (which
# downloads its engine binary) run at all - without it pnpm refuses with
# ERR_PNPM_IGNORED_BUILDS.
COPY pnpm-workspace.yaml ./
RUN printf '{"dependencies":{"prisma":"7.9.1","dotenv":"^17.4.2"}}' > package.json \
  && pnpm install --no-lockfile
COPY prisma.config.ts ./
COPY prisma ./prisma
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
