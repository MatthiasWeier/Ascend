const BERLIN_TZ = "Europe/Berlin";

const dateKeyFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: BERLIN_TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

// "Today" (or any instant) as a Europe/Berlin calendar day, e.g. "2026-09-17".
// en-CA locale formats as YYYY-MM-DD directly, no string surgery needed.
export function germanDateKey(date: Date = new Date()): string {
  return dateKeyFormatter.format(date);
}

export function todayGermanDateKey(): string {
  return germanDateKey(new Date());
}
