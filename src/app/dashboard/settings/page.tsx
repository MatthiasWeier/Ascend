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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { FOCUS_LABEL, ALL_FOCUSES } from "@/lib/muscle-focus";
import type { MuscleFocus } from "@prisma/client";
import { Skeleton } from "@/components/ui/skeleton";
import { ReplayTutorialButton } from "@/components/onboarding-tutorial";
import { MuscleWishes } from "@/components/muscle-wishes";
import { InjuriesCard } from "@/components/injuries-card";
import { MyExercises } from "@/components/my-exercises";
import { InstallAppCard } from "@/components/install-app";
import { DeleteAccountDialog } from "@/components/delete-account-dialog";
import { PushNotificationToggle } from "@/components/push-notification-toggle";
import { DataExport, DataImport, CalendarFeed } from "@/components/data-portability";
import { ApiKeyManager } from "@/components/api-key-manager";
import { APP_VERSION } from "@/lib/version";
import { useWeightUnit } from "@/components/weight-unit-context";
import { roundForDisplay } from "@/lib/weight-units";
import type { WeightUnit } from "@/lib/weight-units";
import { TwoFactorSetup } from "@/components/two-factor-setup";
import { SessionManager } from "@/components/session-manager";
import { useLocale } from "@/components/locale-provider";
import type { Locale } from "@/lib/i18n";

type SettingsData = {
  user: {
    name: string;
    username: string;
    bodyWeightKg: number | null;
    avatarUrl: string | null;
    totpEnabled: boolean;
  };
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
  const weightUnit = useWeightUnit();
  const { t, locale, setLocale } = useLocale();
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

  // Re-derive the displayed bodyweight (in the current unit) whenever the
  // fetched kg value or the unit preference changes.
  useEffect(() => {
    if (data == null) return;
    setBodyWeight(
      data.user.bodyWeightKg != null
        ? String(roundForDisplay(weightUnit.toDisplay(data.user.bodyWeightKg), weightUnit.unit))
        : ""
    );
  }, [data, weightUnit]);

  const goalSum = ALL_FOCUSES.reduce((sum, f) => sum + goals[f], 0);

  async function handleSaveWeight() {
    const n = Number(bodyWeight);
    if (!n || n <= 0) return;
    setSavingWeight(true);
    const res = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bodyWeightKg: weightUnit.toKg(n) }),
    });
    setSavingWeight(false);
    if (!res.ok) {
      toast.error(t("Konnte Gewicht nicht speichern."));
      return;
    }
    toast.success(t("Gewicht eingetragen!"));
    refetch();
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) {
      toast.error(t("Bild zu groß (max. 4MB)."));
      return;
    }
    setUploadingAvatar(true);
    const formData = new FormData();
    formData.append("avatar", file);
    const res = await fetch("/api/settings/avatar", { method: "POST", body: formData });
    setUploadingAvatar(false);
    if (!res.ok) {
      toast.error(t("Konnte Profilbild nicht hochladen."));
      return;
    }
    toast.success(t("Profilbild aktualisiert!"));
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
      toast.error(t("Konnte Ziele nicht speichern."));
      return;
    }
    toast.success(t("Gespeichert!"));
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
    <div className="mx-auto grid max-w-2xl gap-6 px-4 py-6 lg:max-w-5xl lg:grid-cols-2 lg:items-start">
      <div className="flex items-center gap-4 lg:col-span-2">
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
          <h1 className="text-2xl font-bold tracking-tight">{t("Einstellungen")}</h1>
          <p className="text-sm text-muted-foreground">{data.user.name} · @{data.user.username}</p>
          <p className="mt-1 text-xs text-muted-foreground">Ascend v{APP_VERSION}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("Körpergewicht")}</CardTitle>
          <CardDescription>
            {t("Jeder Eintrag wird mit Datum gespeichert - Bodyweight-Übungen (Klimmzüge etc.) werden in Analytics immer gegen dein Gewicht *zum jeweiligen Zeitpunkt* bewertet, nicht dein aktuelles.")}
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
            <span className="text-sm text-muted-foreground">{weightUnit.unitLabel}</span>
            <Button onClick={handleSaveWeight} disabled={savingWeight} size="sm" className="ml-auto">
              {savingWeight ? t("Speichern…") : t("Heute eintragen")}
            </Button>
          </div>

          {data.bodyWeightHistory.length >= 2 && (
            <ChartContainer config={weightChartConfig} className="aspect-auto h-32 w-full">
              <LineChart
                data={data.bodyWeightHistory.map((p) => ({
                  ...p,
                  weightKg: roundForDisplay(weightUnit.toDisplay(p.weightKg), weightUnit.unit),
                }))}
                margin={{ left: 8, right: 8 }}
              >
                <XAxis dataKey="dateKey" hide />
                <YAxis domain={["dataMin - 1", "dataMax + 1"]} hide />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      labelFormatter={(v) => new Date(v).toLocaleDateString(locale === "en" ? "en-GB" : "de-DE")}
                      formatter={(value) => [`${value} ${weightUnit.unitLabel}`, t("Gewicht")]}
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
          <CardTitle className="text-base">{t("Muskel-Wünsche")}</CardTitle>
          <CardDescription>
            {t("Womit bist du unzufrieden? Wünsche dir mehr Training für einen Muskel - das Workout Brain schlägt ihn dann öfter vor.")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <MuscleWishes />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("Eigene Übungen")}</CardTitle>
          <CardDescription>{t("Selbst angelegte Übungen bearbeiten oder löschen.")}</CardDescription>
        </CardHeader>
        <CardContent>
          <MyExercises />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("App installieren")}</CardTitle>
        </CardHeader>
        <CardContent>
          <InstallAppCard />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("Verletzungen")}</CardTitle>
          <CardDescription>
            {t("Was tut gerade weh? Betroffene Übungen bekommen beim Eintragen eine Warnung und fliegen aus den Vorschlägen des Workout Brains.")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <InjuriesCard />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("Balance-Ziele")}</CardTitle>
          <CardDescription>
            {t("Deine Wunsch-Verteilung fürs Balance-Radar. Muss nicht exakt 100% ergeben.")}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          {ALL_FOCUSES.map((focus) => (
            <div key={focus} className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <Label>{t(FOCUS_LABEL[focus])}</Label>
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
            {t("Summe: {sum}%", { sum: goalSum })}{goalSum === 100 ? ` — ${t("perfekt")}` : ""}
          </p>
          <Button onClick={handleSaveGoals} disabled={savingGoals} size="lg">
            {savingGoals ? t("Speichern…") : t("Ziele speichern")}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("Benachrichtigungen")}</CardTitle>
        </CardHeader>
        <CardContent>
          <PushNotificationToggle />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("Deine Daten")}</CardTitle>
          <CardDescription>{t("Export, Import und ein abonnierbarer Kalender-Feed deiner Workouts.")}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <DataExport />
          <DataImport />
          <CalendarFeed />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("Einheiten")}</CardTitle>
          <CardDescription>
            {t("Betrifft nur die Anzeige - gespeichert wird intern immer in kg.")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select
            items={[
              { value: "KG", label: t("Kilogramm (kg)") },
              { value: "LBS", label: t("Pfund (lbs)") },
            ]}
            value={weightUnit.unit}
            onValueChange={(v) => weightUnit.setUnit(v as WeightUnit)}
          >
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="KG">{t("Kilogramm (kg)")}</SelectItem>
              <SelectItem value="LBS">{t("Pfund (lbs)")}</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sprache / Language</CardTitle>
          <CardDescription>
            {t("Gilt für dieses Gerät/diesen Browser. Von Nutzern eingegebene Inhalte (Beiträge, Notizen, eigene Übungen) werden nicht übersetzt.")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select
            items={[
              { value: "de", label: "Deutsch" },
              { value: "en", label: "English" },
            ]}
            value={locale}
            onValueChange={(v) => setLocale(v as Locale)}
          >
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="de">Deutsch</SelectItem>
              <SelectItem value="en">English</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("Tutorial")}</CardTitle>
          <CardDescription>{t("Die Kurz-Tour durch Ascend noch einmal ansehen.")}</CardDescription>
        </CardHeader>
        <CardContent>
          <ReplayTutorialButton />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("API-Keys")}</CardTitle>
          <CardDescription>{t("Für eigene Scripts/Automationen - siehe README für die Endpunkte.")}</CardDescription>
        </CardHeader>
        <CardContent>
          <ApiKeyManager />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("Zwei-Faktor-Authentifizierung")}</CardTitle>
        </CardHeader>
        <CardContent>
          <TwoFactorSetup enabled={data.user.totpEnabled} onChanged={refetch} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("Sitzungen")}</CardTitle>
          <CardDescription>
            {t("Geräte, die aktuell bei deinem Konto angemeldet sind.")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SessionManager />
        </CardContent>
      </Card>

      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="text-base text-destructive">{t("Danger Zone")}</CardTitle>
          <CardDescription>{t("Diese Aktion ist endgültig und kann nicht rückgängig gemacht werden.")}</CardDescription>
        </CardHeader>
        <CardContent>
          <DeleteAccountDialog />
        </CardContent>
      </Card>
    </div>
  );
}
