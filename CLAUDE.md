@AGENTS.md

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

- This is a public repo - don't put real hostnames, IPs, or domains in
  this file. If you're the maintainer running a live instance via Claude
  Code, keep that connection info (VM IP/hostname, SSH user, public
  domain if any) in your own private notes outside this repo, not here.
  The pattern is: SSH to a VM to do anything (`ssh <user>@<host>`), project
  at some path there - not wherever the local Claude Code working
  directory happens to be.
- Local edits in a Claude Code scratchpad are just a staging copy - the
  actual source of truth is the VM's working tree. Pull a file down with
  `scp` before editing it if you're not sure your local copy is current;
  a stale local edit silently overwriting a newer VM file has bitten this
  project before.
- Published on GitHub, MIT-licensed. Treat `main`/`master` as something
  other people may now be reading or cloning - don't force-push it, and
  write commit messages assuming an outside reader.
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
- **Credentials provider errors are NOT distinguishable on the client with
  `redirect: false`.** `@auth/core`'s `isClientError` only whitelists the
  literal string `"CredentialsSignin"` - subclassing `CredentialsSignin`
  with your own `static type`/`code` (the documented pattern for the
  redirect-based flow) gets silently discarded and collapses back to
  `"Configuration"`, and even the `code` query param that DOES survive is
  never exposed by `next-auth/react`'s `signIn()` return value when
  `redirect: false` (this app's login form uses `redirect: false`
  throughout - see `src/app/login/page.tsx`). 2FA works around this with a
  separate pre-flight endpoint (`POST /api/auth/totp-required`) the login
  form calls before attempting `signIn()`, rather than trying to signal
  "wrong password" vs. "needs a code" from `authorize()` itself. Follow
  this pattern for any future multi-step credentials flow instead of
  fighting the error-type plumbing.
- **Database session strategy is unreachable with a credentials-only
  setup.** `@auth/core`'s config validation (`assert.ts`) throws
  `UnsupportedStrategy` if `session.strategy === "database"` and every
  configured provider is `type: "credentials"` - "Signing in with
  credentials only supported if JWT strategy is enabled" is not a
  suggestion, it's enforced. A real Auth.js database-session migration
  would need a second, non-credentials provider (e.g. the official
  `webauthn` provider, which also needs a full Adapter). Session
  management (`lib/auth.ts` jwt/session callbacks, `UserSession` model)
  is instead a revocation list layered on top of the existing JWT: each
  sign-in gets a `UserSession` row and a `sid` claim; every session read
  re-checks that row exists and 404s the session (`token.revoked`) if it
  doesn't. A token from before this existed (no `sid`) gets adopted
  lazily on its next read rather than treated as invalid - don't remove
  that branch, it's what avoided forcing every real user to log in again
  when this shipped.
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

## Notable patterns added since the initial release

- **Optional self-hosted infra via env-var presence, not feature flags.**
  Push notifications (`lib/push.ts`, VAPID keys) follow the same pattern as
  the Impressum/Datenschutz operator fields: if the relevant env vars
  aren't set, the feature's functions no-op and its UI just doesn't
  render - never a crash, never a half-broken state. Follow this pattern
  for any future optional integration rather than adding a separate
  enabled/disabled config flag.
- **Fire-and-forget for non-critical side effects.** Push sends
  (`sendPushToUsers`) are called without `await` and with `.catch(() => {})`
  from request handlers - a slow or failing push must never delay or fail
  the actual user action (saving a workout, completing a challenge).
  `sendPushToUsers` itself is also internally resilient per-subscription
  (one dead subscription never blocks the others, and a 404/410 response
  deletes it).
- **Auto-contribution idempotency pattern.** Group Goals linked to an
  Exercise (`lib/goal-contributions.ts`) and the group-goal
  `GroupGoalContribution` model use a `source` + `sourceId` pair with a
  unique constraint (`@@unique([goalId, source, sourceId])`) so the same
  workout set or challenge attempt can never double-count even under a
  retried or genuinely concurrent request - reuse this shape (not a
  client-side disable-button guard alone) for any future auto-derived
  aggregate.
- **i18n: German text is the key.** `t("Speichern")` looks up the English
  string in `lib/i18n/en/*.ts` and falls back to the German key itself, so a
  missing translation degrades to German instead of breaking. Client code:
  `useT()` / `useLocale()` (`components/locale-provider.tsx`; the locale lives in
  the `ascend-locale` cookie, set from the DE/EN toggle); server components:
  `await getT()` (`lib/i18n/server.ts`). Interpolation is `{name}` placeholders
  (`t("Hi {name}", { name })`); plurals are two separate keys, not ICU. API
  routes keep answering in German - clients translate errors with
  `t(data.error ?? "fallback")`, so every API error string must also exist in
  the dictionary. Dates use `dateLocale` (de-DE / en-GB), never a hardcoded
  locale. Any new user-facing string: wrap it in t(), add the English entry,
  and run `node --experimental-strip-types scripts/check-i18n.mjs` (exits
  non-zero on missing keys). Beware local variables named `t` shadowing the
  translate function (rename e.g. `tpl`, `ty`). Do not leave an empty
  replacement in any scripted bulk edit - it silently mangles the file.
- **Display-unit preference, kg-canonical storage.** `User.weightUnit`
  (`lib/weight-units.ts`, `components/weight-unit-context.tsx`) is a pure
  display setting - every weight is stored in kg everywhere (DB, API,
  CSV export/import, group post text) and converted only at the
  client-rendering boundary via `useWeightUnit()`. In
  `dashboard/workouts/new/page.tsx` specifically, `SetRow.weightKg` holds
  the raw typed string in whatever unit is currently active (not always
  kg, despite the name) so the input is never reformatted on every
  keystroke - conversion only happens where it crosses into/out of kg
  (API submit, and prefill from API responses). If you add another
  weight-bearing surface, follow the same "convert only where kg crosses
  the client boundary" rule rather than converting eagerly.

- **In-process reminder scheduler, no separate worker process.**
  `src/instrumentation.ts`'s `register()` hook (stable in Next.js since v15,
  no flag needed) calls `startScheduler()` (`lib/scheduler.ts`) once per
  server process; it runs a 60s `setInterval` tick, not a cron container -
  matches the single-container philosophy of the rest of the deploy. All
  time math goes through Berlin wall-clock strings (`lib/german-time.ts`
  `germanWeekday`/`germanTime`/`wallClockAtOrAfter`/
  `subtractMinutesFromWallClock`), never a raw UTC `Date` comparison, to
  dodge DST - same convention as the pre-existing `germanDateKey`.
  **Gotcha that cost real debugging time:** a Prisma `{ field: { not: X } }`
  filter on a nullable column compiles to plain SQL `<>`, which never
  matches a `NULL` row (`NULL <> X` is `NULL`, not true) - a brand-new
  reminder with `lastFiredDateKey: null` would never be found "due". Spell
  it out as `OR: [{ field: null }, { field: { not: X } }]` whenever NULL
  should also count as "not equal". Also: `notifyUsers()` filters the actor
  out of the recipient list, so a system-generated reminder (not triggered
  by another user) must pass a sentinel `actorId: "system"` - passing the
  recipient's own id there silently empties the recipient list and nothing
  sends.
- **Admin-configurable instance settings, DB-backed, not env-var-only.**
  `AppSettings` (`prisma/schema.prisma`) is a single-row table, `id` fixed
  to `"global"`, seeded by its own migration so app code (`lib/app-settings.ts`)
  can assume the row always exists (`findUniqueOrThrow`, no get-or-create
  branch). Currently holds `rateLimitingEnabled` and `registrationOpen`,
  edited from Admin > Instanz-Einstellungen (`api/admin/settings`,
  `components/admin-instance-settings.tsx`) and take effect on the very
  next request - no redeploy. Follow this pattern (not a new env var) for
  any future switch an admin should be able to flip at runtime. Rate
  limiting itself (`lib/rate-limit.ts`, in-memory fixed-window buckets) is
  gated through `checkRateLimit()`, which reads `AppSettings` first and
  short-circuits to "allowed" when the switch is off - the limiter logic
  itself is unchanged from before it was made toggleable, only the gate is
  new.
- **Muscle/injury tracking.** `lib/muscles.ts`/`lib/muscle-focus.ts`/
  `lib/muscle-stats.ts` map exercises to muscles with per-muscle load, feed
  a drawable 3D/SVG body map (`components/body-viewer.tsx`, rendered
  read-only for teammates via `components/body-view.tsx`) with heat levels;
  `MusclePreference` ("wishes") steers which muscles the Workout Brain
  favors. Injuries (`Injury`, `InjuryCheckin` models) drive exercise
  warnings in the Brain and a recurring self-service check-in reminder
  (`components/injury-checkin-reminder.tsx`) - separate from, but
  structurally parallel to, the workout/meetup reminder scheduler above.
- **Climbing/gym/other meetups with member-proposed changes.**
  `ClimbingMeetup` (despite the name, generalized to any `MeetupActivity`:
  CLIMBING/GYM/OTHER, with a free-text `title` for "OTHER") shows as a
  marked day in the personal calendar across all a user's groups. Anyone
  who didn't create the meetup can propose a change
  (`ClimbingMeetupSuggestion`: date/time/location/note) instead of only
  joining/leaving; the creator accepts (applies the fields, resets every
  participant's `remindedAt` so the reminder re-arms) or declines. Focus
  tags shown depend on activity (`FOCUSES_BY_ACTIVITY` in
  `lib/climbing-meetups.ts`) - climbing gets Slab/Power/Technik/etc., gym
  gets Push/Pull/Beine/Core/Grip.
- **`lib/muscle-focus.ts` must stay client-bundle-safe.** It's imported from
  client feed components (`home-feed.tsx`, `group-feed.tsx`, ...) just for
  `FOCUS_LABEL`/`ALL_FOCUSES`, so it can never import anything that pulls in
  `@/lib/prisma` (breaks the browser build with `Module not found: Can't
  resolve 'util/types'` from the `pg` driver, trace shows up under "Client
  Component Browser"). `effectiveLoadKg` lives in its own pure
  `lib/effective-load.ts` for exactly this reason - `lib/bodyweight.ts`
  re-exports it for backwards compatibility, but `muscle-focus.ts` imports
  it directly from `effective-load.ts`, not from `bodyweight.ts`. Follow the
  same split for any other pure helper a client-imported lib file needs from
  an otherwise server-only module.
- **`computeLoadPercents` (muscle-focus.ts) needs bodyweight resolved, not
  just `set.weightKg`.** For an `isBodyweight` exercise (push-ups, pull-ups,
  ...) `weightKg` on the set is only the *added* weight, frequently
  null/0 - a user training push-ups heavily used to show ~0% "Push" because
  `reps * 0 = 0`. Callers must resolve each set's bodyweight-at-session-date
  (`makeBodyWeightResolver`, same as `lib/personal-records.ts`) and pass
  `isBodyweight`/`bodyWeightKg` through; `effectiveLoadKg` folds it in. Any
  new caller of `computeLoadPercents` needs to do this too, not just pass
  `weightKg` straight through.
- **`GroupGoal.exercises` is many-to-many (`Exercise[]`), not a single
  `exerciseId`.** Changed so one goal can track several exercises at once
  (e.g. "3000 push-ups" = Push-ups + Diamond + Pike Push-ups). Query with
  `exercises: { some: { id: ... } }`, not a scalar equality check -
  `goal-contributions.ts`'s `backfillGoalFromHistory` now takes
  `exerciseIds: string[]`. The migration
  (`20260930090000_group_goal_multi_exercise`) carries forward every
  pre-existing single link into the new `_GroupGoalExercises` join table
  before dropping the old column - don't re-derive that backfill logic, the
  data is already migrated.
- **Workouts can be logged for a past day** (`WorkoutSession.date`,
  optional `date` field on both `POST /api/workouts` and
  `PATCH /api/workouts/[sessionId]`, a `"YYYY-MM-DD"` Berlin dateKey -
  anchored at `T12:00:00.000Z` like every other dateKey→Date conversion
  here, future dates rejected). This is why
  `syncWorkoutRepsToChallenges(userId, sessionDate)` has always taken an
  explicit date rather than assuming "now" - it already no-ops for any
  non-today date. The one place this *did* need a fix: editing a session's
  date must re-run that sync for **both** the old and the new date (not
  just one), since moving a workout off today should zero its reps back
  out of today's challenge, and moving one onto today should add them -
  the sync itself re-sums live from the DB, so calling it twice is always
  safe. Don't reduce that to a single call.
- **External REST API** (`/api/v1/*`, `lib/api-key-auth.ts`): personal
  access tokens (`ascend_...`, hash-only storage, created/revoked in
  Settings) resolve to a `userId` via `Authorization: Bearer`, same idea as
  a session cookie but for scripts/Home Assistant that can't do a browser
  login. `/api/v1/today` and `/api/v1/balance-goals` reuse
  `getBrainSuggestion`/`computeLoadPercents` directly rather than
  re-deriving the logic - `makeT(normalizeLocale(...))` builds a translator
  from `?lang=` since there's no locale cookie on an API request.
  `/api/v1/calendar` is a separate JSON endpoint from the ICS feed
  (`/api/calendar/[token]`, URL-token-authenticated, no API key) - the ICS
  feed is for calendar-app subscriptions (polled on their own schedule) and
  now covers group meetups too (not just workouts), while `/api/v1/calendar`
  is JSON meant for direct automation/scripting. The ICS feed emits timed
  meetups as `DTSTART;TZID=Europe/Berlin:...` with no embedded VTIMEZONE
  block - every mainstream calendar client (Google Calendar, Home
  Assistant's Remote Calendar integration, Apple Calendar) resolves the
  IANA name fine without one; untimed meetups are an all-day
  `DTSTART;VALUE=DATE:...` marker instead. Keep new `/api/v1/*`
  routes read-mostly and side-effect-light (no PR/goal-contribution hooks)
  - it's a stable automation surface, not a mirror of the internal app API.
  The one deliberate exception: `/api/v1/workouts/[id]` PATCH/DELETE *does*
  clean up `GroupGoalContribution` rows for the sets being replaced/removed
  (`source: "WORKOUT", sourceId: { in: oldSetIds }`) before touching
  anything else, in its own transaction - those rows aren't a real
  cascading foreign key, so a set created via the main app (which *does*
  call `contributeWorkoutSetToGoals`) and then edited/deleted via the v1
  API would otherwise leave a stale contribution behind forever, permanently
  inflating a group goal's total. This is cleanup of existing state, not a
  new write path - v1 itself still never calls
  `contributeWorkoutSetToGoals`. `/api/v1/daily-challenges` similarly
  mirrors `lib/pending-challenges.ts`'s query shape but returns full
  today-status (including `NOT_STARTED`) for every active, non-invalidated
  goal, not just the still-pending ones.
- **Sidequests (`Quest`/`QuestStep`, UI label "Quests"/"Sidequests").**
  Personal long-term goals with a user-chosen deadline (`targetDateKey`, a
  Berlin day string), user-authored ordered progression steps (never
  auto-suggested - that was an explicit requirement) and per-quest
  `sharedWithGroups` visibility, shown read-only in the group's "Sidequests"
  tab (`GET /api/groups/[id]/quests`). Not to be confused with the existing
  *group* goals (`GroupGoal`, tab "Ziele"). Reminders live in
  `checkQuestReminders()` in `lib/scheduler.ts`: 09:00 Berlin onward, at most
  one per quest per day (`lastRemindedDateKey`), interval from
  `reminderIntervalDays()` in `lib/quests.ts` (AUTO scales with the
  creation->deadline span), plus a final reminder on the deadline day, none
  after it. The `QUEST_REMINDER` notification snippet is
  `daysLeft|done|total|title` - title last because it's free text that may
  contain `|`.
- **Docker RAM discipline - keep it that way.** This ships as a pull-and-run
  image for self-hosters on small boxes, so container memory is capped
  deliberately, not left to defaults: `docker-compose.yml` sets
  `deploy.resources.limits.memory` (app 512M, db 256M),
  `NODE_OPTIONS=--max-old-space-size=384` for the running app (so V8 doesn't
  size its heap off the *host's* RAM), and Postgres runs with
  `-c shared_buffers=64MB -c max_connections=30`. The Dockerfile's
  `migrate` stage is deliberately `FROM base` (not `FROM deps`/`FROM
  builder`) with a synthesized package.json installing only `prisma` +
  `dotenv` - pulling in the full app's `node_modules` just to run
  `migrate deploy` was most of a ~2GB image for no reason; it's ~865MB now.
  If you add a new build stage, ask whether it actually needs the full
  dependency tree before copying it in.
- **Baseline security headers, deliberately no CSP yet.** `next.config.ts`
  sets `Strict-Transport-Security`/`X-Content-Type-Options`/`X-Frame-Options`/
  `Referrer-Policy`/`Permissions-Policy` on every response via `headers()`.
  No Content-Security-Policy on purpose - `components/ui/chart.tsx` injects
  an inline `<style>` tag, and a wrong CSP breaks pages silently rather than
  loudly; add one deliberately later, tested in a browser (report-only
  first), not blind via curl.

## Testing conventions

No automated test suite exists yet - verification is manual, over the
live deployed app, per the deployment workflow above. When adding
something with real logic (PR detection, bodyweight resolution, Yammer
vote thresholds, auto-share dedup), write out the specific edge cases
you're checking as curl commands against real accounts, not just "it
built successfully."
