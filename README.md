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
- ✅ Instanzweite Admin-Rolle (`/dashboard/admin`): Nutzerverwaltung,
  Admin-Rechte vergeben/entziehen, Nutzer löschen, 2FA für ein Konto
  zurücksetzen (einzige Wiederherstellung, da es keine E-Mail gibt)
- ✅ **Zwei-Faktor-Authentifizierung (TOTP)**: optional pro Konto,
  selbst implementiertes RFC 6238 (jede Standard-Authenticator-App),
  QR-Code-Setup, 10 Einmal-Backup-Codes
- ✅ **Sitzungsverwaltung** (Settings): aktive Geräte einsehen, einzeln
  oder alle außer dem aktuellen sofort abmelden - wirkt beim nächsten
  Zugriff des Geräts, nicht erst nach JWT-Ablauf
- ✅ **Admin-Einstellungen** (Admin-Seite, nur für Admins): Rate Limits
  (Login/Registrierung, Brute-Force-Schutz) und offene vs. Invite-only-Registrierung
  jeweils per Schalter an/aus - wirkt sofort, kein Redeploy nötig
- ✅ Vollständiger JSON-Datenexport, CSV-Import (Strong/Hevy-kompatibel,
  best effort), abonnierbarer ICS-Kalender-Feed - alles in Settings

### Training eintragen
- ✅ Zwei Übungsarten: Reps+Gewicht (`REPS`) und Zeit-Halten (`HOLD`)
- ✅ Erschöpfungs-Tracking (perceivedExertion) und Haut-Zustand (skinCondition)
- ✅ Custom Exercises (eigene oder gruppenweit sichtbare Übungen)
- ✅ 53 Standardübungen + 8 Daily-Challenge-Themen geseedet
- ✅ Schnelle Übungssuche (durchsuchbare Combobox statt langer Dropdown-Liste)
- ✅ Auto-Fill aus der letzten Session (Wdh/Gewicht/Dauer vorausgefüllt, ohne
  bereits getippte Werte zu überschreiben)
- ✅ Integrierter Pause-Timer (60/90/120/180s, startet per ✓-Button am Satz)
- ✅ Trainingsvorlagen: aktuelle Satz-Reihenfolge speichern, per Dropdown
  wieder laden
- ✅ "Häufig"-Chips: die 8 meistgenutzten Übungen mit einem Klick als Satz
  hinzufügen
- ✅ **Workout bearbeiten & löschen** - inkl. korrekter Nachführung
  verknüpfter Gruppenziel-Beiträge
- ✅ **Deutsch/Englisch umschaltbar** (Kopfleiste, Login, Settings): komplette
  Oberfläche zweisprachig, Sprache per Cookie pro Gerät; Nutzerinhalte und
  Push-Texte bleiben unübersetzt
- ✅ **kg/lbs umschaltbar** (Settings): reine Anzeige-Einstellung, intern
  wird immer in kg gespeichert; Hantelscheiben-/Aufwärm-Rechner rechnen
  mit dem passenden Scheiben-Satz für die gewählte Einheit

### Workout Brain
- ✅ Muskel-Fokus-Vorschlag (längste Pause seit dem letzten Training)
- ✅ Überlastungs-Schutz / Ruhetag-Empfehlung (Ø Anstrengung der letzten
  3 Tage)
- ✅ Haut-Regenerations-Timer für Kletterer (blendet Grip-Übungen aus, bis
  die Haut sich erholt hat)
- ✅ Daily-Challenge-Reminder auf der Startseite (inline, kein Pop-up):
  zeigt jede heute noch offene Challenge über allen Gruppen mit direktem
  Link zur Gruppe/Challenge
- ✅ "Gruppen-Aktivität" auf der Startseite: geteilte Workouts und
  Challenge-Ergebnisse aus allen Gruppen, neueste zuerst, mit Zeitstempel

### Analytics
- ✅ 1RM-Schätzung (Epley) & Maximalkraft-Verlauf
- ✅ Persönliche-Rekorde-Übersicht: aktueller Bestwert pro Übung
- ✅ Trainings-Streak auf der Startseite (deutsche Kalendertage)
- ✅ **Bodyweight-adjustiert**: Klimmzüge & Co. fließen mit dem geloggten
  Körpergewicht *zum jeweiligen Trainingszeitpunkt* in Power/Workload ein -
  nicht mit dem aktuellen Gewicht (`lib/bodyweight.ts`)
- ✅ **PR-Erkennung**: neuer persönlicher Rekord pro Übung wird chronologisch
  berechnet (bodyweight-adjustiertes 1RM bzw. Haltedauer), im Feed mit
  Trophäen-Badge markiert und beim Speichern als Toast gefeiert
- ✅ Volumen-Graph (90 Tage)
- ✅ Balance-Radar (Ist vs. Ziel pro Muskelgruppe)
- ✅ Aktivitäts-Kalender (Jahres-Heatmap), Tag anklicken zeigt das exakte
  Workout (Übungen, Gewicht, Wdh) dieses Tages
- ✅ Kletter-Pyramide + Boulder-Tages-Kalender (Zähler pro Schwierigkeit,
  "5x 6er, 3x 4er")
- ✅ **Termine planen** (Klettern, Gym oder frei benennbar "Sonstiges"): pro Gruppe einen Tag (heute oder später)
  mit optionalem Titel/Uhrzeit/Ort anlegen, Mitglieder sagen mit eigenem optionalem Ziel und Trainingsfokus zu
  (Slab/Power/Technik/Ausdauer/Kraft/Mental für Klettern, Push/Pull/Beine/Core/Grip für Gym) - im persönlichen
  Kalender über alle Gruppen hinweg als grün markierter Tag sichtbar. Mitglieder, die den Termin nicht selbst
  geplant haben, können eine Änderung (Datum/Uhrzeit/Ort + Notiz) vorschlagen; wer geplant hat, nimmt an oder lehnt ab.
- ✅ **Sidequests** (Menüpunkt "Quests"): persönliche Ziele mit selbst gewähltem Zieldatum ("Handstand lernen bis Ende
  2026"), optional mit eigener Progression aus selbst festgelegten Schritten (nichts wird automatisch vorgeschlagen),
  regelmäßigen Erinnerungen (automatisch je nach Dauer oder fest wählbar) und einem Gruppen-Tab, in dem Mitglieder
  ihre geteilten Sidequests samt Fortschritt sehen - pro Sidequest abschaltbar
- ✅ **Erinnerungen** (Einstellungen > Workout-Erinnerungen): eigene wöchentlich wiederkehrende Trainingszeiten
  ("Montag 13 Uhr, Mittwoch 18 Uhr", unabhängig von Gruppen) sowie ein Vorlauf, wie lange vorher an einen
  zugesagten Gruppentermin erinnert werden soll (nie / 1 Std. vorher / morgens / am Vorabend) - beides über einen
  In-Process-Scheduler (`lib/scheduler.ts`, per Next.js Instrumentation-Hook gestartet), kein separater Cron-Dienst nötig

### Gruppen
- ✅ Erstellen, Beitreten per Invite-Link
- ✅ Rollen: **Leader** (Ersteller) / **Member** - jeder darf einladen, nur
  der Leader darf kicken; Mitglieder können selbst austreten; Leitung kann
  übergeben werden (überträgt auch die echte Besitzer-Zuordnung, nicht nur
  die Rolle); Gruppenname vom Leader änderbar
- ✅ Feed: Text-Posts, Fotos (lokales Docker-Volume), geteilte Workouts
  einzeln über den Composer oder per Toggle **"Workouts automatisch
  teilen"** dauerhaft (rückwirkend + alle zukünftigen); bereits geteilte
  Workouts werden nie doppelt gepostet
- ✅ Feed-Filter nach Typ (Alle/Text/Workout/Foto) und per Klick auf einen
  Namen nach Person
- ✅ Reaktionen auf Posts (👍❤️💪🔥, eine pro Person)
- ✅ Anstupsen: Mitglieder gegenseitig per Push erinnern (rate-limited)
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
- ✅ **Gruppen-Analytics**: Gruppen-Volumen (Sätze/Tag, 30 Tage), Aktivität pro Mitglied sowie Klettertage
  (wie oft und wann als Gruppe, mit Ort/Uhrzeit/Teilnehmerzahl) und Teilnahme pro Mitglied - eigener Tab
- ✅ **Kollaborative Gruppenziele**: Leader legt ein gemeinsames Ziel mit
  Ziel-Wert/Einheit (Enum: Wiederholungen/Sekunden/km/Custom, kein
  Freitext)/optionaler Frist an; Fortschrittsbalken zeigt die Summe der
  ganzen Gruppe plus Beitrag pro Person; Titel, Werte und Verknüpfung
  bleiben für den Leader jederzeit nachträglich bearbeitbar, nicht nur löschbar
- ✅ **Automatisches Auffüllen von Gruppenzielen**: ein Ziel kann optional
  mit mehreren Übungen verknüpft werden (`Exercise[]`-Objekte, kein String) -
  z.B. "3000 Liegestütze" zählt Liegestütze + Diamond + Pike Push-ups zusammen.
  Danach tragen normale Workouts *und* abgeschlossene/abgebrochene Daily
  Challenges mit einer der verknüpften Übungen automatisch bei (inkl. rückwirkendem
  Nachtragen der Vergangenheit beim Verknüpfen); manuelles Eintragen bleibt
  nur für nicht verknüpfte Ziele (z.B. km) möglich
- ✅ **Einführungs-Tutorial**: 12-schrittige Tour direkt nach der Registrierung
  (einmalig, mit Überspringen; in den Einstellungen wiederholbar)
- ✅ **Daily Challenges zählen mit Workouts**: Wiederholungen der Challenge-Übung
  aus heutigen Workouts (ohne Aufwärmsätze) zählen automatisch zum Tagesversuch -
  100 Liegestütze im Workout schließen die 100-Liegestütze-Challenge ab. Bearbeiten
  oder Löschen des Workouts rechnet nach; Gruppenziele zählen nichts doppelt

### Bedienung & Design
- ✅ Dark-first Theme mit Light-Mode-Toggle (next-themes)
- ✅ shadcn/ui, CSS-only Enter-Animationen (bewusst kein JS-Animation-Lauf,
  siehe Design-Entscheidungen unten)
- ✅ PWA: installierbar ("Zum Homescreen hinzufügen") mit eigenem Icon
- ✅ **Push-Benachrichtigungen** (Web Push, kein Drittanbieter/Firebase):
  Toggle in den Einstellungen, benachrichtigt andere Gruppenmitglieder bei
  neuem Workout-Post oder geschaffter Daily Challenge - optional, siehe
  `.env.example` (`VAPID_*`); ohne die ist der Toggle einfach ausgeblendet

### Security & Ops
- ✅ Strukturiertes JSON-Logging (`lib/logger.ts`, sichtbar via
  `docker compose logs app`) + eigene Error-Boundaries
- ✅ Automatische DB-Migrationen beim Start (`migrate`-Service in
  `docker-compose.yml`)
- ✅ Healthcheck (`/api/health`) in Dockerfile + Compose eingebunden
- ✅ Prometheus-Metriken (`/api/metrics`, hinter `METRICS_TOKEN`)
- ✅ Backup/Restore-Scripts (`scripts/backup.sh`, `scripts/restore.sh`)
- ✅ Non-root Container-User
- ✅ S3/MinIO-Storage-Backend für Uploads (optional, siehe `.env.example`)
- ⏳ Externes Monitoring/Alerting (Sentry o.ä.) - braucht einen eigenen
  Account, nicht Teil des Projekts
- ❓ Mobile/Cross-Browser-UI ist nicht in einem echten Browser getestet -
  wenn du etwas Kaputtes findest, bitte melden

## API (für eigene Scripts)

API-Keys werden in Settings erstellt (`ascend_...`, nur einmal sichtbar).
Damit gegen `/api/v1/*` authentifizieren:

```bash
curl -H "Authorization: Bearer ascend_..." https://your-instance/api/v1/exercises
```

| Endpoint | Methode | Beschreibung |
|---|---|---|
| `/api/v1/today` | GET | Workout-Brain-Empfehlung: was heute trainiert werden sollte (`?lang=de\|en`, Default `de`) |
| `/api/v1/calendar` | GET | Eigene Workouts + Gruppen-Meetups im Zeitraum (`?from=`/`?to=`, `YYYY-MM-DD`, Default: heute-7 bis heute+30) |
| `/api/v1/balance-goals` | GET | Ziel- vs. Ist-Trainingsanteil pro Fokus (Push/Pull/Beine/Core/Grip) |
| `/api/v1/exercises` | GET | Sichtbare Übungen (eigene + Default + Gruppen) |
| `/api/v1/workouts` | GET | Eigene Workouts (`?limit=`, max. 200, Default 50) |
| `/api/v1/workouts` | POST | Workout anlegen (`{date?, notes?, sets: [{exerciseId, reps?, weightKg?, durationSec?, setType?, notes?}]}`) |
| `/api/v1/groups` | GET | Eigene Gruppen (id, name, Rolle) |
| `/api/v1/personal-records` | GET | Aktuelle persönliche Bestleistungen pro Übung |
| `/api/v1/body-weight` | GET | Letzte Körpergewicht-Einträge (`?limit=`, max. 200, Default 30) |
| `/api/v1/body-weight` | POST | Körpergewicht eintragen (`{weightKg, date?}`, ein Eintrag pro Tag - erneutes Posten am selben Tag korrigiert) |

Bewusst schlank gehalten - kein Ersatz für die interne API, sondern eine
stabile Fläche für eigene Automationen. `/api/v1/workouts` POST löst
keine PR-/Gruppenziel-Nebeneffekte aus.

### Beispiel: Home Assistant

REST-Sensor für die Trainingsempfehlung von heute:

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
