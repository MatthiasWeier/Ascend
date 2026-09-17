"use client";

import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";

type Point = { date: string; volumeKg: number };

const chartConfig = {
  volumeKg: { label: "Volumen", color: "var(--chart-1)" },
} satisfies ChartConfig;

export function VolumeChart() {
  const [points, setPoints] = useState<Point[] | null>(null);

  useEffect(() => {
    fetch("/api/analytics/volume?days=90")
      .then((r) => r.json())
      .then((data: { points: Point[] }) => setPoints(data.points));
  }, []);

  if (points == null) return <Skeleton className="h-64 w-full" />;

  if (points.length === 0) {
    return (
      <p className="flex h-64 items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted-foreground">
        Noch keine Reps-Workouts in den letzten 90 Tagen.
      </p>
    );
  }

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
          tickFormatter={(v) => new Date(v).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" })}
        />
        <YAxis tickLine={false} axisLine={false} tickMargin={8} width={48} />
        <ChartTooltip
          content={
            <ChartTooltipContent
              labelFormatter={(v) => new Date(v).toLocaleDateString("de-DE")}
              formatter={(value) => [`${value} kg`, "Volumen"]}
            />
          }
        />
        <Bar dataKey="volumeKg" fill="var(--color-volumeKg)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ChartContainer>
  );
}
