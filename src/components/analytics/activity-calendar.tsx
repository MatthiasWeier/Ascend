"use client";

import { useEffect, useMemo, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { VIZ_SEQUENTIAL } from "@/lib/viz-colors";

type Day = { date: string; intensity: number };

const LEVEL_COLORS = [
  "var(--muted)",
  VIZ_SEQUENTIAL[1],
  VIZ_SEQUENTIAL[2],
  VIZ_SEQUENTIAL[3],
  VIZ_SEQUENTIAL[4],
];

const MONTH_LABELS = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];
const WEEKDAY_LABELS = ["Mo", "", "Mi", "", "Fr", "", ""];

function toIsoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

export function ActivityCalendar() {
  const [year] = useState(new Date().getFullYear());
  const [days, setDays] = useState<Day[] | null>(null);

  useEffect(() => {
    fetch(`/api/analytics/calendar?year=${year}`)
      .then((r) => r.json())
      .then((data: { days: Day[] }) => setDays(data.days));
  }, [year]);

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
    let cursor = new Date(start);
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
  }, [days, year]);

  if (days == null) return <Skeleton className="h-40 w-full" />;

  function levelFor(intensity: number) {
    if (intensity <= 0) return 0;
    const level = Math.ceil((intensity / maxIntensity) * 4);
    return Math.min(4, Math.max(1, level));
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-x-auto pb-2">
        <div className="relative w-fit">
          <div className="mb-1 flex text-[10px] text-muted-foreground" style={{ paddingLeft: 20 }}>
            {monthMarkers.map((m, i) => (
              <span
                key={i}
                className="absolute"
                style={{ left: m.weekIndex * 13 + 20 }}
              >
                {m.label}
              </span>
            ))}
          </div>
          <div className="flex gap-[3px] pt-4">
            <div className="flex flex-col gap-[3px] pr-1 text-[10px] text-muted-foreground">
              {WEEKDAY_LABELS.map((l, i) => (
                <div key={i} className="flex h-[10px] items-center">
                  {l}
                </div>
              ))}
            </div>
            {weeks.map((week, wi) => (
              <div key={wi} className="flex flex-col gap-[3px]">
                {week.map((day, di) => (
                  <div
                    key={di}
                    title={`${day.date}: ${day.inYear ? `Intensität ${day.intensity}` : ""}`}
                    className="size-[10px] rounded-[2px]"
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
        Weniger
        {LEVEL_COLORS.map((c, i) => (
          <div key={i} className="size-[10px] rounded-[2px]" style={{ backgroundColor: c }} />
        ))}
        Mehr
      </div>
    </div>
  );
}
