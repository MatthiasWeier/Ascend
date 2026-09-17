# Ascend

Train together. Push each other.

A self-hostable workout tracker with a built-in "Workout Brain" that suggests
what to train next, protects you from overtraining, tracks climbing-specific
skin recovery, and runs group Daily Challenges with a peer-review system
("Yammer") that stops people from sandbagging their goals.

## Stack

- Next.js 16 (App Router) + TypeScript + Tailwind CSS 4
- shadcn/ui (Base UI primitives) + Motion, dark-first theme
- PostgreSQL + Prisma ORM (driver adapter, no Rust query engine)
- Auth.js (NextAuth v5) with credentials (email + password) login
- Docker / Docker Compose for deployment

## Local development

```bash
cp .env.example .env      # fill in DATABASE_URL / AUTH_SECRET
docker compose up -d db   # start just the database
pnpm install
pnpm prisma migrate dev   # create tables
pnpm prisma db seed       # seed default exercises + challenge templates
pnpm dev
```

## Running fully in Docker

```bash
cp .env.example .env
echo "AUTH_SECRET=$(openssl rand -base64 33)" >> .env
docker compose up -d --build
docker compose exec app pnpm prisma migrate deploy
docker compose exec app pnpm prisma db seed
```

> On a small VM (2 vCPU / 2GB RAM or less), don't run `pnpm dev` and
> `docker compose build` at the same time - both are memory-hungry and can
> thrash the box into unresponsiveness. Stop the dev server first, or add
> swap.

## Feature status

Legend: ✅ implemented · 🚧 partial · ⏳ not started

### Nutzer & Profile
- ✅ Eigener Login (Email + Passwort)
- ✅ Private, strikt getrennte Trainingsdaten pro Nutzer
- ✅ Körpergewicht als **Verlauf** (`BodyWeightEntry`, ein Eintrag pro Tag),
  nicht nur ein einzelner Wert

### Training eintragen
- ✅ Zwei Übungsarten: Reps+Gewicht (`REPS`) und Zeit-Halten (`HOLD`)
- ✅ Erschöpfungs-Tracking (perceivedExertion) und Haut-Zustand (skinCondition)
- ✅ Custom Exercises (eigene oder gruppenweit sichtbare Übungen)
- ✅ 53 Standardübungen + 8 Daily-Challenge-Themen geseedet
- 🚧 Trainingsvorlagen (Schema `WorkoutTemplate` steht, kein UI zum
  Speichern/Starten)

### Workout Brain
- ✅ Muskel-Fokus-Vorschlag (längste Pause seit dem letzten Training)
- ✅ Überlastungs-Schutz / Ruhetag-Empfehlung (Ø Anstrengung der letzten
  3 Tage)
- ✅ Haut-Regenerations-Timer für Kletterer (blendet Grip-Übungen aus, bis
  die Haut sich erholt hat)

### Analytics
- ✅ 1RM-Schätzung (Epley) & Maximalkraft-Verlauf
- ✅ **Bodyweight-adjustiert**: Klimmzüge & Co. fließen mit dem geloggten
  Körpergewicht *zum jeweiligen Trainingszeitpunkt* in Power/Workload ein -
  nicht mit dem aktuellen Gewicht (`lib/bodyweight.ts`)
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

### Bedienung & Design
- ✅ Dark-first Theme mit Light-Mode-Toggle (next-themes)
- ✅ shadcn/ui + Motion-Animationen
- 🚧 PWA-Grundgerüst (manifest.json vorhanden, Icons + Service Worker fehlen)

## Datenmodell

Siehe `prisma/schema.prisma`. Wichtige Design-Entscheidungen:

- **Bodyweight-Historie statt Einzelwert**: `BodyWeightEntry` pro Tag, damit
  alte Workouts gegen das damalige Gewicht bewertet werden.
- **Deutsche Kalendertage als String-Key**: Daily-Challenge- und
  Boulder-Tage nutzen `YYYY-MM-DD` (Europe/Berlin) statt UTC-`DateTime`, um
  Zeitzonen-Bugs an der Tagesgrenze zu vermeiden (`lib/german-time.ts`).
- **Yammer-Stimmrecht**: die Berechtigung "75% der übrigen Mitglieder" wird
  serverseitig bei jedem Vote neu berechnet, nicht als Snapshot gespeichert.
