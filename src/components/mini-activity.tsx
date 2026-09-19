import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { VIZ_SEQUENTIAL } from "@/lib/viz-colors";
import { getT } from "@/lib/i18n/server";

const WEEKS = 12;
const LEVEL_COLORS = ["var(--muted)", VIZ_SEQUENTIAL[1], VIZ_SEQUENTIAL[2], VIZ_SEQUENTIAL[3], VIZ_SEQUENTIAL[4]];

function isoDay(d: Date) {
  return d.toISOString().slice(0, 10);
}

// Compact "last 12 weeks" heatmap for the desktop side column - the full
// year calendar lives in Analytics.
export async function MiniActivity({
  sessions,
}: {
  sessions: { date: Date; sets: number }[];
}) {
  const { t } = await getT();

  const setsByDay = new Map<string, number>();
  for (const s of sessions) setsByDay.set(isoDay(s.date), (setsByDay.get(isoDay(s.date)) ?? 0) + s.sets);
  const max = Math.max(1, ...setsByDay.values());

  // Grid ends on the Sunday of the current week, starts WEEKS weeks earlier
  // on a Monday - columns are weeks, rows Mon..Sun.
  const today = new Date();
  const end = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
  end.setUTCDate(end.getUTCDate() + (6 - ((end.getUTCDay() + 6) % 7)));
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - WEEKS * 7 + 1);

  const weeks: { date: string; sets: number; future: boolean }[][] = [];
  const cursor = new Date(start);
  const todayKey = isoDay(new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())));
  for (let w = 0; w < WEEKS; w++) {
    const week = [];
    for (let d = 0; d < 7; d++) {
      const key = isoDay(cursor);
      week.push({ date: key, sets: setsByDay.get(key) ?? 0, future: key > todayKey });
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    weeks.push(week);
  }

  const trainingDays = Array.from(setsByDay.values()).filter((n) => n > 0).length;

  return (
    <Link
      href="/dashboard/analytics"
      className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:bg-accent/40"
    >
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2 text-sm font-semibold">
          <CalendarDays className="size-4 text-primary" />
          {t("Aktivität")}
        </span>
        <span className="text-xs text-muted-foreground">
          {t("{n} Trainingstage in {w} Wochen", { n: trainingDays, w: WEEKS })}
        </span>
      </div>
      <div className="flex justify-between gap-1">
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-1">
            {week.map((day) => {
              const level = day.sets <= 0 ? 0 : Math.min(4, Math.max(1, Math.ceil((day.sets / max) * 4)));
              return (
                <div
                  key={day.date}
                  title={`${day.date}${day.sets > 0 ? `: ${t("{n} Sätze", { n: day.sets })}` : ""}`}
                  className="size-4 rounded-[3px]"
                  style={{ backgroundColor: day.future ? "transparent" : LEVEL_COLORS[level] }}
                />
              );
            })}
          </div>
        ))}
      </div>
    </Link>
  );
}
