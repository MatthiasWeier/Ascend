"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { OneRmChart } from "@/components/analytics/one-rm-chart";
import { VolumeChart } from "@/components/analytics/volume-chart";
import { BalanceRadar } from "@/components/analytics/balance-radar";
import { ActivityCalendar } from "@/components/analytics/activity-calendar";
import { ClimbingPyramid } from "@/components/analytics/climbing-pyramid";
import { BoulderCalendar } from "@/components/analytics/boulder-calendar";
import { PersonalRecords } from "@/components/analytics/personal-records";
import { WeeklySets } from "@/components/analytics/weekly-sets";
import { useT } from "@/components/locale-provider";

export default function AnalyticsPage() {
  const t = useT();
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-6 lg:max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("Analytics")}</h1>
        <p className="text-sm text-muted-foreground">{t("Your progress in numbers.")}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("Activity calendar")}</CardTitle>
          <CardDescription>{t("The darker, the more intense your training was that day.")}</CardDescription>
        </CardHeader>
        <CardContent>
          <ActivityCalendar />
        </CardContent>
      </Card>

      <Tabs defaultValue="strength">
        <TabsList className="w-full flex-wrap">
          <TabsTrigger value="strength">{t("Strength")}</TabsTrigger>
          <TabsTrigger value="records">{t("Records")}</TabsTrigger>
          <TabsTrigger value="volume">{t("Volume")}</TabsTrigger>
          <TabsTrigger value="balance">{t("Balance")}</TabsTrigger>
          <TabsTrigger value="climbing">{t("Climbing")}</TabsTrigger>
        </TabsList>

        <TabsContent value="strength">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("Max strength history")}</CardTitle>
              <CardDescription>{t("Estimated 1RM (Epley formula) per exercise over time.")}</CardDescription>
            </CardHeader>
            <CardContent>
              <OneRmChart />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="records">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("Personal records")}</CardTitle>
              <CardDescription>{t("Your current best per exercise.")}</CardDescription>
            </CardHeader>
            <CardContent>
              <PersonalRecords />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="volume" className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("Sets this week")}</CardTitle>
              <CardDescription>{t("Working sets per muscle group since Monday - warm-ups don't count.")}</CardDescription>
            </CardHeader>
            <CardContent>
              <WeeklySets />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("Total work")}</CardTitle>
              <CardDescription>{t("Weight moved (reps × weight) over the last 90 days.")}</CardDescription>
            </CardHeader>
            <CardContent>
              <VolumeChart />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="balance">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("Balance radar")}</CardTitle>
              <CardDescription>{t("How balanced is your training across all areas?")}</CardDescription>
            </CardHeader>
            <CardContent>
              <BalanceRadar />
            </CardContent>
          </Card>
        </TabsContent>

        {/* The year calendar sits above the tabs, always visible. */}

        <TabsContent value="climbing" className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("Boulder calendar")}</CardTitle>
              <CardDescription>{t("Tap a day, enter the count per difficulty.")}</CardDescription>
            </CardHeader>
            <CardContent>
              <BoulderCalendar />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("Climbing pyramid")}</CardTitle>
              <CardDescription>{t("Number of boulders/routes sent per grade.")}</CardDescription>
            </CardHeader>
            <CardContent>
              <ClimbingPyramid />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
