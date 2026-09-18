"use client";

import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import type { MuscleFocus } from "@prisma/client";

type WeeklySet = { focus: MuscleFocus; label: string; count: number };

export function WeeklySets() {
  const [data, setData] = useState<WeeklySet[] | null>(null);

  useEffect(() => {
    fetch("/api/analytics/weekly-sets")
      .then((r) => r.json())
      .then((res: { data: WeeklySet[] }) => setData(res.data));
  }, []);

  if (data == null) return <Skeleton className="h-32 w-full" />;

  const max = Math.max(1, ...data.map((d) => d.count));

  return (
    <div className="flex flex-col gap-3">
      {data.map((d) => (
        <div key={d.focus} className="flex flex-col gap-1">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{d.label}</span>
            <span className="font-medium tabular-nums">{d.count} Sätze</span>
          </div>
          <Progress value={Math.round((d.count / max) * 100)} />
        </div>
      ))}
    </div>
  );
}
