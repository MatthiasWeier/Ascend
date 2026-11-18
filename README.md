# Ascend

Train together. Push each other.

A self-hostable, open-source workout tracker with a built-in "Workout Brain"
that suggests what to train next, protects you from overtraining, tracks
climbing-specific skin recovery, and runs group Daily Challenges with a
peer-review system ("Yammer") that stops people from sandbagging their goals.

Licensed under the [MIT License](./LICENSE) - use it, fork it, run your own
instance for you and your crew. Contributions welcome - see
[CONTRIBUTING.md](./CONTRIBUTING.md).

**Version:** see [`package.json`](./package.json) (`version` field - the one
source of truth, also shown in the app footer and in Settings) ·
[CHANGELOG.md](./CHANGELOG.md) for release history · follows
[SemVer](https://semver.org/); `0.x` means still moving, no stability
guarantees yet.

## Stack

- Next.js 16 (App Router) + TypeScript + Tailwind CSS 4
- shadcn/ui (Base UI primitives), dark-first theme, CSS-only animations
- PostgreSQL + Prisma ORM (driver adapter, no Rust query engine)
- Auth.js (NextAuth v5) with username + password login (no email required -
  nothing is ever emailed)
- Docker / Docker Compose for deployment

## Running your own instance (Docker)

```bash
cp .env.example .env
echo "AUTH_SECRET=$(openssl rand -base64 33)" >> .env
# Optional but recommended before letting real people sign up - see "Legal
# pages" below.
docker compose up -d --build
docker compose exec app pnpm prisma db seed
```

Database migrations run automatically on every `docker compose up` (a
one-shot `migrate` service that `app` waits on) - no manual step needed
there. The app is then on `http://localhost:3000` (or your server's
address). Data lives in two named Docker volumes (`db-data`,
`uploads-data`) that survive rebuilds/restarts. Uploads (avatars, group
photos) can instead go to an S3-compatible bucket like MinIO - set the
`S3_*` variables in `.env.example`; unset, everything stays on local
disk as above.

See [DEPLOYMENT.md](./DEPLOYMENT.md) for reverse proxy / HTTPS setup,
backups, the healthcheck, and Prometheus metrics.

> **Resource usage:** at rest, the app container sits around 150-200MB RAM
> and Postgres around 30-50MB - both are capped (512M / 256M) in
> `docker-compose.yml` so neither can run away with the host's memory.
> `docker stats` showing a much bigger number next to them (e.g. the
> host's full RAM) just means no limit was set yet, not that anything is
> actually using that much - see [DEPLOYMENT.md](./DEPLOYMENT.md#resource-usage).
> The one real spike is the **build** (`docker compose build`/`up --build`),
> which needs real headroom for `pnpm build` - 2GB+ free is a safe minimum.
> On a small VM (2 vCPU / 2GB RAM or less), don't run `pnpm dev` and
> `docker compose build` at the same time - both are memory-hungry and can
> thrash the box into unresponsiveness. Stop the dev server first, or add
> swap.

## Local development

```bash
cp .env.example .env      # fill in DATABASE_URL / AUTH_SECRET
docker compose up -d db   # start just the database
pnpm install
pnpm prisma migrate dev   # create tables
pnpm prisma db seed       # seed default exercises + challenge templates
pnpm dev
```

## Legal pages (`/impressum`, `/datenschutz`)

Ascend is self-hosted: whoever runs an instance is the one legally
responsible for it, not this project. The legal notice (`/impressum`) and
privacy policy (`/datenschutz`) pages read their operator details (name,
address, contact) from environment
variables and clearly say "not configured" instead of showing placeholder
fake data until you set them - see `.env.example` for `OPERATOR_NAME`,
`OPERATOR_ADDRESS`, `OPERATOR_EMAIL`, `OPERATOR_PHONE`.

The privacy policy's description of *what data the app processes* is
accurate for the software itself regardless of who's hosting it; only the
"who is the controller / how to contact them" part needs filling in. This is
a reasonable-effort template, not legal advice - if you're operating this
commercially or at any real scale, have an actual lawyer check it for your
jurisdiction.

## Feature status

Legend: ✅ implemented · 🚧 partial · ⏳ not started · ❓ implemented but unverified (not manually tested)

### Users & Profiles
- ✅ Username + password login (no email required)
- ✅ Private, strictly separated training data per user
- ✅ Body weight as a **history** (`BodyWeightEntry`, one entry per day),
  not just a single value
- ✅ Account deletion (Danger Zone in Settings, password confirmation,
  cascades correctly including owned groups)
- ✅ Instance-wide admin role (`/dashboard/admin`): user management,
  grant/revoke admin rights, delete users, reset 2FA for an account
  (the only recovery path, since there's no email)
- ✅ **Two-factor authentication (TOTP)**: optional per account,
  self-implemented RFC 6238 (works with any standard authenticator app),
  QR code setup, 10 one-time backup codes
- ✅ **Session management** (Settings): view active devices, sign out
  individually or all except the current one immediately - takes effect
  on that device's next request, not only after JWT expiry
- ✅ **Admin settings** (Admin page, admins only): rate limits
  (login/registration, brute-force protection) and open vs. invite-only
  registration, each toggled on/off - takes effect immediately, no
  redeploy needed
- ✅ Full JSON data export, CSV import (Strong/Hevy-compatible, best
  effort), subscribable ICS calendar feed - all in Settings

### Logging Training
- ✅ Two exercise types: reps+weight (`REPS`) and timed hold (`HOLD`)
- ✅ Exertion tracking (perceivedExertion) and skin condition (skinCondition)
- ✅ Custom exercises (personal or group-wide visible)
- ✅ 53 default exercises + 8 daily-challenge themes seeded
- ✅ Fast exercise search (searchable combobox instead of a long dropdown
  list)
- ✅ Auto-fill from the last session (reps/weight/duration pre-filled,
  without overwriting values you've already typed)
- ✅ Built-in rest timer (60/90/120/180s, started via the ✓ button on a set)
- ✅ Workout templates: save the current set order, reload it via dropdown
- ✅ "Frequent" chips: add any of your 8 most-used exercises as a set with
  one click
- ✅ **Edit & delete a workout** - including correctly updating any linked
  group-goal contributions
- ✅ **German/English toggle** (header, login, Settings): the whole UI is
  bilingual, language stored per device via cookie; user-generated content
  and push text stay untranslated
- ✅ **kg/lbs toggle** (Settings): a display-only setting, everything is
  always stored in kg internally; the plate/warm-up calculators use the
  matching plate set for whichever unit is selected

### Workout Brain
- ✅ Muscle-focus suggestion (longest gap since it was last trained)
- ✅ Overload protection / rest-day recommendation (avg. exertion over the
  last 3 days)
- ✅ Skin-recovery timer for climbers (hides grip exercises until skin has
  recovered)
- ✅ Daily-challenge reminder on the home page (inline, no pop-up): shows
  every still-open challenge for today across all groups, with a direct
  link to the group/challenge
- ✅ "Group activity" on the home page: shared workouts and challenge
  results from all groups, newest first, with timestamps

### Analytics
- ✅ 1RM estimate (Epley) & max-strength history
- ✅ Personal-records overview: current best value per exercise
- ✅ Training streak on the home page (German calendar days)
- ✅ **Bodyweight-adjusted**: pull-ups & co. factor into power/workload
  using the body weight logged *at the time of that training session* -
  not your current weight (`lib/bodyweight.ts`)
- ✅ **PR detection**: a new personal record per exercise is computed
  chronologically (bodyweight-adjusted 1RM or hold duration), flagged
  with a trophy badge in the feed, and celebrated with a toast on save
- ✅ Volume graph (90 days)
- ✅ Balance radar (actual vs. target per muscle group)
- ✅ Activity calendar (year heatmap), clicking a day shows the exact
  workout (exercises, weight, reps) for that day
- ✅ Climbing pyramid + boulder-day calendar (counter per grade, e.g.
  "5x grade 6, 3x grade 4")
- ✅ **Schedule meetups** (climbing, gym, or freely-labeled "other"): create
  a day (today or later) per group with an optional title/time/location;
  members RSVP with their own optional goal and training focus
  (Slab/Power/Technique/Endurance/Strength/Mental for climbing,
  Push/Pull/Legs/Core/Grip for gym) - shown as a green-marked day in your
  personal calendar across all groups. Members who didn't plan the meetup
  themselves can suggest a change (date/time/location + note); whoever
  planned it accepts or declines.
- ✅ **Sidequests** (menu item "Quests"): personal goals with a
  self-chosen target date ("learn a handstand by end of 2026"), optionally
  with your own progression made of self-defined steps (nothing is ever
  auto-suggested), recurring reminders (automatic based on duration, or a
  fixed interval), and a group tab where members see each other's shared
  sidequests and progress - toggleable per sidequest
- ✅ **Reminders** (Settings > Workout Reminders): your own weekly
  recurring training times ("Monday 1pm, Wednesday 6pm", independent of
  groups) plus a lead time for how far ahead to be reminded about a
  meetup you've RSVP'd to (never / 1 hour before / that morning / the
  evening before) - both run through an in-process scheduler
  (`lib/scheduler.ts`, started via Next.js's instrumentation hook), no
  separate cron service needed

### Groups
- ✅ Create, join via invite link
- ✅ Roles: **Leader** (creator) / **Member** - anyone can invite, only the
  Leader can kick; members can leave on their own; leadership can be
  transferred (moves the real ownership assignment too, not just the
  role); group name editable by the Leader
- ✅ Feed: text posts, photos (local Docker volume), workouts shared
  individually via the composer or permanently via the **"Auto-share
  workouts"** toggle (retroactive + all future ones); an already-shared
  workout is never posted twice
- ✅ Feed filter by type (All/Text/Workout/Photo) and by clicking a name to
  filter by person
- ✅ Reactions on posts (👍❤️💪🔥, one per person)
- ✅ Nudge: remind fellow members via push notification (rate-limited)
- ✅ **Daily Challenges**: the Leader activates up to 4 themes from a
  catalog (`ChallengeTemplate`), everyone sets their own rep target
- ✅ **Yammer system** (anti-sandbagging): other members can challenge a
  target they think is too low; once 75% of the *remaining* members agree
  (the goal owner doesn't count), the target is invalidated until it's
  raised
- ✅ Execution with a live timer + quick buttons (+1/+2/+5/+10),
  auto-completes once the target is reached, daily boundary in **German
  time** (Europe/Berlin, not UTC)
- ✅ Post-challenge rating (5 smileys) adjusts the target for *next* time
  (±10%/±5%/0%)
- ✅ **Stakes**: optional free text when activating a Daily Challenge (e.g.
  "loser does 20 push-ups"), visible to everyone
- ✅ **Challenge history**: see retroactively, per member, which days a
  challenge was completed, abandoned, or never attempted, including a
  percentage for partially-completed attempts
- ✅ **Group analytics**: group volume (sets/day, 30 days), activity per
  member, plus climbing days (how often and when as a group, with
  location/time/attendee count) and attendance per member - its own tab
- ✅ **Collaborative group goals**: the Leader sets up a shared goal with a
  target value/unit (enum: reps/seconds/km/custom, not free text)/optional
  deadline; a progress bar shows the whole group's total plus each
  person's contribution; title, values, and linked exercises stay
  editable by the Leader at any time afterward, not just deletable
- ✅ **Automatic group-goal contributions**: a goal can optionally be
  linked to multiple exercises (`Exercise[]` objects, not a string) - e.g.
  "3000 push-ups" counts push-ups + diamond + pike push-ups together.
  From then on, regular workouts *and* completed/abandoned Daily
  Challenges using any linked exercise contribute automatically
  (including a retroactive backfill of past history when linking);
  manual entry only remains possible for goals with no linked exercise
  (e.g. km)
- ✅ **Onboarding tutorial**: a 12-step tour right after registration
  (once, skippable; repeatable from Settings)
- ✅ **Daily Challenges count workout reps too**: reps of the challenge's
  exercise from today's workouts (excluding warm-up sets) automatically
  count toward today's attempt - 100 push-ups logged in a workout
  complete the 100-push-ups challenge. Editing or deleting the workout
  recalculates it; group goals never double-count

### UX & Design
- ✅ Dark-first theme with a light-mode toggle (next-themes)
- ✅ shadcn/ui, CSS-only enter animations (deliberately no JS animation
  runtime - see design decisions below)
- ✅ PWA: installable ("Add to Home Screen") with its own icon
- ✅ **Push notifications** (Web Push, no third party/Firebase): a
  Settings toggle, notifies other group members on a new workout post or
  a completed Daily Challenge - optional, see `.env.example`
  (`VAPID_*`); without those set, the toggle is simply hidden

### Security & Ops
- ✅ Structured JSON logging (`lib/logger.ts`, visible via
  `docker compose logs app`) + custom error boundaries
- ✅ Automatic DB migrations on startup (`migrate` service in
  `docker-compose.yml`)
- ✅ Healthcheck (`/api/health`) wired into the Dockerfile + Compose
- ✅ Prometheus metrics (`/api/metrics`, behind `METRICS_TOKEN`)
- ✅ Backup/restore scripts (`scripts/backup.sh`, `scripts/restore.sh`)
- ✅ Non-root container user
- ✅ S3/MinIO storage backend for uploads (optional, see `.env.example`)
- ⏳ External monitoring/alerting (Sentry or similar) - needs your own
  account, not part of this project
- ❓ Mobile/cross-browser UI hasn't been tested in a real browser - if you
  find something broken, please report it

## API (for your own scripts)

API keys are created in Settings (`ascend_...`, shown only once). Use one
to authenticate against `/api/v1/*`:

```bash
curl -H "Authorization: Bearer ascend_..." https://your-instance/api/v1/exercises
```

Every key has a scope: **read-only** (the default for new keys) or
**read/write**, chosen at creation time. A read-only key gets `403` on
every writing route (POST/PATCH/DELETE, marked in the table below). Keys
that already existed before this feature shipped stay read/write.

| Endpoint | Method | Description |
|---|---|---|
| `/api/v1/me` | GET | Your own profile (name, avatar, weight unit, current body weight) |
| `/api/v1/today` | GET | Workout Brain recommendation: what to train today (`?lang=de\|en`, default `de`) |
| `/api/v1/calendar` | GET | Your workouts + group meetups within a range (`?from=`/`?to=`, `YYYY-MM-DD`, default: today-7 to today+30) |
| `/api/v1/streak` | GET | Current training streak (days) |
| `/api/v1/daily-challenges` | GET | Today's status of every active daily challenge across all groups |
| `/api/v1/quests` | GET | Your sidequests including steps |
| `/api/v1/climbing-sends` | GET | Most recent logged sends (`?limit=`, max 200, default 50) |
| `/api/v1/climbing-sends` | POST 🔒 | Log a send (`{style, grade, attempts?, count?, date?}`) |
| `/api/v1/group-goals` | GET | Progress on all group goals across all your groups (read-only) |
| `/api/v1/balance-goals` | GET | Target vs. actual training share per focus (Push/Pull/Legs/Core/Grip) |
| `/api/v1/balance-goals` | PATCH 🔒 | Set balance targets (`{goals: [{focus, targetPercent}]}`) |
| `/api/v1/injuries` | GET | Active injuries |
| `/api/v1/muscle-preferences` | GET | Muscle wishlist (0 = fine as-is, 1 = more, 2 = much more) |
| `/api/v1/workout-templates` | GET | Your workout templates including exercises |
| `/api/v1/exercises` | GET | Visible exercises (your own + defaults + groups) |
| `/api/v1/exercises` | POST 🔒 | Create a custom exercise (same validation as in the app) |
| `/api/v1/workouts` | GET | Your workouts (`?limit=`, max 200, default 50) |
| `/api/v1/workouts` | POST 🔒 | Create a workout (`{date?, notes?, sets: [{exerciseId, reps?, weightKg?, durationSec?, setType?, notes?}]}`, `date` as `YYYY-MM-DD`, a future date → 400) |
| `/api/v1/workouts/[id]` | GET/PATCH 🔒/DELETE 🔒 | Read/edit/delete a single workout (`date` as in POST) |
| `/api/v1/groups` | GET | Your groups (id, name, role) |
| `/api/v1/personal-records` | GET | Current personal records per exercise |
| `/api/v1/body-weight` | GET | Most recent body-weight entries (`?limit=`, max 200, default 30) |
| `/api/v1/body-weight` | POST 🔒 | Log body weight (`{weightKg, date?}`, one entry per day - posting again the same day corrects it) |

🔒 = needs a key with read/write access; a read-only key gets `403` here.

Deliberately kept lean - not a replacement for the internal API, but a
stable surface for your own automations. Writing `/api/v1/*` routes don't
trigger PR/group-goal side effects - with one exception:
`/api/v1/workouts/[id]` PATCH/DELETE automatically cleans up orphaned
group-goal contributions if the workout was originally logged through the
app (otherwise group-goal progress would never be accurate again).

### Example: Home Assistant

A REST sensor for today's training recommendation:

```yaml
sensor:
  - platform: rest
    name: Ascend Trainingsempfehlung
    resource: https://your-instance/api/v1/today
    headers:
      Authorization: !secret ascend_api_key
    value_template: "{{ value_json.headline }}"
    json_attributes:
      - detail
      - exampleExercises
      - suggestedFocus
```

## Data model

See `prisma/schema.prisma`. Key design decisions:

- **Body-weight history instead of a single value**: `BodyWeightEntry` per
  day, so old workouts are evaluated against the weight you had back then.
- **German calendar days as a string key**: daily-challenge and boulder
  days use `YYYY-MM-DD` (Europe/Berlin) instead of a UTC `DateTime`, to
  avoid timezone bugs at the day boundary (`lib/german-time.ts`).
- **Yammer voting threshold**: the "75% of the remaining members" check is
  recalculated server-side on every vote, not stored as a snapshot.
- **Account deletion cascades**: delete your account while you're still a
  group's Leader, and the group is deleted along with it - the UI warns
  explicitly beforehand. There's a leadership transfer
  (`POST /api/groups/[groupId]/transfer-leadership`, moves both the
  visible Leader role and `Group.ownerId`, the field that actually
  cascades on deletion) - transfer leadership to another member first,
  and the group survives deleting your account.
