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
import { useT } from "@/components/locale-provider";
import { EmptyChart } from "@/components/analytics/empty-chart";

type FocusDatum = { focus: string; label: string; actualPercent: number; goalPercent: number | null };

export function BalanceRadar() {
  const t = useT();
  const chartConfig = {
    actualPercent: { label: t("Aktuell"), theme: VIZ_CATEGORICAL.actual },
    goalPercent: { label: t("Ziel"), theme: VIZ_CATEGORICAL.goal },
  } satisfies ChartConfig;
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
      <EmptyChart className="h-72" message={t("Noch keine Daten für die Balance-Analyse.")} />
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <ChartContainer config={chartConfig} className="aspect-square h-72 w-full">
        <RadarChart data={data.map((d) => ({ ...d, label: t(d.label) }))}>
          <ChartTooltip
            content={<ChartTooltipContent formatter={(value, name) => [`${Math.round(Number(value))} %`, String(name)]} />}
          />
          <PolarAngleAxis dataKey="label" tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} />
          <PolarGrid />
          <PolarRadiusAxis angle={90} tick={false} axisLine={false} />
          <Radar
            name={t("Aktuell")}
            dataKey="actualPercent"
            stroke="var(--color-actualPercent)"
            fill="var(--color-actualPercent)"
            fillOpacity={0.35}
          />
          {hasGoals && (
            <Radar
              name={t("Ziel")}
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
          {t("Noch keine Ziel-Balance gesetzt — unter Einstellungen konfigurierbar.")}
        </p>
      )}
    </div>
  );
}
