"use client";

import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Cell, LabelList } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { VIZ_ORDINAL } from "@/lib/viz-colors";
import { AddClimbingSendDialog } from "@/components/analytics/add-climbing-send-dialog";
import { EmptyChart } from "@/components/analytics/empty-chart";
import { useT } from "@/components/locale-provider";

type GradeDatum = { grade: string; count: number; rank: number };

export function ClimbingPyramid() {
  const t = useT();
  const chartConfig = {
    count: { label: t("Anzahl") },
  } satisfies ChartConfig;
  const [style, setStyle] = useState<"BOULDER" | "ROUTE">("BOULDER");
  const [grades, setGrades] = useState<GradeDatum[] | null>(null);

  function refetch() {
    setGrades(null);
    fetch(`/api/analytics/climbing?style=${style}`)
      .then((r) => r.json())
      .then((data: { grades: GradeDatum[] }) => setGrades(data.grades));
  }

  useEffect(refetch, [style]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <Tabs value={style} onValueChange={(v) => setStyle(v as "BOULDER" | "ROUTE")}>
          <TabsList>
            <TabsTrigger value="BOULDER">{t("Boulder")}</TabsTrigger>
            <TabsTrigger value="ROUTE">{t("Routen")}</TabsTrigger>
          </TabsList>
        </Tabs>
        <AddClimbingSendDialog onAdded={refetch} />
      </div>

      {grades == null ? (
        <Skeleton className="h-64 w-full" />
      ) : grades.length === 0 ? (
        <EmptyChart
          variant="bars"
          message={style === "BOULDER" ? t("Noch keine Boulder eingetragen.") : t("Noch keine Routen eingetragen.")}
        />
      ) : (
        <>
          <ChartContainer config={chartConfig} className="aspect-auto h-64 w-full">
            <BarChart data={grades} layout="vertical" margin={{ left: 8, right: 16 }}>
              <CartesianGrid horizontal={false} />
              <XAxis type="number" tickLine={false} axisLine={false} allowDecimals={false} />
              <YAxis dataKey="grade" type="category" tickLine={false} axisLine={false} width={48} />
              <ChartTooltip content={<ChartTooltipContent formatter={(value) => [`${value}×`, t("Anzahl")]} />} />
              <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                <LabelList dataKey="count" position="right" className="fill-foreground text-xs" />
                {grades.map((g, i) => (
                  <Cell
                    key={g.grade}
                    fill={VIZ_ORDINAL[Math.min(4, Math.floor((i / grades.length) * 5))]}
                  />
                ))}
              </Bar>
            </BarChart>
          </ChartContainer>
          <p className="text-center text-xs text-muted-foreground">
            {t("Heller = leichter, dunkler = schwerer")}
          </p>
        </>
      )}
    </div>
  );
}
