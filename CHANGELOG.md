# Changelog

All notable changes to this project are documented here. Format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versioning follows
[SemVer](https://semver.org/) - `0.x.y` means the app is still moving and
nothing is guaranteed stable yet.

## [0.42.0] - 2026-09-21

### Changed
- **Feed & Workout-Karten**: Status ("X hat ein Workout gepostet") und Metriken sind klar getrennt -
  Name fett, Aktion gedämpft, Zahlen wie "2 Übungen · 4 Sätze" oder "100/100" fett in Akzentfarbe
  (`BoldNumbers`). "Details einblenden" hat eine größere Klickfläche mit größerem Caret;
  Kommentar-Button größer, immer mit Text.
- **Workout eintragen**: der Satz-Haken ist jetzt ein Button "Satz & Pause" (danach "Erledigt");
  "Satz hinzufügen" ist ein deutlich erkennbarer, gestrichelter Vollbreiten-Button; Papierkorb mit Tooltip.
- **Analytics**: Aktivitätskalender mit echtem Hover-Tooltip (Datum + Intensität, auch per Tastatur)
  und Farbrampe, die im Dark-Theme von dunkel nach hell läuft (vorher versank die dunkelste Stufe im
  Schwarz). Y-Achsen beschriftet ("Geschätztes 1RM (kg)", "Volumen (kg)", "Sätze"), X-Achse mit
  Mindestabstand gegen überlappende Datumsangaben.
- **Gruppenziele**: Beitragende als Rangliste (Platz 1-3 in Gold/Silber/Bronze, Balken, fetter Betrag).
- **Kletter-Pyramide** mit Achsentiteln, **Balance-Radar**-Tooltip in %, **Boulder-Kalender** mit Tooltip pro Tag;
  Tooltips für Gruppe umbenennen/verlassen und Ziel löschen.
- **Gruppen-Challenges**: Rangliste des Tages (Platz 1-3 in Gold/Silber/Bronze, danach Zahl) inkl.
  fettem Fortschritt "cur/target"; Tooltips für Play ("Challenge starten/fortsetzen/bewerten"),
  Anfechten, Verlauf und Deaktivieren.

### Fixed
- Dropdowns zeigten teils den rohen Wert statt des Namens (z.B. die Datenbank-ID im
  Maximalkraft-Verlauf). Die betroffenen Selects (Übung, Workout-Auswahl, Satz-Typ, Einheiten,
  Sprache, Übung anlegen, Gruppenziel) übergeben jetzt ihre Labels.

## [0.41.0] - 2026-09-20

### Added
- **Klettertag-Button auf der Startseite**: "Klettertag" öffnet direkt den Boulder-Dialog für
  heute (neben "Workout"; am Handy neben "Workout eintragen").
- **Push + Glocke für Klettertage**: wer einen neuen Klettertag einträgt, benachrichtigt die
  Mitglieder der Gruppen, in denen er/sie das Teilen des Trainings aktiviert hat
  ("X war bouldern (12 Boulder)"). Nachträgliches Bearbeiten eines Tages löst nichts aus.
- **Benachrichtigungen führen zur Nachricht**: ein Klick auf Kommentar-, Antwort- oder
  Workout-Benachrichtigung öffnet den Gruppen-Feed, scrollt zum Beitrag bzw. Kommentar,
  klappt die Kommentare auf und hebt die Stelle kurz hervor (auch per Push-Link).

### Fixed
- **Kalender "Klettern"**: Ein Klick auf einen markierten Tag öffnete einen leeren Dialog
  (alle Grade 0). Er lädt jetzt die gespeicherten Boulder des Tages, beim Speichern werden sie
  ersetzt statt doppelt angehängt; alle auf 0 = Tag leeren. Routen/andere Grade des Tages
  bleiben unangetastet (mit Hinweis).

## [0.40.0] - 2026-09-19

### Added
- **Einführungs-Tutorial**: direkt nach der Registrierung öffnet sich einmalig eine
  12-schrittige Tour (Workout eintragen, Pump Pics, Feed, Kalender & Streak, Analytics,
  Workout Brain, Gruppen, Challenges & Gruppenziele, Benachrichtigungen, Einstellungen).
  Mit "Überspringen" jederzeit abbrechbar; erscheint danach nie wieder (serverseitig pro
  Account gemerkt, `User.tutorialCompletedAt`). Bestehende Accounts sehen es nicht.
  In den Einstellungen gibt es "Tutorial erneut ansehen".

## [0.39.0] - 2026-09-19

### Added
- **Daily Challenges zählen mit Workouts**: Wiederholungen der Challenge-Übung, die du
  heute in einem Workout einträgst (Aufwärmsätze zählen nicht), laufen automatisch in den
  Tagesversuch der Challenge - 100 Liegestütze im Workout erfüllen die Challenge, inkl.
  Benachrichtigung an die Gruppe. Funktioniert beim Eintragen, Bearbeiten und Löschen von
  Workouts (sinkt der Stand unter das Ziel und ist noch nicht bewertet, wird die Challenge
  wieder geöffnet), sowie beim nachträglichen Setzen eines Ziels. Der Challenge-Dialog zeigt
  "davon X aus deinen Workouts heute".

### Changed
- Ein Challenge-Versuch trägt zu Gruppenzielen nur noch die im Dialog getippten Wiederholungen
  bei (`manualReps`); Workout-Wiederholungen kommen über die Sätze - so wird nichts doppelt gezählt.

## [0.38.0] - 2026-09-19

### Added
- **Workout-Entwurf serverseitig**: das "Workout eintragen"-Formular wird automatisch
  gespeichert (kurz nach jeder Änderung und sofort, wenn der Tab in den Hintergrund geht),
  z.B. beim Wechsel zu WhatsApp. Beim Zurückkommen wird es wiederhergestellt, mit Hinweis
  und "Verwerfen". Entwürfe und nie angehängte Fotos verfallen nach 7 Tagen.
- **Pump Pics**: bis zu 10 Fotos pro Workout (beim Eintragen und Bearbeiten). Sichtbar
  für dich und für Mitglieder der Gruppen, in denen das Workout geteilt ist - an der
  Workout-Karte, im Gruppen-Feed, auf der Startseite und im Kalender. Klick vergrößert;
  Fotos werden nie beschnitten. Löschen von Workout oder Account entfernt auch die Dateien.
## [0.37.0] - 2026-09-19

### Added
- **Benachrichtigungs-Zentrale (Glocke)** in der Kopfleiste: Zähler für Ungelesenes und eine
  Liste mit Kommentaren auf eigene Beiträge, Antworten auf eigene Kommentare, Anstupsern,
  neuen Workouts aus der Gruppe und geschafften Challenges. Funktioniert unabhängig von Web
  Push (nutzt den Push aber zusätzlich, wenn er eingerichtet ist). Einträge sind sprachneutral
  gespeichert und erscheinen in der gewählten Sprache; alte werden nach 60 Tagen entfernt.
## [0.36.3] - 2026-09-19

### Added
- **Push-Diagnose** (Einstellungen → Benachrichtigungen): zeigt Erlaubnis-Status, Push-Dienst,
  Abo-Status und den exakten Fehler beim Aktivieren; "Test-Benachrichtigung" schickt eine
  Push an die eigenen Geräte und meldet, was der Push-Dienst geantwortet hat.
  Pushes gehen jetzt mit TTL und hoher Dringlichkeit raus.
## [0.36.1] - 2026-09-19

### Fixed
- **Fotos werden nie mehr beschnitten**: Bilder im Gruppen-Feed und auf der Startseite
  erscheinen vollständig (kleiner statt abgeschnitten) und lassen sich per Klick
  groß öffnen (Lightbox, mit Link zum Original).
- **Kommentare auf der Startseite**: unter Gruppen-Posts (Text, Foto, Workout) und
  unter den eigenen, in Gruppen geteilten Workouts sind Kommentare jetzt auch im
  Startseiten-Feed les- und schreibbar.
## [0.36.0] - 2026-09-19

### Added
- **Kommentare mit verschachtelten Antworten (Reddit-Stil)** unter jedem Gruppen-Post
  (Text, Workout, Foto): Antworten auf Antworten, einzelne Threads einklappbar,
  eigene Kommentare bearbeiten/löschen, Leader kann moderieren. Ein gelöschter
  Kommentar mit Antworten bleibt als "[gelöscht]" stehen, damit der Thread lesbar
  bleibt. Kommentar-Zähler im Feed; Push an Post- bzw. Kommentar-Autor.
## [0.35.0] - 2026-09-19

### Changed
- **Desktop-Layout**: ab großen Bildschirmen zwei Spalten - rechts bleiben
  Workout Brain, offene Challenges und eine 12-Wochen-Aktivitätsübersicht
  sichtbar.
- **Feeds**: Workouts (eigene und geteilte) zeigen zuerst eine Zusammenfassung
  ("5 Übungen · 14 Sätze") mit "Details einblenden"; Eintragsarten sind per
  farbigem Rand und Icon-Kreis schneller unterscheidbar.
- **Workout eintragen**: größere Eingabefelder und mehr Abstand, die
  "Häufig"-Pillen sehen wie Buttons aus.
- **Analytics**: Empty States mit Dummy-Graph und Button, Einheiten an den
  Y-Achsen, Werte direkt an den Pyramiden-Balken, größerer Aktivitäts-Kalender.
  "Kraft" listet nur Übungen mit mindestens 2 Trainingstagen (Graph möglich)
  und wählt die meisttrainierte vor.
- Hellere Nebentexte im Dark Mode (Kontrast).
- **Nachgezogen**: Gruppenziele in der Desktop-Spalte; geteilte Workouts zeigen den
  Muskelfokus ("Core-Fokus") und lassen sich auch auf der Startseite aufklappen;
  Gruppen, Gruppendetail, Einstellungen (zweispaltig) und Workout-Eintragen nutzen
  große Bildschirme besser; größere Aktions-Icons in den Satz-Zeilen; der
  Aktivitäts-Kalender liegt jetzt prominent über den Analytics-Tabs; Kontrast im
  Light Mode erhöht (5,8:1 auf 7,5:1), sehr blasse Nebentexte entfernt.
## [0.34.0] - 2026-09-19

### Added
- **Englisch/Deutsch umschaltbar**: Umschalter (DE/EN) in der Kopfleiste, auf
  Login/Registrierung/Startseite und in den Einstellungen. Die gewählte Sprache
  wird in einem Cookie (`ascend-locale`) pro Gerät gespeichert und gilt auch
  vor dem Login. Übersetzt sind die gesamte Oberfläche, Workout-Brain-Texte,
  Zeitangaben/Datumsformate, Fehlermeldungen des Servers sowie Impressum und
  Datenschutzerklärung (englische Fassung als Serviceübersetzung - die
  deutsche ist verbindlich).
- `scripts/check-i18n.mjs` (`pnpm i18n:check`): findet fehlende englische
  Übersetzungen und noch nicht übersetzte deutsche Texte.

### Bekannte Grenzen
- Von Nutzern eingegebene Inhalte (Beiträge, Notizen, eigene Übungen,
  Gruppennamen) werden nicht übersetzt.
- Push-Benachrichtigungen werden serverseitig auf Deutsch verschickt (die
  Sprache des Empfängers ist dort nicht bekannt).
- Bereits gespeicherte Workout-Zusammenfassungen in Gruppen-Posts bleiben
  wie geteilt; nur die Kopfzeile ("Workout vom …") wird übersetzt.

## [0.33.0] - 2026-09-19

### Changed
- **Startseite: ein gemeinsamer Feed statt zwei getrennter Bereiche.** Eigene
  Workouts, Gruppen-Nachrichten, Fotos, geteilte Workouts und Challenges
  stehen jetzt in einer Zeitleiste. Filter (bleiben gespeichert):
  Quelle (Ich / einzelne Gruppen, mehrfach wählbar) und Typ (Workouts /
  Nachrichten / Bilder / Challenges). Fotos werden direkt als Vorschau
  angezeigt, "Mehr anzeigen" lädt weiter zurück.
- **Workout bearbeiten/löschen direkt an der Karte** als sichtbare Buttons
  statt hinter einem kleinen ⋮-Menü - der Umweg über Analytics → Kalender
  ist nicht mehr nötig.

## [0.32.0] - 2026-09-19

### Added
- **Sitzungsverwaltung** (Settings → Sitzungen): zeigt alle Geräte, die
  aktuell angemeldet sind, mit "zuletzt aktiv"; einzelne Sitzungen oder
  alle außer der aktuellen lassen sich sofort beenden - das Gerät wird
  beim nächsten Zugriff automatisch abgemeldet, ganz ohne auf den
  natürlichen JWT-Ablauf zu warten. Bestehende Logins bleiben beim Update
  gültig (kein erzwungenes Neu-Anmelden).

### Changed
- Technischer Hinweis für zukünftige Arbeit an Auth: ein echter Wechsel
  von JWT- auf Datenbank-Sessions (wie ursprünglich für dieses Feature
  angedacht) ist mit dieser App nicht möglich, solange nur der
  Credentials-Provider konfiguriert ist - Auth.js lehnt
  `session.strategy = "database"` in dem Fall aktiv ab. Sitzungsverwaltung
  ist stattdessen als Widerrufs-Liste über dem bestehenden JWT gebaut
  (siehe CLAUDE.md), was praktisch das gleiche Ergebnis liefert, ohne
  gegen diese Einschränkung anzukämpfen.

## [0.31.0] - 2026-09-19

### Added
- **Zwei-Faktor-Authentifizierung (TOTP)**: optional, pro Konto in den
  Einstellungen aktivierbar - RFC-6238-TOTP (kompatibel mit Google/Microsoft
  Authenticator, Aegis, 1Password, ...) selbst implementiert, kein
  Cloud-Dienst nötig. QR-Code zum Scannen, 10 Backup-Codes (je einmal
  gültig) beim Aktivieren. Login fragt den Code nur ab, wenn 2FA für den
  jeweiligen Account an ist - für alle bestehenden Konten ändert sich ohne
  eigenes Zutun nichts. Da es keine E-Mail-basierte Konto-Wiederherstellung
  gibt, können Admins 2FA für ein Konto in `/dashboard/admin` zurücksetzen,
  falls Authenticator und Backup-Codes beide verloren gehen.

## [0.30.0] - 2026-09-19

### Added
- **kg/lbs umschaltbar** (Settings → Einheiten): steuert nur die Anzeige -
  Workout-Sätze, Körpergewicht, PRs und Charts zeigen/akzeptieren Werte in
  der gewählten Einheit; gespeichert wird intern immer in kg (kein Bruch
  bei Export/Import/API, die bleiben kg-only). Hantelscheiben- und
  Aufwärm-Rechner rechnen mit dem passenden Scheiben-/Stangen-Satz für die
  gewählte Einheit (kg: 20kg-Stange, 25/20/15/10/5/2.5/1.25kg-Scheiben;
  lbs: 45lbs-Stange, 45/35/25/10/5/2.5lbs-Scheiben).
- **CONTRIBUTING.md**: Setup, Vorraussetzungen für PRs (Build/Lint/
  manuelles Testen, Migration statt `db push`, Versionierung) und
  Konventionen (deutsche UI, keine neuen Pflicht-Cloud-Abhängigkeiten).

## [0.29.0] - 2026-09-19

### Added
- **S3/MinIO-Storage-Backend** (optional): Avatare und Gruppen-Fotos können
  statt auf lokaler Disk in einem S3-kompatiblen Bucket (z.B. MinIO)
  abgelegt werden - nützlich für Multi-Host- oder Kubernetes-Deployments,
  wo das lokale `uploads`-Volume nicht praktikabel ist. Aktiviert durch
  Setzen von `S3_ENDPOINT`/`S3_BUCKET`/`S3_REGION`/`S3_ACCESS_KEY_ID`/
  `S3_SECRET_ACCESS_KEY` (siehe `.env.example`); ohne diese bleibt alles
  beim bisherigen lokalen Disk-Verhalten. Dateien werden nie über eine
  öffentliche Bucket-URL ausgeliefert, sondern immer über die
  bestehenden authentifizierten App-Routen gestreamt, damit die
  Gruppen-Zugriffskontrolle unverändert greift.

## [0.28.0] - 2026-09-19

### Added
- **REST-API mit API-Keys**: `/api/v1/exercises` und `/api/v1/workouts`
  (GET/POST), authentifiziert über `Authorization: Bearer ascend_...`.
  Keys werden in Settings erstellt/widerrufen, der Rohschlüssel wird nur
  einmal angezeigt. Siehe README für Details.

## [0.27.0] - 2026-09-19

### Added
- **Datenexport** (Settings): vollständiger JSON-Export aller eigenen
  Daten (Workouts, Sätze, Körpergewicht, Klettern, Balance-Ziele,
  Vorlagen)
- **CSV-Import** (Strong/Hevy-kompatibel, best effort): unbekannte
  Übungen werden automatisch angelegt, Muskel-Fokus wird aus dem
  Übungsnamen geraten
- **Abonnierbarer Kalender-Feed** (ICS): pro Nutzer ein privater,
  token-basierter Link für Apple/Google Kalender etc., in Settings
  einsehbar und neu generierbar

## [0.26.0] - 2026-09-19

### Added
- **Admin-Rolle**: instanzweiter Admin (`User.isAdmin`) mit einer
  Nutzerverwaltung unter `/dashboard/admin` - Liste aller Nutzer,
  Admin-Rechte vergeben/entziehen, Nutzer löschen (mit Schutz gegen
  Selbst-Löschung und Entfernen des letzten Admins)
- **Invite-only Registrierung**: `INVITE_ONLY=true` schließt die
  Registrierung, außer man kommt über einen gültigen Gruppen-Invite-Link -
  Registrierung und Gruppen-Beitritt passieren dann in einem Schritt

## [0.25.0] - 2026-09-19

### Added
- **Automatische DB-Migrationen**: `docker compose up` führt jetzt einen
  einmaligen `migrate`-Service (`prisma migrate deploy`) aus, bevor die
  App startet - kein manuelles SSH+Migrations-Kommando mehr nötig
- **Healthcheck**: `GET /api/health` prüft die echte DB-Erreichbarkeit,
  eingebunden in Dockerfile-`HEALTHCHECK` und den `app`-Service
- **Prometheus-Metriken**: `GET /api/metrics`, hinter `METRICS_TOKEN`
  (per Default deaktiviert/404)
- **Backup/Restore-Scripts** (`scripts/backup.sh`, `scripts/restore.sh`)
  für DB-Dump + Uploads-Archiv, siehe `DEPLOYMENT.md`
- **DEPLOYMENT.md**: Caddy/Traefik-Beispiele, Migrations-/Healthcheck-/
  Backup-/Metriken-Doku an einem Ort
- Login-/Registrierungs-Rate-Limits über Env-Vars konfigurierbar
  (`LOGIN_RATE_LIMIT_*`, `REGISTER_RATE_LIMIT_*`)

### Fixed
- Docker setzt `HOSTNAME` automatisch auf die Container-ID, wodurch Next's
  Standalone-Server nur auf die interne Bridge-IP statt auf alle
  Interfaces gebunden hat - von außen unsichtbar (Port-Forwarding
  funktionierte zufällig trotzdem), aber jede Verbindung von *innerhalb*
  des Containers zu `localhost` (wie der neue Healthcheck) schlug fehl.
  `HOSTNAME=0.0.0.0` im Dockerfile behebt das.

## [0.24.0] - 2026-09-18

### Added
- **Satz-Typen**: jeder Satz lässt sich als Warm-up, Normal, Dropsatz oder
  Failure markieren - Warm-up-Sätze zählen nicht in Rekorde,
  Trainings-Balance oder Gruppenziele
- **Notizen pro Satz** (z.B. "langsame Exzentrik"), zusätzlich zur
  bestehenden Workout-weiten Notiz
- **Hantelscheiben-Rechner** und **Aufwärm-Rechner** direkt beim Eintragen
  eines Satzes
- **"Letztes Mal"-Anzeige** im aktiven Workout, statt nur stillschweigend
  vorauszufüllen
- **Sätze pro Muskelgruppe diese Woche** in Analytics (Volumen-Tab) -
  eine der wichtigsten Volumen-Steuerungs-Metriken
- **Vorlagen von Gruppenmitgliedern kopieren**: in der Mitgliederliste
  einsehbar und mit einem Klick in die eigene Bibliothek übernehmbar

## [0.23.1] - 2026-09-18

### Fixed
- Editing a workout that was already shared into a group now updates that
  group post's content too, instead of leaving it showing the old
  numbers - without sending a new push notification.

## [0.23.0] - 2026-09-18

### Added
- **Fatigue pro Muskelgruppe**: statt einer einzigen "Anstrengung
  insgesamt" fragt das Workout jetzt pro tatsächlich trainiertem Fokus,
  wie ausgelastet er ist - Workout Brain nutzt das jetzt: ein Fokus, der
  gerade hart getroffen wurde, wird nicht sofort wieder vorgeschlagen,
  selbst wenn er laut Kalender "überfällig" wäre
- Eigene Nachrichten (Text/Foto-Bildunterschrift) im Gruppen-Feed lassen
  sich jetzt bearbeiten, nicht nur löschen

### Fixed
- Ein Hold mit Zusatzgewicht (z.B. Weighted Dead Hang) ließ sich bisher
  gar nicht mit Gewicht eintragen - das Gewicht wurde stillschweigend
  verworfen. Zählt jetzt korrekt in Rekorden und der Trainings-Balance.

## [0.22.0] - 2026-09-18

### Added
- **Gruppen-Aktivität** auf dem Dashboard zeigt jetzt auch Chat-Nachrichten
  und Fotos, nicht mehr nur geteilte Workouts und Challenges
- **Start-Datum ("Von")** für Gruppenziele: ohne Start zählte "1000
  Klimmzüge im Oktober" bisher auch September und früher mit - jetzt lässt
  sich ein Zeitfenster statt nur einer Frist definieren
- **Online-Status** in der Mitgliederliste: "Online" oder "zuletzt online
  vor X"
- **Mitglieder-Kalender**: der Trainings-Kalender eines anderen
  Gruppenmitglieds ist jetzt einsehbar - nur mit dem, was in dieser Gruppe
  tatsächlich geteilt wurde, nie die private Historie
- Jeder kann jetzt eigene Beiträge (Nachrichten, Fotos, geteilte Workouts)
  im Gruppen-Feed löschen; der Leader kann zusätzlich fremde
  Nachrichten/Fotos moderieren, aber keine fremden Workout-Shares
- Beim Hovern über eine Reaktion sieht man jetzt, wer reagiert hat

## [0.21.0] - 2026-09-18

### Changed
- **Workout Brain berücksichtigt jetzt Balance-Ziele**: ein Fokus mit 0%
  Ziel wird nie mehr vorgeschlagen, und ein Fokus, der spürbar unter
  seinem Ziel-Anteil liegt, wird bevorzugt vorgeschlagen statt nur nach
  "zuletzt trainiert" zu gehen

## [0.20.0] - 2026-09-18

### Added
- **Onboarding-Checkliste** für neue Nutzer ohne Workouts: "So geht's los"
  mit drei Schritten (Gewicht eintragen, erstes Workout eintragen, Gruppe
  erstellen/beitreten) statt einer leeren Liste ohne Anleitung

## [0.19.0] - 2026-09-18

### Added
- **Undo-Fenster** statt Bestätigungs-Dialog: Vorlage löschen (neue
  "Vorlagen verwalten"-Ansicht) und Mitglied aus einer Gruppe entfernen
  passieren sofort, mit 5 Sekunden Zeit zum Rückgängigmachen im Toast

## [0.18.0] - 2026-09-18

### Added
- **Optimistische UI-Updates**: Posten im Gruppen-Feed, Reagieren auf Posts
  und Beitragen zu Gruppenzielen fühlen sich jetzt sofort an, statt auf die
  Server-Antwort zu warten (mit automatischem Rollback bei Fehlern)

## [0.17.0] - 2026-09-18

### Added
- **Pull-to-refresh** auf Dashboard und Gruppen-Feed: am oberen Rand nach
  unten ziehen lädt neu, statt die Seite manuell neu laden zu müssen

## [0.16.0] - 2026-09-18

### Added
- **Profilbild-Upload**: eigenes Bild statt nur Initialen-Avatar, sichtbar
  im Nutzermenü, in den Einstellungen und in der Mitgliederliste jeder
  Gruppe

## [0.15.0] - 2026-09-18

### Added
- **Anstupsen**: jedes Mitglied kann jedes andere Mitglied per Push
  anstupsen ("Zieh dein Workout durch!"), max. einmal pro Stunde pro Person
- **Reaktionen** auf Feed-Posts (👍❤️💪🔥) - eine Reaktion pro Person und
  Post, ein anderes Emoji wählen ersetzt die alte
- **Streak-Anzeige** auf der Startseite: aufeinanderfolgende Trainingstage
  in deutscher Zeitzone, bricht erst nach einem komplett verpassten Tag
- **Persönliche-Rekorde-Übersicht**: neuer "Rekorde"-Tab in Analytics mit
  dem aktuellen Bestwert pro Übung (statt nur als Badge im Feed sichtbar)

## [0.14.0] - 2026-09-18

### Added
- Mitglieder können eine Gruppe jetzt selbst verlassen (bisher nur
  Kicken durch den Leader möglich)
- **Leitungs-Übergabe**: Leader kann die Leitung an ein anderes Mitglied
  übergeben - überträgt sowohl die Rolle als auch die eigentliche
  Besitzer-Zuordnung, damit die Gruppe beim Löschen des alten
  Leader-Accounts nicht mehr mitgelöscht wird
- Gruppenname kann vom Leader nachträglich geändert werden

## [0.13.0] - 2026-09-18

### Added
- "Häufig"-Chips über der Übungsliste beim Workout-Eintragen: die 8 am
  häufigsten geloggten Übungen mit einem Klick als neuen Satz hinzufügen,
  ohne die Suche zu öffnen
- **Workout bearbeiten und löschen** - bisher nicht möglich. Bearbeiten
  öffnet dieselbe Eintragen-Seite mit den bestehenden Sätzen vorausgefüllt;
  beides über ein Menü an jeder Workout-Karte (Feed + Kalender-Ansicht).
  Verknüpfte Gruppenziel-Beiträge werden beim Bearbeiten/Löschen korrekt
  nachgezogen, nie doppelt gezählt

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
