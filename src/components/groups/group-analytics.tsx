"use client";

import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocale } from "@/components/locale-provider";

type VolumePoint = { date: string; totalSets: number };
type MemberActivity = { userId: string; userName: string; workoutCount: number };
type AnalyticsData = { days: number; volumeByDay: VolumePoint[]; memberActivity: MemberActivity[] };

export function GroupAnalytics({ groupId }: { groupId: string }) {
  const { t, dateLocale } = useLocale();
  const volumeConfig = {
    totalSets: { label: t("Sätze (Gruppe)"), color: "var(--chart-1)" },
  } satisfies ChartConfig;
  const activityConfig = {
    workoutCount: { label: t("Workouts"), color: "var(--chart-2)" },
  } satisfies ChartConfig;
  const [data, setData] = useState<AnalyticsData | null>(null);

  useEffect(() => {
    fetch(`/api/groups/${groupId}/analytics`)
      .then((r) => r.json())
      .then(setData);
  }, [groupId]);

  if (data == null) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const hasAnyVolume = data.volumeByDay.some((p) => p.totalSets > 0);
  const hasAnyActivity = data.memberActivity.some((m) => m.workoutCount > 0);

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("Gruppen-Volumen")}</CardTitle>
          <CardDescription>{t("Sätze der ganzen Gruppe pro Tag, letzte {days} Tage.", { days: data.days })}</CardDescription>
        </CardHeader>
        <CardContent>
          {!hasAnyVolume ? (
            <p className="flex h-64 items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted-foreground">
              {t("Noch keine Workouts in diesem Zeitraum.")}
            </p>
          ) : (
            <ChartContainer config={volumeConfig} className="aspect-auto h-64 w-full">
              <BarChart data={data.volumeByDay} margin={{ left: 8, right: 8 }}>
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
                  width={48}
                  allowDecimals={false}
                  label={{ value: t("Sätze"), angle: -90, position: "insideLeft", offset: 4, style: { textAnchor: "middle" }, fill: "var(--muted-foreground)", fontSize: 11 }}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      labelFormatter={(v) => new Date(v).toLocaleDateString(dateLocale)}
                      formatter={(value) => [t("{n} Sätze", { n: String(value) }), t("Gruppe")]}
                    />
                  }
                />
                <Bar dataKey="totalSets" fill="var(--color-totalSets)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("Aktivität pro Mitglied")}</CardTitle>
          <CardDescription>{t("Geloggte Workouts, letzte {days} Tage.", { days: data.days })}</CardDescription>
        </CardHeader>
        <CardContent>
          {!hasAnyActivity ? (
            <p className="flex h-64 items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted-foreground">
              {t("Noch keine Workouts in diesem Zeitraum.")}
            </p>
          ) : (
            <ChartContainer config={activityConfig} className="aspect-auto h-64 w-full">
              <BarChart data={data.memberActivity} layout="vertical" margin={{ left: 8, right: 8 }}>
                <CartesianGrid horizontal={false} />
                <XAxis
                  type="number"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  allowDecimals={false}
                  height={40}
                  label={{ value: t("Workouts"), position: "insideBottom", offset: 0, fill: "var(--muted-foreground)", fontSize: 11 }}
                />
                <YAxis
                  type="category"
                  dataKey="userName"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  width={80}
                />
                <ChartTooltip content={<ChartTooltipContent formatter={(value) => [`${value}`, t("Workouts")]} />} />
                <Bar dataKey="workoutCount" fill="var(--color-workoutCount)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
