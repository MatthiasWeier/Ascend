"use client";

import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { Mountain, MapPin, Clock } from "lucide-react";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocale } from "@/components/locale-provider";

type VolumePoint = { date: string; totalSets: number };
type MemberActivity = { userId: string; userName: string; workoutCount: number };
type ClimbingDate = { dateKey: string; time: string | null; location: string | null; participantCount: number };
type ClimbingAttendance = { userId: string; userName: string; count: number };
type ClimbingData = { totalCount: number; recentDates: ClimbingDate[]; attendance: ClimbingAttendance[] };
type AnalyticsData = {
  days: number;
  volumeByDay: VolumePoint[];
  memberActivity: MemberActivity[];
  climbing: ClimbingData;
};

export function GroupAnalytics({ groupId }: { groupId: string }) {
  const { t, dateLocale } = useLocale();
  const volumeConfig = {
    totalSets: { label: t("Sets (group)"), color: "var(--chart-1)" },
  } satisfies ChartConfig;
  const activityConfig = {
    workoutCount: { label: t("Workouts"), color: "var(--chart-2)" },
  } satisfies ChartConfig;
  const climbingConfig = {
    count: { label: t("Climbing days"), color: "var(--chart-3)" },
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
          <CardTitle className="text-base">{t("Group volume")}</CardTitle>
          <CardDescription>{t("Sets of the whole group per day, last {days} days.", { days: data.days })}</CardDescription>
        </CardHeader>
        <CardContent>
          {!hasAnyVolume ? (
            <p className="flex h-64 items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted-foreground">
              {t("No workouts in this period yet.")}
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
                  label={{ value: t("Sets"), angle: -90, position: "insideLeft", offset: 4, style: { textAnchor: "middle" }, fill: "var(--muted-foreground)", fontSize: 11 }}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      labelFormatter={(v) => new Date(v).toLocaleDateString(dateLocale)}
                      formatter={(value) => [t("{n} sets", { n: String(value) }), t("Group")]}
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
          <CardTitle className="text-base">{t("Activity per member")}</CardTitle>
          <CardDescription>{t("Logged workouts, last {days} days.", { days: data.days })}</CardDescription>
        </CardHeader>
        <CardContent>
          {!hasAnyActivity ? (
            <p className="flex h-64 items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted-foreground">
              {t("No workouts in this period yet.")}
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

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-1.5 text-base">
            <Mountain className="size-4 text-primary" />
            {t("Climbing days")}
          </CardTitle>
          <CardDescription>
            {data.climbing.totalCount === 0
              ? t("No climbing day as a group yet.")
              : data.climbing.totalCount === 1
                ? t("1 climbing day so far.")
                : t("{n} climbing days so far.", { n: data.climbing.totalCount })}
          </CardDescription>
        </CardHeader>
        {data.climbing.recentDates.length > 0 && (
          <CardContent>
            <ol className="flex flex-col gap-2">
              {data.climbing.recentDates.map((d) => (
                <li
                  key={d.dateKey}
                  className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-border px-3 py-2 text-sm"
                >
                  <span className="font-medium">
                    {new Date(`${d.dateKey}T12:00:00Z`).toLocaleDateString(dateLocale, {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                  {d.time && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="size-3" />
                      {d.time}
                    </span>
                  )}
                  {d.location && (
                    <span className="flex min-w-0 items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="size-3 shrink-0" />
                      <span className="truncate">{d.location}</span>
                    </span>
                  )}
                  <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                    {t("{n} there", { n: d.participantCount })}
                  </span>
                </li>
              ))}
            </ol>
          </CardContent>
        )}
      </Card>

      {data.climbing.attendance.some((a) => a.count > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("Attendance per member")}</CardTitle>
            <CardDescription>{t("How often RSVP'd and there, across all climbing days.")}</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={climbingConfig} className="aspect-auto h-64 w-full">
              <BarChart data={data.climbing.attendance} layout="vertical" margin={{ left: 8, right: 8 }}>
                <CartesianGrid horizontal={false} />
                <XAxis
                  type="number"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  allowDecimals={false}
                  height={40}
                  label={{ value: t("Climbing days"), position: "insideBottom", offset: 0, fill: "var(--muted-foreground)", fontSize: 11 }}
                />
                <YAxis type="category" dataKey="userName" tickLine={false} axisLine={false} tickMargin={8} width={80} />
                <ChartTooltip content={<ChartTooltipContent formatter={(value) => [`${value}`, t("Climbing days")]} />} />
                <Bar dataKey="count" fill="var(--color-count)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
