# Ascend

Train together. Push each other.

A self-hostable workout tracker with a built-in "Workout Brain" that suggests
what to train next, protects you from overtraining, and tracks climbing-specific
skin recovery — plus group challenges to push each other.

## Stack

- Next.js 16 (App Router) + TypeScript + Tailwind CSS 4
- PostgreSQL + Prisma ORM
- Auth.js (NextAuth v5) with credentials (email + password) login
- Docker / Docker Compose for deployment

## Local development

```bash
cp .env.example .env      # fill in DATABASE_URL / AUTH_SECRET
docker compose up -d db   # start just the database
pnpm install
pnpm prisma migrate dev   # create tables
pnpm prisma db seed       # seed default exercises
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

## Feature roadmap

Legend: ✅ implemented · 🚧 schema ready, UI pending · ⏳ not started

### Nutzer & Profile
- ✅ Eigener Login (Email + Passwort)
- ✅ Private, strikt getrennte Trainingsdaten pro Nutzer
- 🚧 Körpergewicht im Profil (Feld existiert, kein Profil-UI/Fair-Berechnung für Klimmzüge etc. noch)

### Training eintragen
- ✅ Zwei Übungsarten: Reps+Gewicht (`REPS`) und Zeit-Halten (`HOLD`)
- ✅ Erschöpfungs-Tracking (perceivedExertion) und Haut-Zustand (skinCondition) pro Workout
- 🚧 Trainingsvorlagen (Schema `WorkoutTemplate` steht, kein UI zum Speichern/Starten)

### Workout Brain
- ⏳ Muskel-Fokus-Vorschlag (längste Pause)
- ⏳ Überlastungs-Schutz / Ruhetag-Empfehlung
- ⏳ Haut-Regenerations-Timer für Kletterer

### Analytics
- ⏳ 1RM-Schätzung & Maximalkraft-Verlauf
- ⏳ Volumen-Graph
- 🚧 Balance-Radar (Schema `BalanceGoal` + `focus` auf Exercise steht)
- ⏳ Aktivitäts-Kalender (Heatmap)
- 🚧 Kletter-Pyramide (Schema `ClimbingSend` steht, kein UI)

### Bedienung & Design
- 🚧 PWA-Grundgerüst (manifest.json vorhanden, Icons + Service Worker fehlen noch)
- ⏳ Dark/Light-Mode-Umschalter (Tailwind ist dark:-ready, kein UI-Toggle)
- 🚧 Gruppen: Schema (`Group`, `GroupMember`, Invite-Code) steht, kein UI
- 🚧 Gruppen-Feed (Fotos, geteilte Workouts) — Schema `GroupPost` steht
- 🚧 Tägliche Challenges — Schema `Challenge` + `ChallengeEntry` steht

## Datenmodell

Siehe `prisma/schema.prisma` — deckt bereits den gesamten oben beschriebenen
Funktionsumfang ab, auch für Features, deren UI noch nicht gebaut ist.
