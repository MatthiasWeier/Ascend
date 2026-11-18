import type { MuscleFocus } from "@prisma/client";

// Minimal CSV parser: handles quoted fields (with embedded commas/quotes)
// well enough for Strong/Hevy exports. Not a general-purpose CSV library -
// those exports are simple enough not to need one.
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  const chars = text.replace(/\r\n/g, "\n");
  for (let i = 0; i < chars.length; i++) {
    const c = chars[i];
    if (inQuotes) {
      if (c === '"') {
        if (chars[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += c;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((f) => f.trim() !== ""));
}

// Strong/Hevy CSV exports use slightly different column names across
// versions - match by keyword instead of an exact header.
function findColumn(header: string[], ...keywords: string[]): number {
  const lower = header.map((h) => h.toLowerCase().trim());
  for (const kw of keywords) {
    const idx = lower.findIndex((h) => h.includes(kw));
    if (idx !== -1) return idx;
  }
  return -1;
}

const FOCUS_KEYWORDS: [MuscleFocus, string[]][] = [
  ["LEGS", ["squat", "leg", "calf", "lunge", "deadlift", "hip thrust", "glute"]],
  ["PULL", ["row", "pull", "curl", "lat", "back", "shrug", "chin"]],
  ["PUSH", ["press", "push", "bench", "tricep", "chest", "shoulder", "dip", "fly"]],
  ["GRIP", ["hang", "grip", "carry", "farmer"]],
  ["CORE", ["ab", "core", "plank", "crunch", "sit-up", "situp"]],
];

function guessFocus(exerciseName: string): MuscleFocus {
  const lower = exerciseName.toLowerCase();
  for (const [focus, keywords] of FOCUS_KEYWORDS) {
    if (keywords.some((kw) => lower.includes(kw))) return focus;
  }
  return "CORE";
}

export type ImportedSet = {
  reps: number | null;
  weightKg: number | null;
  durationSec: number | null;
  notes: string | null;
};

export type ImportedSession = {
  date: Date;
  notes: string | null;
  exercises: { name: string; sets: ImportedSet[] }[];
};

// Parses a Strong or Hevy CSV export into sessions grouped by (date,
// workout name). Weight is normalized to kg if the header says lbs.
export function parseWorkoutCsv(text: string): ImportedSession[] {
  const rows = parseCsv(text);
  if (rows.length < 2) return [];

  const header = rows[0];
  const dateCol = findColumn(header, "date", "start_time", "start time");
  const workoutNameCol = findColumn(header, "workout name", "title");
  const exerciseCol = findColumn(header, "exercise");
  const weightCol = findColumn(header, "weight");
  const repsCol = findColumn(header, "reps");
  const durationCol = findColumn(header, "seconds", "duration");
  const notesCol = findColumn(header, "notes");
  const isLbs = weightCol !== -1 && header[weightCol].toLowerCase().includes("lb");

  if (dateCol === -1 || exerciseCol === -1) {
    throw new Error("Could not find a date or exercise column in the CSV");
  }

  const sessionsByKey = new Map<string, ImportedSession>();
  const exerciseOrderByKey = new Map<string, string[]>();

  for (const row of rows.slice(1)) {
    const dateRaw = row[dateCol]?.trim();
    if (!dateRaw) continue;
    const date = new Date(dateRaw.replace(" ", "T"));
    if (isNaN(date.getTime())) continue;

    const workoutName = workoutNameCol !== -1 ? row[workoutNameCol]?.trim() : "";
    const key = `${date.toISOString().slice(0, 16)}::${workoutName}`;

    let session = sessionsByKey.get(key);
    if (!session) {
      session = { date, notes: workoutName || null, exercises: [] };
      sessionsByKey.set(key, session);
      exerciseOrderByKey.set(key, []);
    }

    const exerciseName = row[exerciseCol]?.trim();
    if (!exerciseName) continue;

    const order = exerciseOrderByKey.get(key)!;
    let exerciseEntry = session.exercises.find((e) => e.name === exerciseName);
    if (!exerciseEntry) {
      exerciseEntry = { name: exerciseName, sets: [] };
      session.exercises.push(exerciseEntry);
      order.push(exerciseName);
    }

    const weightRaw = weightCol !== -1 ? Number(row[weightCol]) : null;
    const weightKg =
      weightRaw != null && !isNaN(weightRaw) && weightRaw > 0
        ? Math.round((isLbs ? weightRaw * 0.453592 : weightRaw) * 100) / 100
        : null;
    const repsRaw = repsCol !== -1 ? Number(row[repsCol]) : null;
    const reps = repsRaw != null && !isNaN(repsRaw) && repsRaw > 0 ? Math.round(repsRaw) : null;
    const durationRaw = durationCol !== -1 ? Number(row[durationCol]) : null;
    const durationSec =
      durationRaw != null && !isNaN(durationRaw) && durationRaw > 0 ? Math.round(durationRaw) : null;
    const notes = notesCol !== -1 ? row[notesCol]?.trim() || null : null;

    if (reps == null && durationSec == null) continue;

    exerciseEntry.sets.push({ reps, weightKg, durationSec, notes });
  }

  return Array.from(sessionsByKey.values()).sort((a, b) => a.date.getTime() - b.date.getTime());
}

export { guessFocus };
