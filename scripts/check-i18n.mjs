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
const deDir = path.join(srcDir, "lib", "i18n", "de");

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return walk(p);
    return /\.(ts|tsx)$/.test(e.name) ? [p] : [];
  });
}

const dictionary = {};
for (const file of fs.readdirSync(deDir)) {
  if (file === "index.ts") continue;
  const mod = await import(pathToFileURL(path.join(deDir, file)).href);
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
  "Feed", "Log", "Analytics", "Groups", "Settings",
  "Push", "Pull", "Legs", "Core", "Grip",
  "Warm-up", "Normal", "Drop set", "Failure",
  "All", "Text", "Workout", "Photo",
  "Workouts", "Messages", "Images", "Challenges",
  "Repetitions", "Seconds", "km", "Custom",
  "Very easy", "Rather easy", "Just right", "Rather hard", "Very hard",
  "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun",
  "As many pull-ups as possible up to your goal.",
  "Push-ups galore - relentless until your goal.",
  "Dips without mercy.",
  "Bodyweight squats non-stop.",
  "Sit-ups against the clock.",
  "Burpees - the all-rounder killer.",
  "Lunges for strong legs.",
  "One-arm-ish pressing for advanced athletes.",
];

const used = new Map(); // key -> first location
const suspects = [];
const tCall = /\bt\(\s*("(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*')/g;
const errFallback = /\bt\(\s*[\w.?]+\s*\?\?\s*("(?:[^"\\\n]|\\.)*")/g;
const apiError = /error:\s*("(?:[^"\\\n]|\\.)*")/g;
const germanHint = /[äöüÄÖÜß]|\b(Speichern|Abbrechen|Löschen|Noch|Konnte|nicht|Bitte|Übung|Gruppe|Workout|Passwort|Benutzername|Fehlgeschlagen|Einstellungen)\b/;

for (const file of walk(srcDir)) {
  if (file.includes(path.join("lib", "i18n", "de"))) continue;
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
