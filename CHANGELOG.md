# Changelog

All notable changes to this project are documented here. Format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versioning follows
[SemVer](https://semver.org/) - `0.x.y` means the app is still moving and
nothing is guaranteed stable yet.

## [0.12.1] - 2026-09-18

### Added
- Rest-Timer gibt jetzt einen doppelten Ton (Web Audio, kein Audio-Asset
  nötig) und Vibration aus, wenn die Pause abgelaufen ist - nicht mehr nur
  ein Toast, den man leicht verpasst

## [0.12.0] - 2026-09-18

### Added
- Push-Benachrichtigungen (Web Push, ohne Drittanbieter): Toggle in den
  Einstellungen, Benachrichtigung an alle anderen Gruppenmitglieder wenn
  jemand ein Workout postet oder eine Daily Challenge schafft. Komplett
  optional für Selbsthoster - ohne gesetzte `VAPID_*`-Umgebungsvariablen
  bleibt der Toggle einfach ausgeblendet

## [0.11.0] - 2026-09-18

### Added
- Neuer "Analytics"-Tab in Gruppen: Gruppen-Volumen über die letzten 30
  Tage (Sätze der ganzen Gruppe pro Tag) und Aktivität pro Mitglied
  (geloggte Workouts, letzte 30 Tage)

## [0.10.0] - 2026-09-18

### Added
- Aktivitäts-Kalender: ein Tag anklicken zeigt das exakte Workout (Übungen,
  Gewicht, Wiederholungen) dieses Tages in einem Dialog

## [0.9.0] - 2026-09-18

### Added
- Workout-Vorlagen: aktuelle Satz-Reihenfolge als benannte Vorlage
  speichern und beim nächsten Mal per Dropdown wieder laden (Werte werden
  weiterhin aus der letzten Session vorausgefüllt)

## [0.8.0] - 2026-09-18

### Added
- "Gruppen-Aktivität" auf der Startseite: geteilte Workouts und
  abgeschlossene/abgebrochene Challenges aus allen eigenen Gruppen,
  neueste zuerst, mit Zeitangabe und Link zur jeweiligen Gruppe

## [0.7.0] - 2026-09-18

### Added
- Challenge-Verlauf: pro Daily Challenge sehen, wer an welchem Tag
  geschafft, aufgegeben oder es gar nicht versucht hat, inkl. Prozent bei
  nur teilweise geschafften Versuchen

## [0.6.0] - 2026-09-18

### Added
- Gruppen-Feed-Filter nach Typ (Alle/Text/Workout/Foto)
- Auf einen Namen im Feed klicken zeigt nur noch dessen Posts

## [0.5.0] - 2026-09-18

### Added
- PWA-Icons (App-Icon/Home-Screen, Favicon) aus dem Ascend-Logo generiert
- **Gruppenziele als echte Objekte statt Strings**: Einheit ist jetzt ein
  Enum (Wiederholungen / Sekunden / km / Custom) statt Freitext
- **Automatisches Auffüllen von Gruppenzielen**: ein Ziel kann optional mit
  einer Übung verknüpft werden - danach tragen sowohl normale Workouts als
  auch abgeschlossene/abgebrochene Daily Challenges mit dieser Übung
  automatisch bei, kein manuelles Eintragen mehr nötig. Beim Verknüpfen
  wird die komplette Vergangenheit rückwirkend nachgetragen. Tägliche
  Challenges selbst bleiben davon unberührt - die entstehen weiterhin nur
  über den separaten Challenge-Flow

### Fixed
- Migration der bestehenden Gruppenziele (Freitext-Einheit -> Enum) ohne
  Datenverlust durchgeführt

## [0.4.0] - 2026-09-18

### Added
- Daily-Challenge-Reminder auf der Startseite: wer noch eine offene
  Challenge für heute hat (nicht gestartet oder nicht fertig), sieht das
  sofort oben über "Hey, Name" - kein Pop-up, kein Wegklicken, direkter
  Link zur jeweiligen Gruppe/Challenge

## [0.3.1] - 2026-09-18

### Changed
- Replaced the "Alle Workouts teilen"-Button mit einem dauerhaften
  Toggle ("Workouts automatisch teilen") pro Gruppe: einmal aktiviert,
  wird jedes neue Workout automatisch geteilt, nicht nur der bestehende
  Rückstand. Deaktivieren stoppt nur zukünftige Shares, bereits geteilte
  Posts bleiben im Feed.

### Fixed
- Bulk-Share konnte bei mehrfachem/schnellem Klicken (oder einer erneuten
  Anfrage) dieselben Workouts doppelt in den Feed einfügen - die
  Datenbank blockt das jetzt selbst ab (`skipDuplicates`), unabhängig
  davon wie oft die Aktion ausgelöst wird.

## [0.3.0] - 2026-09-18

### Added
- "Alle Workouts teilen"-Button in Gruppen: teilt mit einem Klick jedes
  eigene Workout, das noch nicht in dieser Gruppe geteilt wurde, statt sie
  einzeln über den Composer auszuwählen
- Bereits geteilte Workouts werden im Composer nicht mehr zur Auswahl
  angeboten und können nicht doppelt geteilt werden

## [0.2.0] - 2026-09-17

### Added
- Schnelle Übungssuche: durchsuchbare Combobox (shadcn Command/Popover)
  ersetzt die lange Dropdown-Liste beim Workout-Eintragen
- Auto-Fill aus der letzten Session: Wdh/Gewicht/Dauer werden pro Übung aus
  dem letzten Log vorausgefüllt, ohne bereits getippte Werte zu überschreiben
- Integrierter Pause-Timer mit 60/90/120/180s-Presets, startbar per
  ✓-Button direkt am Satz
- Satz duplizieren: ein Klick kopiert Übung + Werte eines Satzes in eine
  neue Zeile darunter, für mehrere Sätze derselben Übung hintereinander
- PR-Erkennung: chronologische Bestwert-Berechnung pro Übung
  (bodyweight-adjustiertes 1RM bzw. Haltedauer), Trophäen-Badge im Feed und
  "Neuer PR!"-Toast beim Speichern
- Wetteinsatz: optionaler Freitext beim Aktivieren einer Daily Challenge
- Kollaborative Gruppenziele: gemeinsames Ziel mit Ziel-Wert/Einheit/Frist,
  jedes Mitglied trägt Beiträge bei, Fortschrittsbalken + Beitrag pro Person

### Fixed
- Absturz beim Öffnen des User-Menüs (Base-UI-Fehler durch fehlenden
  `Menu.Group`-Wrapper um das Nutzernamen-Label)

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
