"use client";

import { useEffect, useState } from "react";
import {
  Radar,
  RadarChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
import { VIZ_CATEGORICAL } from "@/lib/viz-colors";

type FocusDatum = { focus: string; label: string; actualPercent: number; goalPercent: number | null };

const chartConfig = {
  actualPercent: { label: "Aktuell", theme: VIZ_CATEGORICAL.actual },
  goalPercent: { label: "Ziel", theme: VIZ_CATEGORICAL.goal },
} satisfies ChartConfig;

export function BalanceRadar() {
  const [data, setData] = useState<FocusDatum[] | null>(null);
  const [hasGoals, setHasGoals] = useState(false);

  useEffect(() => {
    fetch("/api/analytics/balance")
      .then((r) => r.json())
      .then((res: { data: FocusDatum[]; hasGoals: boolean }) => {
        setData(res.data);
        setHasGoals(res.hasGoals);
      });
  }, []);

  if (data == null) return <Skeleton className="h-72 w-full" />;

  const total = data.reduce((a, d) => a + d.actualPercent, 0);
  if (total === 0) {
    return (
      <p className="flex h-72 items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted-foreground">
        Noch keine Daten für die Balance-Analyse.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <ChartContainer config={chartConfig} className="aspect-square h-72 w-full">
        <RadarChart data={data}>
          <ChartTooltip content={<ChartTooltipContent />} />
          <PolarAngleAxis dataKey="label" tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} />
          <PolarGrid />
          <PolarRadiusAxis angle={90} tick={false} axisLine={false} />
          <Radar
            name="Aktuell"
            dataKey="actualPercent"
            stroke="var(--color-actualPercent)"
            fill="var(--color-actualPercent)"
            fillOpacity={0.35}
          />
          {hasGoals && (
            <Radar
              name="Ziel"
              dataKey="goalPercent"
              stroke="var(--color-goalPercent)"
              fill="var(--color-goalPercent)"
              fillOpacity={0.15}
              strokeDasharray="4 3"
            />
          )}
          {hasGoals && <ChartLegend content={<ChartLegendContent />} />}
        </RadarChart>
      </ChartContainer>
      {!hasGoals && (
        <p className="text-center text-xs text-muted-foreground">
          Noch keine Ziel-Balance gesetzt — unter Einstellungen konfigurierbar.
        </p>
      )}
    </div>
  );
}
