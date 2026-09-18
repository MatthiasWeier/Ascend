# Ascend

Train together. Push each other.

A self-hostable, open-source workout tracker with a built-in "Workout Brain"
that suggests what to train next, protects you from overtraining, tracks
climbing-specific skin recovery, and runs group Daily Challenges with a
peer-review system ("Yammer") that stops people from sandbagging their goals.

Licensed under the [MIT License](./LICENSE) - use it, fork it, run your own
instance for you and your crew.

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
docker compose exec app pnpm prisma migrate deploy
docker compose exec app pnpm prisma db seed
```

The app is then on `http://localhost:3000` (or your server's address). Data
lives in two named Docker volumes (`db-data`, `uploads-data`) that survive
rebuilds/restarts.

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
responsible for it, not this project. The Impressum and Datenschutzerklärung
pages read their operator details (name, address, contact) from environment
variables and clearly say "not configured" instead of showing placeholder
fake data until you set them - see `.env.example` for `OPERATOR_NAME`,
`OPERATOR_ADDRESS`, `OPERATOR_EMAIL`, `OPERATOR_PHONE`.

The Datenschutzerklärung's description of *what data the app processes* is
accurate for the software itself regardless of who's hosting it; only the
"who is the controller / how to contact them" part needs filling in. This is
a reasonable-effort template, not legal advice - if you're operating this
commercially or at any real scale, have an actual lawyer check it for your
jurisdiction.

## Feature status

Legend: ✅ implemented · 🚧 partial · ⏳ not started

### Nutzer & Profile
- ✅ Login per Benutzername + Passwort (keine E-Mail nötig)
- ✅ Private, strikt getrennte Trainingsdaten pro Nutzer
- ✅ Körpergewicht als **Verlauf** (`BodyWeightEntry`, ein Eintrag pro Tag),
  nicht nur ein einzelner Wert
- ✅ Account-Löschung (Danger Zone in den Einstellungen, Passwort-Bestätigung,
  kaskadiert korrekt inkl. eigener Gruppen)

### Training eintragen
- ✅ Zwei Übungsarten: Reps+Gewicht (`REPS`) und Zeit-Halten (`HOLD`)
- ✅ Erschöpfungs-Tracking (perceivedExertion) und Haut-Zustand (skinCondition)
- ✅ Custom Exercises (eigene oder gruppenweit sichtbare Übungen)
- ✅ 53 Standardübungen + 8 Daily-Challenge-Themen geseedet
- ✅ Schnelle Übungssuche (durchsuchbare Combobox statt langer Dropdown-Liste)
- ✅ Auto-Fill aus der letzten Session (Wdh/Gewicht/Dauer vorausgefüllt, ohne
  bereits getippte Werte zu überschreiben)
- ✅ Integrierter Pause-Timer (60/90/120/180s, startet per ✓-Button am Satz)
- 🚧 Trainingsvorlagen (Schema `WorkoutTemplate` steht, kein UI zum
  Speichern/Starten)

### Workout Brain
- ✅ Muskel-Fokus-Vorschlag (längste Pause seit dem letzten Training)
- ✅ Überlastungs-Schutz / Ruhetag-Empfehlung (Ø Anstrengung der letzten
  3 Tage)
- ✅ Haut-Regenerations-Timer für Kletterer (blendet Grip-Übungen aus, bis
  die Haut sich erholt hat)
- ✅ Daily-Challenge-Reminder auf der Startseite (inline, kein Pop-up):
  zeigt jede heute noch offene Challenge über allen Gruppen mit direktem
  Link zur Gruppe/Challenge

### Analytics
- ✅ 1RM-Schätzung (Epley) & Maximalkraft-Verlauf
- ✅ **Bodyweight-adjustiert**: Klimmzüge & Co. fließen mit dem geloggten
  Körpergewicht *zum jeweiligen Trainingszeitpunkt* in Power/Workload ein -
  nicht mit dem aktuellen Gewicht (`lib/bodyweight.ts`)
- ✅ **PR-Erkennung**: neuer persönlicher Rekord pro Übung wird chronologisch
  berechnet (bodyweight-adjustiertes 1RM bzw. Haltedauer), im Feed mit
  Trophäen-Badge markiert und beim Speichern als Toast gefeiert
- ✅ Volumen-Graph (90 Tage)
- ✅ Balance-Radar (Ist vs. Ziel pro Muskelgruppe)
- ✅ Aktivitäts-Kalender (Jahres-Heatmap)
- ✅ Kletter-Pyramide + Boulder-Tages-Kalender (Zähler pro Schwierigkeit,
  "5x 6er, 3x 4er")

### Gruppen
- ✅ Erstellen, Beitreten per Invite-Link
- ✅ Rollen: **Leader** (Ersteller) / **Member** - jeder darf einladen, nur
  der Leader darf kicken
- ✅ Feed: Text-Posts, Fotos (lokales Docker-Volume), geteilte Workouts
  einzeln über den Composer oder per Toggle **"Workouts automatisch
  teilen"** dauerhaft (rückwirkend + alle zukünftigen); bereits geteilte
  Workouts werden nie doppelt gepostet
- ✅ Feed-Filter nach Typ (Alle/Text/Workout/Foto) und per Klick auf einen
  Namen nach Person
- ✅ **Daily Challenges**: Leader aktiviert bis zu 4 Themen aus einem
  Katalog (`ChallengeTemplate`), jeder setzt sein eigenes Reps-Ziel
- ✅ **Yammer-System** (Anti-Sandbagging): andere Mitglieder können ein zu
  niedriges Ziel anfechten; ab 75% Zustimmung der *übrigen* Mitglieder
  (Ziel-Owner zählt nicht mit) ist das Ziel ungültig, bis es angehoben wird
- ✅ Ausführung mit Live-Timer + Schnell-Buttons (+1/+2/+5/+10), automatischer
  Abschluss bei Zielerreichung, Tages-Grenze in **deutscher Zeit**
  (Europe/Berlin, nicht UTC)
- ✅ Post-Challenge-Bewertung (5 Smileys) passt das Ziel fürs *nächste* Mal
  an (±10%/±5%/0%)
- ✅ **Wetteinsatz**: optionaler Freitext beim Aktivieren einer Daily
  Challenge (z.B. "Verlierer macht 20 Liegestütze"), für alle sichtbar
- ✅ **Challenge-Verlauf**: rückwirkend pro Mitglied sehen, an welchem Tag
  eine Challenge geschafft, aufgegeben oder gar nicht versucht wurde,
  inkl. Prozentanzeige bei nur teilweise geschafften Versuchen
- ✅ **Kollaborative Gruppenziele**: Leader legt ein gemeinsames Ziel mit
  Ziel-Wert/Einheit (Enum: Wiederholungen/Sekunden/km/Custom, kein
  Freitext)/optionaler Frist an; Fortschrittsbalken zeigt die Summe der
  ganzen Gruppe plus Beitrag pro Person
- ✅ **Automatisches Auffüllen von Gruppenzielen**: ein Ziel kann optional
  mit einer Übung verknüpft werden (`Exercise`-Objekt, kein String) -
  danach tragen normale Workouts *und* abgeschlossene/abgebrochene Daily
  Challenges mit dieser Übung automatisch bei (inkl. rückwirkendem
  Nachtragen der Vergangenheit beim Verknüpfen); manuelles Eintragen bleibt
  nur für nicht verknüpfte Ziele (z.B. km) möglich. Daily Challenges selbst
  bleiben davon komplett unberührt - die sind weiterhin ein separater,
  manueller Flow

### Bedienung & Design
- ✅ Dark-first Theme mit Light-Mode-Toggle (next-themes)
- ✅ shadcn/ui, CSS-only Enter-Animationen (bewusst kein JS-Animation-Lauf,
  siehe Design-Entscheidungen unten)
- 🚧 PWA-Grundgerüst (manifest.json vorhanden, Icons + Service Worker fehlen)

### Security & Ops
- ✅ Rate Limiting (Registrierung, Login-Brute-Force-Lockout, Daily-Challenge-
  Aktionen) - in-memory, passend für die Single-Container-Deployment
- ✅ Strukturiertes JSON-Logging (`lib/logger.ts`, sichtbar via
  `docker compose logs app`) + eigene Error-Boundaries
- ⏳ Externes Monitoring/Alerting (Sentry o.ä.) - braucht einen eigenen
  Account, nicht Teil des Projekts
- ❓ Mobile/Cross-Browser-UI ist nicht in einem echten Browser getestet -
  wenn du etwas Kaputtes findest, bitte melden

## Datenmodell

Siehe `prisma/schema.prisma`. Wichtige Design-Entscheidungen:

- **Bodyweight-Historie statt Einzelwert**: `BodyWeightEntry` pro Tag, damit
  alte Workouts gegen das damalige Gewicht bewertet werden.
- **Deutsche Kalendertage als String-Key**: Daily-Challenge- und
  Boulder-Tage nutzen `YYYY-MM-DD` (Europe/Berlin) statt UTC-`DateTime`, um
  Zeitzonen-Bugs an der Tagesgrenze zu vermeiden (`lib/german-time.ts`).
- **Yammer-Stimmrecht**: die Berechtigung "75% der übrigen Mitglieder" wird
  serverseitig bei jedem Vote neu berechnet, nicht als Snapshot gespeichert.
- **Account-Löschung kaskadiert**: löscht du deinen Account und bist Owner
  einer Gruppe, wird die Gruppe komplett mitgelöscht (keine
  Ownership-Übertragung vorhanden) - die UI warnt vorher explizit.
