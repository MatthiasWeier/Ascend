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
        <p className="text-sm text-muted-foreground">{t("Deine Fortschritte in Zahlen.")}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("Aktivitäts-Kalender")}</CardTitle>
          <CardDescription>{t("Je dunkler, desto intensiver war dein Training an dem Tag.")}</CardDescription>
        </CardHeader>
        <CardContent>
          <ActivityCalendar />
        </CardContent>
      </Card>

      <Tabs defaultValue="strength">
        <TabsList className="w-full flex-wrap">
          <TabsTrigger value="strength">{t("Kraft")}</TabsTrigger>
          <TabsTrigger value="records">{t("Rekorde")}</TabsTrigger>
          <TabsTrigger value="volume">{t("Volumen")}</TabsTrigger>
          <TabsTrigger value="balance">{t("Balance")}</TabsTrigger>
          <TabsTrigger value="climbing">{t("Klettern")}</TabsTrigger>
        </TabsList>

        <TabsContent value="strength">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("Maximalkraft-Verlauf")}</CardTitle>
              <CardDescription>{t("Geschätztes 1RM (Epley-Formel) pro Übung über Zeit.")}</CardDescription>
            </CardHeader>
            <CardContent>
              <OneRmChart />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="records">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("Persönliche Rekorde")}</CardTitle>
              <CardDescription>{t("Dein aktueller Bestwert pro Übung.")}</CardDescription>
            </CardHeader>
            <CardContent>
              <PersonalRecords />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="volume" className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("Sätze diese Woche")}</CardTitle>
              <CardDescription>{t("Arbeitssätze pro Muskelgruppe seit Montag - Warm-ups zählen nicht mit.")}</CardDescription>
            </CardHeader>
            <CardContent>
              <WeeklySets />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("Gesamtarbeit")}</CardTitle>
              <CardDescription>{t("Bewegtes Gewicht (Wdh × Gewicht) der letzten 90 Tage.")}</CardDescription>
            </CardHeader>
            <CardContent>
              <VolumeChart />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="balance">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("Balance-Spinnennetz")}</CardTitle>
              <CardDescription>{t("Wie ausgewogen ist dein Training über alle Bereiche?")}</CardDescription>
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
              <CardTitle className="text-base">{t("Boulder-Kalender")}</CardTitle>
              <CardDescription>{t("Tag antippen, Anzahl pro Schwierigkeit eintragen.")}</CardDescription>
            </CardHeader>
            <CardContent>
              <BoulderCalendar />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("Kletter-Pyramide")}</CardTitle>
              <CardDescription>{t("Anzahl geschaffter Boulder/Routen pro Schwierigkeitsgrad.")}</CardDescription>
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
