# Ascend - Review Report

Branch: `improve/review-2026-11-18` (lokal, nicht gemerged, nicht gepusht - `master` unverändert bei `ef945c4`)
Zeitraum: 2026-11-18, ein Durchlauf
Ausgangspunkt: `docs/ANALYSIS.md` (Phase 1, selber Branch, Commit `18b7946`)

## Sicherheitslücken und Bugs - zuerst

Das hier ist der Teil, der am meisten zählt. Alles andere ist Hygiene.

1. **Next.js 16.3.5 war verwundbar für 3 kritische CVEs** (RCE-Klasse: `next/og` `ImageResponse`, Image-Optimization mit SVG, `"use cache"`-Funktionen). Behoben durch Upgrade auf 16.4.6. Commit `4e6b96e`.
2. **Rate-Limiting war standardmäßig deaktiviert** - eine frische Instanz hatte keinen Brute-Force-Schutz auf Login/Register/2FA, bis ein Admin den Schalter manuell fand. Jetzt Default AN (Schema-Default + Migration, die auch diese Instanz sofort umgestellt hat). Commit `65854f1`.
3. **Kein TOTP-Replay-Schutz** - derselbe 6-stellige Code konnte mehrfach im 90s-Fenster benutzt werden. Jetzt wird der letzte akzeptierte Zeit-Counter pro User gespeichert und per atomarem Conditional-Update durchgesetzt. Commit `5fb84e9`.
4. **Race Condition bei Challenge-Increments** (`BUG-D1`): `currentReps` wurde aus einem veralteten Lesewert überschrieben statt atomar inkrementiert - zwei gleichzeitige Taps konnten einen verlieren. Jetzt atomar, Completion-Erkennung über einen separaten, auf `status=IN_PROGRESS` bedingten Update. Live mit 10 parallelen Requests verifiziert (landet exakt bei 10, vorher reproduzierbar bei 2-3). Commit `644ddf6`.
5. **Yammer-Votes blieben nach Gruppenaustritt bestehen** (`BUG-D2`) und machten eine Invalidierung unverhältnismäßig leicht, da `eligibleVoters` live kleiner wird, die alte Stimme aber nicht verschwindet. Jetzt beim Verlassen/Kicken mit aufgeräumt. Commit `644ddf6`.
6. **Mehrere fehlende Array-Limits** (`sets` auf Workout-Routen, `entries` auf `climbing-sends/batch`) - konnten unbegrenzt groß gesendet werden. Jetzt auf 100 gedeckelt. Commit `644ddf6`.
7. **API-Keys hatten keinen Scope** - jeder Key hatte volles Lese-/Schreibrecht. Jetzt wählbar (Default für neue Keys: nur lesend), jede schreibende `/api/v1/*`-Route gibt einem read-only-Key `403`. Bestehende Keys bleiben Lese-/Schreibzugriff (verifiziert am echten "Home Assistant"-Key dieser Instanz). Commit `9b3eeba`.
8. **`/api/v1/workouts*` `date` war inkonsistent zur internen API** (volles ISO-Datetime statt Berlin-Datumsschlüssel, keine Zukunfts-Prüfung) - als bewusster Breaking Change angeglichen, im CHANGELOG markiert. Commit `9b3eeba`.
9. **README und Account-Löschen-Dialog behaupteten fälschlich, es gäbe keine Leitungs-Übertragung** - die Funktion existiert längst. Beide korrigiert, inkl. Übersetzung. Commit `3763029`.

Alles Weitere aus der Phase-1-Analyse (SEC-A1/A2/A4-Rest, SEC-B1, DATA-B1, UPLOAD-B1, SEC-C1/C2/C3, SEC-E2, MISC-1/2/3, INFO-A1, PERF-C1) ist dokumentiert, aber **nicht umgesetzt** - siehe "Offen geblieben" unten.

## Was umgesetzt wurde (nach Kategorie, mit Commit-Hashes)

**Dependencies**
- Next.js 16.3.5 → 16.4.6 (`4e6b96e`)

**Sicherheit**
- Rate-Limiting Default AN (`65854f1`)
- TOTP-Replay-Schutz (`5fb84e9`)
- API-Key-Scopes, read-only-Default (`9b3eeba`)
- Array-Limits auf allen betroffenen Routen (`644ddf6`)

**Korrektheit / Race Conditions**
- Atomarer Challenge-Attempt-Increment (`644ddf6`)
- Yammer-Vote-Cleanup beim Gruppenaustritt (`644ddf6`)
- v1-API-Datumsformat an interne API angeglichen, als Breaking Change markiert (`9b3eeba`)

**Code-Qualität**
- 23 vorbestehende ESLint-Fehler behoben, die nie liefen (`pnpm lint` war nie Teil des Workflows) - 2 echte Bugs (Ref-Mutation während Render, Komponente während Render erzeugt), der Rest waren React-Compiler-Readiness-Regeln für ein Feature, das dieses Projekt nicht nutzt, bewusst mit Begründung deaktiviert statt ~20 Dateien unnötig umzubauen (`d98e95e`)

**Tests** (neu: 78 Tests über 7 Dateien, `pnpm test`)
- Vitest eingerichtet, eigene `ascend_test`-Datenbank (nie die Live-DB) (`606beec`)
- Unit-Tests: `german-time` (inkl. beider DST-Übergänge 2026), `totp` (gegen unabhängige Referenz-Implementierung), `csv-import`, `streak`, `personal-records`, `goal-contributions` (`606beec`)
- Integrationstests, die den "kein IDOR"-Befund aus der Analyse beweisen: ein Request pro Autorisierungs-Muster (Personal Ownership, Gruppen-Mitgliedschaft, Gruppen-LEADER-Rolle, API-Key+Ownership, Challenge-Attempt-Ownership, Admin-only), echte Requests gegen echte Routen-Handler (`a8f9ace`)

**CI**
- GitHub Actions: install → migrate → seed → lint → typecheck → i18n → test → build → docker build → audit (non-blocking) (`ed22a62`)

**Dokumentation**
- `docs/ANALYSIS.md` (Phase 1, `18b7946`)
- README/UI: veraltete "keine Leitungs-Übertragung"-Behauptung korrigiert, Grammatikfehler, fehlendes ❓-Legendensymbol ergänzt (`3763029`)
- CLAUDE.md laufend aktualisiert (Testing-Konventionen, API-Key-Scopes, v1-Datumsformat) in den jeweiligen Commits

## Teststand

- **78 Tests, 7 Dateien, alle grün.** `pnpm test` (Vitest gegen `ascend_test`).
- Davon 6 Integrationstests gegen echte Routen-Handler (Autorisierung), 72 Unit-Tests (reine Logik + DB-gestützte Lib-Funktionen).
- Abgedeckte Module: `german-time.ts`, `totp.ts`, `csv-import.ts`, `streak.ts`, `personal-records.ts`, `goal-contributions.ts`, plus die 6 Autorisierungs-Routen oben.
- **Nicht abgedeckt**: die übrigen ~115 Routen, alle UI-Komponenten, `workout-brain.ts`, `rate-limit.ts`, `bodyweight.ts`/`effective-load.ts`, `plate-calculator.ts`, `warmup-calculator.ts`, `weight-units.ts`, `climbing-grades.ts` - aus der ursprünglichen Liste nicht geschafft, siehe unten.

## Status am Ende

| Check | Status |
|---|---|
| `pnpm lint` | ✅ grün (0 Fehler, 2 vorbestehende, nicht neue Warnings) |
| `pnpm tsc --noEmit` | ✅ grün |
| `node scripts/check-i18n.mjs` | ✅ grün (0 fehlende Keys) |
| `pnpm test` | ✅ grün (78/78) |
| `pnpm build` | ✅ grün |
| `docker build .` | ✅ grün (separat verifiziert, standalone und via `docker compose build`) |
| `pnpm audit --prod --audit-level=high` | ❌ rot (erwartet, bewusst nicht blockierend in CI - siehe `DEPS-1`) |

Jeder Commit wurde einzeln gegen alle fünf erstgenannten Checks verifiziert, nicht nur der finale Stand.

## Offen geblieben (und warum)

Aus dem ursprünglichen Phase-2-Plan nicht geschafft, absteigend nach Priorität:

1. **Schritt 7 teilweise**: README-Fixes sind komplett, aber kein systematischer Rechtschreib-Durchgang über die restlichen ~800 Zeilen README - nur die drei explizit genannten Punkte (Ownership-Widerspruch, "löscht du", ❓-Legende) wurden geprüft und behoben.
2. **Schritt 8 (Refactoring & Performance) - nicht begonnen.** Explizit niedrigste Priorität ("nur falls Zeit bleibt"). Betrifft: `dashboard/workouts/new/page.tsx` (1144 Zeilen), mehrere Gruppen-Komponenten über 500 Zeilen, fehlende Indizes (die Analyse hat keine konkret fehlenden gefunden, aber auch nicht systematisch gegen echte Query-Patterns mit `EXPLAIN` geprüft), N+1-Kandidaten aus der Analyse (`PERF-C1`).
3. **Die übrigen ~20 Befunde aus `docs/ANALYSIS.md`** (SEC-A1/A2, SEC-B1, DATA-B1, UPLOAD-B1, SEC-C1/C2/C3, SEC-E2, MISC-1/2/3, INFO-A1) - alles Mittel/Niedrig, keiner davon ein echtes Ausnutzungsrisiko ohne bereits gekaperte Session. Aufwand jeweils S laut Analyse, aber in Summe ein eigener Durchgang.
4. **`DEPS-1`** (Prisma-Studio-transitive Audit-Funde) - bewusst nicht gefixt, wie in Entscheidung 4 festgelegt.

## Offene Entscheidungen für dich

Keine neuen - die vier aus der Phase-1-Analyse sind durch deine Antworten alle entschieden und umgesetzt.

## Empfehlungen für die nächsten Schritte

1. **Review den Branch, dann entscheiden: mergen oder weiter daran arbeiten.** Nichts hiervon ist auf `master` oder gepusht.
2. Falls gemerged wird: die Docker-Produktivinstanz braucht einen Rebuild+Redeploy, damit der Next.js-Fix, die Rate-Limiting- und TOTP-Änderungen tatsächlich live greifen (die beiden DB-Migrationen - Rate-Limiting-Default und API-Key-Scope - sind bereits auf der Live-DB angewendet, unabhängig vom Code-Deploy, da hier kein separates Staging existiert).
3. Für Schritt 8 (falls gewünscht): am ehesten lohnt sich zuerst `dashboard/workouts/new/page.tsx` aufzuteilen - mit Abstand die größte Datei, und die, die durch die React-Compiler-Lint-Funde in diesem Durchgang (Ref-Mutation, Deklarationsreihenfolge) sowieso schon angefasst wurde.
4. Ein zweiter Review-Durchgang für die übrigen Mittel/Niedrig-Befunde wäre ein guter nächster, in sich abgeschlossener Auftrag - die meisten sind S-Aufwand und unabhängig voneinander.
