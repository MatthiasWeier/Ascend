# Contributing to Ascend

Thanks for looking at this. Ascend is a small, self-hosted project - the bar
for contributing is "does this make sense for a self-hosted workout tracker
run by a small group of friends," not "does this scale to millions of users."

## Before you start

For anything more than a trivial fix (a typo, an obvious bug), open an issue
first describing what you want to change and why. This saves everyone time
if the change doesn't fit the project's direction - self-hosted, no
telemetry/tracking, no required third-party services, German-language UI.

## Local setup

```bash
git clone <this repo>
cd ascend
cp .env.example .env      # fill in DATABASE_URL / AUTH_SECRET
docker compose up -d db   # start just the database
pnpm install
pnpm prisma migrate dev   # create tables
pnpm dev
```

See [README.md](./README.md) for the full setup (including running the
whole stack via Docker Compose) and [DEPLOYMENT.md](./DEPLOYMENT.md) for
production-deployment details.

## Before opening a pull request

- `pnpm build` must succeed (this is the project's type-check - there's no
  separate `tsc --noEmit` script).
- `pnpm lint` must be clean.
- There is no automated test suite yet. Manually exercise the feature or
  fix you're touching - describe what you tested in the PR description.
- If you changed `prisma/schema.prisma`, include a generated migration
  (`pnpm prisma migrate dev --name <description>`) rather than relying on
  `db push` - the latter is dev-only and isn't tracked in `prisma/migrations`.
- Update `README.md`/`CHANGELOG.md` if you added or changed user-facing
  behavior. Bump the `version` field in `package.json` per
  [SemVer](https://semver.org/) - patch for a fix or refinement, minor for
  a new capability.

## Conventions

- UI strings are German (the app's actual users are German-speaking); code,
  comments, and commit messages are English.
- No new required third-party/cloud dependencies. Optional integrations
  (S3/MinIO storage, Web Push, Prometheus metrics) are fine as long as the
  app works fully without them when their env vars are unset.
- Follow the existing code style rather than introducing a new pattern for
  something the codebase already does a certain way - check a neighboring
  file before guessing.
- Keep PRs focused. A bug fix shouldn't carry along unrelated refactoring.

## Reporting security issues

Please don't open a public issue for a security vulnerability. Instead,
open a private security advisory on this repo (or, if that's not available,
contact a maintainer directly) so it can be fixed before details are public.
