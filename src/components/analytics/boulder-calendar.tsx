"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Mountain } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { BoulderDayDialog } from "@/components/analytics/boulder-day-dialog";
import { ClimbingMeetupDayDialog } from "@/components/analytics/climbing-meetup-day-dialog";
import { useLocale } from "@/components/locale-provider";

const WEEKDAYS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

export function BoulderCalendar() {
  const { t, dateLocale } = useLocale();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1); // 1-12
  const [markedDays, setMarkedDays] = useState<Set<string>>(new Set());
  const [meetupDays, setMeetupDays] = useState<Set<string>>(new Set());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  function refetch() {
    fetch(`/api/climbing-sends?year=${year}&month=${month}`)
      .then((r) => r.json())
      .then((data: { markedDays: string[] }) => setMarkedDays(new Set(data.markedDays)));
    fetch(`/api/climbing-meetups?year=${year}&month=${month}`)
      .then((r) => r.json())
      .then((data: { markedDays: string[] }) => setMeetupDays(new Set(data.markedDays)));
  }

  useEffect(refetch, [year, month]);

  function changeMonth(delta: number) {
    let m = month + delta;
    let y = year;
    if (m < 1) { m = 12; y -= 1; }
    if (m > 12) { m = 1; y += 1; }
    setMonth(m);
    setYear(y);
  }

  const firstOfMonth = new Date(Date.UTC(year, month - 1, 1));
  const startWeekday = (firstOfMonth.getUTCDay() + 6) % 7; // Mon=0
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();

  const cells: (number | null)[] = [
    ...Array(startWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const todayKey = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  // Today counts as "future" for planning purposes - you can still invite
  // people to climb later today.
  const isFuture = (dateKey: string) => dateKey >= todayKey;
  const selectedIsFuture = selectedDate != null && isFuture(selectedDate);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="icon-sm" onClick={() => changeMonth(-1)}>
          <ChevronLeft className="size-4" />
        </Button>
        <span className="text-sm font-medium">
          {new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString(dateLocale, {
            month: "long",
            year: "numeric",
            timeZone: "UTC",
          })}
        </span>
        <Button variant="ghost" size="icon-sm" onClick={() => changeMonth(1)}>
          <ChevronRight className="size-4" />
        </Button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-muted-foreground">
        {WEEKDAYS.map((d) => (
          <div key={d}>{t(d)}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (day == null) return <div key={i} />;
          const dateKey = `${year}-${pad(month)}-${pad(day)}`;
          const marked = markedDays.has(dateKey);
          const hasMeetup = meetupDays.has(dateKey);
          const isToday = dateKey === todayKey;
          const future = isFuture(dateKey);
          const label = future
            ? hasMeetup
              ? t("Klettertag geplant - klicken für Details")
              : t("Klicken, um einen Klettertag zu planen")
            : marked
              ? t("Klettertag eingetragen - klicken zum Bearbeiten")
              : t("Klicken, um einen Klettertag einzutragen");
          return (
            <button
              key={i}
              type="button"
              title={`${new Date(dateKey).toLocaleDateString(dateLocale, { weekday: "short", day: "2-digit", month: "short", timeZone: "UTC" })}: ${label}`}
              aria-label={`${dateKey}: ${label}`}
              onClick={() => setSelectedDate(dateKey)}
              className={cn(
                "flex aspect-square flex-col items-center justify-center gap-0.5 rounded-lg text-sm transition-colors hover:bg-accent",
                isToday && "font-semibold text-primary",
                future && hasMeetup && "bg-emerald-500/15 ring-1 ring-emerald-500/50 hover:bg-emerald-500/25"
              )}
            >
              {day}
              {future && hasMeetup ? (
                <Mountain className="size-3 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <span className={cn("size-1.5 rounded-full", marked ? "bg-primary" : "bg-transparent")} />
              )}
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <Mountain className="size-3 text-emerald-600 dark:text-emerald-400" />
        {t("Klettern - geplant")}
      </div>

      {selectedDate &&
        (selectedIsFuture ? (
          <ClimbingMeetupDayDialog
            dateKey={selectedDate}
            open={!!selectedDate}
            onOpenChange={(open) => !open && setSelectedDate(null)}
            onChanged={refetch}
          />
        ) : (
          <BoulderDayDialog
            date={selectedDate}
            open={!!selectedDate}
            onOpenChange={(open) => !open && setSelectedDate(null)}
            onSaved={refetch}
          />
        ))}
    </div>
  );
}
