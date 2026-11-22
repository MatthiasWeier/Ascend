"use client";

import { useEffect, useMemo, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { WorkoutSessionCard } from "@/components/workout-session-card";
import { useLocale } from "@/components/locale-provider";
import { cn } from "@/lib/utils";

type Day = { date: string; intensity: number };

type DaySession = {
  id: string;
  date: string;
  notes: string | null;
  perceivedExertion: number | null;
  skinCondition: number | null;
  photos?: { id: string }[];
  sets: {
    id: string;
    reps: number | null;
    weightKg: number | null;
    durationSec: number | null;
    distanceMeters: number | null;
    exercise: { name: string; focus: "PUSH" | "PULL" | "LEGS" | "CORE" | "GRIP" };
  }[];
};

const LEVEL_COLORS = ["var(--muted)", "var(--heat-1)", "var(--heat-2)", "var(--heat-3)", "var(--heat-4)"];

// Month/weekday labels come from the active locale inside the component.

function toIsoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

export function ActivityCalendar({
  daysUrl = (year: number) => `/api/analytics/calendar?year=${year}`,
  sessionsUrl = (date: string) => `/api/workouts/by-date?date=${date}`,
  editable = true,
}: {
  daysUrl?: (year: number) => string;
  sessionsUrl?: (date: string) => string;
  editable?: boolean;
} = {}) {
  const { t, dateLocale } = useLocale();
  const MONTH_LABELS = Array.from({ length: 12 }, (_, m) =>
    new Date(Date.UTC(2024, m, 1)).toLocaleDateString(dateLocale, { month: "short", timeZone: "UTC" })
  );
  const WEEKDAY_LABELS = [t("Mon"), "", t("Wed"), "", t("Fri"), "", ""];
  const [year] = useState(new Date().getFullYear());
  const [days, setDays] = useState<Day[] | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [daySessions, setDaySessions] = useState<DaySession[] | null>(null);
  const [tip, setTip] = useState<{ date: string; intensity: number; x: number; y: number } | null>(null);

  function showTip(el: HTMLElement, day: { date: string; intensity: number }) {
    const r = el.getBoundingClientRect();
    setTip({ date: day.date, intensity: day.intensity, x: r.left + r.width / 2, y: r.top });
  }

  useEffect(() => {
    setDays(null);
    fetch(daysUrl(year))
      .then((r) => r.json())
      .then((data: { days: Day[] }) => setDays(data.days));
    // daysUrl is treated as static config, not reactive state - including
    // it would refetch every render since callers typically pass an inline
    // function (a fresh reference each time).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year]);

  function openDay(date: string) {
    setSelectedDate(date);
    setDaySessions(null);
    fetch(sessionsUrl(date))
      .then((r) => r.json())
      .then((data: { sessions: DaySession[] }) => setDaySessions(data.sessions));
  }

  const { weeks, maxIntensity, monthMarkers } = useMemo(() => {
    const intensityByDay = new Map((days ?? []).map((d) => [d.date, d.intensity]));
    const max = Math.max(1, ...(days ?? []).map((d) => d.intensity));

    const start = new Date(Date.UTC(year, 0, 1));
    // Shift to the Monday on/before Jan 1 so the grid starts on a full week.
    const startWeekday = (start.getUTCDay() + 6) % 7;
    start.setUTCDate(start.getUTCDate() - startWeekday);

    const end = new Date(Date.UTC(year, 11, 31));

    const weeks: { date: string; intensity: number; inYear: boolean }[][] = [];
    const monthMarkers: { weekIndex: number; label: string }[] = [];
    const cursor = new Date(start);
    let weekIndex = 0;
    let lastMonth = -1;

    while (cursor <= end) {
      const week: { date: string; intensity: number; inYear: boolean }[] = [];
      for (let i = 0; i < 7; i++) {
        const iso = toIsoDate(cursor);
        const inYear = cursor.getUTCFullYear() === year;
        if (inYear && cursor.getUTCMonth() !== lastMonth && cursor.getUTCDate() <= 7) {
          monthMarkers.push({ weekIndex, label: MONTH_LABELS[cursor.getUTCMonth()] });
          lastMonth = cursor.getUTCMonth();
        }
        week.push({ date: iso, intensity: intensityByDay.get(iso) ?? 0, inYear });
        cursor.setUTCDate(cursor.getUTCDate() + 1);
      }
      weeks.push(week);
      weekIndex++;
    }

    return { weeks, maxIntensity: max, monthMarkers };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days, year, dateLocale]);

  if (days == null) return <Skeleton className="h-40 w-full" />;

  function levelFor(intensity: number) {
    if (intensity <= 0) return 0;
    const level = Math.ceil((intensity / maxIntensity) * 4);
    return Math.min(4, Math.max(1, level));
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="max-w-full overflow-x-auto pb-2">
        <div className="relative w-fit">
          <div className="mb-1 flex text-[10px] text-muted-foreground" style={{ paddingLeft: 20 }}>
            {monthMarkers.map((m, i) => (
              <span
                key={i}
                className="absolute"
                style={{ left: m.weekIndex * 16 + 20 }}
              >
                {m.label}
              </span>
            ))}
          </div>
          <div className="flex gap-[3px] pt-4">
            <div className="flex flex-col gap-[3px] pr-1 text-[10px] text-muted-foreground">
              {WEEKDAY_LABELS.map((l, i) => (
                <div key={i} className="flex h-[13px] items-center">
                  {l}
                </div>
              ))}
            </div>
            {weeks.map((week, wi) => (
              <div key={wi} className="flex flex-col gap-[3px]">
                {week.map((day, di) => (
                  <button
                    key={di}
                    type="button"
                    tabIndex={day.inYear ? 0 : -1}
                    aria-label={day.inYear ? `${day.date}: ${day.intensity > 0 ? t("Intensity {n}", { n: day.intensity }) : t("No workout")}` : undefined}
                    onMouseEnter={(e) => day.inYear && showTip(e.currentTarget, day)}
                    onFocus={(e) => day.inYear && showTip(e.currentTarget, day)}
                    onMouseLeave={() => setTip(null)}
                    onBlur={() => setTip(null)}
                    onClick={() => day.inYear && day.intensity > 0 && openDay(day.date)}
                    className={cn(
                      "size-[13px] rounded-[3px] hover:ring-1 hover:ring-foreground/50",
                      day.inYear && day.intensity > 0 ? "cursor-pointer" : "cursor-default"
                    )}
                    style={{
                      backgroundColor: day.inYear ? LEVEL_COLORS[levelFor(day.intensity)] : "transparent",
                    }}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        {t("Less")}
        {LEVEL_COLORS.map((c, i) => (
          <div key={i} className="size-[10px] rounded-[2px]" style={{ backgroundColor: c }} />
        ))}
        {t("More")}
      </div>

      {tip && (
        <div
          role="tooltip"
          className="pointer-events-none fixed z-50 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-md bg-popover px-2.5 py-1.5 text-xs text-popover-foreground shadow-md ring-1 ring-foreground/10"
          style={{ left: tip.x, top: tip.y - 6 }}
        >
          <p className="font-medium">
            {new Date(`${tip.date}T00:00:00.000Z`).toLocaleDateString(dateLocale, {
              weekday: "short",
              day: "2-digit",
              month: "short",
              year: "numeric",
              timeZone: "UTC",
            })}
          </p>
          <p className="text-muted-foreground">
            {tip.intensity > 0 ? t("Intensity {n}", { n: tip.intensity }) : t("No workout")}
          </p>
        </div>
      )}

      <Dialog open={selectedDate != null} onOpenChange={(open) => !open && setSelectedDate(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedDate &&
                new Date(`${selectedDate}T00:00:00.000Z`).toLocaleDateString(dateLocale, {
                  weekday: "long",
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                  timeZone: "UTC",
                })}
            </DialogTitle>
          </DialogHeader>
          {daySessions == null ? (
            <Skeleton className="h-32 w-full" />
          ) : daySessions.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("No workout on this day.")}</p>
          ) : (
            <div className="flex max-h-96 flex-col gap-3 overflow-y-auto">
              {daySessions.map((s) => (
                <WorkoutSessionCard
                  key={s.id}
                  sessionId={editable ? s.id : undefined}
                  date={s.date}
                  notes={s.notes}
                  perceivedExertion={s.perceivedExertion}
                  skinCondition={s.skinCondition}
                  sets={s.sets}
                  photos={s.photos}
                  onDeleted={() => selectedDate && openDay(selectedDate)}
                />
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
