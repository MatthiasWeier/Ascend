// i18n coverage check. Usage: node --experimental-strip-types scripts/check-i18n.mjs
//   - lists every t("...") key used in src/ that has no English entry
//   - lists English entries nobody references any more
//   - heuristically flags German-looking string literals / JSX text that are
//     NOT wrapped in t() (add "// i18n-ignore" to a line to silence it)
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const root = path.resolve(import.meta.dirname, "..");
const srcDir = path.join(root, "src");
const enDir = path.join(srcDir, "lib", "i18n", "en");

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return walk(p);
    return /\.(ts|tsx)$/.test(e.name) ? [p] : [];
  });
}

const dictionary = {};
for (const file of fs.readdirSync(enDir)) {
  if (file === "index.ts") continue;
  const mod = await import(pathToFileURL(path.join(enDir, file)).href);
  for (const value of Object.values(mod)) Object.assign(dictionary, value);
}

function unescapeLiteral(raw) {
  return raw
    .replace(/\\"/g, '"')
    .replace(/\\'/g, "'")
    .replace(/\\n/g, "\n")
    .replace(/\\\\/g, "\\");
}

// Keys that are looked up dynamically (t(variable)) - the literals live in
// constants/DB seed/API responses, so they're listed here explicitly.
const DYNAMIC_KEYS = [
  "Feed", "Eintragen", "Analytics", "Gruppen", "Einstellungen",
  "Push", "Pull", "Beine", "Core", "Grip",
  "Warm-up", "Normal", "Dropsatz", "Failure",
  "Alle", "Text", "Workout", "Foto",
  "Workouts", "Nachrichten", "Bilder", "Challenges",
  "Wiederholungen", "Sekunden", "km", "Custom",
  "Sehr einfach", "Eher einfach", "Genau richtig", "Eher schwer", "Sehr schwer",
  "Mo", "Di", "Mi", "Do", "Fr", "Sa", "So",
  "So viele Klimmzüge wie möglich bis zu deinem Ziel.",
  "Liegestütze satt - knallhart bis zum Ziel.",
  "Dips ohne Gnade.",
  "Bodyweight Squats am laufenden Band.",
  "Sit-ups gegen die Uhr.",
  "Burpees - der Allrounder-Killer.",
  "Ausfallschritte für starke Beine.",
  "Einarmig(er) drücken für Fortgeschrittene.",
];

const used = new Map(); // key -> first location
const suspects = [];
const tCall = /\bt\(\s*("(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*')/g;
const errFallback = /\bt\(\s*[\w.?]+\s*\?\?\s*("(?:[^"\\\n]|\\.)*")/g;
const apiError = /error:\s*("(?:[^"\\\n]|\\.)*")/g;
const germanHint = /[äöüÄÖÜß]|\b(Speichern|Abbrechen|Löschen|Noch|Konnte|nicht|Bitte|Übung|Gruppe|Workout|Passwort|Benutzername|Fehlgeschlagen|Einstellungen)\b/;

for (const file of walk(srcDir)) {
  if (file.includes(path.join("lib", "i18n", "en"))) continue;
  const rel = path.relative(root, file);
  const text = fs.readFileSync(file, "utf8");
  const isApi = rel.includes(path.join("app", "api"));

  for (const m of text.matchAll(tCall)) {
    const key = unescapeLiteral(m[1].slice(1, -1));
    if (!used.has(key)) used.set(key, rel);
  }
  for (const m of text.matchAll(errFallback)) {
    const key = unescapeLiteral(m[1].slice(1, -1));
    if (!used.has(key)) used.set(key, rel);
  }
  if (isApi) {
    for (const m of text.matchAll(apiError)) {
      const key = unescapeLiteral(m[1].slice(1, -1));
      if (germanHint.test(key) && !used.has(key)) used.set(key, rel + " (API error)");
    }
    continue; // API routes stay German by design; clients translate via t(data.error)
  }

  if (!/\.tsx$/.test(file)) continue;
  const lines = text.split("\n");
  lines.forEach((line, i) => {
    const trimmed = line.trim();
    if (trimmed.startsWith("//") || trimmed.startsWith("*") || trimmed.startsWith("/*")) return;
    if (line.includes("i18n-ignore")) return;
    if (/\bt\(/.test(line) || /import /.test(line)) return;
    if (!germanHint.test(line)) return;
    if (/className=|console\.|logger\./.test(trimmed) && !/>[^<{]*[äöüß]/.test(line)) return;
    suspects.push(`${rel}:${i + 1}: ${trimmed.slice(0, 140)}`);
  });
}

for (const key of DYNAMIC_KEYS) if (!used.has(key)) used.set(key, "(dynamic)");

const missing = [...used.keys()].filter((k) => !(k in dictionary));
const unused = Object.keys(dictionary).filter((k) => !used.has(k) && !k.startsWith("__"));

console.log(`keys used: ${used.size}, dictionary entries: ${Object.keys(dictionary).length}`);
if (missing.length) {
  console.log(`\nMISSING English (${missing.length}):`);
  for (const k of missing) console.log("  " + JSON.stringify(k) + "  <- " + used.get(k));
}
if (unused.length) {
  console.log(`\nUnused dictionary entries (${unused.length}):`);
  for (const k of unused) console.log("  " + JSON.stringify(k));
}
if (suspects.length) {
  console.log(`\nPossibly untranslated German text (${suspects.length}):`);
  for (const s of suspects) console.log("  " + s);
}
process.exit(missing.length ? 1 : 0);
