"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Line, LineChart, XAxis, YAxis } from "recharts";
import { Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { FOCUS_LABEL, ALL_FOCUSES } from "@/lib/muscle-focus";
import type { MuscleFocus } from "@prisma/client";
import { Skeleton } from "@/components/ui/skeleton";
import { DeleteAccountDialog } from "@/components/delete-account-dialog";
import { PushNotificationToggle } from "@/components/push-notification-toggle";
import { DataExport, DataImport, CalendarFeed } from "@/components/data-portability";
import { ApiKeyManager } from "@/components/api-key-manager";
import { APP_VERSION } from "@/lib/version";

type SettingsData = {
  user: { name: string; username: string; bodyWeightKg: number | null; avatarUrl: string | null };
  balanceGoals: { focus: MuscleFocus; targetPercent: number }[];
  bodyWeightHistory: { dateKey: string; weightKg: number }[];
};

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

const weightChartConfig = {
  weightKg: { label: "Gewicht", color: "var(--chart-1)" },
} satisfies ChartConfig;

export default function SettingsPage() {
  const [data, setData] = useState<SettingsData | null>(null);
  const [bodyWeight, setBodyWeight] = useState("");
  const [savingWeight, setSavingWeight] = useState(false);
  const [goals, setGoals] = useState<Record<MuscleFocus, number>>({
    PUSH: 20,
    PULL: 20,
    LEGS: 20,
    CORE: 20,
    GRIP: 20,
  });
  const [savingGoals, setSavingGoals] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  function refetch() {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((res: SettingsData) => {
        setData(res);
        setBodyWeight(res.user.bodyWeightKg?.toString() ?? "");
        if (res.balanceGoals.length > 0) {
          setGoals((g) => {
            const next = { ...g };
            for (const goal of res.balanceGoals) next[goal.focus] = goal.targetPercent;
            return next;
          });
        }
      });
  }

  useEffect(refetch, []);

  const goalSum = ALL_FOCUSES.reduce((sum, f) => sum + goals[f], 0);

  async function handleSaveWeight() {
    const n = Number(bodyWeight);
    if (!n || n <= 0) return;
    setSavingWeight(true);
    const res = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bodyWeightKg: n }),
    });
    setSavingWeight(false);
    if (!res.ok) {
      toast.error("Konnte Gewicht nicht speichern.");
      return;
    }
    toast.success("Gewicht eingetragen!");
    refetch();
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) {
      toast.error("Bild zu groß (max. 4MB).");
      return;
    }
    setUploadingAvatar(true);
    const formData = new FormData();
    formData.append("avatar", file);
    const res = await fetch("/api/settings/avatar", { method: "POST", body: formData });
    setUploadingAvatar(false);
    if (!res.ok) {
      toast.error("Konnte Profilbild nicht hochladen.");
      return;
    }
    toast.success("Profilbild aktualisiert!");
    refetch();
  }

  async function handleSaveGoals() {
    setSavingGoals(true);
    const res = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        balanceGoals: ALL_FOCUSES.map((focus) => ({ focus, targetPercent: goals[focus] })),
      }),
    });
    setSavingGoals(false);
    if (!res.ok) {
      toast.error("Konnte Ziele nicht speichern.");
      return;
    }
    toast.success("Gespeichert!");
  }

  if (data == null) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-6">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => avatarInputRef.current?.click()}
          disabled={uploadingAvatar}
          className="group relative shrink-0 rounded-full"
        >
          <Avatar className="size-16">
            {data.user.avatarUrl && <AvatarImage src={data.user.avatarUrl} alt={data.user.name} />}
            <AvatarFallback className="bg-primary text-lg font-semibold text-primary-foreground">
              {initials(data.user.name)}
            </AvatarFallback>
          </Avatar>
          <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
            <Camera className="size-5 text-white" />
          </span>
          <input
            ref={avatarInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={handleAvatarChange}
          />
        </button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Einstellungen</h1>
          <p className="text-sm text-muted-foreground">{data.user.name} · @{data.user.username}</p>
          <p className="mt-1 text-xs text-muted-foreground/60">Ascend v{APP_VERSION}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Körpergewicht</CardTitle>
          <CardDescription>
            Jeder Eintrag wird mit Datum gespeichert - Bodyweight-Übungen (Klimmzüge etc.) werden in
            Analytics immer gegen dein Gewicht *zum jeweiligen Zeitpunkt* bewertet, nicht dein aktuelles.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min={20}
              max={300}
              step={0.1}
              value={bodyWeight}
              onChange={(e) => setBodyWeight(e.target.value)}
              className="w-32"
            />
            <span className="text-sm text-muted-foreground">kg</span>
            <Button onClick={handleSaveWeight} disabled={savingWeight} size="sm" className="ml-auto">
              {savingWeight ? "Speichern…" : "Heute eintragen"}
            </Button>
          </div>

          {data.bodyWeightHistory.length >= 2 && (
            <ChartContainer config={weightChartConfig} className="aspect-auto h-32 w-full">
              <LineChart data={data.bodyWeightHistory} margin={{ left: 8, right: 8 }}>
                <XAxis dataKey="dateKey" hide />
                <YAxis domain={["dataMin - 1", "dataMax + 1"]} hide />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      labelFormatter={(v) => new Date(v).toLocaleDateString("de-DE")}
                      formatter={(value) => [`${value} kg`, "Gewicht"]}
                    />
                  }
                />
                <Line
                  type="monotone"
                  dataKey="weightKg"
                  stroke="var(--color-weightKg)"
                  strokeWidth={2}
                  dot={{ r: 2, fill: "var(--color-weightKg)" }}
                />
              </LineChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Balance-Ziele</CardTitle>
          <CardDescription>
            Deine Wunsch-Verteilung fürs Balance-Radar. Muss nicht exakt 100% ergeben.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          {ALL_FOCUSES.map((focus) => (
            <div key={focus} className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <Label>{FOCUS_LABEL[focus]}</Label>
                <span className="text-sm font-medium text-primary">{goals[focus]}%</span>
              </div>
              <Slider
                value={goals[focus]}
                onValueChange={(v) => setGoals((g) => ({ ...g, [focus]: v as number }))}
                min={0}
                max={100}
                step={5}
              />
            </div>
          ))}
          <p className={`text-xs ${goalSum === 100 ? "text-success" : "text-muted-foreground"}`}>
            Summe: {goalSum}%{goalSum === 100 ? " — perfekt" : ""}
          </p>
          <Button onClick={handleSaveGoals} disabled={savingGoals} size="lg">
            {savingGoals ? "Speichern…" : "Ziele speichern"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Benachrichtigungen</CardTitle>
        </CardHeader>
        <CardContent>
          <PushNotificationToggle />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Deine Daten</CardTitle>
          <CardDescription>Export, Import und ein abonnierbarer Kalender-Feed deiner Workouts.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <DataExport />
          <DataImport />
          <CalendarFeed />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">API-Keys</CardTitle>
          <CardDescription>Für eigene Scripts/Automationen - siehe README für die Endpunkte.</CardDescription>
        </CardHeader>
        <CardContent>
          <ApiKeyManager />
        </CardContent>
      </Card>

      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="text-base text-destructive">Danger Zone</CardTitle>
          <CardDescription>Diese Aktion ist endgültig und kann nicht rückgängig gemacht werden.</CardDescription>
        </CardHeader>
        <CardContent>
          <DeleteAccountDialog />
        </CardContent>
      </Card>
    </div>
  );
}
