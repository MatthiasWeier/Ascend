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

const weekdayFormatter = new Intl.DateTimeFormat("en-US", { timeZone: BERLIN_TZ, weekday: "short" });
const WEEKDAY_INDEX: Record<string, number> = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };

// Midnight (UTC) of the Monday starting the Europe/Berlin calendar week
// containing `date` - same day-boundary approximation used elsewhere in
// analytics (calendar-day math via UTC, not true Berlin midnight).
export function mondayOfGermanWeek(date: Date = new Date()): Date {
  const monday = new Date(`${germanDateKey(date)}T00:00:00.000Z`);
  const weekday = WEEKDAY_INDEX[weekdayFormatter.format(date)];
  monday.setUTCDate(monday.getUTCDate() - weekday);
  return monday;
}
