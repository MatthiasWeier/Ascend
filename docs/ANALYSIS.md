# Ascend - Code-Review-Analyse (Phase 1)

Datum: 2026-11-18
Umfang: alle 122 API-Routen unter `src/app/api/**` (inkl. `/api/v1/**`), Dependency-Audit, Docker/Compose-Setup, Scheduler, README/CLAUDE.md-Konsistenz.
Durchgeführt von: Claude (demselben Agenten, der den Großteil dieses Codes ursprünglich geschrieben hat - dadurch gezielter geprüft statt blind von null, mit entsprechendem Vertrauensvorteil bei "das ist absichtlich so" vs. "das wurde übersehen").

## Zusammenfassung

Der Code ist insgesamt in besserem Zustand, als man bei "von einem KI-Agenten in kurzer Zeit erzeugt, keine Tests" erwarten würde. Auth- und Ownership-Checks folgen durchgängig denselben etablierten Mustern (`getGroupMembership`, `findOwn`/`loadOwn`-Helfer, API-Routen scopen praktisch überall korrekt auf `session.user.id` bzw. geprüfte Gruppenmitgliedschaft) - von 122 Routen wurden **keine echten IDOR-Lücken mit tatsächlichem Cross-User-Datenzugriff** gefunden, nur eine Handvoll kleinerer Inkonsistenzen (fehlender Membership-Check bei zwei Routen, die aber ohnehin selbst-scoped sind). Mass Assignment kommt nirgends vor - jede schreibende Route validiert mit zod und übernimmt Felder gezielt. TypeScript läuft im `strict`-Modus. Das Docker-Setup ist durchdacht (Multi-Stage, Non-Root, Healthchecks, RAM-Limits, DB nicht nach außen exponiert).

Die zwei Funde mit echtem Gewicht: **Next.js 16.3.5 ist verwundbar für drei kritische CVEs** (RCE-Klasse, gepatcht ab 16.3.6/16.4.1 - ein einfaches Versions-Update behebt alle drei), und **Rate-Limiting ist standardmäßig deaktiviert**, d. h. eine frische Instanz hat ohne manuelles Eingreifen keinen Brute-Force-Schutz auf Login/Register/2FA. Alles andere ist Mittel/Niedrig: ein paar fehlende Längenlimits auf Arrays, zwei Race-Condition-Lücken bei gleichzeitigen Requests (Challenge-Attempt-Increment, Yammer-Votes nach Gruppenaustritt), kein TOTP-Replay-Schutz, kein Rate-Limit auf `/api/v1/*`, sowie eine veraltete README-Aussage zur Gruppen-Ownership-Übertragung (die Funktion existiert längst, die Doku wurde nie nachgezogen). Es gibt **keine Tests und keine CI** - das größte strukturelle Risiko ist nicht ein einzelner Bug, sondern dass es aktuell nichts gibt, das eine Regression automatisch auffangen würde.

`pnpm audit` meldet alarmierend viele Funde (3 kritisch, 19 hoch, 29 mittel) - verifiziert wurde, dass bis auf die drei Next.js-CVEs **keiner der hoch/mittel eingestuften Funde tatsächlich im produktiven Docker-Image landet** (`.next/standalone` enthält die betroffenen Pakete wie `lodash`/`mysql2`/`studio-core` nicht - sie kommen rein aus Prismas eigenem Build-Tooling, das nur zur Build-/Migrationszeit läuft, nicht im laufenden Container).

## Befundliste

| ID | Kategorie | Schweregrad | Datei(en) | Beschreibung | Vorschlag | Aufwand |
|---|---|---|---|---|---|---|
| CRIT-1 | Dependency | **Kritisch** | `package.json` (`next: 16.3.5`) | 3 kritische Next.js-CVEs treffen die installierte Version: GHSA-vcvr-r3jv-pc5j (RCE in `next/og` `ImageResponse`, gepatcht ≥16.3.6), GHSA-2464-fhr4-w9xw (unauth. RCE in Image-Optimization bei SVG, gepatcht ≥16.4.1), GHSA-673q-mjm6-r5xr (unauth. RCE in `"use cache"`-Funktionen, gepatcht ≥16.4.1). App nutzt weder `next/og`/`ImageResponse` noch `"use cache"` noch `next/image` im eigenen Code (verifiziert per Grep) - reduziert, aber schließt Risiko nicht sicher aus, da es sich um Framework-interne Request-Handling-Bugs handeln kann. | `next` auf ≥16.4.1 anheben (selbe Minor-Linie, risikoarmes Update), danach `pnpm build` + Smoke-Test. | S |
| SEC-A-RL0 | Sicherheit | **Hoch** | `src/lib/rate-limit.ts`, `lib/app-settings.ts` | Rate-Limiting ist standardmäßig deaktiviert (`rateLimitingEnabled` default `false`, nur per Admin-Toggle aktivierbar). Eine frische Instanz hat ohne manuelles Eingreifen keinen Brute-Force-Schutz auf Login/Register/TOTP. | Default auf `true` setzen, oder beim ersten Admin-Login unübersehbar darauf hinweisen. **Offene Entscheidung, siehe unten.** | S |
| SEC-A1 | Sicherheit | Mittel | `src/app/api/settings/2fa/verify/route.ts` | Kein Rate-Limit auf den TOTP-Code bei 2FA-Aktivierung (im Gegensatz zum Login-Flow). | Dieselbe `checkRateLimit`-Logik wie beim Login anwenden. | S |
| SEC-A2 | Sicherheit | Mittel | `src/lib/uploads.ts`, `src/app/api/settings/avatar/route.ts` | Avatar-Upload validiert nur den client-deklarierten MIME-Type, keine Magic-Byte-Prüfung. Entschärft durch festen Content-Type beim Ausliefern (kein XSS-Vektor), aber Nicht-Bilder könnten gespeichert werden. | Magic-Byte-Check vor dem Schreiben (z. B. `file-type`-Paket). | S |
| SEC-A3 | Sicherheit | Mittel | `src/lib/totp.ts` | Kein TOTP-Replay-Schutz - derselbe gültige Code ist im 90s-Fenster mehrfach nutzbar. | Letzten akzeptierten Zeit-Counter pro User speichern, gleiche/kleinere Werte ablehnen. | S |
| SEC-A4 | Sicherheit | Niedrig | `src/lib/api-key-auth.ts`, alle `/api/v1/*` | API-Keys haben kein Scope (immer voller Lese-/Schreibzugriff) und kein Ablaufdatum; kein Rate-Limit auf `/api/v1/*`. Selbst gebaut/bestätigt: dieselbe Lücke wurde unabhängig bei der v1-API-Entwicklung notiert. | Optionales Scope-Feld (read-only/read-write) und/oder Ablaufdatum; Rate-Limit auf v1-Routen. | M |
| INFO-A1 | Robustheit | Niedrig | `src/app/api/settings/import/route.ts` | Mehrere Sessions werden sequenziell außerhalb einer Transaktion importiert - Abbruch mittendrin lässt Teil-Import stehen (kein Datenverlust, nur Unvollständigkeit). | In `$transaction` wrappen oder Fehler klar kommunizieren. | S |
| SEC-B1 | Sicherheit | Niedrig | `src/app/api/analytics/1rm/route.ts` | `exerciseId` wird ohne Sichtbarkeits-Check per `findUnique` geladen (nur ein Boolean-Feld betroffen, keine echten Trainingsdaten; cuid nicht erratbar). | Sichtbarkeits-Check wie in `/api/exercises` GET ergänzen. | S |
| DATA-B1 | Datenkonsistenz | Niedrig | `src/app/api/workout-templates/route.ts` | `exerciseIds` im Body werden nicht gegen sichtbare Übungen validiert - eine erratene fremde Exercise-ID könnte theoretisch referenziert werden (cuid nicht erratbar, geringes Risiko). | Gegen dieselbe Sichtbarkeits-Query wie `/api/exercises` GET prüfen. | S |
| UPLOAD-B1 | Sicherheit | Niedrig | `workout-photos`, `avatars`, `uploads/[...path]`, Gruppen-Post-Uploads | Content-Type-Validierung nur über MIME/Endung, keine Magic-Byte-Prüfung (gleiche Klasse wie SEC-A2, aber alle Upload-Pfade betreffend). | Zentralen Magic-Byte-Check für alle Upload-Pfade einführen. | S |
| SEC-C1 | Sicherheit | Niedrig | `src/app/api/groups/[groupId]/posts/[postId]/reactions/route.ts` (DELETE) | `postId` wird nicht gegen `groupId` geprüft (anders als POST). `deleteMany` ist aber auf `userId: session.user.id` gescoped - nur Selbstzugriff möglich, kein Cross-User-Risiko. | `findGroupPost(groupId, postId)` auch in DELETE nutzen. | S |
| SEC-C2 | Sicherheit | Niedrig | `src/app/api/groups/[groupId]/climbing-meetups/[meetupId]/join/route.ts` (DELETE) | Kein Membership-Check vor dem Löschen der eigenen Teilnahme (selbst-scoped, kein Cross-User-Risiko, aber Ex-Mitglied könnte alte RSVP noch löschen). | Membership-Check ergänzen, konsistent mit POST. | S |
| SEC-C3 | Sicherheit | Mittel | `.../suggestions/[suggestionId]/accept`, `.../decline` | Kein Membership-Check, nur `createdById`-Prüfung - ein Ersteller, der die Gruppe verlassen hat, kann weiterhin Terminvorschläge zu seinem alten Termin annehmen/ablehnen. Schwesterroute `POST /suggestions` prüft Membership zusätzlich - hier fehlt es inkonsistent. | `getGroupMembership`-Check ergänzen wie bei `POST /suggestions`. | S |
| PERF-C1 | Performance | Niedrig | `src/app/api/groups/[groupId]/posts/route.ts` (GET) | Mehrere korrekt gebatchte Zusatz-Queries (kein echtes N+1), aber vier sequentielle statt parallelisierte Queries bei großen Feeds. | Mit `Promise.all` parallelisieren. | S |
| BUG-D1 | Datenkonsistenz | Mittel | `src/app/api/challenge-attempts/[attemptId]/increment/route.ts` | `currentReps` wird per Read-Modify-Write statt atomarem `{ increment }` geschrieben (im Gegensatz zu `manualReps`). Bei gleichzeitigen Requests (Doppel-Tap) "last write wins" - verfälscht dauerhaft Fortschrittsanzeige/`justCompleted`-Erkennung bis zum nächsten Workout-Sync. Gruppenziel-Beiträge selbst bleiben korrekt. | `currentReps` ebenfalls atomar mit `{ increment: amount }` schreiben, `justCompleted` aus dem Update-Rückgabewert ableiten. | S |
| BUG-D2 | Datenkonsistenz | Mittel | `prisma/schema.prisma` (`YammerVote`), Gruppenaustritt-Route | `YammerVote` wird beim Gruppenaustritt/-Kick nicht aufgeräumt (nur `onDelete: Cascade` bei Account-Löschung). Verlässt ein Mitglied die Gruppe, zählt seine alte Stimme in `maybeInvalidate()` weiter mit, während `eligibleVoters` live kleiner wird - macht Invalidierung unverhältnismäßig leicht. | Beim Verlassen/Kicken `yammerVote.deleteMany(...)` für die betroffene Gruppe ergänzen. | S |
| SEC-E1 | Sicherheit | Mittel | `src/app/api/climbing-sends/batch/route.ts` | `entries`-Array im Body hat kein Längenlimit (anders als die Einzel-Route). Self-DoS/Ressourcenverbrauch auf der kleinen VM möglich. | `.max(100)` o. ä. auf das Array. | S |
| SEC-E2 | Sicherheit | Niedrig | `src/app/api/metrics/route.ts` | Token-Vergleich mit `!==` statt `crypto.timingSafeEqual`; Token auch per `?token=`-Query möglich (Access-Log-Leak-Risiko). Nur aggregierte Zähler betroffen, keine PII. | `timingSafeEqual` nutzen, Query-Param-Variante zugunsten Header deprecaten. | S |
| MISC-1 | Doku | Niedrig | `src/app/api/calendar/[token]/route.ts` | Kein Bug (bewusstes Design wie jeder ICS-Feed), aber bei Token-Leak sind komplette Workout-Historie + Meetup-Details einsehbar, unbegrenzt, ohne Rate-Limit. | In Settings-UI/README als "wie ein Passwort behandeln" dokumentieren. | S |
| MISC-2 | Robustheit | Niedrig | `src/app/api/climbing-sends/route.ts` | `date` ohne Format-Validierung (anders als `batch/route.ts`, das `DATE_KEY_RE` nutzt) - ungültiger String könnte zu 500 statt 400 führen. | Gleiche Regex-Validierung wie `batch/route.ts`. | S |
| MISC-3 | Kosmetisch | Niedrig | `src/app/api/injuries/route.ts` | POST gibt bei Update eines bestehenden Eintrags ebenfalls `201` statt `200` zurück. | Statuscode je nach Create/Update differenzieren. | S |
| BUG-F1 | Datenkonsistenz | Mittel | `src/app/api/v1/workouts/[sessionId]/route.ts`, `src/app/api/v1/workouts/route.ts` | `date`-Feld nutzt `z.string().datetime()` (volles ISO-Datetime) statt des Berlin-DateKey-Formats (`YYYY-MM-DD`) wie die interne `/api/workouts`-API, und prüft **nicht** auf Zukunftsdaten (die interne API lehnt das explizit ab). Zwei unterschiedliche Verhaltensweisen für dieselbe Aktion, je nachdem ob über App oder API geloggt wird. | `date`-Handling zwischen `/api/workouts` und `/api/v1/workouts` angleichen (DateKey-Regex + Zukunfts-Check übernehmen) - **Breaking Change für bestehende API-Konsumenten, daher offene Entscheidung, siehe unten.** | M |
| LOW-F2 | Robustheit | Niedrig | `src/app/api/workouts/route.ts`, `.../[sessionId]/route.ts`, `src/app/api/v1/workouts/*` | `sets`-Array hat in keiner der vier Routen ein `.max()` - app-weites Muster, nicht v1-spezifisch. Ein Request könnte ein beliebig großes Set-Array senden. | `.max(100)` o. ä. einheitlich ergänzen. | S |
| DOCS-1 | Doku | Niedrig | `README.md:328-330` | Behauptet "keine Ownership-Übertragung vorhanden" bei Account-Löschung - `POST /api/groups/[groupId]/transfer-leadership` existiert längst und verschiebt tatsächlich `Group.ownerId` (nicht nur die kosmetische Leader-Rolle, verifiziert im Code). Doku wurde nach Einführung des Features nie nachgezogen. | README-Absatz korrigieren; prüfen, ob die Account-Löschungs-UI ihre Warnung bereits korrekt nur zeigt, wenn der Nutzer *aktuell* noch Owner einer Gruppe ist. | S |
| DEPS-1 | Dependency | Info | `pnpm-lock.yaml` | `pnpm audit` meldet 19 Hoch + 29 Mittel zusätzlich zu den 3 Next.js-Kritisch-Funden - alle verifiziert transitiv über `prisma`s eigenes Studio/Config-Tooling (`lodash`, `mysql2`, `deepmerge-ts`, `source-map-js` u. a.), **nicht** im produktiven `.next/standalone`-Build enthalten (per `find` bestätigt: keines dieser Pakete liegt im Docker-Image). Kein aktives Produktionsrisiko, aber Rauschen bei jedem zukünftigen Audit/CI-Gate. | Niedrige Priorität; bei Gelegenheit `pnpm overrides` prüfen oder auf neuere Prisma-Version warten, die das sauberer trennt. | M |
| TEST-1 | Tests/CI | Hoch (strukturell) | Repo-weit | Keine Tests, keine CI. Kein einzelner Fund, aber das größte strukturelle Risiko: jede künftige Änderung (auch ein Next.js-Upgrade wie CRIT-1) hat aktuell keinen automatisierten Sicherheitsnetz außer `pnpm build`/manuellem Smoke-Test. | Siehe Umsetzungsplan unten, Punkt 1. | L |

## Routen-Autorisierungstabelle

Legende: ✅ = Session-Check vorhanden · Ownership = zusätzliche Berechtigungsprüfung über reinen Login hinaus · Befund verweist auf obige ID, "OK" = nichts gefunden.

### Auth / Account / Settings / Admin / Push

| Route | Methode | Auth-Check | Ownership/Autorisierung | Befund |
|---|---|---|---|---|
| `/api/account` | DELETE | ✅ | nur eigener Account, Passwort-Reconfirm | OK |
| `/api/account/tutorial` | POST | ✅ | nur eigener User | OK |
| `/api/admin/settings` | GET/PATCH | ✅ | `isAdmin()` DB-Check | OK |
| `/api/admin/users` | GET | ✅ | `isAdmin()` | OK |
| `/api/admin/users/[userId]` | PATCH | ✅ | `isAdmin()`, Last-Admin-Schutz | OK |
| `/api/admin/users/[userId]` | DELETE | ✅ | `isAdmin()`, Self-Delete blockiert | OK |
| `/api/auth/[...nextauth]` | GET/POST | n/a (Login selbst) | n/a | OK |
| `/api/auth/totp-required` | POST | bewusst öffentlich | rate-limited | OK |
| `/api/push/config` | GET | ✅ | n/a | OK |
| `/api/push/subscribe` | POST/DELETE | ✅ | eigene userId | OK |
| `/api/push/test` | POST | ✅ | eigene Subscriptions | OK |
| `/api/register` | GET/POST | bewusst öffentlich | rate-limited, Invite-Gate | OK |
| `/api/settings/2fa/backup-codes` | POST | ✅ | Passwort-Reconfirm | OK |
| `/api/settings/2fa/disable` | POST | ✅ | Passwort-Reconfirm | OK |
| `/api/settings/2fa/setup` | POST | ✅ | eigener User | OK |
| `/api/settings/2fa/verify` | POST | ✅ | eigener User | SEC-A1 |
| `/api/settings/api-keys` | GET/POST | ✅ | eigene Keys | OK |
| `/api/settings/api-keys/[keyId]` | DELETE | ✅ | geprüft | OK |
| `/api/settings/avatar` | POST | ✅ | eigener User | SEC-A2 |
| `/api/settings/calendar-token` | GET/POST | ✅ | eigener Token | OK |
| `/api/settings/export` | GET | ✅ | eigene Daten | OK |
| `/api/settings/import` | POST | ✅ | eigener User | INFO-A1 |
| `/api/settings` | GET/PATCH | ✅ | eigener User | OK |
| `/api/settings/sessions` | GET/DELETE | ✅ | eigene Sessions | OK |
| `/api/settings/sessions/[sessionId]` | DELETE | ✅ | geprüft | OK |

### Workouts / Exercises / Templates / Photos / Uploads / Analytics

| Route | Methode | Auth-Check | Ownership/Autorisierung | Befund |
|---|---|---|---|---|
| `/api/workouts` | GET/POST | ✅ | scoped auf userId | LOW-F2 |
| `/api/workouts/[sessionId]` | GET/PATCH/DELETE | ✅ | `findOwnedSession` | LOW-F2 |
| `/api/workouts/by-date` | GET | ✅ | scoped | OK |
| `/api/workouts/draft` | GET/PUT/POST/DELETE | ✅ | keyed auf userId | OK |
| `/api/exercises` | GET/POST | ✅ | Default/eigen/Gruppe-OR | OK |
| `/api/exercises/[exerciseId]` | PATCH/DELETE | ✅ | `findManageableExercise` | OK |
| `/api/exercises/last-values` | GET | ✅ | scoped | OK |
| `/api/exercises/mine` | GET | ✅ | scoped | OK |
| `/api/workout-templates` | GET/POST | ✅ | scoped | DATA-B1 |
| `/api/workout-templates/[templateId]` | DELETE | ✅ | owned-check | OK |
| `/api/workout-photos` | POST | ✅ | Rate-Limit, Größen-/Typ-Check | UPLOAD-B1 |
| `/api/workout-photos/[photoId]` | GET/DELETE | ✅ | Owner/Gruppenmitglied bei geteiltem Workout | OK |
| `/api/workout-reminders` | GET/POST | ✅ | scoped, Max-Limit | OK |
| `/api/workout-reminders/[reminderId]` | PATCH/DELETE | ✅ | `loadOwn` | OK |
| `/api/body` | GET | ✅ | scoped | OK |
| `/api/avatars/[filename]` | GET | ✅ | n/a, Path-Traversal geblockt | OK |
| `/api/uploads/[...path]` | GET | ✅ | `getGroupMembership` auf Segment | OK |
| `/api/analytics/1rm` | GET | ✅ | scoped | SEC-B1 |
| `/api/analytics/balance` | GET | ✅ | scoped | OK |
| `/api/analytics/calendar` | GET | ✅ | scoped | OK |
| `/api/analytics/climbing` | GET | ✅ | scoped | OK |
| `/api/analytics/records` | GET | ✅ | scoped | OK |
| `/api/analytics/volume` | GET | ✅ | scoped | OK |
| `/api/analytics/weekly-sets` | GET | ✅ | scoped | OK |

### Groups / Members / Posts / Meetups

| Route | Methode | Auth-Check | Ownership/Autorisierung | Befund |
|---|---|---|---|---|
| `/api/groups` | GET/POST | ✅ | eigene Memberships | OK |
| `/api/groups/[groupId]` | GET/PATCH | ✅ | Membership/LEADER | OK |
| `/api/groups/[groupId]/auto-share` | PATCH | ✅ | Membership | OK |
| `/api/groups/[groupId]/transfer-leadership` | POST | ✅ | LEADER-only | OK |
| `/api/groups/join/[code]` | POST | ✅ | inviteCode lookup, idempotent | OK |
| `/api/groups/[groupId]/members/[userId]` | DELETE | ✅ | Self-leave/LEADER-kick | OK |
| `/.../members/[userId]/body` | GET | ✅ | beide Membership, gescoped | OK |
| `/.../members/[userId]/calendar` | GET | ✅ | Membership, gescoped | OK |
| `/.../members/[userId]/nudge` | POST | ✅ | beide Membership, Rate-Limit | OK |
| `/.../members/[userId]/templates` | GET | ✅ | beide Membership | OK |
| `/.../templates/[templateId]/copy` | POST | ✅ | beide Membership + Quelle | OK |
| `/.../members/[userId]/workouts-by-date` | GET | ✅ | Membership, gescoped | OK |
| `/api/groups/[groupId]/posts` | GET/POST | ✅ | Membership | OK |
| `/.../posts/[postId]` | PATCH/DELETE | ✅ | Autor/LEADER | OK |
| `/.../posts/[postId]/comments` | GET/POST | ✅ | Membership + scoped, Rate-Limit | OK |
| `/.../comments/[commentId]` | PATCH/DELETE | ✅ | Autor/LEADER, Soft-Delete | OK |
| `/.../posts/[postId]/reactions` | POST/DELETE | ✅ | Membership | SEC-C1 (DELETE) |
| `/api/groups/[groupId]/quests` | GET | ✅ | Membership | OK |
| `/api/groups/[groupId]/climbing-meetups` | GET/POST | ✅ | Membership | OK |
| `/.../climbing-meetups/[meetupId]` | PATCH/DELETE | ✅ | Membership + Ersteller | OK |
| `/.../[meetupId]/join` | POST/DELETE | ✅ | POST geprüft | SEC-C2 (DELETE) |
| `/.../[meetupId]/suggestions` | POST | ✅ | Membership + scoped | OK |
| `/.../suggestions/[id]/accept` | POST | ✅ | nur `createdById` | SEC-C3 |
| `/.../suggestions/[id]/decline` | POST | ✅ | nur `createdById` | SEC-C3 |

### Daily Challenges / Group Goals / Yammer

| Route | Methode | Auth-Check | Ownership/Autorisierung | Befund |
|---|---|---|---|---|
| `/api/groups/[groupId]/analytics` | GET | ✅ | Membership | OK |
| `/api/groups/[groupId]/daily-challenges` | GET/POST | ✅ | Membership/LEADER | OK |
| `/.../daily-challenges/[id]` | DELETE | ✅ | Membership + LEADER + groupId-Match | OK |
| `/.../daily-challenges/[id]/goal` | POST | ✅ | Membership + groupId-Match | OK |
| `/.../daily-challenges/[id]/history` | GET | ✅ | Membership + groupId-Match | OK |
| `/api/groups/[groupId]/goals` | GET/POST | ✅ | Membership/LEADER | OK |
| `/.../goals/[goalId]` | PATCH/DELETE | ✅ | Membership + LEADER + groupId-Match | OK |
| `/.../goals/[goalId]/contributions` | POST | ✅ | Membership + groupId-Match | OK |
| `/api/challenge-attempts/[id]/end` | POST | ✅ | Goal-Ownership | OK |
| `/api/challenge-attempts/[id]/increment` | POST | ✅ | Goal-Ownership + Rate-Limit | BUG-D1 |
| `/api/challenge-attempts/[id]/rate` | POST | ✅ | Goal-Ownership | OK |
| `/api/challenge-goals/[id]/attempts` | POST | ✅ | Goal-Ownership | OK |
| `/api/challenge-goals/[id]/yammer` | POST/DELETE | ✅ | Membership, Selbst-Vote blockiert | BUG-D2 |
| `/api/challenge-templates` | GET | ✅ | n/a (geteilter Katalog) | OK |

### Quests / Injuries / Climbing-Sends / Sonstiges

| Route | Methode | Auth-Check | Ownership/Autorisierung | Befund |
|---|---|---|---|---|
| `/api/quests` | GET/POST | ✅ | eigene userId | OK |
| `/api/quests/[questId]` | PATCH/DELETE | ✅ | `loadOwn()` | OK |
| `/.../steps` | POST | ✅ | Quest-Ownership | OK |
| `/.../steps/[stepId]` | PATCH/DELETE | ✅ | `loadOwnStep()` | OK |
| `/api/injuries` | GET/POST | ✅ | eigene userId, Limit 12 aktive | OK |
| `/api/injuries/[injuryId]` | PATCH/DELETE | ✅ | `findOwn()` | OK |
| `/.../checkin` | POST | ✅ | Ownership inline | OK |
| `/api/injuries/pending-checkin` | GET | ✅ | eigene userId | OK |
| `/api/muscle-preferences` | GET/PUT | ✅ | eigene userId | OK |
| `/api/climbing-sends` | GET/POST | ✅ | eigene userId | MISC-2 |
| `/api/climbing-sends/batch` | POST | ✅ | eigene userId | SEC-E1 |
| `/api/climbing-meetups` | GET | ✅ | nur eigene Gruppen | OK |
| `/api/climbing-meetups/[dateKey]` | GET | ✅ | nur eigene Gruppen | OK |
| `/api/notifications` | GET/POST | ✅ | eigene userId, fremde IDs no-op | OK |
| `/api/heartbeat` | POST | ✅ | eigener `lastActiveAt` | OK |
| `/api/health` | GET | bewusst öffentlich | n/a, keine sensiblen Daten | OK |
| `/api/metrics` | GET | `METRICS_TOKEN`, 404 wenn unset | n/a | SEC-E2 |
| `/api/calendar/[token]` | GET | URL-Token, exakter Index-Match | n/a (Token = Auth, 192 Bit Entropie) | MISC-1 |

### `/api/v1/*` (Personal-Access-Token-API)

| Route | Methode | Auth-Check | Ownership/Autorisierung | Befund |
|---|---|---|---|---|
| `/api/v1/me` | GET | ✅ API-Key | eigene userId | OK |
| `/api/v1/today` | GET | ✅ API-Key | eigene userId | OK |
| `/api/v1/calendar` | GET | ✅ API-Key | eigene Workouts + eigene Gruppen | OK |
| `/api/v1/streak` | GET | ✅ API-Key | eigene userId | OK |
| `/api/v1/daily-challenges` | GET | ✅ API-Key | eigene userId | OK |
| `/api/v1/quests` | GET | ✅ API-Key | eigene userId | OK |
| `/api/v1/climbing-sends` | GET/POST | ✅ API-Key | eigene userId | OK |
| `/api/v1/group-goals` | GET | ✅ API-Key | eigene Gruppen | OK |
| `/api/v1/balance-goals` | GET/PATCH | ✅ API-Key | eigene userId | OK |
| `/api/v1/injuries` | GET | ✅ API-Key | eigene userId | OK |
| `/api/v1/muscle-preferences` | GET | ✅ API-Key | eigene userId | OK |
| `/api/v1/workout-templates` | GET | ✅ API-Key | eigene userId | OK |
| `/api/v1/exercises` | GET/POST | ✅ API-Key | Default/eigen/Gruppe-Membership | OK |
| `/api/v1/workouts` | GET/POST | ✅ API-Key | eigene userId | BUG-F1, LOW-F2 |
| `/api/v1/workouts/[sessionId]` | GET/PATCH/DELETE | ✅ API-Key | `findOwnedSession` | BUG-F1, LOW-F2 |
| `/api/v1/groups` | GET | ✅ API-Key | eigene Memberships | OK |
| `/api/v1/personal-records` | GET | ✅ API-Key | eigene userId | OK |

Alle `/api/v1/*`-Routen betroffen von **SEC-A4** (kein Scope, kein Ablauf, kein Rate-Limit auf API-Keys allgemein).

## Offene Entscheidungen

Diese Punkte wurden bewusst **nicht** umgesetzt - sie brauchen eine Produktentscheidung:

1. **Rate-Limiting-Default (SEC-A-RL0).** Soll Rate-Limiting ab sofort für neue Installationen standardmäßig AN sein (sicherer, aber ein Admin könnte sich beim Testen selbst aussperren), oder bleibt es Opt-in mit deutlicherem Hinweis beim ersten Admin-Login? Empfehlung: Default AN, mit großzügigen Limits.
2. **v1-API Datums-Verhalten angleichen (BUG-F1).** Die Angleichung an das interne Datumsformat (DateKey statt ISO-Datetime, Zukunfts-Check) ist ein Breaking Change für bestehende API-Konsumenten (z. B. die gerade erst eingerichtete Home-Assistant-Integration, die aktuell kein `date`-Feld beim Schreiben nutzt, also vermutlich unberührt bliebe - aber sicherheitshalber abklären, bevor es geändert wird).
3. **API-Key-Scopes (SEC-A4).** Lohnt sich read-only-vs-read-write als neues Feld, oder ist das für die aktuelle Nutzergröße (kleiner Freundeskreis) Overkill?
4. **`pnpm overrides` für die transitiven Prisma-Studio-Vulnerabilities (DEPS-1).** Rein kosmetisch für saubere Audit-Ergebnisse, kein echtes Risiko - lohnt sich der Aufwand, oder ignorieren wir das bewusst bis zu einem künftigen Prisma-Major-Update?

## Umsetzungsplan (priorisiert für Phase 2)

1. **Next.js-Upgrade (CRIT-1)** - höchste Priorität, geringstes Risiko (Patch innerhalb derselben Minor-Linie).
2. **Test-Infrastruktur** (Vitest) + Unit-Tests für die reine Logik in `src/lib` - schafft erst die Grundlage, um alles Weitere gefahrlos zu ändern.
3. **SEC-A-RL0 entscheiden und umsetzen** (siehe offene Entscheidung 1).
4. **BUG-D1, BUG-D2** (Race-Condition bei Challenge-Increment, Yammer-Vote-Leichen) - mit Test, der vorher fehlschlägt.
5. **SEC-C3, SEC-C2, SEC-C1** (fehlende Membership-Checks, niedriges Risiko aber schnell behoben) + **SEC-A1, SEC-A3** (2FA Rate-Limit, TOTP-Replay).
6. **SEC-E1, LOW-F2** (fehlende Array-Längenlimits) - triviale zod-`.max()`-Ergänzungen.
7. **DOCS-1** (README-Korrektur) - trivial, aber sollte vor dem nächsten Blick von außen passieren, da das Repo jetzt öffentlich ist.
8. **CI-Pipeline** (`.github/workflows/ci.yml`: install, lint, typecheck, check-i18n, tests, build, `docker build`, `pnpm audit --audit-level=critical` nicht-blockierend für die bekannten Studio-Transitiv-Funde).
9. Alles Weitere aus der Befundliste (SEC-A2/A4, UPLOAD-B1, SEC-B1, DATA-B1, SEC-E2, BUG-F1/Entscheidung, INFO-A1, PERF-C1, MISC-1/2/3) - niedrige Priorität, gute Gelegenheitsarbeit zwischen größeren Features.

Nicht angefasst: große Refactorings (z. B. `dashboard/workouts/new/page.tsx`, 1144 Zeilen) - per Auftrag erst, sobald Tests als Sicherheitsnetz existieren.
