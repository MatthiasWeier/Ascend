"use client";

import { useEffect, useMemo, useState } from "react";
import { Line, LineChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { TrendingUp, TrendingDown } from "lucide-react";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { VIZ_DELTA_GOOD, VIZ_DELTA_BAD } from "@/lib/viz-colors";

type Exercise = { id: string; name: string; type: "REPS" | "HOLD" };
type Point = { date: string; oneRepMax: number };

const chartConfig = {
  oneRepMax: { label: "Geschätztes 1RM", color: "var(--chart-1)" },
} satisfies ChartConfig;

export function OneRmChart() {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [exerciseId, setExerciseId] = useState<string>("");
  const [points, setPoints] = useState<Point[] | null>(null);

  useEffect(() => {
    fetch("/api/exercises")
      .then((r) => r.json())
      .then((data: { exercises: Exercise[] }) => {
        const repsExercises = data.exercises.filter((e) => e.type === "REPS");
        setExercises(repsExercises);
        if (repsExercises.length > 0) setExerciseId(repsExercises[0].id);
      });
  }, []);

  useEffect(() => {
    if (!exerciseId) return;
    setPoints(null);
    fetch(`/api/analytics/1rm?exerciseId=${exerciseId}`)
      .then((r) => r.json())
      .then((data: { points: Point[] }) => setPoints(data.points));
  }, [exerciseId]);

  const delta = useMemo(() => {
    if (!points || points.length < 2) return null;
    return points[points.length - 1].oneRepMax - points[0].oneRepMax;
  }, [points]);

  return (
    <div className="flex flex-col gap-4">
      <Select value={exerciseId} onValueChange={(v) => setExerciseId(v as string)}>
        <SelectTrigger className="w-full sm:w-64">
          <SelectValue placeholder="Übung wählen" />
        </SelectTrigger>
        <SelectContent>
          {exercises.map((ex) => (
            <SelectItem key={ex.id} value={ex.id}>
              {ex.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {points == null ? (
        <Skeleton className="h-64 w-full" />
      ) : points.length < 2 ? (
        <p className="flex h-64 items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted-foreground">
          Noch zu wenig Daten für diese Übung — trag mindestens 2 Workouts ein.
        </p>
      ) : (
        <>
          {delta != null && (
            <div
              className="flex w-fit items-center gap-1.5 text-sm font-medium"
              style={{ color: delta >= 0 ? VIZ_DELTA_GOOD.light : VIZ_DELTA_BAD }}
            >
              {delta >= 0 ? <TrendingUp className="size-4" /> : <TrendingDown className="size-4" />}
              {delta >= 0 ? "+" : ""}
              {delta.toFixed(1)} kg geschätztes 1RM seit erstem Eintrag
            </div>
          )}
          <ChartContainer config={chartConfig} className="aspect-auto h-64 w-full">
            <LineChart data={points} margin={{ left: 8, right: 8 }}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={(v) => new Date(v).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" })}
              />
              <YAxis tickLine={false} axisLine={false} tickMargin={8} width={40} />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    labelFormatter={(v) => new Date(v).toLocaleDateString("de-DE")}
                    formatter={(value) => [`${value} kg`, "1RM"]}
                  />
                }
              />
              <Line
                type="monotone"
                dataKey="oneRepMax"
                stroke="var(--color-oneRepMax)"
                strokeWidth={2}
                dot={{ r: 3, fill: "var(--color-oneRepMax)" }}
              />
            </LineChart>
          </ChartContainer>
        </>
      )}
    </div>
  );
}
