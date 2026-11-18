"use client";

import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
import { useWeightUnit } from "@/components/weight-unit-context";
import { useLocale } from "@/components/locale-provider";
import { EmptyChart } from "@/components/analytics/empty-chart";

type Point = { date: string; volumeKg: number };

export function VolumeChart() {
  const { t, dateLocale } = useLocale();
  const chartConfig = {
    volumeKg: { label: t("Volume"), color: "var(--chart-1)" },
  } satisfies ChartConfig;
  const [rawPoints, setRawPoints] = useState<Point[] | null>(null);
  const { toDisplay, unitLabel } = useWeightUnit();

  useEffect(() => {
    fetch("/api/analytics/volume?days=90")
      .then((r) => r.json())
      .then((data: { points: Point[] }) => setRawPoints(data.points));
  }, []);

  if (rawPoints == null) return <Skeleton className="h-64 w-full" />;

  if (rawPoints.length === 0) {
    return (
      <EmptyChart variant="bars" message={t("No rep-based workouts in the last 90 days.")} />
    );
  }

  const points = rawPoints.map((p) => ({ ...p, volumeKg: Math.round(toDisplay(p.volumeKg)) }));

  return (
    <ChartContainer config={chartConfig} className="aspect-auto h-64 w-full">
      <BarChart data={points} margin={{ left: 8, right: 8 }}>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="date"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          minTickGap={24}
          tickFormatter={(v) => new Date(v).toLocaleDateString(dateLocale, { day: "2-digit", month: "2-digit" })}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          width={72}
          label={{ value: `${t("Volume")} (${unitLabel})`, angle: -90, position: "insideLeft", offset: 4, style: { textAnchor: "middle" }, fill: "var(--muted-foreground)", fontSize: 11 }}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              labelFormatter={(v) => new Date(v).toLocaleDateString(dateLocale)}
              formatter={(value) => [`${value} ${unitLabel}`, t("Volume")]}
            />
          }
        />
        <Bar dataKey="volumeKg" fill="var(--color-volumeKg)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ChartContainer>
  );
}
