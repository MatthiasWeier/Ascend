# CLAUDE.md - agent context for Ascend

**Keep this file updated.** Whenever you ship a feature, fix a real bug, or
change how something is deployed/versioned, update the relevant section
here before you're done - not just README.md/CHANGELOG.md (those are
user-facing; this one is so a fresh Claude session in this repo has full
working context without re-deriving it). Treat a stale CLAUDE.md as a bug.

## What this is

Ascend - "Train together. Push each other." - a self-hostable workout/
climbing tracker for a small group of friends, German-language UI. Feature
list and setup instructions live in `README.md`; release history in
`CHANGELOG.md`. Both are kept current - read them for what exists today
rather than trusting a summary here to stay in sync with every detail.

## Where this actually runs

- The real, git-tracked project lives on a Debian 13 VM, **not** wherever
  this Claude session's working directory happens to be. SSH there to do
  anything: `ssh debian@192.168.178.163`, project at `~/ascend`.
- The VM's hostname is `debian13-vm01`. It's reachable over LAN at
  `192.168.178.163` and, via some reverse proxy the user set up outside
  this project, publicly at `https://workout.matt-host.de`.
- Local edits in a Claude Code scratchpad are just a staging copy - the
  actual source of truth is the VM's working tree. Pull a file down with
  `scp` before editing it if you're not sure your local copy is current;
  a stale local edit silently overwriting a newer VM file has bitten this
  project before.
- Git remote is **not configured yet** - it's a local repo on the VM only.
  Publishing it to GitHub is a stated goal of the project (see the Docker/
  OCI labels and MIT license already in place for that), just hasn't
  happened yet as of this writing.
- Small VM (2 vCPU / 2GB RAM + a swapfile). Don't run `pnpm dev` and
  `docker compose build` at the same time - it's OOM'd the box before.

## Stack and things that will bite you if assumed wrong

- **Next.js 16** (App Router, Turbopack). `middleware.ts` is `proxy.ts` now
  (same default-export convention).
- **shadcn/ui on the "Nova" preset, built on Base UI - not Radix.** This is
  the single most common source of subtle bugs in this project. Concretely:
  - Polymorphic "render as something else" is `render={<X/>}` , not
    `asChild`. The primitive merges its own props/children onto the
    element you pass; the element's own children are ignored in favor of
    the primitive's children prop (see `DropdownMenuItem render={<Link/>}`
    for the working pattern).
  - Prop names mostly match what you'd expect (`checked`/`onCheckedChange`
    for Switch, `value`/`onValueChange` for Select/Slider/Tabs) but
    **verify against the actual installed `src/components/ui/*.tsx` file**
    before assuming - don't trust Radix docs or memory. Past bugs here:
    Slider's `onValueChange` callback shape follows whatever type
    (`number` vs `number[]`) you passed as `value`, not a fixed shape;
    Select only resolves an item's label once it's rendered in the open
    listbox, so pre-selecting a value before ever opening it shows the
    raw id instead of the label.
  - `Menu.GroupLabel` (used by shadcn's `DropdownMenuLabel`) throws at
    runtime (Base UI error #31, an obfuscated production error code) if
    it isn't wrapped in `Menu.Group`/`DropdownMenuGroup`. When you hit an
    opaque "Base UI error #N", decode it by grepping the installed
    package for the call site instead of trying to load base-ui.com's
    error page (that page needs client JS a plain fetch can't run):
    `grep -rn ")(N)" node_modules/.pnpm/@base-ui+react@*/node_modules/@base-ui/react/`
    finds the exact `throw new Error(dev-message : formatErrorMessage(N))`
    line, dev-message included.
  - `cmdk` (used for the Command/Popover combobox) is a separate library
    from the Base UI wrapper components and pulls in its own transitive
    `@radix-ui/primitive` - that's expected, not a conflict.
- **Prisma 7, "no-Rust-engine" architecture.** No `url` in the `datasource`
  block - that lives in `prisma.config.ts` via `defineConfig`/`env()`.
  `PrismaClient` needs an explicit driver adapter
  (`@prisma/adapter-pg`/`PrismaPg`) passed to its constructor.
  `migrate diff` uses `--from-schema`/`--to-schema` now, not the old
  `--from-schema-datamodel`/`--to-schema-datamodel` flags.
- **Auth.js (NextAuth v5)**, JWT sessions, username+password (no email).
  `session.user.id`/`.username` need the module augmentation in
  `src/lib/next-auth.d.ts` plus the `session()` callback in `src/lib/auth.ts`
  to actually be populated - both already exist, don't re-add them.
- **Tailwind v4**, dark-first, CSS-only animations (`tw-animate-css`) -
  deliberately no JS animation library (Framer Motion caused an
  unreproducible stuck-invisible bug early on and was ripped out).
- German-calendar-day logic (`lib/german-time.ts`) uses
  `Intl.DateTimeFormat` with `timeZone: "Europe/Berlin"`, not naive UTC -
  daily challenges and boulder-day tracking key off this, not `Date`.
- Bodyweight-adjusted analytics resolve the user's logged bodyweight *as of
  the workout's date*, not their current weight (`lib/bodyweight.ts`,
  `BodyWeightEntry` history table). Don't "simplify" this to a single
  current-weight field - it was a deliberate design requirement.

## Deployment workflow (every change goes through this)

1. Edit files locally, then `scp` each changed/new file to the VM at the
   matching path under `~/ascend`.
2. If `prisma/schema.prisma` changed: `ssh` in, `pnpm prisma db push`
   (plain, no `--force-reset`; add `--accept-data-loss` only after you've
   confirmed by hand that the flagged change is actually safe - e.g. a
   new nullable column/unique index on a column that's currently all-NULL
   can never violate uniqueness, Postgres treats NULLs as distinct).
   Then `pnpm prisma generate` to refresh the client types.
3. `pnpm build` on the VM (outside Docker) first, to get fast TypeScript
   errors before burning time on a Docker rebuild.
4. Generate a proper migration file for the schema delta instead of
   leaving history to drift: `git show HEAD:prisma/schema.prisma` to a
   temp file, then
   `pnpm prisma migrate diff --from-schema <old> --to-schema prisma/schema.prisma --script`
   into a new `prisma/migrations/<timestamp>_<name>/migration.sql`, then
   `pnpm prisma migrate resolve --applied <name>` (the DDL is already live
   from step 2 - this just makes the bookkeeping match, so a fresh
   `prisma migrate deploy` on someone else's clone gets the full schema).
   Run `pnpm prisma migrate status` after - it should say "up to date"
   with no drift warnings. If it complains about a migration name applied
   in the DB with no matching folder on disk, that's stale bookkeeping
   from an old baseline squash, not real drift - verify the current
   migration folder's `CREATE TABLE`s already cover what's live, then
   remove the orphaned row directly:
   `DELETE FROM "_prisma_migrations" WHERE migration_name = '...'`
   (this table is Prisma's own ledger, not application data).
5. `sudo docker compose build --build-arg VERSION=X.Y.Z app && sudo docker compose up -d`
   (see Versioning below for picking X.Y.Z first).
6. **Verify, don't assume.** Check `docker compose logs app` for a clean
   start. Then exercise the actual feature over the real HTTP API with
   curl (register a throwaway account, log in via
   `/api/auth/csrf` + `/api/auth/callback/credentials`, drive the feature,
   check the JSON/HTML response - see any recent commit for the exact
   pattern) rather than trusting that a 200 status or a successful build
   means the feature works. This has caught real bugs that a build alone
   would have missed (Base UI prop mismatches, race conditions needing an
   actual concurrent-request test, hydration-comment-induced false
   negatives in naive `grep` checks against rendered HTML).
7. **Always clean up test accounts/groups you create** via the account
   deletion API before finishing (cascades correctly). Check
   `SELECT username FROM "User"` afterward to confirm only real accounts
   remain - a leftover `uibug_...`-style test account has slipped through
   before.
8. Commit with a descriptive message via a temp file
   (`git commit -F /tmp/msg.txt`) rather than an inline `-m` heredoc -
   backticks/parens in a message body have corrupted an inline commit
   before. End every commit message with
   `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>`.

## Versioning

Bump `package.json`'s `version` **as part of the same batch**, never as a
follow-up afterthought - this was missed for several commits in a row
before the user called it out. Move the CHANGELOG's entry into a dated
`## [x.y.z] - date` section and pass `--build-arg VERSION=x.y.z` on the
Docker build so the OCI label matches. Verify it actually rendered
(`Ascend vX.Y.Z` in the footer and Settings page) before calling it done.

**Patch vs. minor, don't over-bump:** a patch (`0.x.Y+1`) covers a bugfix
or reworking/refining something that shipped earlier in the *same*
session (e.g. swapping a button for a toggle on the same feature, fixing
a race condition just introduced). Reserve a minor bump (`0.X+1.0`) for a
genuinely new, independent capability. Got this wrong once already -
shipped a feature as 0.3.0, reworked it minutes later and called that
0.4.0, and the user correctly pushed back that the rework was 0.3.1. When
in doubt, ask "is this fixing/adjusting what I just shipped, or is it a
new thing a user would notice as separate" - the former is patch.

## Testing conventions

No automated test suite exists yet - verification is manual, over the
live deployed app, per the deployment workflow above. When adding
something with real logic (PR detection, bodyweight resolution, Yammer
vote thresholds, auto-share dedup), write out the specific edge cases
you're checking as curl commands against real accounts, not just "it
built successfully."
