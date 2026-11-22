# Changelog

All notable changes to this project are documented here. Format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versioning follows
[SemVer](https://semver.org/) - `0.x.y` means the app is still moving and
nothing is guaranteed stable yet.

## [0.63.0] - 2026-11-22

### Fixed
- **Cardio sets in the feed never picked up the distance/duration work from
  0.61.0/0.62.0.** A 60-minute swim showed up as "Swimming 3600s" with no
  distance at all - the feed card, the activity calendar's day popover, and
  the text summaries used for shared group posts / calendar exports were
  still on the old duration-in-raw-seconds, weight-only formatting. All three
  now show duration as minutes above a minute (e.g. "60min") and, for cardio
  exercises, the distance alongside it (e.g. "60min, 1.3km").

## [0.62.0] - 2026-11-21

### Added
- **Seconds/minutes toggle for any duration-logged exercise** (Plank,
  Dead Hang, Running, Swimming, ...), right next to the duration field -
  same idea as the km/mi distance toggle. Typing "3600" for a 60-minute
  swim was exactly the kind of mental math this app should be doing for
  you; a 15-second sprint still wants seconds, not "0.25". Each set picks
  its own unit (defaulting to minutes for cardio, seconds otherwise) and
  converts the already-typed value when switched, instead of resetting
  it. Nothing changes in storage or the API - duration is still logged in
  seconds under the hood.

## [0.61.0] - 2026-11-21

### Changed
- **Cardio exercises now log distance instead of added weight.** Logging
  5kg for a swim never meant anything - the "+kg" field next to a cardio
  exercise's duration is now a distance field (km, or mi if your weight
  unit is set to lbs) instead. Non-cardio HOLD exercises (planks, dead
  hangs, ...) are unaffected and still take optional added weight.
- **Drop set/Failure are hidden for cardio exercises** in the set-type
  picker - both are strength-training tags (reduce the weight and keep
  going / trained to the point of failure) that don't mean anything for a
  duration-logged run or swim. Only Warm-up/Normal are offered.

### Added
- `WorkoutSet.distanceMeters`, exposed on both the web app's workout
  routes and the `/v1` API (optional, backward compatible).

## [0.60.0] - 2026-11-21

### Added
- **Cardio exercises**: Running, Cycling, Jump Rope, Rowing (Machine), and
  all four competitive swimming strokes (Freestyle, Backstroke,
  Breaststroke, Butterfly), logged by duration like a HOLD exercise. The
  swimming strokes are mapped to genuinely different muscles and training
  focuses - breaststroke's propulsion is whip-kick dominant (legs) with a
  chest/triceps press for the arm phase, while freestyle and backstroke
  are arm-pull dominant (lats/shoulders); butterfly's dolphin kick makes
  it the most core-driven of the four.
- `Exercise.isCardio`: new exercises are excluded from the Push/Pull/Legs/
  Core/Grip Workout Brain balance and its example-exercise suggestions, so
  a run's duration (counted in seconds) doesn't swamp strength sets' reps
  x weight numbers and skew the balance toward "you've way overtrained
  legs."

## [0.59.0] - 2026-11-18

### Changed
- **English is now the source language throughout the codebase**, not
  German - this is a public repo. Every UI string, API error message,
  and push notification text in the source code is now written in
  English directly (previously German text was the literal `t()` call
  argument, with English living only in a translation dictionary). The
  app's actual UI behavior is unchanged: English is now the default
  display language, and German is still fully available via the
  existing locale toggle, just the other way around architecturally -
  German now lives in the dictionary (`src/lib/i18n/de/`) instead of
  English.

## [0.58.2] - 2026-11-18

### Fixed
- **The workout date field could still be set to a future date despite
  the `max` attribute**, with no error shown until you actually tried to
  submit (the server has always correctly rejected it - now the field
  itself prevents picking it).

## [0.58.1] - 2026-11-18

### Fixed
- **README/UI: fixed an outdated claim about group leadership transfer.**
  Both the README and the account-deletion dialog claimed there was no way
  to transfer a group's leadership - that feature has existed for a while
  (`POST /api/groups/[groupId]/transfer-leadership`). Both texts corrected;
  the dialog now correctly points out that you should transfer leadership
  first, instead of incorrectly claiming it's impossible.
- Minor README fixes: a German grammar error, plus the already-used ❓
  symbol ("implemented but not manually tested") added to the legend.

## [0.58.0] - 2026-11-18

### Changed
- **BREAKING: `/api/v1/workouts` and `/api/v1/workouts/[id]` - `date`
  format changed.** Used to accept a full ISO datetime and never rejected
  a future date - inconsistent with the internal `/api/workouts` API,
  which has always used a Berlin date key (`YYYY-MM-DD`) and rejects
  future dates. Now aligned: `date` is `YYYY-MM-DD`, a future date returns
  `400`. Existing scripts sending an ISO datetime here need to switch to
  the new format.

### Added
- **API key scopes**: choosable when creating a key, between "read-only"
  (new default) and "read/write". A read-only key gets `403` on every
  writing `/api/v1/*` route (POST/PATCH/DELETE). Existing keys stay
  read/write, so nothing that already relies on write access breaks.

## [0.57.1] - 2026-11-16

### Added
- **The ICS calendar feed now also includes group meetups**: previously
  just your own workouts, now also climbing/gym/other meetups from all
  your groups (with location/RSVP count, as an all-day or timed entry).
  Meant for calendar integration in external tools like Home Assistant.

## [0.57.0] - 2026-11-16

### Added
- **REST API: significantly more endpoints**: `/api/v1/me`,
  `/api/v1/streak`, `/api/v1/daily-challenges` (today's status across all
  groups), `/api/v1/quests`, `/api/v1/climbing-sends` (GET/POST),
  `/api/v1/group-goals` (progress, read-only), `/api/v1/injuries`,
  `/api/v1/muscle-preferences`, `/api/v1/workout-templates`,
  `/api/v1/balance-goals` PATCH (set goals), `/api/v1/exercises` POST
  (create your own exercise), and `/api/v1/workouts/[id]`
  GET/PATCH/DELETE for individual workouts. See README for the full list.

## [0.56.0] - 2026-11-16

### Added
- **REST API expanded**: `/api/v1/today` (Workout Brain recommendation,
  what to train today, `?lang=de|en`), `/api/v1/calendar` (own workouts +
  group meetups as JSON, `?from=`/`?to=`), `/api/v1/balance-goals`
  (target vs. actual percent per focus), `/api/v1/groups`,
  `/api/v1/personal-records`, and `/api/v1/body-weight` (GET/POST, one
  entry per day). Meant for your own automations, e.g. Home Assistant.
  See README.

## [0.55.1] - 2026-10-24

### Added
- **Log workouts retroactively**: when logging (and later editing), the
  date can now be freely chosen instead of only "now" - for anyone who
  only logs once they have time, not during the workout. Future dates are
  blocked; daily challenges/group goals still only count toward the day
  actually chosen.

## [0.55.0] - 2026-09-30

### Fixed
- **Workout Brain / balance goals counted bodyweight exercises as
  practically zero**: training load per focus (Push/Pull/Legs/Core/Grip)
  was computed as reps*weight, but for exercises with no added weight
  (push-ups, pull-ups, ...), `weightKg` is only the *additional* weight,
  often 0 - someone doing lots of push-ups still saw only ~1% "Push".
  Now factors in bodyweight at the time of the workout, same as
  PRs/1RM already do.

### Added
- **Edit group goals** (Leader): title, target value, unit, start/deadline,
  and linked exercises can now be changed after the fact, not just deleted.
- **Link multiple exercises to one group goal**: "3000 push-ups in
  September" can now count push-ups, diamond push-ups, and pike push-ups
  together, instead of only one exact exercise.
- **Group analytics: climbing days** - how often and when the group went
  climbing (date, time, location, attendee count), plus how often each
  member RSVP'd, as a bar chart.

## [0.54.1] - 2026-09-28

### Fixed
- The tab bar inside a group (Feed, Challenges, Goals, Sidequests, ...)
  couldn't be swiped on mobile; it now sits in its own horizontally
  scrollable container (edge to edge).

## [0.54.0] - 2026-09-28

### Added
- **Sidequests** (new "Quests" menu item): personal long-term goals with
  a self-chosen target date, e.g. "learn a handstand by end of 2026".
  Optionally with your own **progression** - intermediate steps (pike
  push-ups → feet on the wall → ... → handstand hold) that only you
  define (nothing is ever suggested), checkable and reorderable, with a
  progress bar. Complete/reopen/edit/delete.
- **Reminders** per sidequest at 9am: automatic based on duration (every
  2 days up to 2 weeks out, weekly up to 2 months, every 2 weeks up to
  ~6 months, monthly beyond that) or fixed (daily / every 3 days / weekly
  / every 2 weeks / monthly / never), plus a reminder on the deadline day.
  Runs in the existing scheduler.
- **Group tab "Sidequests"**: the group can see its members' shared
  sidequests including progress; toggleable per sidequest ("visible to my
  groups"). The group gets notified when one is completed. Sidequests are
  also included in the JSON data export.

## [0.53.0] - 2026-09-22

### Added
- **Instance settings** (admin page, admins only): two new switches, take
  effect immediately with no redeploy.
  - **Rate limits**: toggles login lockout, registration, comment, nudge,
    photo-upload, and challenge-rep limits as a whole on/off (default:
    off, as before). Thresholds remain tunable via env vars, see
    `.env.example`.
  - **Open registration**: replaces the previous `INVITE_ONLY` env var -
    closes/opens registration at runtime instead of only at deploy time.

## [0.52.0] - 2026-09-22

### Security
- Added baseline HTTP hardening headers (`Strict-Transport-Security`,
  `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`,
  `Referrer-Policy`, `Permissions-Policy`) to every response. Prompted by
  a security review; a Content-Security-Policy was deliberately left out
  for now since a wrong one breaks pages silently rather than loudly and
  deserves its own browser-tested change.

## [0.51.0] - 2026-09-22

### Added
- **Meetups now exist for every activity** (climbing, gym, other with a
  free-text title), not just climbing days - when planning one, you pick
  the type and optionally a title ("leg day"); the focus picker shows
  matching tags (Slab/Power/Technique/Endurance/Strength/Mental for
  climbing, Push/Pull/Legs/Core/Grip for gym). Multiple meetups can share
  the same day (e.g. gym in the morning, climbing in the evening).
- **Suggest changes**: anyone who didn't plan a meetup themselves can
  suggest a change to date/time/location (with a note) instead of only
  accepting or skipping it. Whoever planned it sees the suggestions and
  accepts them (applies the change immediately, notifies the group) or
  declines.
- **Workout reminders** (new settings card): your own weekly recurring
  training times, independent of groups ("Monday 1pm, Wednesday 6pm",
  with an optional label, individually toggleable), plus a lead time for
  group meetups you've RSVP'd to (never / 1 hour before / same-day
  morning / evening before). Both run through a new in-process scheduler
  (`lib/scheduler.ts`, started via a Next.js instrumentation hook at
  server start, checks every minute) - no extra cron service needed.

## [0.50.0] - 2026-09-22

### Added
- **Plan climbing days and invite friends**: new group tab "Climbing" -
  set up a climbing day for today or later (time, location, your own goal,
  training focus like Slab/Power/Technique/Endurance/Strength/Mental - all
  optional except the date). The group gets notified. Members see who's
  coming and RSVP with their own optional goal/focus or decline; whoever
  planned it can change time/location or cancel the day.
  The personal climbing calendar (Analytics > Climbing) marks planned days
  green with a mountain icon across all groups - clicking a future day
  opens the RSVP view instead of the boulder-log dialog (which stays as-is
  for today/past days); with no planned day, one can be created directly
  from there (with a group picker if you're in more than one).
- **Rating no longer gets missed when a challenge is completed via a
  workout**: when a daily challenge auto-completes from logged workout
  reps (instead of through the challenge dialog), the feed now still asks
  "how hard was it" (5 smileys, as usual) - previously this stayed
  invisible unless you happened to open the group's "Challenges" tab.

### Fixed
- **A group member's body view**: the dialog had no height limit/scroll,
  so with the 3D view + muscle list + injuries it could easily exceed the
  visible area and look cut off. Also, a load failure (e.g. 403) killed
  the loading state silently instead of showing a message - both fixed
  (the dialog now scrolls itself, load errors show an error message
  instead of loading forever).

## [0.49.0] - 2026-09-22

### Fixed
- **RAM analysis: the 3+GB weren't the app.** `docker stats` for
  `ascend-app-1`/`ascend-db-1` sat at ~100MB/~25MB the whole time - the
  actual consumers were two pieces of Ascend-unrelated Docker leftovers
  from many rebuilds over a long uptime:
  - The **`dockerd` process itself** held onto ~1.5GB RSS it never
    released after many image builds - a `systemctl restart docker`
    (containers come back on their own via `restart: unless-stopped`)
    dropped that straight back to ~100MB.
  - **Orphaned build cache** had piled up to 3.4GB of disk (`docker
    builder prune -af` fixed it).
  - The **`migrate` image was 2.03GB**, because it dragged along the
    entire `builder` stage (full source code, the built `.next`, all
    ~90 runtime/dev dependencies) just to run `prisma migrate deploy`
    once. Now installs only `prisma`+`dotenv` in isolation (no longer
    `FROM builder`) - **2.03GB → 865MB**. Migration tested successfully
    after the change (26 migrations detected, connected correctly).
  - The actual app image (`ascend-app`) was already lean: 323MB, of which
    238MB is the node:22-alpine base, 78MB is the app's own layer - that's
    also what someone actually gets with `docker pull`.
  - Details and diagnostic commands in
    [DEPLOYMENT.md](./DEPLOYMENT.md#resource-usage).

## [0.48.0] - 2026-09-22

### Removed
- **Removed all rate limits.** Registration, login (brute-force lockout),
  nudges, daily-challenge reps, group comments, and pump-pic uploads
  previously ran through an in-memory limiter - unnecessary for this
  self-hosted setup with a small, trusted group. `lib/rate-limit.ts` and
  the corresponding `LOGIN_RATE_LIMIT_*`/`REGISTER_RATE_LIMIT_*` env vars
  are gone entirely (docs/`.env.example`/`docker-compose.yml` cleaned up
  accordingly). Note: this also removes login brute-force protection - a
  deliberate tradeoff for this setup.

## [0.47.0] - 2026-09-22

### Added
- **Collapsible sidebar**: the left navigation can be collapsed to an icon
  strip (remembered per device); Admin/Settings/Impressum/Privacy
  Policy/version number are now pinned to the view (sticky) and always
  visible, without having to scroll down through the feed first.
- **Report an injury directly on the body**: on the body page, every
  muscle's detail view now has a "report injury" button, pre-filled with
  the body parts that match that muscle.
- **Daily injury check-in**: for any injury active longer than a day, the
  feed asks once a day "still injured?" - "Yes" opens a 1-10 pain scale,
  "No" marks it as healed (`InjuryCheckin`, one entry per day and injury).
- **Group body view**: in the member list, "View body" shows a teammate's
  3D view - training load only from workouts shared in that group (never
  the private history), plus active injuries including notes. Your own
  wishes stay private and are never shown there.
- Injury notes are now also visible as their own card in your own body
  view, not just in settings.

### Fixed
- **3D body view barely visible on mobile**: the renderer was scaled with
  `updateStyle=false`, so the canvas area became a multiple of the visible
  area on high-resolution (Retina) screens and the overflow was simply
  cut off - especially noticeable on mobile. The canvas size now
  explicitly follows the container.
- **RAM usage put in context and capped**: actual usage in operation was
  already low (app ~150-200MB, database ~30-50MB) - `docker stats` only
  showed several GB of "Limit" because none was set (the Limit field then
  just shows the whole host's RAM). Both containers now have a hard memory
  limit (512M/256M), the app has a Node heap cap, and Postgres runs with
  tighter `shared_buffers`/`max_connections`. The one real usage spike is
  the **build** (`docker compose build`), which is now also capped (2GB)
  instead of hanging the VM when free RAM runs low. Details in
  [DEPLOYMENT.md](./DEPLOYMENT.md#resource-usage).

## [0.46.0] - 2026-09-22

### Added
- **Edit and delete your own exercises**: new settings card "My Exercises"
  (your own custom exercises plus group exercises you manage as Leader).
  Editable: name, description, type (reps/hold), focus, bodyweight, and
  the trained muscles. Changing the type converts already-logged sets
  (reps <-> seconds) instead of displaying them wrong - so a hold exercise
  accidentally created as "reps" can be repaired. If the exercise is
  linked to a group goal, the type stays locked. Deleting works as long as
  no sets, challenges, or group goals depend on it (otherwise a message
  with the count); templates just lose the entry. Default exercises stay
  untouchable.
- **Install-the-app prompt**: on mobile in the browser (not as an
  installed app), a banner reads "Download Ascend as an app" with
  "Install" (Chrome/Android: native dialog) or "How to" (instructions for
  Safari/iOS and other browsers). Closing (X) hides it until the next
  visit, "Don't show again" hides it permanently on that device. Settings
  has an "Install app" card (install/instructions, show the hint again).

## [0.45.0] - 2026-09-21

### Added
- **Injuries** (stage 3): in settings, log a body part (neck, shoulder,
  elbow, forearm, wrist, finger, chest, back, hip, knee, foot), severity
  (mild/moderate/severe), note, and optional end date; "Healed" ends it.
  Every exercise knows the body parts it loads (from its muscles plus
  joint load like wrists during push-ups). When logging, an affected
  exercise gets a warning (also in the exercise picker); at
  moderate/severe it also disappears from the Workout Brain, a focus with
  no exercises left gets skipped, and the Brain card names the reason.
  The card now shows example exercises for every suggestion.
- **Body page** (stage 4, new "Body" menu item): a custom, rotatable 3D
  figure (three.js, 14 muscles as ellipsoids), colored in 5 steps from
  gray (barely any) to red (a lot) based on weighted sets per week
  (7/14/30 days). Blue = muscle wish, orange = affected by injury. Tapping
  selects a muscle (details, set a wish), dragging rotates, front/back/spin
  buttons; without WebGL there's a muscle list instead.

## [0.44.0] - 2026-09-21

### Added
- **Muscle model** (stage 1 of the muscle/injury guideline): 14 muscle
  groups (chest, shoulders, biceps, triceps, forearms, lats, upper/lower
  back, abs, obliques, glutes, quads, hamstrings, calves). All 53 default
  exercises have primary/secondary muscles attached (`ExerciseMuscle`,
  `prisma/seed.ts`); custom exercises pick their muscles on creation (tap:
  primary → secondary → off), with no selection an estimate from the focus
  is used. `getMuscleStats` returns load and "last trained" per muscle.
- **Muscle wishes** (stage 2): in settings, per muscle "Fine / More / Much
  more". The Workout Brain suggests a wished muscle again once it hasn't
  been trained for more than 3 days ("More") or 2 days ("Much more"), with
  a reason and three example exercises (preferring your own).

Planned: injuries (stage 3), rotatable 3D body with heatmap (stage 4).

## [0.43.0] - 2026-09-21

### Fixed
- **Climbing days didn't show up in the feed**: a new climbing day only
  triggered a notification but had no feed entry. It now appears as its
  own post (`PostType.CLIMBING`, content as JSON, one per group/person/day)
  in the group feed and on the home page (filters "Workouts" or
  "Climbing"), with a total count and grade breakdown, commentable.
  Editing the day afterward updates the post, clearing the day removes it;
  the notification only fires for a new post and links straight there.
  Applies to the climbing-day dialog and "log a send" (routes count too).
  Climbing days from the last 30 days were backfilled once (without a
  notification).

## [0.42.0] - 2026-09-21

### Changed
- **Feed & workout cards**: status ("X posted a workout") and metrics are
  now clearly separated - name bold, action muted, numbers like "2
  exercises · 4 sets" or "100/100" bold in the accent color
  (`BoldNumbers`). "Show details" has a larger click target with a bigger
  caret; comment button is larger, always with a label.
- **Logging a workout**: the set checkmark is now a "Set & rest" button
  (then "Done"); "Add set" is a clearly recognizable, dashed full-width
  button; trash icon with a tooltip.
- **Analytics**: activity calendar with a real hover tooltip (date +
  intensity, also via keyboard) and a color ramp that runs dark-to-light
  in dark theme (previously the darkest step sank into black). Y-axes
  labeled ("Estimated 1RM (kg)", "Volume (kg)", "Sets"), X-axis with
  minimum spacing against overlapping dates.
- **Group goals**: contributors as a leaderboard (ranks 1-3 in
  gold/silver/bronze, bars, bold amount).
- **Climbing pyramid** with axis titles, **balance radar** tooltip in %,
  **boulder calendar** with a per-day tooltip; tooltips for renaming/
  leaving a group and deleting a goal.
- **Group challenges**: today's leaderboard (ranks 1-3 in
  gold/silver/bronze, then a number) including bold progress "cur/target";
  tooltips for play ("start/continue/rate challenge"), contest, history,
  and deactivate.

### Fixed
- Dropdowns sometimes showed the raw value instead of the name (e.g. the
  database ID in the strength-record history). The affected selects
  (exercise, workout picker, set type, units, language, create exercise,
  group goal) now pass their labels.

## [0.41.0] - 2026-09-20

### Added
- **Climbing-day button on the home page**: "Climbing day" opens the
  boulder dialog for today directly (next to "Workout"; on mobile next to
  "Log workout").
- **Push + bell for climbing days**: logging a new climbing day notifies
  the members of any group where you've enabled sharing your training
  ("X went bouldering (12 boulders)"). Editing a day afterward doesn't
  trigger anything.
- **Notifications lead to the message**: clicking a comment, reply, or
  workout notification opens the group feed, scrolls to the post or
  comment, expands the comments, and briefly highlights the spot (also via
  a push link).

### Fixed
- **"Climbing" calendar**: clicking a marked day opened an empty dialog
  (all grades at 0). It now loads that day's saved boulders, saving
  replaces them instead of appending duplicates; all zeros clears the day.
  Routes/other grades for that day stay untouched (with a note).

## [0.40.0] - 2026-09-19

### Added
- **Onboarding tutorial**: right after registration, a 12-step tour opens
  once (log a workout, pump pics, feed, calendar & streak, analytics,
  Workout Brain, groups, challenges & group goals, notifications,
  settings). Can be skipped anytime with "Skip"; never shows again
  afterward (remembered server-side per account, `User.tutorialCompletedAt`).
  Existing accounts don't see it. Settings has "Watch the tutorial again".

## [0.39.0] - 2026-09-19

### Added
- **Daily challenges count with workouts**: reps of the challenge exercise
  that you log in a workout today (warm-up sets don't count) automatically
  flow into the challenge's daily attempt - 100 push-ups in a workout
  completes the challenge, including a notification to the group. Works
  when logging, editing, and deleting workouts (if the count drops below
  the target and it's not yet rated, the challenge reopens), as well as
  when setting a goal retroactively. The challenge dialog shows "of which
  X from your workouts today".

### Changed
- A challenge attempt now only contributes the reps typed into the dialog
  to group goals (`manualReps`); workout reps come in through the sets -
  so nothing gets counted twice.

## [0.38.0] - 2026-09-19

### Added
- **Server-side workout draft**: the "log a workout" form is saved
  automatically (shortly after every change, and immediately when the tab
  goes to the background), e.g. when switching to WhatsApp. It's restored
  when you come back, with a notice and "Discard". Drafts and photos never
  attached to a workout expire after 7 days.
- **Pump pics**: up to 10 photos per workout (when logging and editing).
  Visible to you and to members of the groups the workout is shared in -
  on the workout card, in the group feed, on the home page, and in the
  calendar. Clicking enlarges; photos are never cropped. Deleting a
  workout or account also removes the files.

## [0.37.0] - 2026-09-19

### Added
- **Notification center (bell)** in the header: an unread counter and a
  list of comments on your own posts, replies to your own comments,
  nudges, new workouts from the group, and completed challenges. Works
  independently of Web Push (uses push additionally when it's set up).
  Entries are stored language-neutral and appear in whichever language is
  selected; old ones are removed after 60 days.

## [0.36.3] - 2026-09-19

### Added
- **Push diagnostics** (Settings → Notifications): shows permission
  status, push service, subscription status, and the exact error when
  enabling it; "Test notification" sends a push to your own devices and
  reports what the push service replied with.
  Pushes now go out with a TTL and high urgency.

## [0.36.1] - 2026-09-19

### Fixed
- **Photos are never cropped anymore**: images in the group feed and on
  the home page appear in full (smaller instead of cut off) and can be
  opened full-size by clicking (lightbox, with a link to the original).
- **Comments on the home page**: comments under group posts (text, photo,
  workout) and under your own workouts shared in groups are now
  readable and writable from the home-page feed too.

## [0.36.0] - 2026-09-19

### Added
- **Comments with nested replies (Reddit-style)** under every group post
  (text, workout, photo): replies to replies, individual threads
  collapsible, edit/delete your own comments, Leader can moderate. A
  deleted comment with replies stays visible as "[deleted]" so the thread
  remains readable. Comment counter in the feed; push to the post's or
  comment's author.

## [0.35.0] - 2026-09-19

### Changed
- **Desktop layout**: two columns on large screens - Workout Brain, open
  challenges, and a 12-week activity overview stay visible on the right.
- **Feeds**: workouts (own and shared) show a summary first ("5 exercises
  · 14 sets") with "Show details"; entry types are easier to tell apart
  via a colored border and icon circle.
- **Logging a workout**: larger input fields and more spacing, the
  "Frequent" pills look like buttons.
- **Analytics**: empty states with a dummy graph and a button, units on
  the Y-axes, values directly on the pyramid bars, a larger activity
  calendar. "Strength" only lists exercises with at least 2 training days
  (so a graph is possible) and pre-selects the most-trained one.
- Lighter secondary text in dark mode (contrast).
- **Follow-ups**: group goals in the desktop column; shared workouts show
  the muscle focus ("Core focus") and can be expanded on the home page
  too; groups, group detail, settings (two columns), and logging a workout
  make better use of large screens; larger action icons in set rows; the
  activity calendar now sits prominently above the analytics tabs;
  contrast in light mode increased (5.8:1 to 7.5:1), very pale secondary
  text removed.

## [0.34.0] - 2026-09-19

### Added
- **English/German toggle**: a switcher (DE/EN) in the header, on
  login/registration/home page, and in settings. The chosen language is
  stored in a cookie (`ascend-locale`) per device and applies even before
  login. Translated: the whole UI, Workout Brain text, times/date formats,
  server error messages, as well as the Impressum and privacy policy
  pages (the English version is a courtesy translation - the German one
  is authoritative).
- `scripts/check-i18n.mjs` (`pnpm i18n:check`): finds missing English
  translations and German text that isn't translated yet.

### Known limitations
- User-entered content (posts, notes, custom exercises, group names) is
  not translated.
- Push notifications are sent in German server-side (the recipient's
  language isn't known there).
- Already-stored workout summaries in group posts stay as shared; only
  the heading ("Workout from ...") is translated.

## [0.33.0] - 2026-09-19

### Changed
- **Home page: one shared feed instead of two separate sections.** Own
  workouts, group messages, photos, shared workouts, and challenges now
  live in a single timeline. Filters (remembered): source (me / individual
  groups, multi-select) and type (workouts / messages / photos /
  challenges). Photos show as a direct preview, "Show more" loads further
  back.
- **Edit/delete a workout directly on the card** as visible buttons
  instead of behind a small ⋮ menu - the detour via Analytics → Calendar
  is no longer needed.

## [0.32.0] - 2026-09-19

### Added
- **Session management** (Settings → Sessions): shows every device
  currently signed in, with "last active"; individual sessions or all but
  the current one can be ended immediately - the device gets signed out
  automatically on its next request, with no need to wait for the natural
  JWT expiry. Existing logins remain valid across the update (no forced
  re-login).

### Changed
- Technical note for future auth work: a true switch from JWT to
  database sessions (as originally envisioned for this feature) isn't
  possible with this app as long as only the Credentials provider is
  configured - Auth.js actively rejects `session.strategy = "database"`
  in that case. Session management is instead built as a revocation list
  on top of the existing JWT (see CLAUDE.md), which delivers practically
  the same result without fighting that limitation.

## [0.31.0] - 2026-09-19

### Added
- **Two-factor authentication (TOTP)**: optional, toggleable per account
  in settings - RFC 6238 TOTP (compatible with Google/Microsoft
  Authenticator, Aegis, 1Password, ...) implemented from scratch, no cloud
  service needed. QR code to scan, 10 backup codes (each usable once) on
  activation. Login only asks for the code if 2FA is on for that account -
  nothing changes for any existing account without opting in. Since there's
  no email-based account recovery, admins can reset 2FA for an account in
  `/dashboard/admin` if both the authenticator and backup codes are lost.

## [0.30.0] - 2026-09-19

### Added
- **kg/lbs toggle** (Settings → Units): controls display only - workout
  sets, body weight, PRs, and charts show/accept values in the chosen
  unit; storage is always internally in kg (no mismatch on
  export/import/the API, which stay kg-only). The plate and warm-up
  calculators use the matching plate/bar set for the chosen unit (kg:
  20kg bar, 25/20/15/10/5/2.5/1.25kg plates; lbs: 45lbs bar,
  45/35/25/10/5/2.5lbs plates).
- **CONTRIBUTING.md**: setup, requirements for PRs (build/lint/manual
  testing, migrations instead of `db push`, versioning), and conventions
  (German UI, no new mandatory cloud dependencies).

## [0.29.0] - 2026-09-19

### Added
- **S3/MinIO storage backend** (optional): avatars and group photos can
  be stored in an S3-compatible bucket (e.g. MinIO) instead of on local
  disk - useful for multi-host or Kubernetes deployments where the local
  `uploads` volume isn't practical. Enabled by setting
  `S3_ENDPOINT`/`S3_BUCKET`/`S3_REGION`/`S3_ACCESS_KEY_ID`/
  `S3_SECRET_ACCESS_KEY` (see `.env.example`); without these, everything
  stays on the previous local-disk behavior. Files are never served from a
  public bucket URL, always streamed through the existing authenticated
  app routes, so group access control still applies unchanged.

## [0.28.0] - 2026-09-19

### Added
- **REST API with API keys**: `/api/v1/exercises` and `/api/v1/workouts`
  (GET/POST), authenticated via `Authorization: Bearer ascend_...`. Keys
  are created/revoked in Settings, the raw key is only shown once. See
  README for details.

## [0.27.0] - 2026-09-19

### Added
- **Data export** (Settings): a full JSON export of all your own data
  (workouts, sets, body weight, climbing, balance goals, templates)
- **CSV import** (Strong/Hevy-compatible, best effort): unknown exercises
  are created automatically, muscle focus is guessed from the exercise
  name
- **Subscribable calendar feed** (ICS): a private, token-based link per
  user for Apple/Google Calendar etc., viewable and regeneratable in
  Settings

## [0.26.0] - 2026-09-19

### Added
- **Admin role**: an instance-wide admin (`User.isAdmin`) with user
  management under `/dashboard/admin` - a list of all users, grant/revoke
  admin rights, delete users (with protection against self-deletion and
  removing the last admin)
- **Invite-only registration**: `INVITE_ONLY=true` closes registration
  unless you come through a valid group invite link - registration and
  joining a group then happen in one step

## [0.25.0] - 2026-09-19

### Added
- **Automatic DB migrations**: `docker compose up` now runs a one-shot
  `migrate` service (`prisma migrate deploy`) before the app starts - no
  more manual SSH + migration command
- **Health check**: `GET /api/health` checks real DB reachability, wired
  into the Dockerfile `HEALTHCHECK` and the `app` service
- **Prometheus metrics**: `GET /api/metrics`, behind `METRICS_TOKEN`
  (disabled/404 by default)
- **Backup/restore scripts** (`scripts/backup.sh`, `scripts/restore.sh`)
  for a DB dump + uploads archive, see `DEPLOYMENT.md`
- **DEPLOYMENT.md**: Caddy/Traefik examples, migration/health-check/
  backup/metrics docs in one place
- Login/registration rate limits configurable via env vars
  (`LOGIN_RATE_LIMIT_*`, `REGISTER_RATE_LIMIT_*`)

### Fixed
- Docker automatically sets `HOSTNAME` to the container ID, which made
  Next's standalone server bind only to the internal bridge IP instead of
  all interfaces - invisible from outside (port forwarding happened to
  still work anyway), but any connection from *inside* the container to
  `localhost` (like the new health check) failed. `HOSTNAME=0.0.0.0` in
  the Dockerfile fixes it.

## [0.24.0] - 2026-09-18

### Added
- **Set types**: every set can be marked as warm-up, normal, drop, or
  failure - warm-up sets don't count toward records, training balance, or
  group goals
- **Notes per set** (e.g. "slow eccentric"), in addition to the existing
  workout-wide note
- **Plate calculator** and **warm-up calculator** right when logging a set
- **"Last time" display** in the active workout, instead of only silently
  pre-filling
- **Sets per muscle group this week** in Analytics (Volume tab) - one of
  the most important volume-management metrics
- **Copy templates from group members**: viewable in the member list and
  importable into your own library with one click

## [0.23.1] - 2026-09-18

### Fixed
- Editing a workout that was already shared into a group now updates that
  group post's content too, instead of leaving it showing the old
  numbers - without sending a new push notification.

## [0.23.0] - 2026-09-18

### Added
- **Fatigue per muscle group**: instead of a single "overall effort", the
  workout now asks per focus actually trained how taxed it is - the
  Workout Brain now uses this: a focus just hit hard isn't suggested again
  right away, even if the calendar alone would call it "overdue"
- Your own messages (text/photo caption) in the group feed can now be
  edited, not just deleted

### Fixed
- A hold with added weight (e.g. a weighted dead hang) previously couldn't
  be logged with weight at all - the weight was silently dropped. Now
  counts correctly toward records and training balance.

## [0.22.0] - 2026-09-18

### Added
- **Group activity** on the dashboard now also shows chat messages and
  photos, not just shared workouts and challenges
- **Start date ("from")** for group goals: without a start, "1000
  pull-ups in October" previously also counted September and earlier -
  now a time window can be defined instead of only a deadline
- **Online status** in the member list: "Online" or "last online X ago"
- **Member calendar**: another group member's training calendar is now
  viewable - only what's actually been shared in that group, never the
  private history
- Anyone can now delete their own posts (messages, photos, shared
  workouts) in the group feed; the Leader can additionally moderate
  others' messages/photos, but not others' workout shares
- Hovering over a reaction now shows who reacted

## [0.21.0] - 2026-09-18

### Changed
- **Workout Brain now takes balance goals into account**: a focus with a
  0% target is never suggested again, and a focus noticeably below its
  target share is preferred over just going by "last trained"

## [0.20.0] - 2026-09-18

### Added
- **Onboarding checklist** for new users with no workouts: "Getting
  started" with three steps (log your weight, log your first workout,
  create/join a group) instead of an empty list with no guidance

## [0.19.0] - 2026-09-18

### Added
- **Undo window** instead of a confirmation dialog: deleting a template
  (new "manage templates" view) and removing a member from a group now
  happen immediately, with 5 seconds to undo in a toast

## [0.18.0] - 2026-09-18

### Added
- **Optimistic UI updates**: posting in the group feed, reacting to posts,
  and contributing to group goals now feel instant instead of waiting for
  the server response (with automatic rollback on errors)

## [0.17.0] - 2026-09-18

### Added
- **Pull-to-refresh** on the dashboard and group feed: pulling down at the
  top reloads, instead of having to manually reload the page

## [0.16.0] - 2026-09-18

### Added
- **Profile picture upload**: your own image instead of just an initials
  avatar, visible in the user menu, in settings, and in every group's
  member list

## [0.15.0] - 2026-09-18

### Added
- **Nudge**: any member can nudge any other member via push ("Get your
  workout in!"), max once per hour per person
- **Reactions** on feed posts (👍❤️💪🔥) - one reaction per person per
  post, picking a different emoji replaces the old one
- **Streak display** on the home page: consecutive training days in
  German time, only breaks after a fully missed day
- **Personal records overview**: a new "Records" tab in Analytics with
  the current best per exercise (instead of only visible as a badge in
  the feed)

## [0.14.0] - 2026-09-18

### Added
- Members can now leave a group themselves (previously only kicking by
  the Leader was possible)
- **Leadership transfer**: a Leader can hand off leadership to another
  member - transfers both the role and the actual owner assignment, so
  the group no longer gets deleted along with the old Leader's account
- The group name can be changed afterward by the Leader

## [0.13.0] - 2026-09-18

### Added
- "Frequent" chips above the exercise list when logging a workout: the 8
  most frequently logged exercises added as a new set with one click,
  without opening the search
- **Edit and delete a workout** - not previously possible. Editing opens
  the same logging page pre-filled with the existing sets; both available
  via a menu on every workout card (feed + calendar view). Linked
  group-goal contributions are correctly adjusted on edit/delete, never
  double-counted

## [0.12.0] - 2026-09-18

### Added
- Push notifications (Web Push, no third party): toggle in settings,
  notifies every other group member when someone posts a workout or
  completes a daily challenge. Fully optional for self-hosters - without
  `VAPID_*` environment variables set, the toggle just stays hidden

## [0.11.0] - 2026-09-18

### Added
- New "Analytics" tab in groups: group volume over the last 30 days (the
  whole group's sets per day) and activity per member (logged workouts,
  last 30 days)

## [0.10.0] - 2026-09-18

### Added
- Activity calendar: clicking a day shows that day's exact workout
  (exercises, weight, reps) in a dialog

## [0.9.0] - 2026-09-18

### Added
- Workout templates: save the current set order as a named template and
  reload it next time via a dropdown (values are still pre-filled from the
  last session)

## [0.8.0] - 2026-09-18

### Added
- "Group activity" on the home page: shared workouts and
  completed/abandoned challenges from all your groups, newest first, with
  a timestamp and a link to the respective group

## [0.7.0] - 2026-09-18

### Added
- Challenge history: see per daily challenge who completed, gave up, or
  never attempted it on which day, including the percentage for partially
  completed attempts

## [0.6.0] - 2026-09-18

### Added
- Group feed filter by type (all/text/workout/photo)
- Clicking a name in the feed now shows only that person's posts

## [0.5.0] - 2026-09-18

### Added
- PWA icons (app icon/home screen, favicon) generated from the Ascend logo
- **Group goals as real objects instead of strings**: the unit is now an
  enum (reps / seconds / km / custom) instead of free text
- **Automatic group-goal contribution**: a goal can optionally be linked
  to an exercise - afterward, both normal workouts and
  completed/abandoned daily challenges with that exercise contribute
  automatically, no more manual entry needed. Linking backfills the
  entire past retroactively. Daily challenges themselves stay unaffected
  by this - those still only arise through the separate challenge flow

### Fixed
- Migrated existing group goals (free-text unit -> enum) without
  data loss

## [0.4.0] - 2026-09-18

### Added
- Daily-challenge reminder on the home page: anyone with an open challenge
  for today (not started or not finished) sees it immediately above "Hey,
  name" - no pop-up, nothing to dismiss, a direct link to the respective
  group/challenge

## [0.3.1] - 2026-09-18

### Changed
- Replaced the "share all workouts" button with a persistent toggle
  ("auto-share workouts") per group: once enabled, every new workout is
  shared automatically, not just the existing backlog. Disabling only
  stops future shares, already-shared posts stay in the feed.

### Fixed
- Bulk-share could insert the same workouts into the feed twice on
  multiple/fast clicks (or a repeated request) - the database now blocks
  that itself (`skipDuplicates`), regardless of how often the action is
  triggered.

## [0.3.0] - 2026-09-18

### Added
- "Share all workouts" button in groups: shares every own workout not yet
  shared in that group with one click, instead of selecting them one by
  one via the composer
- Already-shared workouts are no longer offered for selection in the
  composer and can't be shared twice

## [0.2.0] - 2026-09-17

### Added
- Fast exercise search: a searchable combobox (shadcn Command/Popover)
  replaces the long dropdown list when logging a workout
- Auto-fill from the last session: reps/weight/duration are pre-filled per
  exercise from the last log, without overwriting values already typed
- Built-in rest timer with 60/90/120/180s presets, startable via a
  ✓ button right on the set
- Duplicate set: one click copies an exercise + values from a set into a
  new row below it, for multiple sets of the same exercise in a row
- PR detection: chronological best-value calculation per exercise
  (bodyweight-adjusted 1RM or hold duration), trophy badge in the feed,
  and a "New PR!" toast on save
- Stakes: optional free text when activating a daily challenge
- Collaborative group goals: a shared goal with a target value/unit/
  deadline, every member contributes, progress bar + contribution per
  person

### Fixed
- Crash when opening the user menu (Base UI error from a missing
  `Menu.Group` wrapper around the username label)

## [0.1.0] - 2026-09-17

Initial public release.

### Added
- Workout logging (rep/weight and timed-hold exercises), custom exercises
  (personal or group-shared), 53 seeded default exercises
- Workout Brain: muscle-focus suggestion by longest rest, overload/rest-day
  protection, climbing skin-recovery gating
- Analytics: 1RM trend (Epley, bodyweight-adjusted for bodyweight
  exercises), volume graph, balance radar, activity calendar heatmap,
  climbing pyramid + boulder-day quick counter
- Groups: invite-link join, Leader/Member roles, text/photo/workout-share
  feed
- Daily Challenges with a "Yammer" anti-sandbagging vote system, live-timer
  execution, post-attempt difficulty rating that adjusts future targets
- Username + password auth (no email required), per-user data isolation
- Account deletion (GDPR right to erasure), self-hostable Impressum/
  privacy-policy pages configured via environment variables
- Rate limiting (registration, login brute-force lockout, challenge
  actions), structured logging, custom error boundaries
- Dark-first theme with light-mode toggle, Docker/Docker Compose deployment
- MIT license
