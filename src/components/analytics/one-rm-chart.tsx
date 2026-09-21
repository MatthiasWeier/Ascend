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
import { Badge } from "@/components/ui/badge";
import { Scale } from "lucide-react";
import { VIZ_DELTA_GOOD, VIZ_DELTA_BAD } from "@/lib/viz-colors";
import { useWeightUnit } from "@/components/weight-unit-context";
import { useLocale } from "@/components/locale-provider";
import { EmptyChart } from "@/components/analytics/empty-chart";

type Exercise = { id: string; name: string; type: "REPS" | "HOLD"; isBodyweight: boolean };
type Point = { date: string; oneRepMax: number };

export function OneRmChart() {
  const { t, dateLocale } = useLocale();
  const chartConfig = {
    oneRepMax: { label: t("Geschätztes 1RM"), color: "var(--chart-1)" },
  } satisfies ChartConfig;
  const [exercises, setExercises] = useState<Exercise[] | null>(null);
  const [exerciseId, setExerciseId] = useState<string>("");
  const [rawPoints, setRawPoints] = useState<Point[] | null>(null);
  const { toDisplay, unitLabel } = useWeightUnit();

  useEffect(() => {
    fetch("/api/analytics/1rm?list=1")
      .then((r) => r.json())
      .then((data: { exercises: Exercise[] }) => {
        setExercises(data.exercises);
        // Most-trained exercise first - show its graph right away.
        if (data.exercises.length > 0) setExerciseId(data.exercises[0].id);
      });
  }, []);

  useEffect(() => {
    if (!exerciseId) return;
    setRawPoints(null);
    fetch(`/api/analytics/1rm?exerciseId=${exerciseId}`)
      .then((r) => r.json())
      .then((data: { points: Point[] }) => setRawPoints(data.points));
  }, [exerciseId]);

  const points = useMemo(
    () => rawPoints?.map((p) => ({ ...p, oneRepMax: Math.round(toDisplay(p.oneRepMax) * 10) / 10 })) ?? null,
    [rawPoints, toDisplay]
  );

  const delta = useMemo(() => {
    if (!points || points.length < 2) return null;
    return points[points.length - 1].oneRepMax - points[0].oneRepMax;
  }, [points]);

  const selectedExercise = exercises?.find((e) => e.id === exerciseId);

  if (exercises != null && exercises.length === 0) {
    return <EmptyChart message={t("Trage dein erstes Workout ein, um hier deinen Fortschritt zu sehen.")} />;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
      <Select
        value={exerciseId}
        onValueChange={(v) => setExerciseId(v as string)}
        items={(exercises ?? []).map((ex) => ({ value: ex.id, label: ex.name }))}
      >
        <SelectTrigger className="w-full sm:w-64">
          <SelectValue placeholder={t("Übung wählen")} />
        </SelectTrigger>
        <SelectContent>
          {(exercises ?? []).map((ex) => (
            <SelectItem key={ex.id} value={ex.id}>
              {ex.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {selectedExercise?.isBodyweight && (
        <Badge variant="secondary" className="gap-1">
          <Scale className="size-3" />
          {t("Bodyweight-adjustiert")}
        </Badge>
      )}
      </div>

      {!exerciseId ? (
        <p className="flex h-64 items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted-foreground">
          {t("Wähl eine Übung, um ihren Verlauf zu sehen.")}
        </p>
      ) : points == null ? (
        <Skeleton className="h-64 w-full" />
      ) : points.length < 2 ? (
        <p className="flex h-64 items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted-foreground">
          {t("Noch zu wenig Daten für diese Übung — trag mindestens 2 Workouts ein.")}
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
              {t("{delta} {unit} geschätztes 1RM seit erstem Eintrag", { delta: delta.toFixed(1), unit: unitLabel })}
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
                minTickGap={28}
                tickFormatter={(v) => new Date(v).toLocaleDateString(dateLocale, { day: "2-digit", month: "2-digit" })}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                width={64}
                label={{ value: `${t("Geschätztes 1RM")} (${unitLabel})`, angle: -90, position: "insideLeft", offset: 4, style: { textAnchor: "middle" }, fill: "var(--muted-foreground)", fontSize: 11 }}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    labelFormatter={(v) => new Date(v).toLocaleDateString(dateLocale)}
                    formatter={(value) => [`${value} ${unitLabel}`, "1RM"]}
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
