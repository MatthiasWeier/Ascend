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
import { WorkoutReminders } from "@/components/workout-reminders";
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
  weightKg: { label: "Weight", color: "var(--chart-1)" },
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
      toast.error(t("Couldn't save the weight."));
      return;
    }
    toast.success(t("Weight logged!"));
    refetch();
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) {
      toast.error(t("Image too large (max. 4 MB)."));
      return;
    }
    setUploadingAvatar(true);
    const formData = new FormData();
    formData.append("avatar", file);
    const res = await fetch("/api/settings/avatar", { method: "POST", body: formData });
    setUploadingAvatar(false);
    if (!res.ok) {
      toast.error(t("Couldn't upload the profile picture."));
      return;
    }
    toast.success(t("Profile picture updated!"));
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
      toast.error(t("Couldn't save the goals."));
      return;
    }
    toast.success(t("Saved!"));
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
          <h1 className="text-2xl font-bold tracking-tight">{t("Settings")}</h1>
          <p className="text-sm text-muted-foreground">{data.user.name} · @{data.user.username}</p>
          <p className="mt-1 text-xs text-muted-foreground">Ascend v{APP_VERSION}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("Body weight")}</CardTitle>
          <CardDescription>
            {t("Every entry is saved with its date - bodyweight exercises (pull-ups etc.) are always rated in analytics against your weight *at the time*, not your current one.")}
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
              {savingWeight ? t("Saving…") : t("Log today")}
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
                      formatter={(value) => [`${value} ${weightUnit.unitLabel}`, t("Weight")]}
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
          <CardTitle className="text-base">{t("Muscle wishes")}</CardTitle>
          <CardDescription>
            {t("What are you unhappy with? Wish for more training on a muscle - the Workout Brain will then suggest it more often.")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <MuscleWishes />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("My exercises")}</CardTitle>
          <CardDescription>{t("Edit or delete exercises you created.")}</CardDescription>
        </CardHeader>
        <CardContent>
          <MyExercises />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("Install app")}</CardTitle>
        </CardHeader>
        <CardContent>
          <InstallAppCard />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("Injuries")}</CardTitle>
          <CardDescription>
            {t("What hurts right now? Affected exercises get a warning while logging and are dropped from the Workout Brain's suggestions.")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <InjuriesCard />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("Balance targets")}</CardTitle>
          <CardDescription>
            {t("Your desired split for the balance radar. Doesn't have to add up to exactly 100%.")}
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
            {t("Total: {sum}%", { sum: goalSum })}{goalSum === 100 ? ` — ${t("perfect")}` : ""}
          </p>
          <Button onClick={handleSaveGoals} disabled={savingGoals} size="lg">
            {savingGoals ? t("Saving…") : t("Save targets")}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("Notifications")}</CardTitle>
        </CardHeader>
        <CardContent>
          <PushNotificationToggle />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("Workout reminders")}</CardTitle>
          <CardDescription>{t("When you want to be reminded to train - your own times and shared events.")}</CardDescription>
        </CardHeader>
        <CardContent>
          <WorkoutReminders />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("Your data")}</CardTitle>
          <CardDescription>{t("Export, import and a subscribable calendar feed of your workouts.")}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <DataExport />
          <DataImport />
          <CalendarFeed />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("Units")}</CardTitle>
          <CardDescription>
            {t("Affects the display only - everything is always stored in kg internally.")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select
            items={[
              { value: "KG", label: t("Kilograms (kg)") },
              { value: "LBS", label: t("Pounds (lbs)") },
            ]}
            value={weightUnit.unit}
            onValueChange={(v) => weightUnit.setUnit(v as WeightUnit)}
          >
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="KG">{t("Kilograms (kg)")}</SelectItem>
              <SelectItem value="LBS">{t("Pounds (lbs)")}</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sprache / Language</CardTitle>
          <CardDescription>
            {t("Applies to this device/browser. User-entered content (posts, notes, custom exercises) is not translated.")}
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
          <CardDescription>{t("Watch the short tour through Ascend again.")}</CardDescription>
        </CardHeader>
        <CardContent>
          <ReplayTutorialButton />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("API keys")}</CardTitle>
          <CardDescription>{t("For your own scripts/automations - see the README for the endpoints.")}</CardDescription>
        </CardHeader>
        <CardContent>
          <ApiKeyManager />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("Two-factor authentication")}</CardTitle>
        </CardHeader>
        <CardContent>
          <TwoFactorSetup enabled={data.user.totpEnabled} onChanged={refetch} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("Sessions")}</CardTitle>
          <CardDescription>
            {t("Devices currently signed in to your account.")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SessionManager />
        </CardContent>
      </Card>

      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="text-base text-destructive">{t("Danger zone")}</CardTitle>
          <CardDescription>{t("This action is final and can't be undone.")}</CardDescription>
        </CardHeader>
        <CardContent>
          <DeleteAccountDialog />
        </CardContent>
      </Card>
    </div>
  );
}
