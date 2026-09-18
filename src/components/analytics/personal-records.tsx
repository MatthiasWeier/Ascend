"use client";

import { useEffect, useState } from "react";
import { Trophy } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { FOCUS_LABEL } from "@/lib/muscle-focus";
import type { MuscleFocus } from "@prisma/client";

type Record = {
  exerciseId: string;
  exerciseName: string;
  focus: MuscleFocus;
  type: "REPS" | "HOLD";
  bestValue: number;
  achievedAt: string;
};

export function PersonalRecords() {
  const [records, setRecords] = useState<Record[] | null>(null);

  useEffect(() => {
    fetch("/api/analytics/records")
      .then((r) => r.json())
      .then((data: { records: Record[] }) => setRecords(data.records));
  }, []);

  if (records == null) return <Skeleton className="h-64 w-full" />;

  if (records.length === 0) {
    return (
      <p className="flex h-32 items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted-foreground">
        Noch keine Rekorde - leg los!
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      {records.map((r) => (
        <div
          key={r.exerciseId}
          className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2"
        >
          <Trophy className="size-4 shrink-0 text-amber-500" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{r.exerciseName}</p>
            <p className="text-xs text-muted-foreground">
              {new Date(r.achievedAt).toLocaleDateString("de-DE", { day: "2-digit", month: "short", year: "numeric" })}
            </p>
          </div>
          <Badge variant="secondary" className="shrink-0 text-[10px]">
            {FOCUS_LABEL[r.focus]}
          </Badge>
          <span className="shrink-0 font-mono text-sm tabular-nums">
            {r.type === "HOLD" ? `${r.bestValue}s` : `${Math.round(r.bestValue)} kg·1RM`}
          </span>
        </div>
      ))}
    </div>
  );
}
