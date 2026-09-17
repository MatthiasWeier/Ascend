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

export default function AnalyticsPage() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
        <p className="text-sm text-muted-foreground">Deine Fortschritte in Zahlen.</p>
      </div>

      <Tabs defaultValue="strength">
        <TabsList className="w-full flex-wrap">
          <TabsTrigger value="strength">Kraft</TabsTrigger>
          <TabsTrigger value="volume">Volumen</TabsTrigger>
          <TabsTrigger value="balance">Balance</TabsTrigger>
          <TabsTrigger value="calendar">Kalender</TabsTrigger>
          <TabsTrigger value="climbing">Klettern</TabsTrigger>
        </TabsList>

        <TabsContent value="strength">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Maximalkraft-Verlauf</CardTitle>
              <CardDescription>Geschätztes 1RM (Epley-Formel) pro Übung über Zeit.</CardDescription>
            </CardHeader>
            <CardContent>
              <OneRmChart />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="volume">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Gesamtarbeit</CardTitle>
              <CardDescription>Bewegtes Gewicht (Wdh × kg) der letzten 90 Tage.</CardDescription>
            </CardHeader>
            <CardContent>
              <VolumeChart />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="balance">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Balance-Spinnennetz</CardTitle>
              <CardDescription>Wie ausgewogen ist dein Training über alle Bereiche?</CardDescription>
            </CardHeader>
            <CardContent>
              <BalanceRadar />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="calendar">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Aktivitäts-Kalender</CardTitle>
              <CardDescription>Je dunkler, desto intensiver war dein Training an dem Tag.</CardDescription>
            </CardHeader>
            <CardContent>
              <ActivityCalendar />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="climbing" className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Boulder-Kalender</CardTitle>
              <CardDescription>Tag antippen, Anzahl pro Schwierigkeit eintragen.</CardDescription>
            </CardHeader>
            <CardContent>
              <BoulderCalendar />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Kletter-Pyramide</CardTitle>
              <CardDescription>Anzahl geschaffter Boulder/Routen pro Schwierigkeitsgrad.</CardDescription>
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
