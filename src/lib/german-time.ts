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

// 0 (Monday) .. 6 (Sunday) for the Europe/Berlin calendar day of `date` -
// same indexing WorkoutReminder.weekday uses.
export function germanWeekday(date: Date = new Date()): number {
  return WEEKDAY_INDEX[weekdayFormatter.format(date)];
}

const timeFormatter = new Intl.DateTimeFormat("en-GB", { timeZone: BERLIN_TZ, hour: "2-digit", minute: "2-digit", hour12: false });

// "HH:MM" wall-clock time in Europe/Berlin, e.g. "18:05".
export function germanTime(date: Date = new Date()): string {
  return timeFormatter.format(date);
}

// The scheduler's reminder math is all done on Berlin wall-clock
// "dateKey"/"HH:MM" strings, never on real UTC instants - that sidesteps
// DST entirely (no instant conversion needed), matching the day-boundary
// approximation already used elsewhere here. Comparing (dateKey, time)
// pairs lexicographically gives correct chronological order.
export function wallClockAtOrAfter(nowKey: string, nowTime: string, targetKey: string, targetTime: string): boolean {
  return nowKey > targetKey || (nowKey === targetKey && nowTime >= targetTime);
}

// Subtracts `minutes` from a Berlin wall-clock (dateKey, "HH:MM"),
// rolling the calendar day back as needed - pure calendar arithmetic, no
// timezone conversion.
export function subtractMinutesFromWallClock(dateKey: string, time: string, minutes: number): { dateKey: string; time: string } {
  const [h, m] = time.split(":").map(Number);
  let totalMinutes = h * 60 + m - minutes;
  let dayShift = 0;
  while (totalMinutes < 0) {
    totalMinutes += 24 * 60;
    dayShift -= 1;
  }
  const day = new Date(`${dateKey}T12:00:00.000Z`); // noon UTC - clear of any DST-edge date-shifting
  day.setUTCDate(day.getUTCDate() + dayShift);
  const newHh = String(Math.floor(totalMinutes / 60)).padStart(2, "0");
  const newMm = String(totalMinutes % 60).padStart(2, "0");
  return { dateKey: germanDateKey(day), time: `${newHh}:${newMm}` };
}
