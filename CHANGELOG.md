# Changelog

All notable changes to this project are documented here. Format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versioning follows
[SemVer](https://semver.org/) - `0.x.y` means the app is still moving and
nothing is guaranteed stable yet.

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
  Datenschutzerklärung pages configured via environment variables
- Rate limiting (registration, login brute-force lockout, challenge
  actions), structured logging, custom error boundaries
- Dark-first theme with light-mode toggle, Docker/Docker Compose deployment
- MIT license
